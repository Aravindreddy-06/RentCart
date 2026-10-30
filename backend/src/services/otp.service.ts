/**
 * src/services/otp.service.ts
 * OTP generation, hashing, constant-time validation, rate limiting, and cleanup.
 */

import crypto from 'crypto';
import prisma from '../prisma/client';
import { OtpPurpose } from '@prisma/client';
import { env } from '../config/env';

export interface OtpVerificationResult {
  valid: boolean;
  attemptsLeft?: number;
  message?: string;
}

export class OtpError extends Error {
  statusCode: number;
  attemptsLeft?: number;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    statusCode = 400,
    options?: { attemptsLeft?: number; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = 'OtpError';
    this.statusCode = statusCode;
    this.attemptsLeft = options?.attemptsLeft;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/**
 * Generate a cryptographically secure 6-digit OTP string.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP using SHA-256 so plain text codes are never persisted.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Compare candidate OTP hash with stored hash in constant time.
 */
export function constantTimeCompare(candidateOtp: string, storedHash: string): boolean {
  const candidateHash = hashOtp(candidateOtp);
  const bufA = Buffer.from(candidateHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Check resend cooldown (60 seconds) and hourly limits (max 5 OTP emails per hour).
 */
export async function assertOtpRateLimits(userId: string, purpose: OtpPurpose): Promise<void> {
  if (env.DISABLE_OTP_COOLDOWN) {
    if (env.NODE_ENV !== 'test') {
      throw new Error('DISABLE_OTP_COOLDOWN is only permitted when NODE_ENV=test');
    }
    return;
  }

  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60 * 1000);
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  // 1. Check 60-second cooldown on the most recent OTP
  const latestOtp = await prisma.otpCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (latestOtp && latestOtp.createdAt > oneMinuteAgo) {
    const elapsedSeconds = Math.floor((now - latestOtp.createdAt.getTime()) / 1000);
    const retryAfterSeconds = Math.max(1, 60 - elapsedSeconds);
    throw new OtpError(
      `Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'} before requesting another code.`,
      429,
      { retryAfterSeconds },
    );
  }

  // 2. Check 5 OTPs per hour limit
  const countLastHour = await prisma.otpCode.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (countLastHour >= 5) {
    throw new OtpError(
      'Too many verification requests. Please try again in an hour.',
      429,
      { retryAfterSeconds: 3600 },
    );
  }
}

/**
 * Create and persist a new hashed OTP code record for the user.
 */
export async function createAndSaveOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  // Ensure limits are respected
  await assertOtpRateLimits(userId, purpose);

  const plainOtp = generateOtp();
  const codeHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // Expire any existing unconsumed OTPs for this user and purpose
  await prisma.otpCode.updateMany({
    where: {
      userId,
      purpose,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(), // Invalidate older codes
    },
  });

  await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  return plainOtp;
}

/**
 * Verify an OTP in constant time, enforcing 5-attempt lockout and single-use consumption.
 */
export async function verifyOtpCode(
  userId: string,
  purpose: OtpPurpose,
  candidateOtp: string,
): Promise<void> {
  const trimmed = candidateOtp.trim();

  // Find latest active OTP for this user and purpose
  const record = await prisma.otpCode.findFirst({
    where: {
      userId,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new OtpError('Invalid or expired verification code.', 400);
  }

  // Check expiration
  if (record.expiresAt < new Date()) {
    throw new OtpError('Verification code has expired. Please request a new one.', 400);
  }

  // Check attempt lockout (max 5 wrong attempts)
  if (record.attempts >= 5) {
    throw new OtpError(
      'Too many failed attempts. This code has been invalidated. Please request a new one.',
      400,
      { attemptsLeft: 0 },
    );
  }

  const matches = constantTimeCompare(trimmed, record.codeHash);

  if (!matches) {
    const newAttempts = record.attempts + 1;
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: newAttempts },
    });

    const attemptsLeft = Math.max(0, 5 - newAttempts);
    if (attemptsLeft === 0) {
      throw new OtpError(
        'Incorrect code. Maximum attempts exceeded. This code has been invalidated.',
        400,
        { attemptsLeft: 0 },
      );
    }

    throw new OtpError(
      `Incorrect verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      400,
      { attemptsLeft },
    );
  }

  // Success: mark as consumed (single-use)
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

/**
 * Clean up expired and consumed OtpCode rows.
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otpCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } },
      ],
    },
  });
  return result.count;
}

/**
 * Start periodic background cleanup job (runs every 30 minutes).
 */
export function startOtpCleanupJob(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const count = await cleanupExpiredOtps();
      if (count > 0) {
        // Cleaned up expired rows
      }
    } catch {
      // Non-blocking
    }
  }, 30 * 60 * 1000);
}
