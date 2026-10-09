/**
 * src/middlewares/error.middleware.ts
 * Centralized error handler — must be registered LAST in the Express pipeline.
 */

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[ERROR]', err.stack ?? err.message);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
