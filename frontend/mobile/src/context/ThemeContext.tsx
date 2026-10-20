/**
 * src/context/ThemeContext.tsx (mobile)
 * Dark mode and theme management with persistence via SecureStore.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../utils/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  card: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
}

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  themeColors: ThemeColors;
}

const THEME_STORE_KEY = 'rentcart_theme_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      await SecureStore.setItemAsync(THEME_STORE_KEY, mode);
    } catch {
      // Ignore
    }
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return systemColorScheme === 'dark';
  }, [theme, systemColorScheme]);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setTheme(nextMode);
  }, [isDark, setTheme]);

  const themeColors: ThemeColors = useMemo(() => {
    if (isDark) {
      return {
        background: colors.dark.background,
        surface: colors.dark.surface,
        surfaceHover: colors.dark.surfaceHover,
        border: colors.dark.border,
        text: colors.dark.text,
        textMuted: colors.dark.textMuted,
        card: colors.dark.card,
        primary: colors.primary[500],
        primaryLight: 'rgba(15, 157, 138, 0.15)',
        accent: colors.accent[500],
        accentLight: 'rgba(255, 138, 31, 0.15)',
      };
    }
    return {
      background: colors.background,
      surface: colors.surface,
      surfaceHover: colors.surfaceHover,
      border: colors.border,
      text: colors.text,
      textMuted: colors.textMuted,
      card: colors.card,
      primary: colors.primary[500],
      primaryLight: colors.primary[50],
      accent: colors.accent[500],
      accentLight: colors.accent[50],
    };
  }, [isDark]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      setTheme,
      toggleTheme,
      themeColors,
    }),
    [theme, isDark, setTheme, toggleTheme, themeColors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
