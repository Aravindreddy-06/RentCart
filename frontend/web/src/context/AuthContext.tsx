/**
 * src/context/AuthContext.tsx
 * Global auth state — user, tokens, login/logout helpers.
 * Wraps the entire app so any component can call useAuth().
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { authService, type User } from '../services/auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean; // true while checking stored token on startup
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /** Persist tokens and update state after a successful auth response. */
  const handleAuthSuccess = useCallback((user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  /** Check stored token on startup. */
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    // Verify the token is still valid by calling /api/auth/me
    authService
      .getMe()
      .then((user) => setState({ user, isLoading: false, isAuthenticated: true }))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, accessToken, refreshToken } = await authService.login({ email, password });
      handleAuthSuccess(user, accessToken, refreshToken);
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { user, accessToken, refreshToken } = await authService.register(data);
      handleAuthSuccess(user, accessToken, refreshToken);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const setUser = useCallback((user: User | null) => {
    setState((s) => ({ ...s, user }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
