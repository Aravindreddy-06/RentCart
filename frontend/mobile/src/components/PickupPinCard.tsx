/**
 * src/components/PickupPinCard.tsx (mobile)
 * Borrower Pickup PIN display card for APPROVED rentals.
 * Features:
 * - Brand gradient header (LinearGradient)
 * - 4 large digit boxes (masked by default)
 * - Show PIN / Hide PIN toggle with 30-second auto-hide countdown
 * - Auto-hide when app goes to background (AppState)
 * - Copy button with expo-clipboard
 * - Clear guidance text: "Share this PIN with the owner only when you collect the item"
 * - Full light / dark mode support
 * - Haptic feedback support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { rentalsService } from '../services/rentals.service';
import { useTheme } from '../context/ThemeContext';
import { colors, gradients, radius, shadows } from '../utils/colors';

interface PickupPinCardProps {
  rentalId: string;
}

export const PickupPinCard: React.FC<PickupPinCardProps> = ({ rentalId }) => {
  const { isDark, themeColors } = useTheme();
  const [pin, setPin] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(30);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await rentalsService.getHandoverPin(rentalId);
      setPin(res.pin);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load pickup PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    fetchPin();
  }, [fetchPin]);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Auto-hide when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        setIsVisible(false);
        clearTimers();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [clearTimers]);

  const toggleVisibility = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isVisible) {
      clearTimers();
      setIsVisible(false);
    } else {
      setIsVisible(true);
      setSecondsLeft(30);
      clearTimers();

      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        clearTimers();
      }, 30000);
    }
  };

  const handleCopy = async () => {
    if (!pin) return;
    try {
      await Clipboard.setStringAsync(pin);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const digits = pin ? pin.split('') : ['•', '•', '•', '•'];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
      ]}
    >
      {/* Brand Gradient Header */}
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="key" size={16} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Pickup PIN</Text>
            <Text style={styles.headerSubtitle}>Show to owner when taking handover</Text>
          </View>
        </View>
        <View style={styles.approvedTag}>
          <Text style={styles.approvedTagText}>APPROVED</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>
              Loading pickup PIN…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPin}>
              <Ionicons name="refresh" size={14} color={colors.primary[500]} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 4 Digit Boxes */}
            <View style={styles.digitsRow}>
              {digits.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.digitBox,
                    {
                      backgroundColor: isVisible
                        ? isDark
                          ? 'rgba(15, 157, 138, 0.2)'
                          : colors.primary[50]
                        : isDark
                        ? colors.dark.surfaceHover
                        : colors.neutral[100],
                      borderColor: isVisible
                        ? colors.primary[500]
                        : isDark
                        ? themeColors.border
                        : colors.neutral[200],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.digitText,
                      {
                        color: isVisible
                          ? colors.primary[500]
                          : themeColors.textMuted,
                      },
                    ]}
                  >
                    {isVisible ? digit : '•'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Toggle and Copy Controls */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isVisible
                    ? {
                        backgroundColor: isDark
                          ? colors.dark.surfaceHover
                          : colors.neutral[100],
                        borderColor: themeColors.border,
                      }
                    : {
                        backgroundColor: colors.primary[500],
                        borderColor: colors.primary[600],
                      },
                ]}
                onPress={toggleVisibility}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={isVisible ? themeColors.text : '#ffffff'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: isVisible ? themeColors.text : '#ffffff' },
                  ]}
                >
                  {isVisible ? 'Hide PIN' : 'Show PIN'}
                </Text>
                {isVisible && (
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownText}>{secondsLeft}s</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.copyBtn,
                  {
                    backgroundColor: copied
                      ? isDark
                        ? 'rgba(22, 163, 74, 0.2)'
                        : '#DCFCE7'
                      : isDark
                      ? themeColors.surface
                      : '#ffffff',
                    borderColor: copied ? colors.success : themeColors.border,
                  },
                ]}
                onPress={handleCopy}
                disabled={!pin}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={copied ? colors.success : themeColors.text}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: copied ? colors.success : themeColors.text },
                  ]}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Helper guidance text */}
            <Text style={[styles.guidanceText, { color: themeColors.textMuted }]}>
              Share this PIN with the owner only when you collect the item.
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    ...shadows.sm,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  approvedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  approvedTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  body: {
    padding: 20,
    alignItems: 'center',
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary[50],
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[500],
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 8,
  },
  digitBox: {
    width: 54,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  countdownBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guidanceText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
});
