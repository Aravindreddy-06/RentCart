/**
 * src/services/socket.ts (web)
 * Socket.IO client singleton with automatic reconnection.
 * Derives server URL from VITE_API_URL by removing /api suffix.
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocketUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket | null {
  const token = localStorage.getItem('accessToken');
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
