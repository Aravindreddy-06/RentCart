/**
 * src/services/auth.service.ts (mobile)
 * Authentication API methods for mobile app.
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

export interface RegisterResponse {
  email: string;
  requiresVerification: boolean;
}

export interface GenericMessageResponse {
  message: string;
}

export const authService = {
  async register(data: RegisterData): Promise<RegisterResponse> {
    const res = await api.post('/auth/register', data);
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Invalid registration response from server');
    }
    return res.data.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const res = await api.post('/auth/login', data);
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Invalid login response from server');
    }
    return res.data.data;
  },

  async verifyEmail(data: { email: string; otp: string }): Promise<AuthResponse> {
    const res = await api.post('/auth/verify-email', data);
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Verification failed');
    }
    return res.data.data;
  },

  async resendOtp(data: {
    email: string;
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  }): Promise<GenericMessageResponse> {
    const res = await api.post('/auth/resend-otp', data);
    return res.data.data;
  },

  async forgotPassword(data: { email: string }): Promise<GenericMessageResponse> {
    const res = await api.post('/auth/forgot-password', data);
    return res.data.data;
  },

  async resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<GenericMessageResponse> {
    const res = await api.post('/auth/reset-password', data);
    return res.data.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    if (!res.data?.success || !res.data?.data?.user) {
      throw new Error(res.data?.message || 'Failed to fetch user profile');
    }
    return res.data.data.user;
  },
};
