/**
 * src/utils/colors.ts (web)
 * Shared design tokens, category themes, status themes, and color helpers.
 * Identical palette values shared with mobile.
 */

export const colors = {
  primary: {
    50:  '#E6F7F4',
    100: '#C2EBE4',
    200: '#99F6E4',
    300: '#5EEAD6',
    400: '#2DD4BF',
    500: '#0F9D8A',  // Brand teal
    600: '#0B7F70',
    700: '#09665A',
    800: '#074D44',
    900: '#05352F',
  },
  accent: {
    400: '#FFA94D',
    500: '#FF8A1F',  // Accent orange (CTAs, prices, highlights)
    600: '#E8730C',
    700: '#C65D05',
  },
  secondary: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    500: '#5B5BD6',  // Secondary indigo
    600: '#4747B8',
    700: '#383896',
  },
  gold: '#F5B301',
  neutral: {
    bg:      '#F6F8FA',
    surface: '#FFFFFF',
    border:  '#E5E9EE',
    text:    '#101828',
    muted:   '#667085',
    subtle:  '#98A2B3',
    50:      '#F6F8FA',
    100:     '#F0F2F5',
    200:     '#E5E9EE',
    300:     '#D0D5DD',
    400:     '#98A2B3',
    500:     '#667085',
    600:     '#475467',
    700:     '#344054',
    800:     '#1D2939',
    900:     '#101828',
  },
  dark: {
    bg:      '#0B1220',
    surface: '#131C2E',
    card:    '#182438',
    border:  '#25314A',
    text:    '#F1F5F9',
    muted:   '#94A3B8',
  },
  semantic: {
    success: '#16A34A',
    warning: '#F59E0B',
    danger:  '#E5484D',
    info:    '#2563EB',
  },
  gradients: {
    brand: 'linear-gradient(135deg, #0F9D8A 0%, #12C2A8 100%)',
    warm:  'linear-gradient(135deg, #FF8A1F 0%, #FF5E62 100%)',
    soft:  'linear-gradient(180deg, #E6F7F4 0%, #FFFFFF 100%)',
  },
} as const;

export type CategoryKey = 'Tools' | 'Electronics' | 'Kitchen' | 'Sports' | 'Books' | 'Other';

export interface CategoryTheme {
  name: CategoryKey;
  icon: string; // Lucide icon name
  solidBg: string;
  solidText: string;
  tintBg: string;
  tintText: string;
  borderColor: string;
  darkTintBg: string;
  darkTintText: string;
  darkBorder: string;
}

export const CATEGORY_THEMES: Record<CategoryKey, CategoryTheme> = {
  Tools: {
    name: 'Tools',
    icon: 'Wrench',
    solidBg: '#FF8A1F',
    solidText: '#FFFFFF',
    tintBg: '#FFF4E6',
    tintText: '#D9480F',
    borderColor: '#FFD8A8',
    darkTintBg: 'rgba(255, 138, 31, 0.18)',
    darkTintText: '#FFA94D',
    darkBorder: 'rgba(255, 138, 31, 0.35)',
  },
  Electronics: {
    name: 'Electronics',
    icon: 'Zap',
    solidBg: '#2563EB',
    solidText: '#FFFFFF',
    tintBg: '#EFF6FF',
    tintText: '#1D4ED8',
    borderColor: '#BFDBFE',
    darkTintBg: 'rgba(37, 99, 235, 0.18)',
    darkTintText: '#60A5FA',
    darkBorder: 'rgba(37, 99, 235, 0.35)',
  },
  Kitchen: {
    name: 'Kitchen',
    icon: 'Utensils',
    solidBg: '#E5484D',
    solidText: '#FFFFFF',
    tintBg: '#FEF2F2',
    tintText: '#DC2626',
    borderColor: '#FECACA',
    darkTintBg: 'rgba(229, 72, 77, 0.18)',
    darkTintText: '#F87171',
    darkBorder: 'rgba(229, 72, 77, 0.35)',
  },
  Sports: {
    name: 'Sports',
    icon: 'Trophy',
    solidBg: '#16A34A',
    solidText: '#FFFFFF',
    tintBg: '#F0FDF4',
    tintText: '#15803D',
    borderColor: '#BBF7D0',
    darkTintBg: 'rgba(22, 163, 74, 0.18)',
    darkTintText: '#4ADE80',
    darkBorder: 'rgba(22, 163, 74, 0.35)',
  },
  Books: {
    name: 'Books',
    icon: 'BookOpen',
    solidBg: '#7C3AED',
    solidText: '#FFFFFF',
    tintBg: '#F5F3FF',
    tintText: '#6D28D9',
    borderColor: '#DDD6FE',
    darkTintBg: 'rgba(124, 58, 237, 0.18)',
    darkTintText: '#A78BFA',
    darkBorder: 'rgba(124, 58, 237, 0.35)',
  },
  Other: {
    name: 'Other',
    icon: 'Package',
    solidBg: '#64748B',
    solidText: '#FFFFFF',
    tintBg: '#F8FAFC',
    tintText: '#475569',
    borderColor: '#E2E8F0',
    darkTintBg: 'rgba(100, 116, 139, 0.18)',
    darkTintText: '#94A3B8',
    darkBorder: 'rgba(100, 116, 139, 0.35)',
  },
};

