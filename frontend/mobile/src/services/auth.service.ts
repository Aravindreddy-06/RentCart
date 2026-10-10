/**
 * src/services/auth.service.ts (mobile)
 */

import api from './api';

export interface User {
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

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await api.post('/auth/register', data);
    console.log('Raw register response:', JSON.stringify(res.data, null, 2));
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Invalid registration response from server');
    }
    return res.data.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const res = await api.post('/auth/login', data);
    console.log('Raw login response:', JSON.stringify(res.data, null, 2));
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Invalid login response from server');
    }
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    console.log('Raw getMe response:', JSON.stringify(res.data, null, 2));
    const user = res.data?.data?.user || res.data?.data || res.data;
    if (!user || typeof user !== 'object') {
      throw new Error('Invalid user profile response from server');
    }
    return user;
  },
};
