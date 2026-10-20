/**
 * src/components/StatusBadge.tsx (mobile)
 * Status badge with dot and tinted background.
 * Exact specification tokens:
 * PENDING amber, APPROVED teal/green, ACTIVE blue, RETURNED indigo, REJECTED red, CANCELLED grey.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { STATUS_THEMES, type RentalStatus } from '../utils/colors';

interface Props {
  status: RentalStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const { isDark } = useTheme();
  const config = STATUS_THEMES[status] ?? STATUS_THEMES.PENDING;

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const bg = isDark ? config.darkBg : config.bg;
  const fg = isDark ? config.darkFg : config.fg;
  const border = isDark ? config.darkBorder : config.border;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border },
        isSmall && styles.badgeSm,
        isLarge && styles.badgeLg,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text
        style={[
          styles.text,
          { color: fg },
          isSmall && styles.textSm,
          isLarge && styles.textLg,
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
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  badgeLg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontWeight: '600',
  },
  textLg: {
    fontSize: 13,
    fontWeight: '700',
  },
});
