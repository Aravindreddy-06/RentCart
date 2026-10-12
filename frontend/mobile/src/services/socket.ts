/**
 * src/services/socket.ts (mobile)
 * Socket.IO client for React Native with AppState management.
 * Derives server URL from EXPO_PUBLIC_API_URL by removing /api suffix.
 */

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

let socket: Socket | null = null;

export function getSocketUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  const clean = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return clean.replace(/\/api\/?$/, '');
}

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket | null> {
  const token = await tokenStorage.getAccess();
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  const socketUrl = getSocketUrl();

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
