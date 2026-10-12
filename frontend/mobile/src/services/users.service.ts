/**
 * src/services/users.service.ts (mobile)
 * User and profile API calls for mobile.
 */

import api from './api';
import { User } from './auth.service';
import { Item } from './items.service';

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
  averageRating?: number;
  reviewCount?: number;
  items: Item[];
}

export const usersService = {
  async getMe(): Promise<User> {
    const res = await api.get('/users/me');
    return res.data.data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const res = await api.patch('/users/me', payload);
    return res.data.data;
  },

  async uploadAvatar(uri: string): Promise<{ avatarUrl: string; user: User }> {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    const res = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.patch('/users/me/password', { currentPassword, newPassword });
    return res.data.data;
  },

  async getPublicProfile(id: string): Promise<PublicUserProfile> {
    const res = await api.get(`/users/${id}`);
    return res.data.data;
  },
};
