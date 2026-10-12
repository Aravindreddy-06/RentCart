/**
 * src/controllers/reviews.controller.ts
 * Express route handlers for reviews & ratings.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as reviewsService from '../services/reviews.service';
import { success, failure } from '../utils/response';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateReviewSchema = z.object({
  rentalId: z.string().uuid('Invalid rental ID'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .max(500, 'Comment must not exceed 500 characters')
    .optional()
    .nullable(),
});

const UpdateReviewSchema = z
  .object({
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5')
      .optional(),
    comment: z
      .string()
      .max(500, 'Comment must not exceed 500 characters')
      .optional()
      .nullable(),
  })
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: 'At least one of rating or comment must be provided',
  });

function getParamId(req: Request, paramName = 'id'): string {
  const id = req.params[paramName];
  return Array.isArray(id) ? id[0] : id;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (
    err instanceof reviewsService.ValidationError ||
    err instanceof reviewsService.ForbiddenError ||
    err instanceof reviewsService.NotFoundError ||
    err instanceof reviewsService.ConflictError
  ) {
    return failure(res, err.message, err.statusCode);
  }
  next(err);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const review = await reviewsService.createReview({
      ...parsed.data,
      authorId: req.user!.userId,
    });

    return success(res, review, 201);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateReview(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = UpdateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const review = await reviewsService.updateReview(
      getParamId(req),
      req.user!.userId,
      parsed.data,
    );

    return success(res, review);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reviewsService.deleteReview(getParamId(req), req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getItemReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query;
    const result = await reviewsService.getItemReviews(getParamId(req), {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getUserReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query;
    const result = await reviewsService.getUserReviews(getParamId(req), {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getRentalReviewStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reviewsService.getRentalReviewStatus(getParamId(req), req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
