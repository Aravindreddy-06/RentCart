/**
 * src/components/StatusBadge.tsx
 * Colour-coded badge for rental statuses.
 */

import type { RentalStatus } from '../services/rentals.service';

interface StatusBadgeProps {
  status: RentalStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<
    RentalStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    PENDING: {
      label: 'Pending Approval',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
      border: 'border-amber-200',
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
      border: 'border-blue-200',
    },
    ACTIVE: {
      label: 'Active (Handed Over)',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200',
    },
    RETURNED: {
      label: 'Returned',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
      border: 'border-purple-200',
    },
    REJECTED: {
      label: 'Declined',
      bg: 'bg-red-50',
      text: 'text-red-800',
      dot: 'bg-red-500',
      border: 'border-red-200',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-neutral-100',
      text: 'text-neutral-700',
      dot: 'bg-neutral-400',
      border: 'border-neutral-200',
    },
  };

  const config = configs[status] ?? {
    label: status,
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    dot: 'bg-neutral-400',
    border: 'border-neutral-200',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-sm ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'PENDING' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
