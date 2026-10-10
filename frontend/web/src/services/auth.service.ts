/**
 * src/services/auth.service.ts
 * Auth API calls.
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

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await api.post('/api/auth/register', data);
    console.log('Raw web register response:', res.data);
    return res.data.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post('/api/auth/login', data);
    console.log('Raw web login response:', res.data);
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/api/auth/me');
    console.log('Raw web getMe response:', res.data);
    return res.data.data.user;
  },
};
