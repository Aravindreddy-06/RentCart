/**
 * src/utils/response.ts
 * Consistent JSON response helpers used across all controllers.
 */

import { Response } from 'express';

/** Send a successful response with optional data. */
export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

/** Send an error response. */
export function failure(res: Response, message: string, statusCode = 400, errors?: unknown) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}
