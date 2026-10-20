/**
 * src/utils/colors.ts (mobile)
 * Shared design tokens — vibrant, modern marketplace aesthetic with dark mode support.
 */

export const colors = {
  // Primary brand teal
  primary: {
    50: '#E6F7F4',
    100: '#C2EBE4',
    200: '#99E0D4',
    300: '#5ECBBF',
    400: '#2DB5A5',
    500: '#0F9D8A', // Brand primary
    600: '#0B7F70',
    700: '#09665A',
    800: '#074F46',
    900: '#053832',
  },

  // Accent warm orange (CTAs, prices, highlights)
  accent: {
    50: '#FFF4E6',
    100: '#FFE8CC',
    200: '#FFD8A8',
    300: '#FFC078',
    400: '#FFA94D',
    500: '#FF8A1F', // Primary CTA / Price
    600: '#E8730C',
    700: '#C95C05',
    800: '#A34600',
    900: '#7F3300',
  },

  // Secondary indigo (links, info, notices)
  secondary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#5B5BD6',
    600: '#4747B8',
    700: '#373794',
    800: '#2A2A70',
    900: '#1F1F4D',
  },

  // Gold for ratings
  gold: '#F5B301',

  // Light theme neutrals
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceHover: '#F1F4F9',
  border: '#E5E9EE',
  text: '#101828',
  textMuted: '#667085',
  card: '#FFFFFF',

  // Dark theme palette
  dark: {
    background: '#0B1220',
    surface: '#131C2E',
    surfaceHover: '#1E293B',
    border: '#25314A',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    card: '#131C2E',
  },

  // Semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#E5484D',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#EFF6FF',

  // Legacy mappings for backward compatibility
  white: '#FFFFFF',
  error: '#E5484D',
  errorBg: '#FEE2E2',
  errorBorder: '#FECACA',
  neutral: {
    50: '#F6F8FA',
    100: '#F3F4F6',
    200: '#E5E9EE',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#667085',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#101828',
  },
  gray: {
    50: '#F6F8FA',
    100: '#F3F4F6',
    200: '#E5E9EE',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#667085',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#101828',
  },
} as const;

export const gradients = {
  brand: ['#0F9D8A', '#12C2A8'] as const,
  warm: ['#FF8A1F', '#FF5E62'] as const,
  softTint: ['#E6F7F4', '#FFFFFF'] as const,
  darkCard: ['#131C2E', '#182438'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F9D8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: '#FF8A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export type CategoryKey = 'Tools' | 'Electronics' | 'Kitchen' | 'Sports' | 'Books' | 'Other';

export interface CategoryTheme {
  primary: string;
  tint: string;
  border: string;
  darkTint: string;
  darkBorder: string;
  iconName: string;
  ioniconName: any;
}

export const CATEGORY_THEMES: Record<CategoryKey, CategoryTheme> = {
  Tools: {
    primary: '#FF8A1F',
    tint: '#FFF4E6',
    border: '#FFD8A8',
    darkTint: 'rgba(255, 138, 31, 0.15)',
    darkBorder: 'rgba(255, 138, 31, 0.3)',
    iconName: 'wrench',
    ioniconName: 'construct-outline',
  },
  Electronics: {
    primary: '#2563EB',
    tint: '#EFF6FF',
    border: '#BFDBFE',
    darkTint: 'rgba(37, 99, 235, 0.15)',
    darkBorder: 'rgba(37, 99, 235, 0.3)',
    iconName: 'zap',
    ioniconName: 'flash-outline',
  },
  Kitchen: {
    primary: '#E5484D',
    tint: '#FEF2F2',
    border: '#FECACA',
    darkTint: 'rgba(229, 72, 77, 0.15)',
    darkBorder: 'rgba(229, 72, 77, 0.3)',
    iconName: 'utensils',
    ioniconName: 'restaurant-outline',
  },
  Sports: {
    primary: '#16A34A',
    tint: '#F0FDF4',
    border: '#BBF7D0',
    darkTint: 'rgba(22, 163, 74, 0.15)',
    darkBorder: 'rgba(22, 163, 74, 0.3)',
    iconName: 'trophy',
    ioniconName: 'trophy-outline',
  },
  Books: {
    primary: '#8B5CF6',
    tint: '#F5F3FF',
    border: '#DDD6FE',
    darkTint: 'rgba(139, 92, 246, 0.15)',
    darkBorder: 'rgba(139, 92, 246, 0.3)',
    iconName: 'book',
    ioniconName: 'book-outline',
  },
  Other: {
    primary: '#64748B',
    tint: '#F8FAFC',
    border: '#E2E8F0',
    darkTint: 'rgba(100, 116, 139, 0.15)',
    darkBorder: 'rgba(100, 116, 139, 0.3)',
    iconName: 'package',
    ioniconName: 'cube-outline',
  },
};

export type RentalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED';

export interface StatusConfig {
  label: string;
  bg: string;
  fg: string;
  border: string;
  darkBg: string;
  darkFg: string;
  darkBorder: string;
  icon: string;
}

export const STATUS_THEMES: Record<RentalStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    bg: '#FEF3C7',
    fg: '#B45309',
    border: '#FDE68A',
    darkBg: 'rgba(245, 158, 11, 0.18)',
    darkFg: '#FBBF24',
    darkBorder: 'rgba(245, 158, 11, 0.35)',
    icon: 'time-outline',
  },
  APPROVED: {
    label: 'Approved',
    bg: '#E6F7F4',
    fg: '#0B7F70',
    border: '#C2EBE4',
    darkBg: 'rgba(15, 157, 138, 0.18)',
    darkFg: '#2DD4BE',
    darkBorder: 'rgba(15, 157, 138, 0.35)',
    icon: 'checkmark-circle-outline',
  },
  ACTIVE: {
    label: 'Active',
    bg: '#EFF6FF',
    fg: '#1D4ED8',
    border: '#BFDBFE',
    darkBg: 'rgba(37, 99, 235, 0.18)',
    darkFg: '#60A5FA',
    darkBorder: 'rgba(37, 99, 235, 0.35)',
    icon: 'play-circle-outline',
  },
  RETURNED: {
    label: 'Returned',
    bg: '#EEF2FF',
    fg: '#4338CA',
    border: '#C7D2FE',
    darkBg: 'rgba(91, 91, 214, 0.18)',
    darkFg: '#818CF8',
    darkBorder: 'rgba(91, 91, 214, 0.35)',
    icon: 'archive-outline',
  },
  REJECTED: {
    label: 'Declined',
    bg: '#FEE2E2',
    fg: '#B91C1C',
    border: '#FECACA',
    darkBg: 'rgba(229, 72, 77, 0.18)',
    darkFg: '#F87171',
    darkBorder: 'rgba(229, 72, 77, 0.35)',
    icon: 'close-circle-outline',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: '#F3F4F6',
    fg: '#4B5563',
    border: '#E5E7EB',
    darkBg: 'rgba(100, 116, 139, 0.18)',
    darkFg: '#94A3B8',
    darkBorder: 'rgba(100, 116, 139, 0.35)',
    icon: 'ban-outline',
  },
};

const AVATAR_PALETTE = [
  '#0F9D8A',
  '#FF8A1F',
  '#5B5BD6',
  '#16A34A',
  '#E5484D',
  '#2563EB',
  '#8B5CF6',
  '#D97706',
  '#0D9488',
];

export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
