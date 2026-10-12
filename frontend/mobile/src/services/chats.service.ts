/**
 * src/services/chats.service.ts (mobile)
 * In-app chat API client for mobile app.
 */

import { api } from './api';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ChatItem {
  id: string;
  title: string;
  imageUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  rentalId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  sender?: ChatUser;
}

export interface ChatConversation {
  rentalId: string;
  otherUser: ChatUser;
  item: ChatItem;
  rentalStatus: string;
  isReadOnly: boolean;
  readOnlyReason?: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  isReadOnly: boolean;
  readOnlyReason?: string;
  rental: {
    id: string;
    status: string;
    item: ChatItem;
    otherUser: ChatUser;
  };
}

export const chatsService = {
  async getMyChats(): Promise<ChatConversation[]> {
    const res = await api.get('/chats');
    return res.data.data;
  },

  async getRentalMessages(
    rentalId: string,
    query: { before?: string; limit?: number } = {},
  ): Promise<MessagesResponse> {
    const res = await api.get(`/rentals/${rentalId}/messages`, { params: query });
    return res.data.data;
  },

  async sendMessage(rentalId: string, body: string): Promise<ChatMessage> {
    const res = await api.post(`/rentals/${rentalId}/messages`, { body });
    return res.data.data;
  },

  async markMessagesAsRead(rentalId: string): Promise<{ success: boolean; count: number }> {
    const res = await api.patch(`/rentals/${rentalId}/messages/read`);
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/chats/unread-count');
    return res.data.data?.unreadCount || 0;
  },
};
