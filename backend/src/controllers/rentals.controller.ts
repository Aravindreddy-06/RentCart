/**
 * src/controllers/rentals.controller.ts
 * Route handlers for rental requests and lifecycle actions.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RentalStatus } from '@prisma/client';
import * as rentalsService from '../services/rentals.service';
import { success, failure } from '../utils/response';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateRentalSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'End date must be in YYYY-MM-DD format'),
  borrowerNote: z.string().max(500, 'Note must not exceed 500 characters').optional(),
});

const RejectRentalSchema = z.object({
  ownerNote: z.string().max(500, 'Note must not exceed 500 characters').optional(),
});

function getParamId(req: Request): string {
  const id = req.params['id'];
  return Array.isArray(id) ? id[0] : id;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (
    err instanceof rentalsService.ValidationError ||
    err instanceof rentalsService.ForbiddenError ||
    err instanceof rentalsService.NotFoundError ||
    err instanceof rentalsService.ConflictError
  ) {
    return failure(res, err.message, err.statusCode);
  }
  next(err);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function createRental(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateRentalSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const rental = await rentalsService.createRental({
      ...parsed.data,
      borrowerId: req.user!.userId,
    });

    return success(res, rental, 201);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getMyRentals(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query;

    const validStatus =
      typeof status === 'string' && Object.values(RentalStatus).includes(status as RentalStatus)
        ? (status as RentalStatus)
        : undefined;

    const result = await rentalsService.getBorrowerRentals(req.user!.userId, {
      status: validStatus,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getIncomingRentals(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query;

    const validStatus =
      typeof status === 'string' && Object.values(RentalStatus).includes(status as RentalStatus)
        ? (status as RentalStatus)
        : undefined;

    const result = await rentalsService.getIncomingRentals(req.user!.userId, {
      status: validStatus,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getRental(req: Request, res: Response, next: NextFunction) {
  try {
    const rental = await rentalsService.getRentalById(getParamId(req), req.user!.userId);
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function approveRental(req: Request, res: Response, next: NextFunction) {
  try {
    const rental = await rentalsService.approveRental(getParamId(req), req.user!.userId);
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function rejectRental(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RejectRentalSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const rental = await rentalsService.rejectRental(
      getParamId(req),
      req.user!.userId,
      parsed.data.ownerNote,
    );
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function cancelRental(req: Request, res: Response, next: NextFunction) {
  try {
    const rental = await rentalsService.cancelRental(getParamId(req), req.user!.userId);
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function activateRental(req: Request, res: Response, next: NextFunction) {
  try {
    const rental = await rentalsService.activateRental(getParamId(req), req.user!.userId);
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function returnRental(req: Request, res: Response, next: NextFunction) {
  try {
    const rental = await rentalsService.returnRental(getParamId(req), req.user!.userId);
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
