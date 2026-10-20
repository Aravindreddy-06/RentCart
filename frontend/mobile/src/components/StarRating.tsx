/**
 * src/components/StarRating.tsx (mobile)
 * Reusable StarRating component for React Native:
 * - Gold for stars: #F5B301
 * - Display mode (read-only fractional or integer rating with optional numerical/count labels)
 * - Input mode (interactive tappable 1-5 star selector)
 * - Dark mode support
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../utils/colors';
import { useTheme } from '../context/ThemeContext';

export interface StarRatingProps {
  /** Mode: 'display' for showing rating, 'input' for selecting rating */
  mode?: 'display' | 'input';
  /** Value for display mode (0 to 5) */
  rating?: number;
  /** Value for input mode (1 to 5) */
  value?: number;
  /** Callback when rating changes in input mode */
  onChange?: (rating: number) => void;
  /** Alias for onChange */
  onRatingChange?: (rating: number) => void;
  /** Maximum number of stars (defaults to 5) */
  maxStars?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Optional review count to display alongside stars in display mode */
  reviewCount?: number;
  /** Whether to show numeric rating value (e.g., 4.5) in display mode */
  showValue?: boolean;
  /** Disabled state for input mode */
  disabled?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export function StarRating({
  mode = 'display',
  rating = 0,
  value,
  onChange,
  onRatingChange,
  maxStars = 5,
  size = 'md',
  reviewCount,
  showValue = false,
  disabled = false,
  style,
}: StarRatingProps) {
  const { isDark, themeColors } = useTheme();
  const triggerChange = onChange || onRatingChange;

  // Size configurations
  const sizeConfig = {
    xs: { fontSize: 13, gap: 1, textFontSize: 11 },
    sm: { fontSize: 16, gap: 2, textFontSize: 12 },
    md: { fontSize: 24, gap: 4, textFontSize: 14 },
    lg: { fontSize: 34, gap: 8, textFontSize: 16 },
  }[size];

  const emptyStarColor = isDark ? colors.dark.border : '#E5E9EE';

  if (mode === 'input') {
    const currentRating = value ?? rating ?? 0;

    return (
      <View style={[styles.row, { gap: sizeConfig.gap }, style]}>
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= currentRating;

          return (
            <TouchableOpacity
              key={starValue}
              onPress={() => !disabled && triggerChange?.(starValue)}
              disabled={disabled}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`${starValue} of ${maxStars} stars`}
              style={styles.starTouch}
            >
              <Text
                style={[
                  styles.starGlyph,
                  {
                    fontSize: sizeConfig.fontSize,
                    color: isFilled ? colors.gold : emptyStarColor,
                  },
                ]}
              >
                ★
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Display mode
  const effectiveRating = Math.max(0, Math.min(maxStars, rating));
  const roundedRating = Math.round(effectiveRating);

  return (
    <View style={[styles.row, { gap: sizeConfig.gap }, style]}>
      <View style={[styles.row, { gap: sizeConfig.gap }]}>
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= roundedRating;

          return (
            <Text
              key={starValue}
              style={[
                styles.starGlyph,
                {
                  fontSize: sizeConfig.fontSize,
                  color: isFilled ? colors.gold : emptyStarColor,
                },
              ]}
            >
              ★
            </Text>
          );
        })}
      </View>

      {/* Numeric value / review count */}
      {(showValue || reviewCount !== undefined) && (
        <View style={styles.textContainer}>
          {showValue && (
            <Text
              style={[
                styles.valueText,
                { fontSize: sizeConfig.textFontSize, color: themeColors.text },
              ]}
            >
              {effectiveRating > 0 ? effectiveRating.toFixed(1) : '0.0'}
            </Text>
          )}
          {reviewCount !== undefined && (
            <Text
              style={[
                styles.countText,
                { fontSize: sizeConfig.textFontSize, color: themeColors.textMuted },
              ]}
            >
              ({reviewCount})
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  starGlyph: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 3,
  },
  valueText: {
    fontWeight: '700',
  },
  countText: {
    fontWeight: '500',
  },
});
