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

export const env = {
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173').split(','),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
