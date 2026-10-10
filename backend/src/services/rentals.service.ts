/**
 * src/services/rentals.service.ts
 * Business logic for the rental request lifecycle, transitions,
 * double-booking prevention, phone privacy, and queries.
 */

import prisma from '../prisma/client';
import { Prisma, RentalStatus, NotificationType } from '@prisma/client';
import { createNotification } from './notifications.service';

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

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// ─── Include definitions ──────────────────────────────────────────────────────

const rentalInclude = {
  item: {
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      images: true,
      pricePerDay: true,
      deposit: true,
      isAvailable: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          address: true,
          phone: true,
        },
      },
    },
  },
  borrower: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      address: true,
      phone: true,
    },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseDateOnly(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Filter phone numbers according to privacy rules:
 * Only show owner phone to borrower (and borrower phone to owner)
 * when the rental status is APPROVED or ACTIVE.
 */
export function sanitizeRentalForUser(rental: any, currentUserId: string) {
  if (!rental) return rental;
  const isBorrower = rental.borrowerId === currentUserId;
  const isOwner = rental.item?.ownerId === currentUserId;
  const canSeePhone = rental.status === 'APPROVED' || rental.status === 'ACTIVE';

  const sanitized = {
    ...rental,
    startDate: rental.startDate instanceof Date ? formatDateOnly(rental.startDate) : rental.startDate,
    endDate: rental.endDate instanceof Date ? formatDateOnly(rental.endDate) : rental.endDate,
  };

  if (sanitized.borrower) {
    sanitized.borrower = {
      id: sanitized.borrower.id,
      name: sanitized.borrower.name,
      avatarUrl: sanitized.borrower.avatarUrl,
      address: sanitized.borrower.address,
      phone: isOwner && canSeePhone ? sanitized.borrower.phone : null,
    };
  }

  if (sanitized.item?.owner) {
    sanitized.item = {
      ...sanitized.item,
      owner: {
        id: sanitized.item.owner.id,
        name: sanitized.item.owner.name,
        avatarUrl: sanitized.item.owner.avatarUrl,
        address: sanitized.item.owner.address,
        phone: isBorrower && canSeePhone ? sanitized.item.owner.phone : null,
      },
    };
  }

  return sanitized;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export interface CreateRentalInput {
  borrowerId: string;
  itemId: string;
  startDate: string;
  endDate: string;
  borrowerNote?: string;
}

export async function createRental(input: CreateRentalInput) {
  const start = parseDateOnly(input.startDate);
  const end = parseDateOnly(input.endDate);

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (start < todayUtc) {
    throw new ValidationError('Start date cannot be in the past');
  }

  if (end < start) {
    throw new ValidationError('End date must be on or after start date');
  }

  const item = await prisma.item.findUnique({
    where: { id: input.itemId },
    include: { owner: true },
  });

  if (!item) {
    throw new NotFoundError('Item not found');
  }

  if (!item.isAvailable) {
    throw new ValidationError('Item is currently not available for rent');
  }

  if (item.ownerId === input.borrowerId) {
    throw new ValidationError('You cannot rent your own item');
  }

  // Calculate inclusive rental days: 1 day minimum
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const days = Math.max(1, diffDays);
  const totalPrice = Number((days * item.pricePerDay).toFixed(2));
  const depositAmount = item.deposit;

  const rental = await prisma.rental.create({
    data: {
      itemId: input.itemId,
      borrowerId: input.borrowerId,
      startDate: start,
      endDate: end,
      totalPrice,
      depositAmount,
      borrowerNote: input.borrowerNote?.trim() || null,
      status: RentalStatus.PENDING,
    },
    include: rentalInclude,
  });

  try {
    await createNotification(
      item.ownerId,
      NotificationType.RENTAL_REQUESTED,
      'Rental Requested',
      `${rental.borrower.name} requested to rent "${item.title}".`,
      { rentalId: rental.id, itemId: item.id },
      input.borrowerId,
    );
  } catch (notifErr) {
    console.error('Failed to create rental requested notification:', notifErr);
  }

  return sanitizeRentalForUser(rental, input.borrowerId);
}

export interface RentalsQuery {
  status?: RentalStatus;
  page?: number;
  limit?: number;
}

export async function getBorrowerRentals(borrowerId: string, query: RentalsQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.RentalWhereInput = {
    borrowerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: rentalInclude,
    }),
    prisma.rental.count({ where }),
  ]);

  return {
    rentals: rentals.map((r) => sanitizeRentalForUser(r, borrowerId)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getIncomingRentals(ownerId: string, query: RentalsQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.RentalWhereInput = {
    item: { ownerId },
    ...(query.status ? { status: query.status } : {}),
  };

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: rentalInclude,
    }),
    prisma.rental.count({ where }),
  ]);

  return {
    rentals: rentals.map((r) => sanitizeRentalForUser(r, ownerId)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRentalById(rentalId: string, currentUserId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: rentalInclude,
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  const isBorrower = rental.borrowerId === currentUserId;
  const isOwner = rental.item.ownerId === currentUserId;

  if (!isBorrower && !isOwner) {
    throw new ForbiddenError('You do not have permission to view this rental');
  }

  return sanitizeRentalForUser(rental, currentUserId);
}

export async function approveRental(rentalId: string, ownerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true },
  });

  if (!rental) throw new NotFoundError('Rental not found');
  if (rental.item.ownerId !== ownerId) {
    throw new ForbiddenError('Only the item owner can approve this request');
  }

  if (rental.status !== RentalStatus.PENDING) {
    throw new ValidationError(
      `Cannot approve a rental with status ${rental.status}. Only PENDING requests can be approved.`,
    );
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        // Explicit row lock on item to serialize concurrent approval attempts
        await tx.$queryRaw`SELECT id FROM items WHERE id = ${rental.itemId} FOR UPDATE`;

        // Check for conflicting APPROVED or ACTIVE rentals for the same item
        const conflict = await tx.rental.findFirst({
          where: {
            itemId: rental.itemId,
            id: { not: rental.id },
            status: { in: [RentalStatus.APPROVED, RentalStatus.ACTIVE] },
            startDate: { lte: rental.endDate },
            endDate: { gte: rental.startDate },
          },
        });

        if (conflict) {
          throw new ConflictError('Dates conflict with an existing approved or active rental');
        }

        return tx.rental.update({
          where: { id: rental.id },
          data: { status: RentalStatus.APPROVED },
          include: rentalInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    try {
      await createNotification(
        updated.borrowerId,
        NotificationType.RENTAL_APPROVED,
        'Rental Approved',
        `Your request to rent "${updated.item.title}" was approved!`,
        { rentalId: updated.id, itemId: updated.itemId },
        ownerId,
      );
    } catch (notifErr) {
      console.error('Failed to create rental approved notification:', notifErr);
    }

    return sanitizeRentalForUser(updated, ownerId);
  } catch (err: any) {
    if (err instanceof ConflictError) throw err;
    if (
      err.code === 'P2002' ||
      err.message?.includes('no_overlapping_approved_or_active_rentals') ||
      err.message?.includes('23P01')
    ) {
      throw new ConflictError('Dates conflict with an existing approved or active rental');
    }
    throw err;
  }
}

export async function rejectRental(rentalId: string, ownerId: string, ownerNote?: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true },
  });

  if (!rental) throw new NotFoundError('Rental not found');
  if (rental.item.ownerId !== ownerId) {
    throw new ForbiddenError('Only the item owner can reject this request');
  }

  if (rental.status !== RentalStatus.PENDING) {
    throw new ValidationError(
      `Cannot reject a rental with status ${rental.status}. Only PENDING requests can be rejected.`,
    );
  }

  const updated = await prisma.rental.update({
    where: { id: rental.id },
    data: {
      status: RentalStatus.REJECTED,
      ownerNote: ownerNote?.trim() || null,
    },
    include: rentalInclude,
  });

  try {
    const noteText = ownerNote?.trim() ? `: "${ownerNote.trim()}"` : '.';
    await createNotification(
      updated.borrowerId,
      NotificationType.RENTAL_REJECTED,
      'Rental Rejected',
      `Your request to rent "${updated.item.title}" was declined${noteText}`,
      { rentalId: updated.id, itemId: updated.itemId },
      ownerId,
    );
  } catch (notifErr) {
    console.error('Failed to create rental rejected notification:', notifErr);
  }

  return sanitizeRentalForUser(updated, ownerId);
}

