/**
 * src/components/HandoverVerifyCard.tsx (mobile)
 * Owner PIN verification card for APPROVED rentals.
 * Features:
 * - 4-box PIN input with keyboardType="number-pad", textContentType="oneTimeCode"
 * - Auto-advance on input, backspace handling, paste support
 * - Confirm button with loading indicator
 * - Wrong-PIN error with attempts left count
 * - 429 lockout countdown timer
 * - Success state ("Handover confirmed, rental is now Active")
 * - "Skip PIN" warning dialog calling activate with { confirmWithoutPin: true }
 * - Haptic feedback on success/failure (expo-haptics)
 * - Safe areas and keyboard avoidance
 * - Full light / dark theme support
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { rentalsService } from '../services/rentals.service';
import { useTheme } from '../context/ThemeContext';
import { colors, radius, shadows } from '../utils/colors';

interface HandoverVerifyCardProps {
  rentalId: string;
  onSuccess: () => void;
  compact?: boolean;
}

export const HandoverVerifyCard: React.FC<HandoverVerifyCardProps> = ({
  rentalId,
  onSuccess,
  compact = false,
}) => {
  const { isDark, themeColors } = useTheme();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Skip PIN dialog
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState('');

  const inputRefs = [
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
  ];

  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock countdown handler
  useEffect(() => {
    if (isLocked && lockSecondsLeft > 0) {
      lockTimerRef.current = setInterval(() => {
        setLockSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockTimerRef.current) {
        clearInterval(lockTimerRef.current);
        lockTimerRef.current = null;
      }
    };
  }, [isLocked, lockSecondsLeft]);

  const formatLockTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    if (isLocked || isSubmitting || isSuccess) return;

    const cleaned = val.replace(/\D/g, '');

    // Handle paste of multiple digits
    if (cleaned.length > 1) {
      const pasteDigits = cleaned.slice(0, 4).split('');
      const next = ['', '', '', ''];
      pasteDigits.forEach((d, i) => {
        next[i] = d;
      });
      setDigits(next);
      setError('');
      if (pasteDigits.length === 4) {
        inputRefs[3].current?.focus();
      } else {
        inputRefs[Math.min(3, pasteDigits.length)].current?.focus();
      }
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError('');

    // Auto-advance
    if (cleaned && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const pinValue = digits.join('');

  const handleVerify = async () => {
    if (pinValue.length !== 4 || isLocked || isSubmitting || isSuccess) return;

    setIsSubmitting(true);
    setError('');

    try {
      await rentalsService.verifyHandover(rentalId, pinValue);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}

      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 429) {
        setIsLocked(true);
        const retryAfter = data?.retryAfterSeconds || 900;
        setLockSecondsLeft(retryAfter);
        setError(data?.message || 'Verification is locked due to too many failed attempts.');
        setDigits(['', '', '', '']);
      } else if (status === 400 && typeof data?.attemptsLeft === 'number') {
        setAttemptsLeft(data.attemptsLeft);
        setError(`Incorrect PIN. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? '' : 's'} remaining.`);
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        setError(data?.message || 'Verification failed. Please check the PIN and try again.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipConfirm = async () => {
    setIsSkipping(true);
    setSkipError('');
    try {
      await rentalsService.activate(rentalId, { confirmWithoutPin: true });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setShowSkipModal(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setSkipError(err?.response?.data?.message || 'Failed to activate rental.');
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          padding: compact ? 14 : 18,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: themeColors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              Confirm Handover
            </Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.textMuted }]}>
              Enter the 4-digit PIN provided by the borrower
            </Text>
          </View>
        </View>
      </View>

      {isSuccess ? (
        <View
          style={[
            styles.successBanner,
            {
              backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7',
              borderColor: isDark ? 'rgba(22, 163, 74, 0.4)' : '#BBF7D0',
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={[styles.successTitle, { color: colors.success }]}>
            Handover confirmed, rental is now Active
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.success }]}>
            Updating agreement status…
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* 4 Box PIN Input */}
          <View style={styles.pinBoxesRow}>
            {digits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => {
                  inputRefs[idx].current = ref;
                }}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: isLocked
                      ? isDark
                        ? colors.dark.surfaceHover
                        : colors.neutral[100]
                      : digit
                      ? isDark
                        ? 'rgba(37, 99, 235, 0.2)'
                        : '#EFF6FF'
                      : isDark
                      ? colors.dark.card
                      : colors.neutral[50],
                    borderColor: digit
                      ? '#2563EB'
                      : isDark
                      ? themeColors.border
                      : colors.neutral[200],
                    color: themeColors.text,
                  },
                ]}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={1}
                value={digit}
                editable={!isLocked && !isSubmitting}
                onChangeText={(val) => handleDigitChange(idx, val)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Lock / Error feedback */}
          {isLocked ? (
            <View style={styles.lockBanner}>
              <Ionicons name="lock-closed" size={16} color="#D97706" />
              <Text style={styles.lockText}>
                Locked for {formatLockTime(lockSecondsLeft)}. Too many incorrect attempts.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              pinValue.length === 4 && !isLocked && !isSubmitting
                ? { backgroundColor: '#2563EB' }
                : {
                    backgroundColor: isDark
                      ? colors.dark.surfaceHover
                      : colors.neutral[300],
                  },
            ]}
            onPress={handleVerify}
            disabled={pinValue.length !== 4 || isLocked || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text
                  style={[
                    styles.confirmBtnText,
                    {
                      color:
                        pinValue.length === 4 && !isLocked
                          ? '#ffffff'
                          : themeColors.textMuted,
                    },
                  ]}
                >
                  Confirm Handover
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={pinValue.length === 4 && !isLocked ? '#ffffff' : themeColors.textMuted}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Skip PIN fallback text link */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => {
              setSkipError('');
              setShowSkipModal(true);
            }}
          >
            <Text style={[styles.skipBtnText, { color: themeColors.textMuted }]}>
              Skip PIN
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Skip PIN Warning Modal */}
      <Modal
        visible={showSkipModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSkipping) setShowSkipModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="warning" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  Skip Handover PIN?
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.textMuted }]}>
                  Alternative activation
                </Text>
              </View>
            </View>

            <Text style={[styles.modalWarningText, { color: themeColors.text }]}>
              Only skip if the borrower cannot show the PIN.
            </Text>

            <Text style={[styles.modalDescText, { color: themeColors.textMuted }]}>
              Skipping will directly mark this rental as Active without 4-digit authentication.
            </Text>

            {skipError ? (
              <Text style={styles.modalErrorText}>⚠️ {skipError}</Text>
            ) : null}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setShowSkipModal(false)}
                disabled={isSkipping}
              >
                <Text style={[styles.modalCancelText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSkipConfirm}
                disabled={isSkipping}
              >
                {isSkipping ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Skip & Activate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  content: {
    gap: 12,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 4,
  },
  pinInput: {
    width: 52,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  lockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
    flex: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successBanner: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalWarningText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalDescText: {
    fontSize: 11,
    lineHeight: 16,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#D97706',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
