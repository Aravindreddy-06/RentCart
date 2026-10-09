/**
 * src/controllers/auth.controller.ts
 * Express route handlers for all auth endpoints.
 * Controllers are thin — they validate input and delegate to the service layer.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { success, failure } from '../utils/response';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.registerUser(parsed.data);
    return success(res, result, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      return failure(res, 'An account with that email already exists', 409);
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.loginUser(parsed.data);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      return failure(res, 'Invalid email or password', 401);
    }
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Refresh token is required', 400);
    }

    const result = await authService.refreshTokens(parsed.data.refreshToken);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return failure(res, 'Invalid or expired refresh token', 401);
    }
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    return success(res, { user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return failure(res, 'User not found', 404);
    }
    next(err);
  }
}
