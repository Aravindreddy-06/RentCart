/**
 * src/utils/colors.ts (mobile)
 * Shared design tokens — keeps colour consistent across all screens.
 */

export const colors = {
  primary: {
    50:  '#f0fdfb',
    100: '#ccfbf4',
    200: '#99f6e4',
    300: '#5eead6',
    400: '#2dd4be',
    500: '#0F9D8A',  // Brand teal
    600: '#0d8c7a',
    700: '#0a7062',
  },
  neutral: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
  error: '#ef4444',
  danger: '#ef4444',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  warning: '#f59e0b',
  success: '#22c55e',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 999,
} as const;
