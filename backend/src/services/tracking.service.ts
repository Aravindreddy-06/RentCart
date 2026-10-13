/**
 * src/services/tracking.service.ts
 * Business logic for live location tracking, notifications, auto-stop, and cleanup.
 */

import prisma from '../prisma/client';
import { NotificationType } from '@prisma/client';
import { createNotification } from './notifications.service';
import {
  emitTrackingStarted,
  emitTrackingStopped,
  emitTrackingArrived,
} from '../socket';
import { calculateEtaMinutes } from '../utils/geo';

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface StartTrackingInput {
  latitude?: number;
  longitude?: number;
  heading?: number | null;
}

export async function startTracking(
  rentalId: string,
  borrowerId: string,
  input?: StartTrackingInput,
) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true, liveLocation: true },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  if (rental.borrowerId !== borrowerId) {
    throw new ForbiddenError('Only the borrower can start live location tracking');
  }

  if (rental.status !== 'APPROVED') {
    throw new ValidationError(
      `Live tracking can only be started when the rental is APPROVED. Current status: ${rental.status}`,
    );
  }

  const isNewSession = !rental.liveLocation;

  const lat =
    typeof input?.latitude === 'number'
      ? input.latitude
      : rental.pickupLatitude ?? 0;
  const lng =
    typeof input?.longitude === 'number'
      ? input.longitude
      : rental.pickupLongitude ?? 0;
  const heading =
    typeof input?.heading === 'number' ? input.heading : null;

  const liveLocation = await prisma.liveLocation.upsert({
    where: { rentalId },
    update: {
      latitude: lat,
      longitude: lng,
      heading,
      updatedAt: new Date(),
    },
    create: {
      rentalId,
      userId: borrowerId,
      latitude: lat,
      longitude: lng,
      heading,
      startedAt: new Date(),
    },
  });

  // Only notify owner once per tracking session to prevent spam
  if (isNewSession) {
    try {
      await createNotification(
        rental.item.ownerId,
        NotificationType.BORROWER_ON_THE_WAY,
        'Borrower On The Way',
        `The borrower is on the way to pick up "${rental.item.title}".`,
        { rentalId: rental.id, itemId: rental.itemId },
        borrowerId,
      );
    } catch (notifErr) {
      console.error('Failed to send BORROWER_ON_THE_WAY notification:', notifErr);
    }
  }

  emitTrackingStarted(rental.item.ownerId, {
    rentalId,
    startedAt: liveLocation.startedAt.toISOString(),
  });

  let etaMinutes: number | null = null;
  if (
    rental.pickupLatitude !== null &&
    rental.pickupLatitude !== undefined &&
    rental.pickupLongitude !== null &&
    rental.pickupLongitude !== undefined
  ) {
    etaMinutes = calculateEtaMinutes(
      liveLocation.latitude,
      liveLocation.longitude,
      rental.pickupLatitude,
      rental.pickupLongitude,
    );
  }

  return {
    isSharing: true,
    location: {
      latitude: liveLocation.latitude,
      longitude: liveLocation.longitude,
      heading: liveLocation.heading,
    },
    startedAt: liveLocation.startedAt.toISOString(),
    updatedAt: liveLocation.updatedAt.toISOString(),
    etaMinutes,
  };
}

export async function stopTracking(rentalId: string, borrowerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true, liveLocation: true },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  if (rental.borrowerId !== borrowerId) {
    throw new ForbiddenError('Only the borrower can stop live location sharing');
  }

  if (rental.liveLocation) {
    await prisma.liveLocation.delete({
      where: { rentalId },
    });
  }

  emitTrackingStopped(rental.item.ownerId, {
    rentalId,
    reason: 'borrower_stopped',
  });

  return { success: true, message: 'Tracking stopped' };
}