export async function cancelRental(rentalId: string, borrowerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true },
  });

  if (!rental) throw new NotFoundError('Rental not found');
  if (rental.borrowerId !== borrowerId) {
    throw new ForbiddenError('Only the borrower can cancel this request');
  }

  if (rental.status !== RentalStatus.PENDING && rental.status !== RentalStatus.APPROVED) {
    throw new ValidationError(
      `Cannot cancel a rental with status ${rental.status}. Only PENDING or APPROVED rentals can be cancelled.`,
    );
  }

  const updated = await prisma.rental.update({
    where: { id: rental.id },
    data: { status: RentalStatus.CANCELLED },
    include: rentalInclude,
  });

  try {
    await createNotification(
      updated.item.ownerId,
      NotificationType.RENTAL_CANCELLED,
      'Rental Cancelled',
      `Rental request for "${updated.item.title}" was cancelled by the borrower.`,
      { rentalId: updated.id, itemId: updated.itemId },
      borrowerId,
    );
  } catch (notifErr) {
    console.error('Failed to create rental cancelled notification:', notifErr);
  }

  return sanitizeRentalForUser(updated, borrowerId);
}

export async function activateRental(rentalId: string, ownerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true },
  });

  if (!rental) throw new NotFoundError('Rental not found');
  if (rental.item.ownerId !== ownerId) {
    throw new ForbiddenError('Only the item owner can mark this rental as active');
  }

  if (rental.status !== RentalStatus.APPROVED) {
    throw new ValidationError(
      `Cannot activate a rental with status ${rental.status}. Rental must be APPROVED first.`,
    );
  }

  const updated = await prisma.rental.update({
    where: { id: rental.id },
    data: { status: RentalStatus.ACTIVE },
    include: rentalInclude,
  });

  try {
    await createNotification(
      updated.borrowerId,
      NotificationType.RENTAL_ACTIVATED,
      'Rental Active',
      `Your rental of "${updated.item.title}" is now active.`,
      { rentalId: updated.id, itemId: updated.itemId },
      ownerId,
    );
  } catch (notifErr) {
    console.error('Failed to create rental activated notification:', notifErr);
  }

  return sanitizeRentalForUser(updated, ownerId);
}

