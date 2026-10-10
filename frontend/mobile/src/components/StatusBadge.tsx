/**
 * src/components/StatusBadge.tsx (mobile)
 * Status badge for rental agreements.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RentalStatus } from '../services/rentals.service';

interface Props {
  status: RentalStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const configs: Record<
    RentalStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    PENDING: {
      label: 'Pending',
      bg: '#fef3c7',
      text: '#92400e',
      dot: '#f59e0b',
    },
    APPROVED: {
      label: 'Approved',
      bg: '#dbeafe',
      text: '#1e40af',
      dot: '#3b82f6',
    },
    ACTIVE: {
      label: 'Active',
      bg: '#dcfce7',
      text: '#166534',
      dot: '#22c55e',
    },
    RETURNED: {
      label: 'Returned',
      bg: '#f3e8ff',
      text: '#6b21a8',
      dot: '#a855f7',
    },
    REJECTED: {
      label: 'Declined',
      bg: '#fee2e2',
      text: '#991b1b',
      dot: '#ef4444',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: '#f3f4f6',
      text: '#4b5563',
      dot: '#9ca3af',
    },
  };

  const config = configs[status] ?? {
    label: status,
    bg: '#f3f4f6',
    text: '#4b5563',
    dot: '#9ca3af',
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text
        style={[
          styles.text,
          { color: config.text },
          isSmall && styles.textSm,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
});
