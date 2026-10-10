/**
 * src/services/users.service.ts (web)
 * User and profile API calls.
 */

import api from './api';
import type { Item } from './items.service';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avatarUrl?: string | null;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  addressArea?: string | null;
  memberSince: string;
  itemCount: number;
  items: Item[];
}

export const usersService = {
  async getMe(): Promise<UserProfile> {
    const res = await api.get('/api/users/me');
    return res.data.data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<UserProfile> {
    const res = await api.patch('/api/users/me', payload);
    return res.data.data;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string; user: UserProfile }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/api/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.patch('/api/users/me/password', { currentPassword, newPassword });
    return res.data.data;
  },

  async getPublicProfile(id: string): Promise<PublicUserProfile> {
    const res = await api.get(`/api/users/${id}`);
    return res.data.data;
  },
};
