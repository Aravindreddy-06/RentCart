/**
 * src/controllers/rentals.controller.ts
 * Route handlers for rental requests and lifecycle actions.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RentalStatus } from '@prisma/client';
import * as rentalsService from '../services/rentals.service';
import * as trackingService from '../services/tracking.service';
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

const ApproveRentalSchema = z
  .object({
    pickupLatitude: z.number().min(-90).max(90).optional().nullable(),
    pickupLongitude: z.number().min(-180).max(180).optional().nullable(),
    pickupAddress: z.string().trim().min(1).optional().nullable(),
    pickupNote: z.string().max(200, 'Note must not exceed 200 characters').optional().nullable(),
    pickupTimeFrom: z.string().optional().nullable(),
    pickupTimeTo: z.string().optional().nullable(),
  })
  .optional();

const UpdatePickupSchema = z.object({
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1, 'Pickup address is required'),
  pickupNote: z.string().max(200, 'Note must not exceed 200 characters').optional().nullable(),
  pickupTimeFrom: z.string().optional().nullable(),
  pickupTimeTo: z.string().optional().nullable(),
});

const StartTrackingSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    heading: z.number().optional().nullable(),
  })
  .optional();

const VerifyHandoverPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be a 4-digit numeric code'),
});

function getParamId(req: Request): string {
  const id = req.params['id'];
  return Array.isArray(id) ? id[0] : id;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof rentalsService.DuplicateRentalError) {
    return failure(res, err.message, 409, undefined, {
      code: err.code,
      existingRentalId: err.existingRentalId,
      existingStatus: err.existingStatus,
    });
  }
  if (err instanceof rentalsService.RequestCooldownError) {
    res.set('Retry-After', String(err.retryAfterSeconds));
    return failure(res, err.message, 429, undefined, {
      code: err.code,
      canRequestAt: err.canRequestAt,
      retryAfterSeconds: err.retryAfterSeconds,
    });
  }
  if (err instanceof rentalsService.LockedError) {
    return failure(res, err.message, 429, undefined, { retryAfterSeconds: err.retryAfterSeconds });
  }
  if (err instanceof rentalsService.WrongPinError) {
    return failure(res, err.message, 400, undefined, { attemptsLeft: err.attemptsLeft });
  }
  if (
    err instanceof rentalsService.ValidationError ||
    err instanceof rentalsService.ForbiddenError ||
    err instanceof rentalsService.NotFoundError ||
    err instanceof rentalsService.ConflictError ||
    err instanceof trackingService.ValidationError ||
    err instanceof trackingService.ForbiddenError ||
    err instanceof trackingService.NotFoundError
  ) {
    return failure(res, (err as any).message, (err as any).statusCode);
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
    const parsed = ApproveRentalSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const rental = await rentalsService.approveRental(
      getParamId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updatePickup(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = UpdatePickupSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const rental = await rentalsService.updatePickupPoint(
      getParamId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getPickup(req: Request, res: Response, next: NextFunction) {
  try {
    const pickup = await rentalsService.getPickupPoint(getParamId(req), req.user!.userId);
    return success(res, pickup);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function startTracking(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = StartTrackingSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await trackingService.startTracking(
      getParamId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function stopTracking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await trackingService.stopTracking(getParamId(req), req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markArrived(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await trackingService.markArrived(getParamId(req), req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getTracking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await trackingService.getTracking(getParamId(req), req.user!.userId);
    return success(res, result);
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
    const confirmWithoutPin = req.body?.confirmWithoutPin === true;
    if (!confirmWithoutPin) {
      return failure(
        res,
        'Confirmation required: pass confirmWithoutPin: true to activate without a PIN',
        400,
      );
    }
    const rental = await rentalsService.activateRental(
      getParamId(req),
      req.user!.userId,
      confirmWithoutPin,
    );
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

export async function getHandoverPin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await rentalsService.getHandoverPin(getParamId(req), req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function verifyHandover(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = VerifyHandoverPinSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'PIN must be a 4-digit numeric code', 400, parsed.error.flatten().fieldErrors);
    }

    const rental = await rentalsService.verifyHandoverPin(
      getParamId(req),
      req.user!.userId,
      parsed.data.pin,
    );
    return success(res, rental);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
