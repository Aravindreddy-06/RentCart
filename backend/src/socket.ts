/**
 * src/socket.ts
 * Realtime Socket.IO configuration and event emitters for RentCart.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken, TokenPayload } from './utils/jwt';
import { env } from './config/env';

let io: SocketIOServer | null = null;

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
