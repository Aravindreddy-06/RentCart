/**
 * src/config/env.ts
 * Loads and validates all environment variables at startup.
 * The app will crash early if required vars are missing.
 */

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

const parseMailProvider = (): 'brevo' | 'smtp' => {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (nodeEnv === 'production') {
    if (!provider || (provider !== 'brevo' && provider !== 'smtp')) {
      throw new Error(
        'Missing or invalid required environment variable: MAIL_PROVIDER. Must be "brevo" or "smtp" when NODE_ENV=production.',
      );
    }
    return provider;
  }
  return provider === 'brevo' ? 'brevo' : 'smtp';
};

export const env = {
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173').split(','),
  NODE_ENV: nodeEnv,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  CLOUDINARY_CLOUD_NAME: requireEnv('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: requireEnv('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: requireEnv('CLOUDINARY_API_SECRET'),
  MAIL_PROVIDER: parseMailProvider(),
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL,
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME ?? 'RentCart',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM ?? 'RentCart <noreply@rentcart.app>',
  HANDOVER_PIN_SECRET:
    process.env.HANDOVER_PIN_SECRET || 'rentcart-super-secret-handover-pin-secret-key-32b',
  HANDOVER_PIN_ENC_KEY:
    process.env.HANDOVER_PIN_ENC_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  REQUIRE_RETURN_PIN: process.env.REQUIRE_RETURN_PIN === 'true',
  requireReturnPin: process.env.REQUIRE_RETURN_PIN === 'true',
  REJECTED_COOLDOWN_HOURS: process.env.REJECTED_COOLDOWN_HOURS
    ? parseFloat(process.env.REJECTED_COOLDOWN_HOURS)
    : 24,
  CANCELLED_COOLDOWN_MINUTES: process.env.CANCELLED_COOLDOWN_MINUTES
    ? parseFloat(process.env.CANCELLED_COOLDOWN_MINUTES)
    : 10,
} as const;
