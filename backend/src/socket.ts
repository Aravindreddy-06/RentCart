/**
 * src/socket.ts
 * Realtime Socket.IO configuration and event emitters for RentCart.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken, TokenPayload } from './utils/jwt';
import { env } from './config/env';
import prisma from './prisma/client';
import { calculateEtaMinutes } from './utils/geo';

let io: SocketIOServer | null = null;
const rentalUpdateThrottle = new Map<string, number>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.CLIENT_ORIGINS.includes(origin)) return callback(null, true);
        callback(null, true);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!authHeader) {
        return next(new Error('Unauthorized — no token provided'));
      }

      const token =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : String(authHeader);

      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      return next(new Error('Unauthorized — invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as TokenPayload;
    if (user?.userId) {
      const userRoom = `user:${user.userId}`;
      socket.join(userRoom);
    }

    socket.on(
      'tracking:update',
      async (data: {
        rentalId?: string;
        latitude?: number;
        longitude?: number;
        heading?: number | null;
      }) => {
        try {
          if (!user?.userId || !data?.rentalId) return;

          const { rentalId, latitude, longitude, heading } = data;
          if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            isNaN(latitude) ||
            isNaN(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return;
          }

          // Throttle to 1 update per 3 seconds per rental
          const now = Date.now();
          const lastUpdate = rentalUpdateThrottle.get(rentalId) ?? 0;
          if (now - lastUpdate < 3000) {
            return;
          }

          const rental = await prisma.rental.findUnique({
            where: { id: rentalId },
            include: { item: true, liveLocation: true },
          });

          if (!rental) return;
          // Must be the borrower of that rental
          if (rental.borrowerId !== user.userId) return;
          // Rental must be APPROVED
          if (rental.status !== 'APPROVED') return;
          // Tracking must be active
          if (!rental.liveLocation) return;

          rentalUpdateThrottle.set(rentalId, now);

          await prisma.liveLocation.upsert({
            where: { rentalId },
            update: {
              latitude,
              longitude,
              heading: typeof heading === 'number' ? heading : null,
              updatedAt: new Date(),
            },
            create: {
              rentalId,
              userId: user.userId,
              latitude,
              longitude,
              heading: typeof heading === 'number' ? heading : null,
              startedAt: new Date(),
            },
          });

          let etaMinutes: number | null = null;
          if (
            rental.pickupLatitude !== null &&
            rental.pickupLatitude !== undefined &&
            rental.pickupLongitude !== null &&
            rental.pickupLongitude !== undefined
          ) {
            etaMinutes = calculateEtaMinutes(
              latitude,
              longitude,
              rental.pickupLatitude,
              rental.pickupLongitude,
            );
          }

          if (io) {
            io.to(`user:${rental.item.ownerId}`).emit('tracking:location', {
              rentalId,
              latitude,
              longitude,
              heading: typeof heading === 'number' ? heading : null,
              updatedAt: new Date().toISOString(),
              etaMinutes,
            });
          }
        } catch (err) {
          console.error('[Socket] tracking:update error:', err);
        }
      },
    );

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitNewMessage(recipientId: string, message: any) {
  if (io) {
    io.to(`user:${recipientId}`).emit('message:new', message);
  }
}

export function emitMessageRead(
  recipientId: string,
  payload: { rentalId: string; readBy: string; readAt: string },
) {
  if (io) {
    io.to(`user:${recipientId}`).emit('message:read', payload);
  }
}

export function emitTrackingLocation(ownerId: string, payload: any) {
  if (io) {
    io.to(`user:${ownerId}`).emit('tracking:location', payload);
  }
}

export function emitTrackingStarted(ownerId: string, payload: { rentalId: string; startedAt: string }) {
  if (io) {
    io.to(`user:${ownerId}`).emit('tracking:started', payload);
  }
}

export function emitTrackingStopped(ownerId: string, payload: { rentalId: string; reason?: string }) {
  if (io) {
    io.to(`user:${ownerId}`).emit('tracking:stopped', payload);
  }
}

export function emitTrackingArrived(ownerId: string, payload: { rentalId: string; arrivedAt: string }) {
  if (io) {
    io.to(`user:${ownerId}`).emit('tracking:arrived', payload);
  }
}

