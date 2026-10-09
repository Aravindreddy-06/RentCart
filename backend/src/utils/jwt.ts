/**
 * src/utils/jwt.ts
 * Helpers for signing and verifying access + refresh tokens.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
}

/** Sign a short-lived access token (15 minutes). */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

/** Sign a long-lived refresh token (7 days). */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/** Verify an access token and return the payload, or throw on failure. */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

/** Verify a refresh token and return the payload, or throw on failure. */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
