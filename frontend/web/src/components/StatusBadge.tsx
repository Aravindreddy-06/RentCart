/**
 * src/components/StatusBadge.tsx (web)
 * Colour-coded badge for rental statuses with dot and dark mode support.
 * Specification: PENDING amber, APPROVED teal/green, ACTIVE blue, RETURNED indigo, REJECTED red, CANCELLED grey.
 */

import type { RentalStatus } from '../services/rentals.service';

interface StatusBadgeProps {
  status: RentalStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const configs: Record<
    RentalStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    PENDING: {
      label: 'Pending Approval',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-800 dark:text-amber-400',
      dot: 'bg-amber-500',
      border: 'border-amber-200 dark:border-amber-500/30',
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-primary-50 dark:bg-primary-500/10',
      text: 'text-primary-800 dark:text-primary-400',
      dot: 'bg-primary-500',
      border: 'border-primary-200 dark:border-primary-500/30',
    },
    ACTIVE: {
      label: 'Active (Handed Over)',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-800 dark:text-blue-400',
      dot: 'bg-blue-500',
      border: 'border-blue-200 dark:border-blue-500/30',
    },
    RETURNED: {
      label: 'Returned',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      text: 'text-indigo-800 dark:text-indigo-400',
      dot: 'bg-indigo-500',
      border: 'border-indigo-200 dark:border-indigo-500/30',
    },
    REJECTED: {
      label: 'Declined',
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-800 dark:text-red-400',
      dot: 'bg-red-500',
      border: 'border-red-200 dark:border-red-500/30',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-700 dark:text-neutral-400',
      dot: 'bg-neutral-400',
      border: 'border-neutral-200 dark:border-neutral-700',
    },
  };

  const config = configs[status] ?? {
    label: status,
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-400',
    dot: 'bg-neutral-400',
    border: 'border-neutral-200 dark:border-neutral-700',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm transition-colors duration-150 ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'PENDING' ? 'animate-pulse' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
}
