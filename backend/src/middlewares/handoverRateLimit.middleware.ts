/**
 * src/middlewares/handoverRateLimit.middleware.ts
 * Rate limiting for handover PIN verification endpoint per user and per rental.
 */

import { Request, Response, NextFunction } from 'express';
import { failure } from '../utils/response';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const userRateLimits = new Map<string, RateLimitRecord>();
const rentalRateLimits = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of userRateLimits.entries()) {
    if (record.resetAt <= now) userRateLimits.delete(key);
  }
  for (const [key, record] of rentalRateLimits.entries()) {
    if (record.resetAt <= now) rentalRateLimits.delete(key);
  }
}, 5 * 60 * 1000);

export function handoverVerifyRateLimiter(windowMs = 60000, maxRequests = 15) {
  const effectiveMax = process.env.NODE_ENV === 'test' ? 10000 : maxRequests;
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const rawId = req.params['id'];
    const rentalId = Array.isArray(rawId) ? rawId[0] : rawId;
    const now = Date.now();

    // Check user rate limit
    if (userId) {
      const userRecord = userRateLimits.get(userId);
      if (userRecord && userRecord.resetAt > now) {
        if (userRecord.count >= effectiveMax) {
          const retryAfterSeconds = Math.max(1, Math.ceil((userRecord.resetAt - now) / 1000));
          return failure(
            res,
            'Too many verification requests from this user. Please try again later.',
            429,
            undefined,
            { retryAfterSeconds },
          );
        }
        userRecord.count++;
      } else {
        userRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
      }
    }

    // Check rental rate limit
    if (rentalId) {
      const rentalRecord = rentalRateLimits.get(rentalId);
      if (rentalRecord && rentalRecord.resetAt > now) {
        if (rentalRecord.count >= maxRequests) {
          const retryAfterSeconds = Math.max(1, Math.ceil((rentalRecord.resetAt - now) / 1000));
          return failure(
            res,
            'Too many verification requests for this rental. Please try again later.',
            429,
            undefined,
            { retryAfterSeconds },
          );
        }
        rentalRecord.count++;
      } else {
        rentalRateLimits.set(rentalId, { count: 1, resetAt: now + windowMs });
      }
    }

    next();
  };
}
