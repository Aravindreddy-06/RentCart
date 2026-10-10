/**
 * src/context/AuthContext.tsx (mobile)
 * Global auth state using expo-secure-store for token & user persistence.
 * Enforces min 1.5s splash screen loading on app startup.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authService, type User, type RegisterData } from '../services/auth.service';
import { tokenStorage } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    loading: true,
    isAuthenticated: false,
  });

  const handleAuthSuccess = useCallback(
    async (user: User, accessToken: string, refreshToken: string) => {
      await tokenStorage.setAccess(accessToken);
      await tokenStorage.setRefresh(refreshToken);
      await tokenStorage.setUser(user);
      setState({ user, isLoading: false, loading: false, isAuthenticated: true });
    },
    []
  );

  // Check stored token and user profile on startup with min 1.5s delay
  useEffect(() => {
    async function checkAuthOnStartup() {
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const token = await tokenStorage.getAccess();
        if (!token) {
          await minDelayPromise;
          setState({ user: null, isLoading: false, loading: false, isAuthenticated: false });
          return;
        }

        try {
          const user = await authService.getMe();
          await tokenStorage.setUser(user);
          await minDelayPromise;
          setState({ user, isLoading: false, loading: false, isAuthenticated: true });
        } catch {
          const cachedUser = await tokenStorage.getUser();
          await minDelayPromise;
          if (cachedUser) {
            setState({ user: cachedUser, isLoading: false, loading: false, isAuthenticated: true });
          } else {
            await tokenStorage.clear();
            setState({ user: null, isLoading: false, loading: false, isAuthenticated: false });
          }
        }
      } catch {
        await minDelayPromise;
        await tokenStorage.clear();
        setState({ user: null, isLoading: false, loading: false, isAuthenticated: false });
      }
    }

    checkAuthOnStartup();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, accessToken, refreshToken } = await authService.login({ email, password });
      await handleAuthSuccess(user, accessToken, refreshToken);
    },
    [handleAuthSuccess]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { user, accessToken, refreshToken } = await authService.register(data);
      await handleAuthSuccess(user, accessToken, refreshToken);
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setState({ user: null, isLoading: false, loading: false, isAuthenticated: false });
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    await tokenStorage.setUser(updatedUser);
    setState((s) => ({ ...s, user: updatedUser }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
