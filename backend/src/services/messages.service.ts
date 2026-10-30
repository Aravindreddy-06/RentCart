/**
 * src/services/messages.service.ts
 * Business logic for in-app chat between borrower and owner:
 * - One conversation per rental
 * - Rate limiting (30 messages per minute per user)
 * - Read-only chat conditions (REJECTED, CANCELLED, or > 30 days after RETURNED)
 * - Realtime Socket.IO emission
 * - Debounced unread notifications (avoids notification spam)
 */

import prisma from '../prisma/client';
import { RentalStatus, NotificationType } from '@prisma/client';
import { emitNewMessage, emitMessageRead } from '../socket';
import { createNotification } from './notifications.service';

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class TooManyRequestsError extends Error {
  statusCode = 429;
  constructor(message: string) {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

// ─── In-memory Rate Limiter (30 messages per minute per user) ────────────────

const userMessageTimestamps = new Map<string, number[]>();

export function checkMessageRateLimit(userId: string): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = userMessageTimestamps.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= 30) {
    return false;
  }
  recent.push(now);
  userMessageTimestamps.set(userId, recent);
  return true;
}

// ─── Read-only Evaluation ───────────────────────────────────────────────────

export function getRentalChatStatus(rental: {
  status: RentalStatus;
  updatedAt: Date;
}): { isReadOnly: boolean; reason?: string } {
  if (rental.status === RentalStatus.REJECTED) {
    return {
      isReadOnly: true,
      reason: 'Chat is read-only for rejected rental requests',
    };
  }
  if (rental.status === RentalStatus.CANCELLED) {
    return {
      isReadOnly: true,
      reason: 'Chat is read-only for cancelled rental requests',
    };
  }
  if (rental.status === RentalStatus.RETURNED) {
    const returnTime = new Date(rental.updatedAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - returnTime > thirtyDaysMs) {
      return {
        isReadOnly: true,
        reason: 'Chat is read-only 30 days after item was returned',
      };
    }
  }
  return { isReadOnly: false };
}

// ─── Service Methods ────────────────────────────────────────────────────────

