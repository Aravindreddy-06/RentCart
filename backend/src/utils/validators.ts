/**
 * src/utils/validators.ts
 * Shared Zod validation schemas for auth credentials.
 */

import { z } from 'zod';

/**
 * Standard password schema:
 * - Minimum 8 characters
 * - At least one letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Normalized email schema:
 * - Valid email format
 * - Trimmed and lowercased
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((val) => val.trim().toLowerCase());

/**
 * 6-digit OTP schema
 */
export const otpSchema = z
  .string()
  .length(6, 'Verification code must be 6 digits')
  .regex(/^\d{6}$/, 'Verification code must contain only numbers');