export async function returnRental(rentalId: string, ownerId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true },
  });

  if (!rental) throw new NotFoundError('Rental not found');
  if (rental.item.ownerId !== ownerId) {
    throw new ForbiddenError('Only the item owner can mark this rental as returned');
  }

  if (rental.status !== RentalStatus.ACTIVE) {
    throw new ValidationError(
      `Cannot return a rental with status ${rental.status}. Rental must be ACTIVE first.`,
    );
  }

  const updated = await prisma.rental.update({
    where: { id: rental.id },
    data: { status: RentalStatus.RETURNED },
    include: rentalInclude,
  });

  try {
    await createNotification(
      updated.borrowerId,
      NotificationType.RENTAL_RETURNED,
      'Rental Returned',
      `Your rental of "${updated.item.title}" was marked as returned.`,
      { rentalId: updated.id, itemId: updated.itemId },
      ownerId,
    );
  } catch (notifErr) {
    console.error('Failed to create rental returned notification:', notifErr);
  }

  return sanitizeRentalForUser(updated, ownerId);
}

export async function getBookedDates(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError('Item not found');

  const rentals = await prisma.rental.findMany({
    where: {
      itemId,
      status: { in: [RentalStatus.APPROVED, RentalStatus.ACTIVE] },
    },
    select: {
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: 'asc' },
  });

  return rentals.map((r) => ({
    startDate: formatDateOnly(r.startDate),
    endDate: formatDateOnly(r.endDate),
  }));
}