export const STATUS_THEMES = {
  PENDING: {
    label: 'Pending Approval',
    color: '#F59E0B',
    tintBg: '#FEF3C7',
    tintText: '#B45309',
    border: '#FDE68A',
    darkTintBg: 'rgba(245, 158, 11, 0.2)',
    darkTintText: '#FBBF24',
    darkBorder: 'rgba(245, 158, 11, 0.35)',
  },
  APPROVED: {
    label: 'Approved',
    color: '#0F9D8A',
    tintBg: '#E6F7F4',
    tintText: '#09665A',
    border: '#C2EBE4',
    darkTintBg: 'rgba(15, 157, 138, 0.2)',
    darkTintText: '#2DD4BF',
    darkBorder: 'rgba(15, 157, 138, 0.35)',
  },
  ACTIVE: {
    label: 'Active (Handed Over)',
    color: '#2563EB',
    tintBg: '#EFF6FF',
    tintText: '#1D4ED8',
    border: '#BFDBFE',
    darkTintBg: 'rgba(37, 99, 235, 0.2)',
    darkTintText: '#60A5FA',
    darkBorder: 'rgba(37, 99, 235, 0.35)',
  },
  RETURNED: {
    label: 'Returned',
    color: '#5B5BD6',
    tintBg: '#EEF2FF',
    tintText: '#4747B8',
    border: '#C7D2FE',
    darkTintBg: 'rgba(91, 91, 214, 0.2)',
    darkTintText: '#818CF8',
    darkBorder: 'rgba(91, 91, 214, 0.35)',
  },
  REJECTED: {
    label: 'Declined',
    color: '#E5484D',
    tintBg: '#FEE2E2',
    tintText: '#B91C1C',
    border: '#FECACA',
    darkTintBg: 'rgba(229, 72, 77, 0.2)',
    darkTintText: '#F87171',
    darkBorder: 'rgba(229, 72, 77, 0.35)',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#667085',
    tintBg: '#F3F4F6',
    tintText: '#4B5563',
    border: '#E5E7EB',
    darkTintBg: 'rgba(102, 112, 133, 0.2)',
    darkTintText: '#98A2B3',
    darkBorder: 'rgba(102, 112, 133, 0.35)',
  },
} as const;

const AVATAR_PALETTE = [
  '#0F9D8A', // Teal
  '#FF8A1F', // Orange
  '#5B5BD6', // Indigo
  '#16A34A', // Green
  '#E5484D', // Coral Red
  '#F59E0B', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Purple
];

/**
 * Returns a consistent, curated palette color for a user's initials avatar
 */
export function getAvatarColor(name?: string | null): string {
  if (!name || !name.trim()) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * Returns initials (up to 2 letters) from a user's name
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
