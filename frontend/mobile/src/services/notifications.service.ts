/**
 * src/services/notifications.service.ts (mobile)
 * In-app notifications API client.
 * Does NOT import or depend on expo-notifications, ensuring full compatibility with Expo Go.
 */

import { api } from './api';

export type NotificationType =
  | 'RENTAL_REQUESTED'
  | 'RENTAL_APPROVED'
  | 'RENTAL_REJECTED'
  | 'RENTAL_CANCELLED'
  | 'RENTAL_ACTIVATED'
  | 'RENTAL_RETURNED'
  | 'REVIEW_RECEIVED'
  | 'NEW_MESSAGE';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    rentalId: string;
    itemId: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationsQuery {
  unread?: boolean;
  page?: number;
  limit?: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const notificationsService = {
  async getNotifications(params?: NotificationsQuery): Promise<NotificationsListResponse> {
    const res = await api.get('/notifications', { params });
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async registerPushToken(token: string, platform: string): Promise<void> {
    await api.post('/push-tokens', { token, platform });
  },

  async unregisterPushToken(token?: string): Promise<void> {
    try {
      await api.delete('/push-tokens', { data: { token } });
    } catch {
      // Best-effort unregister on logout
    }
  },
};
