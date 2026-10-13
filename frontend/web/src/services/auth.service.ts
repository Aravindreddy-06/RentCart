/**
 * src/services/auth.service.ts
 * Auth API calls for web frontend.
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
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  email: string;
  requiresVerification: boolean;
}

export interface GenericMessageResponse {
  message: string;
}

export const authService = {
  async register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<RegisterResponse> {
    const res = await api.post('/api/auth/register', data);
    return res.data.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post('/api/auth/login', data);
    return res.data.data;
  },

  async verifyEmail(data: { email: string; otp: string }): Promise<AuthResponse> {
    const res = await api.post('/api/auth/verify-email', data);
    return res.data.data;
  },

  async resendOtp(data: {
    email: string;
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  }): Promise<GenericMessageResponse> {
    const res = await api.post('/api/auth/resend-otp', data);
    return res.data.data;
  },

  async forgotPassword(data: { email: string }): Promise<GenericMessageResponse> {
    const res = await api.post('/api/auth/forgot-password', data);
    return res.data.data;
  },

  async resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<GenericMessageResponse> {
    const res = await api.post('/api/auth/reset-password', data);
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/api/auth/me');
    return res.data.data.user;
  },
};
