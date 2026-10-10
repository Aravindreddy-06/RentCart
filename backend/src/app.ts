/**
 * src/app.ts
 * Express application factory — creates and configures the app without starting it.
 * This separation makes the app easy to test.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import itemsRoutes from './routes/items.routes';
import uploadsRoutes from './routes/uploads.routes';
import rentalsRoutes from './routes/rentals.routes';
import usersRoutes from './routes/users.routes';
import { errorHandler } from './middlewares/error.middleware';

export function createApp() {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  // Allow images to be served from /uploads without CSP interference
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── CORS — allow configured origins ──────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (env.CLIENT_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Static file serving — uploaded images ─────────────────────────────────
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  // ── Feature routes ────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/items', itemsRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/rentals', rentalsRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ── Centralized error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}
