/**
 * src/services/api.ts (mobile)
 * Axios instance with auth token attachment and auto-refresh on 401.
 * Tokens and user stored securely using expo-secure-store.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const cleanBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
export const BASE_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const KEYS = {
  ACCESS: 'rentcart_access_token',
  REFRESH: 'rentcart_refresh_token',
  USER: 'rentcart_user',
};

// ── Token & User storage helpers ──────────────────────────────────────────────
export const tokenStorage = {
  getAccess: () => SecureStore.getItemAsync(KEYS.ACCESS),
  getRefresh: () => SecureStore.getItemAsync(KEYS.REFRESH),
  getUser: async () => {
    const raw = await SecureStore.getItemAsync(KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAccess: async (token: string) => {
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error(
        `Invalid value provided for accessToken to SecureStore: expected a non-empty string, but received ${JSON.stringify(token)}`
      );
    }
    await SecureStore.setItemAsync(KEYS.ACCESS, token);
  },

  setRefresh: async (token: string) => {
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error(
        `Invalid value provided for refreshToken to SecureStore: expected a non-empty string, but received ${JSON.stringify(token)}`
      );
    }
    await SecureStore.setItemAsync(KEYS.REFRESH, token);
  },

  setUser: async (user: unknown) => {
    if (!user || typeof user !== 'object') {
      throw new Error(
        `Invalid value provided for user object to SecureStore: expected a non-null object, but received ${JSON.stringify(user)}`
      );
    }
    const jsonStr = JSON.stringify(user);
    if (typeof jsonStr !== 'string' || !jsonStr.trim()) {
      throw new Error('Invalid value provided for user object to SecureStore: JSON stringification failed.');
    }
    await SecureStore.setItemAsync(KEYS.USER, jsonStr);
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(KEYS.ACCESS);
    await SecureStore.deleteItemAsync(KEYS.REFRESH);
    await SecureStore.deleteItemAsync(KEYS.USER);
  },
};

// ── Request interceptor — attach access token ──────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ─────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = await tokenStorage.getRefresh();
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        await tokenStorage.clear();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        console.log('Raw refresh response:', data);

        const newAccess: string = data.data?.accessToken;
        const newRefresh: string = data.data?.refreshToken;

        await tokenStorage.setAccess(newAccess);
        await tokenStorage.setRefresh(newRefresh);

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        original.headers.Authorization = `Bearer ${newAccess}`;

        processQueue(null, newAccess);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clear();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
