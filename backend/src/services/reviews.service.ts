/**
 * src/services/reviews.service.ts
 * Business logic for reviews & ratings:
 * - Create review (rental must be RETURNED, borrower/owner only, no self-reviews, 1-5 rating, max 500 comment, 1 review per user per rental)
 * - Edit review (within 7 days, author only)
 * - Delete review (author only)
 * - Item reviews (paginated + aggregate rating)
 * - User received reviews (paginated + aggregate rating)
 * - Rental review status (whether user can review, whether they already reviewed, existing reviews)
 * - REVIEW_RECEIVED notification
 */

import prisma from '../prisma/client';
import { RentalStatus, NotificationType } from '@prisma/client';
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

const userAuthorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export interface CreateReviewInput {
  rentalId: string;
  rating: number;
  comment?: string | null;
  authorId: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string | null;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export async function createReview(input: CreateReviewInput) {
  const { rentalId, rating, comment, authorId } = input;

  // 1. Find rental with item details
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: { select: { id: true, ownerId: true, title: true } },
    },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  // 2. Must have status RETURNED
  if (rental.status !== RentalStatus.RETURNED) {
    throw new ValidationError('A review can only be written for a rental with status RETURNED');
  }

  // 3. Determine if author is borrower or owner
  let targetUserId: string;
  if (authorId === rental.borrowerId) {
    targetUserId = rental.item.ownerId;
  } else if (authorId === rental.item.ownerId) {
    targetUserId = rental.borrowerId;
  } else {
    throw new ForbiddenError('Only the borrower and the owner of this rental can leave a review');
  }

  // 4. Cannot review yourself
  if (authorId === targetUserId) {
    throw new ValidationError('A user cannot review themselves');
  }

  // 5. Check if author already reviewed this rental (enforced by DB unique constraint too)
  const existingReview = await prisma.review.findUnique({
    where: {
      rentalId_authorId: {
        rentalId,
        authorId,
      },
    },
  });

  if (existingReview) {
    throw new ConflictError('You have already submitted a review for this rental');
  }

  // 6. Create the review
  const sanitizedComment = comment && comment.trim().length > 0 ? comment.trim() : null;

  const review = await prisma.review.create({
    data: {
      rentalId,
      itemId: rental.itemId,
      authorId,
      targetUserId,
      rating,
      comment: sanitizedComment,
    },
    include: {
      author: { select: userAuthorSelect },
      targetUser: { select: userAuthorSelect },
    },
  });

  // 7. Dispatch background notification — must NEVER fail the review
  try {
    await createNotification(
      targetUserId,
      NotificationType.REVIEW_RECEIVED,
      'New Review Received',
      'You received a new review',
      {
        rentalId,
        itemId: rental.itemId,
        reviewId: review.id,
        targetUserId,
        rating,
      },
      authorId,
    );
  } catch (notifErr) {
    console.error('[Notification] Failed to send REVIEW_RECEIVED notification:', notifErr);
  }

  return review;
}

export async function updateReview(id: string, authorId: string, input: UpdateReviewInput) {
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  // Author only
  if (review.authorId !== authorId) {
    throw new ForbiddenError('You can only edit your own reviews');
  }

  // Cannot be edited after 7 days
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - new Date(review.createdAt).getTime();
  if (elapsedMs > SEVEN_DAYS_MS) {
    throw new ValidationError('Reviews cannot be edited after 7 days');
  }

  const data: { rating?: number; comment?: string | null } = {};
  if (input.rating !== undefined) {
    data.rating = input.rating;
  }
  if (input.comment !== undefined) {
    data.comment = input.comment && input.comment.trim().length > 0 ? input.comment.trim() : null;
  }

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: {
      author: { select: userAuthorSelect },
      targetUser: { select: userAuthorSelect },
    },
  });

  return updated;
}

export async function deleteReview(id: string, authorId: string) {
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  // Author only
  if (review.authorId !== authorId) {
    throw new ForbiddenError('You can only delete your own reviews');
  }

  await prisma.review.delete({
    where: { id },
  });

  return { success: true, message: 'Review deleted successfully' };
}

export async function getItemReviews(itemId: string, query: PaginationQuery) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true },
  });

  if (!item) {
    throw new NotFoundError('Item not found');
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 10));
  const skip = (page - 1) * limit;

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { itemId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: userAuthorSelect },
      },
    }),
    prisma.review.count({ where: { itemId } }),
    prisma.review.aggregate({
      where: { itemId },
      _avg: { rating: true },
    }),
  ]);

  const rawAvg = aggregate._avg.rating ?? 0;
  const averageRating = Math.round(rawAvg * 10) / 10;

  return {
    reviews,
    averageRating,
    reviewCount: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserReviews(targetUserId: string, query: PaginationQuery) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 10));
  const skip = (page - 1) * limit;

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { targetUserId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: userAuthorSelect },
        item: { select: { id: true, title: true } },
      },
    }),
    prisma.review.count({ where: { targetUserId } }),
    prisma.review.aggregate({
      where: { targetUserId },
      _avg: { rating: true },
    }),
  ]);

  const rawAvg = aggregate._avg.rating ?? 0;
  const averageRating = Math.round(rawAvg * 10) / 10;

  return {
    reviews,
    averageRating,
    reviewCount: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRentalReviewStatus(rentalId: string, currentUserId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: { select: { id: true, ownerId: true, title: true } },
    },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  // Must be borrower or owner
  const isBorrower = currentUserId === rental.borrowerId;
  const isOwner = currentUserId === rental.item.ownerId;
  if (!isBorrower && !isOwner) {
    throw new ForbiddenError('You are not a participant in this rental');
  }

  const targetUserId = isBorrower ? rental.item.ownerId : rental.borrowerId;
  const isSelf = currentUserId === targetUserId;

  // Fetch target user info
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: userAuthorSelect,
  });

  // Fetch reviews for this rental
  const reviews = await prisma.review.findMany({
    where: { rentalId },
    include: {
      author: { select: userAuthorSelect },
    },
  });

  const myReview = reviews.find((r) => r.authorId === currentUserId) ?? null;
  const otherReview = reviews.find((r) => r.authorId !== currentUserId) ?? null;

  const isReturned = rental.status === RentalStatus.RETURNED;
  const hasReviewed = myReview !== null;
  const canReview = isReturned && !hasReviewed && !isSelf;

  return {
    canReview,
    hasReviewed,
    myReview,
    otherReview,
    targetUser,
    rentalStatus: rental.status,
  };
}