export async function markArrived(rentalId: string, borrowerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true, liveLocation: true },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  if (rental.borrowerId !== borrowerId) {
    throw new ForbiddenError('Only the borrower can mark arrival');
  }

  if (rental.liveLocation) {
    await prisma.liveLocation.delete({
      where: { rentalId },
    });
  }

  try {
    await createNotification(
      rental.item.ownerId,
      NotificationType.BORROWER_ARRIVED,
      'Borrower Arrived',
      `The borrower has arrived to pick up "${rental.item.title}".`,
      { rentalId: rental.id, itemId: rental.itemId },
      borrowerId,
    );
  } catch (notifErr) {
    console.error('Failed to send BORROWER_ARRIVED notification:', notifErr);
  }

  const arrivedAt = new Date().toISOString();
  emitTrackingArrived(rental.item.ownerId, {
    rentalId,
    arrivedAt,
  });

  emitTrackingStopped(rental.item.ownerId, {
    rentalId,
    reason: 'arrived',
  });

  return { success: true, message: 'Arrived at pickup point' };
}

export async function getTracking(rentalId: string, ownerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true, liveLocation: true },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  if (rental.item.ownerId !== ownerId) {
    throw new ForbiddenError('Only the item owner can view live tracking');
  }

  if (!rental.liveLocation) {
    return {
      isSharing: false,
      location: null,
      startedAt: null,
      updatedAt: null,
      etaMinutes: null,
    };
  }

  let etaMinutes: number | null = null;
  if (
    rental.pickupLatitude !== null &&
    rental.pickupLatitude !== undefined &&
    rental.pickupLongitude !== null &&
    rental.pickupLongitude !== undefined
  ) {
    etaMinutes = calculateEtaMinutes(
      rental.liveLocation.latitude,
      rental.liveLocation.longitude,
      rental.pickupLatitude,
      rental.pickupLongitude,
    );
  }

  return {
    isSharing: true,
    location: {
      latitude: rental.liveLocation.latitude,
      longitude: rental.liveLocation.longitude,
      heading: rental.liveLocation.heading,
    },
    startedAt: rental.liveLocation.startedAt.toISOString(),
    updatedAt: rental.liveLocation.updatedAt.toISOString(),
    etaMinutes,
  };
}

/**
 * Auto-stops tracking when rental status changes away from APPROVED.
 */
export async function stopTrackingOnStatusChange(rentalId: string, newStatus: string) {
  try {
    const liveLoc = await prisma.liveLocation.findUnique({
      where: { rentalId },
      include: { rental: { include: { item: true } } },
    });

    if (liveLoc) {
      await prisma.liveLocation.delete({
        where: { rentalId },
      });
      emitTrackingStopped(liveLoc.rental.item.ownerId, {
        rentalId,
        reason: `status_changed_${newStatus.toLowerCase()}`,
      });
    }
  } catch (err) {
    console.error('Error stopping tracking on status change:', err);
  }
}

/**
 * Periodic cleanup job: deletes liveLocation rows if:
 * - No update for 5 minutes (updatedAt < now - 5min)
 * - 2 hours pass (startedAt < now - 2hours)
 * - Rental is no longer APPROVED
 */
export function startTrackingCleanupJob(intervalMs = 30000) {
  setInterval(async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const staleLocations = await prisma.liveLocation.findMany({
        where: {
          OR: [
            { updatedAt: { lt: fiveMinutesAgo } },
            { startedAt: { lt: twoHoursAgo } },
            { rental: { status: { not: 'APPROVED' } } },
          ],
        },
        include: { rental: { include: { item: true } } },
      });

      for (const loc of staleLocations) {
        await prisma.liveLocation.delete({ where: { id: loc.id } }).catch(() => {});
        emitTrackingStopped(loc.rental.item.ownerId, {
          rentalId: loc.rentalId,
          reason: 'timeout_or_status',
        });
      }
    } catch (err) {
      console.error('Error running tracking cleanup job:', err);
    }
  }, intervalMs);
}
