/**
 * src/services/auth.service.ts
 * Business logic for authentication — registration, email verification, login,
 * password reset flows, and session management.
 */

import bcrypt from 'bcryptjs';
import { OtpPurpose } from '@prisma/client';
import prisma from '../prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import {
  createAndSaveOtp,
  verifyOtpCode,
  OtpError,
} from './otp.service';
import {
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
  sendPasswordChangedNotification,
} from './mail.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  otp: string;
}

export interface ResendOtpInput {
  email: string;
  purpose: OtpPurpose;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip passwordHash before returning user object to client */
export function sanitizeUser(user: { passwordHash: string; [key: string]: unknown }) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

function issueTokens(userId: string, email: string) {
  return {
    accessToken: signAccessToken({ userId, email }),
    refreshToken: signRefreshToken({ userId, email }),
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Register a user as unverified, create and send verification OTP.
 * Returns { email, requiresVerification: true } without access or refresh tokens.
 */
export async function registerUser(input: RegisterInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      phone: input.phone,
      passwordHash,
      emailVerified: false,
      emailVerifiedAt: null,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
    },
  });

  // Create verification OTP and send email
  const otp = await createAndSaveOtp(user.id, OtpPurpose.EMAIL_VERIFICATION);
  await sendEmailVerificationOtp(user.email, otp);

  return {
    email: user.email,
    requiresVerification: true,
  };
}

/**
 * Log in a user. If email is unverified, dispatches a fresh OTP (if cooldown allows)
 * and throws EMAIL_NOT_VERIFIED error.
 */
export async function loginUser(input: LoginInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.emailVerified) {
    // Attempt sending a fresh OTP if cooldown allows
    try {
      const otp = await createAndSaveOtp(user.id, OtpPurpose.EMAIL_VERIFICATION);
      await sendEmailVerificationOtp(user.email, otp);
    } catch {
      // Cooldown active or limit reached, non-blocking
    }

    const unverifiedErr = new Error('EMAIL_NOT_VERIFIED');
    throw unverifiedErr;
  }

  const tokens = issueTokens(user.id, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Verify email address with 6-digit OTP and return full login response.
 */
export async function verifyEmail(input: VerifyEmailInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    throw new OtpError('User not found or invalid email address.', 400);
  }

  // Validate OTP in constant time, checking attempts and expiration
  await verifyOtpCode(user.id, OtpPurpose.EMAIL_VERIFICATION, input.otp);

  // Mark user as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const tokens = issueTokens(updatedUser.id, updatedUser.email);
  return { user: sanitizeUser(updatedUser), ...tokens };
}

/**
 * Resend OTP code respecting cooldown and hourly limit.
 * Always returns generic message so existence cannot be probed.
 */
export async function resendOtp(input: ResendOtpInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Generic success message to prevent user enumeration
  const genericResponse = {
    message: 'If an account exists, a verification code has been sent.',
  };

  if (!user) {
    return genericResponse;
  }

  // If already verified and purpose is email verification, no need to send
  if (input.purpose === OtpPurpose.EMAIL_VERIFICATION && user.emailVerified) {
    return genericResponse;
  }

  // Generate new OTP and send (assertOtpRateLimits throws 429 if cooldown/limit violated)
  const otp = await createAndSaveOtp(user.id, input.purpose);

  if (input.purpose === OtpPurpose.EMAIL_VERIFICATION) {
    await sendEmailVerificationOtp(user.email, otp);
  } else {
    await sendPasswordResetOtp(user.email, otp);
  }

  return genericResponse;
}

/**
 * Request password reset OTP. Always returns generic success response.
 * Sends OTP only if a verified account exists.
 */
export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  const genericResponse = {
    message: 'If an account exists with this email, a password reset code has been sent.',
  };

  if (!user || !user.emailVerified) {
    return genericResponse;
  }

  try {
    const otp = await createAndSaveOtp(user.id, OtpPurpose.PASSWORD_RESET);
    await sendPasswordResetOtp(user.email, otp);
  } catch (err: unknown) {
    // If rate limit / cooldown is triggered, we still return generic 200 to prevent account probing
    // while rate limiting per IP on the endpoint level protects from DDoS.
    if (err instanceof OtpError && err.statusCode === 429) {
      throw err; // Let IP/cooldown 429 bubble if explicitly throttled
    }
  }

  return genericResponse;
}

/**
 * Reset password with verified OTP, update password hash, consume OTP,
 * and dispatch "password changed" notification email.
 */
export async function resetPassword(input: ResetPasswordInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    throw new OtpError('Invalid or expired reset code.', 400);
  }

  // Validate reset OTP
  await verifyOtpCode(user.id, OtpPurpose.PASSWORD_RESET, input.otp);

  // Hash new password and update user
  const newHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Send password changed notification email asynchronously
  sendPasswordChangedNotification(user.email).catch(() => {});

  return {
    message: 'Password has been reset successfully. You can now log in with your new password.',
  };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const tokens = issueTokens(user.id, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return sanitizeUser(user);
}
