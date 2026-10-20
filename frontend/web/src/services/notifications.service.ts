/**
 * src/services/notifications.service.ts (web)
 * In-app notifications API client.
 */

import api from './api';

export type NotificationType =
  | 'RENTAL_REQUESTED'
  | 'RENTAL_APPROVED'
  | 'RENTAL_REJECTED'
  | 'RENTAL_CANCELLED'
  | 'RENTAL_ACTIVATED'
  | 'RENTAL_RETURNED'
  | 'REVIEW_RECEIVED'
  | 'NEW_MESSAGE'
  | 'PICKUP_LOCATION_SHARED'
  | 'BORROWER_ON_THE_WAY'
  | 'BORROWER_ARRIVED'
  | 'HANDOVER_PIN_READY'
  | 'HANDOVER_CONFIRMED';

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

export const notificationsService = {
  async getNotifications(params?: NotificationsQuery): Promise<NotificationsListResponse> {
    const res = await api.get('/api/notifications', { params });
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/api/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch(`/api/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/api/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
  },
};