export async function getMyChats(userId: string) {
  const rentals = await prisma.rental.findMany({
    where: {
      OR: [{ borrowerId: userId }, { item: { ownerId: userId } }],
    },
    include: {
      item: {
        select: {
          id: true,
          title: true,
          images: true,
          ownerId: true,
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
      borrower: {
        select: { id: true, name: true, avatarUrl: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate unread counts per rental
  const rentalIds = rentals.map((r) => r.id);
  const unreadMessages = await prisma.message.groupBy({
    by: ['rentalId'],
    where: {
      rentalId: { in: rentalIds },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });

  const unreadMap = new Map(unreadMessages.map((u) => [u.rentalId, u._count._all]));

  const chats = rentals.map((rental) => {
    const isBorrower = rental.borrowerId === userId;
    const otherUser = isBorrower ? rental.item.owner : rental.borrower;
    const { isReadOnly, reason } = getRentalChatStatus(rental);
    const lastMessage = rental.messages[0] || null;

    return {
      rentalId: rental.id,
      otherUser,
      item: {
        id: rental.item.id,
        title: rental.item.title,
        imageUrl: rental.item.images[0] || null,
      },
      rentalStatus: rental.status,
      isReadOnly,
      readOnlyReason: reason,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            readAt: lastMessage.readAt,
          }
        : null,
      unreadCount: unreadMap.get(rental.id) || 0,
      updatedAt: lastMessage ? lastMessage.createdAt : rental.updatedAt,
    };
  });

  // Sort by latest message / activity
  chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return chats;
}

export async function getRentalMessages(
  rentalId: string,
  userId: string,
  query: { before?: string; limit?: number } = {},
) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: {
        select: {
          id: true,
          title: true,
          images: true,
          ownerId: true,
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
      borrower: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  const isBorrower = rental.borrowerId === userId;
  const isOwner = rental.item.ownerId === userId;
  if (!isBorrower && !isOwner) {
    throw new ForbiddenError('You are not authorized to access this chat');
  }

  const otherUser = isBorrower ? rental.item.owner : rental.borrower;
  const { isReadOnly, reason } = getRentalChatStatus(rental);

  const limit = Math.min(Math.max(query.limit ? Number(query.limit) : 30, 1), 50);

  let beforeDate: Date | undefined;
  if (query.before) {
    // Check if it's a message ID or an ISO date
    const messageById = await prisma.message.findUnique({
      where: { id: query.before },
      select: { createdAt: true },
    });
    if (messageById) {
      beforeDate = messageById.createdAt;
    } else {
      const parsed = new Date(query.before);
      if (!isNaN(parsed.getTime())) {
        beforeDate = parsed;
      }
    }
  }

  const rawMessages = await prisma.message.findMany({
    where: {
      rentalId,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    take: limit + 1,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  const hasMore = rawMessages.length > limit;
  const messagesToReturn = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Return oldest to newest for chronological chat stream
  messagesToReturn.reverse();

  return {
    messages: messagesToReturn,
    hasMore,
    isReadOnly,
    readOnlyReason: reason,
    rental: {
      id: rental.id,
      status: rental.status,
      item: {
        id: rental.item.id,
        title: rental.item.title,
        imageUrl: rental.item.images[0] || null,
      },
      otherUser,
    },
  };
}

export async function sendMessage(
  rentalId: string,
  userId: string,
  bodyText: string,
) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          owner: { select: { id: true, name: true } },
        },
      },
      borrower: {
        select: { id: true, name: true },
      },
    },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  const isBorrower = rental.borrowerId === userId;
  const isOwner = rental.item.ownerId === userId;
  if (!isBorrower && !isOwner) {
    throw new ForbiddenError('You are not authorized to send messages in this chat');
  }

  const { isReadOnly, reason } = getRentalChatStatus(rental);
  if (isReadOnly) {
    throw new ForbiddenError(reason || 'Chat is read-only for this rental');
  }

  if (!checkMessageRateLimit(userId)) {
    throw new TooManyRequestsError('Rate limit exceeded: maximum 30 messages per minute');
  }

  const body = (bodyText || '').trim();
  if (body.length < 1) {
    throw new ValidationError('Message cannot be empty');
  }
  if (body.length > 1000) {
    throw new ValidationError('Message cannot exceed 1000 characters');
  }

  const otherUserId = isBorrower ? rental.item.ownerId : rental.borrowerId;
  const senderName = isBorrower ? rental.borrower.name : rental.item.owner.name;

  const message = await prisma.message.create({
    data: {
      rentalId,
      senderId: userId,
      body,
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Realtime notification via Socket.IO to recipient
  emitNewMessage(otherUserId, message);

  // Debounced notification: send NEW_MESSAGE notification only if recipient has no unread NEW_MESSAGE for this rental
  void (async () => {
    try {
      const unreadNotifs = await prisma.notification.findMany({
        where: {
          userId: otherUserId,
          type: NotificationType.NEW_MESSAGE,
          isRead: false,
        },
      });

      const alreadyHasUnread = unreadNotifs.some(
        (n) => (n.data as any)?.rentalId === rentalId,
      );

      if (!alreadyHasUnread) {
        const snippet = body.length > 80 ? body.slice(0, 77) + '...' : body;
        await createNotification(
          otherUserId,
          NotificationType.NEW_MESSAGE,
          `New message from ${senderName}`,
          snippet,
          {
            rentalId: rental.id,
            itemId: rental.itemId,
            senderId: userId,
          },
          userId,
        );
      }
    } catch (err) {
      console.error('[Chat] Notification dispatch failed (non-blocking):', err);
    }
  })();

  return message;
}

export async function markMessagesAsRead(rentalId: string, userId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      item: { select: { ownerId: true } },
    },
  });

  if (!rental) {
    throw new NotFoundError('Rental not found');
  }

  const isBorrower = rental.borrowerId === userId;
  const isOwner = rental.item.ownerId === userId;
  if (!isBorrower && !isOwner) {
    throw new ForbiddenError('You are not authorized to access this chat');
  }

  const otherUserId = isBorrower ? rental.item.ownerId : rental.borrowerId;
  const now = new Date();

  const updateResult = await prisma.message.updateMany({
    where: {
      rentalId,
      senderId: otherUserId,
      readAt: null,
    },
    data: {
      readAt: now,
    },
  });

  // Mark corresponding unread notifications as read
  void (async () => {
    try {
      const notifs = await prisma.notification.findMany({
        where: {
          userId,
          type: NotificationType.NEW_MESSAGE,
          isRead: false,
        },
      });

      const notifIdsToMark = notifs
        .filter((n) => (n.data as any)?.rentalId === rentalId)
        .map((n) => n.id);

      if (notifIdsToMark.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: notifIdsToMark } },
          data: { isRead: true },
        });
      }
    } catch (err) {
      console.error('[Chat] Marking notification read failed:', err);
    }
  })();

  // Emit realtime read event to other user
  emitMessageRead(otherUserId, {
    rentalId,
    readBy: userId,
    readAt: now.toISOString(),
  });

  return { success: true, count: updateResult.count };
}

export async function getUnreadMessagesCount(userId: string) {
  const rentals = await prisma.rental.findMany({
    where: {
      OR: [{ borrowerId: userId }, { item: { ownerId: userId } }],
    },
    select: { id: true },
  });

  if (rentals.length === 0) {
    return { unreadCount: 0 };
  }

  const rentalIds = rentals.map((r) => r.id);
  const count = await prisma.message.count({
    where: {
      rentalId: { in: rentalIds },
      senderId: { not: userId },
      readAt: null,
    },
  });

  return { unreadCount: count };
}
