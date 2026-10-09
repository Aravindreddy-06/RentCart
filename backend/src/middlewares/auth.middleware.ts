/**
 * src/middlewares/auth.middleware.ts
 * Express middleware that validates the JWT Bearer token and
 * attaches the decoded payload to req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { failure } from '../utils/response';

// Extend Express Request so TypeScript knows about req.user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    failure(res, 'Unauthorized — no token provided', 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    failure(res, 'Unauthorized — invalid or expired token', 401);
  }
}
