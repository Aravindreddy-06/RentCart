/**
 * src/services/auth.service.ts
 * Business logic for authentication — registration, login, token refresh, and profile fetch.
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip the passwordHash before sending the user object to the client. */
function sanitizeUser(user: { passwordHash: string; [key: string]: unknown }) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function registerUser(input: RegisterInput) {
  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.email)}`,
    },
  });

  const tokens = issueTokens(user.id, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const tokens = issueTokens(user.id, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken); // throws if invalid/expired

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

// ─── Private helpers ──────────────────────────────────────────────────────────

function issueTokens(userId: string, email: string) {
  return {
    accessToken: signAccessToken({ userId, email }),
    refreshToken: signRefreshToken({ userId, email }),
  };
}
