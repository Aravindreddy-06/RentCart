/**
 * src/services/notifications.service.ts
 * Business logic for in-app notifications and background Expo push delivery.
 */

import prisma from '../prisma/client';
import { NotificationType } from '@prisma/client';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

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

// ─── Push Delivery (Background) ───────────────────────────────────────────────

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, any>,
): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const t of tokens) {
      if (!Expo.isExpoPushToken(t.token)) {
        console.warn(`[PushNotification] Invalid Expo push token found: ${t.token}. Deleting.`);
        await prisma.pushToken.delete({ where: { id: t.id } }).catch(() => {});
        continue;
      }

      messages.push({
        to: t.token,
        sound: 'default',
        title,
        body,
        data,
      });
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket.status === 'error') {
            console.warn(
              `[PushNotification] Ticket error: ${ticket.message} (${ticket.details?.error})`,
            );
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials'
            ) {
              const badToken = chunk[i]?.to;
              if (typeof badToken === 'string') {
                await prisma.pushToken.deleteMany({ where: { token: badToken } }).catch(() => {});
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[PushNotification] Error sending push chunk:', err?.message || err);
      }
    }
  } catch (err: any) {
    console.error('[PushNotification] Push delivery failed:', err?.message || err);
  }
}

// ─── Notification Creation ────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    rentalId: string;
    itemId: string;
    [key: string]: any;
  };
  actorId?: string; // If actor is the same as recipient, skip (never notify own action)
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: { rentalId: string; itemId: string; [key: string]: any },
  actorId?: string,
) {
  // Never notify a user about their own action
  if (actorId && actorId === userId) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data,
    },
  });

  // Background push notification: do not await in the request path
  void sendPushNotification(userId, title, body, data).catch((err) => {
    console.error('[PushNotification] Background delivery error:', err?.message || err);
  });

  return notification;
}

// ─── Queries & Updates ────────────────────────────────────────────────────────

export interface NotificationsQuery {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function getUserNotifications(userId: string, query: NotificationsQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(query.unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadCount(userId: string) {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { unreadCount };
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError('You do not have permission to access this notification');
  }

  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { success: true };
}

export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError('You do not have permission to delete this notification');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
}

// ─── Push Token Management ────────────────────────────────────────────────────

export async function registerPushToken(userId: string, token: string, platform: string) {
  return prisma.pushToken.upsert({
    where: { token },
    update: {
      userId,
      platform,
      updatedAt: new Date(),
    },
    create: {
      userId,
      token,
      platform,
    },
  });
}

export async function deletePushToken(userId: string, token?: string) {
  if (token) {
    await prisma.pushToken.deleteMany({
      where: {
        userId,
        token,
      },
    });
  } else {
    await prisma.pushToken.deleteMany({
      where: { userId },
    });
  }

  return { success: true };
}
