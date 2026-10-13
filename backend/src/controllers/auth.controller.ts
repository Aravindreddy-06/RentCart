/**
 * src/controllers/auth.controller.ts
 * Express route handlers for authentication endpoints:
 * register, login, email verification, resend OTP, forgot password, reset password, refresh, and profile.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { OtpError } from '../services/otp.service';
import { success, failure } from '../utils/response';
import { passwordSchema, emailSchema, otpSchema } from '../utils/validators';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  phone: z.string().optional(),
  password: passwordSchema,
});

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const VerifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

const ResendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']),
});

const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

const ResetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
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
    if (err instanceof OtpError) {
      return failure(res, err.message, err.statusCode, undefined, {
        retryAfterSeconds: err.retryAfterSeconds,
      });
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
    if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
      return failure(
        res,
        'Please verify your email address to log in.',
        403,
        undefined,
        { code: 'EMAIL_NOT_VERIFIED' },
      );
    }
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      return failure(res, 'Invalid email or password', 401);
    }
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = VerifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.verifyEmail(parsed.data);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof OtpError) {
      return failure(res, err.message, err.statusCode, undefined, {
        attemptsLeft: err.attemptsLeft,
        retryAfterSeconds: err.retryAfterSeconds,
      });
    }
    next(err);
  }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ResendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.resendOtp(parsed.data);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof OtpError) {
      return failure(res, err.message, err.statusCode, undefined, {
        retryAfterSeconds: err.retryAfterSeconds,
      });
    }
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.forgotPassword(parsed.data.email);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof OtpError) {
      return failure(res, err.message, err.statusCode, undefined, {
        retryAfterSeconds: err.retryAfterSeconds,
      });
    }
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await authService.resetPassword(parsed.data);
    return success(res, result);
  } catch (err: unknown) {
    if (err instanceof OtpError) {
      return failure(res, err.message, err.statusCode, undefined, {
        attemptsLeft: err.attemptsLeft,
        retryAfterSeconds: err.retryAfterSeconds,
      });
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
