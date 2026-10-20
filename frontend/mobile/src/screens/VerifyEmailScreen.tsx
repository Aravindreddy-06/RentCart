/**
 * src/screens/VerifyEmailScreen.tsx (mobile)
 * Polished 6-box OTP verification screen:
 * - Active box highlighted in teal with subtle glow
 * - Gradient primary button
 * - Soft tinted background with dark mode support
 * - Clean resend countdown and state feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth.service';
import { colors, gradients, shadows } from '../utils/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(3, local.length - 3))}${local.slice(-1)}@${domain}`;
}

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { verifyEmail } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const newOtp = [...otp];
      chars.forEach((c, i) => {
        if (i < 6) newOtp[i] = c;
      });
      setOtp(newOtp);
      setError(null);
      const nextIdx = Math.min(chars.length, 5);
      inputRefs.current[nextIdx]?.focus();

      if (chars.length === 6) {
        handleVerify(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    setError(null);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (cleaned && index === 5 && newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError(null);
    setAttemptsLeft(null);
    setLoading(true);

    try {
      await verifyEmail(email, code);
    } catch (err: any) {
      const resp = err.response?.data;
      setError(resp?.message || 'Verification failed. Please check the code and try again.');
      if (typeof resp?.attemptsLeft === 'number') {
        setAttemptsLeft(resp.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await authService.resendOtp({ email, purpose: 'EMAIL_VERIFICATION' });
      setInfoMessage(res.message || 'Verification code resent successfully.');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const resp = err.response?.data;
      if (err.response?.status === 429 && resp?.retryAfterSeconds) {
        setCooldown(resp.retryAfterSeconds);
      }
      setError(resp?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(15, 157, 138, 0.15)' : colors.primary[50],
                  borderColor: isDark ? 'rgba(15, 157, 138, 0.3)' : colors.primary[200],
                },
              ]}
            >
              <Ionicons name="mail-open" size={34} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }]}>Check Your Email</Text>
            <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
              We sent a 6-digit verification code to{'\n'}
              <Text style={[styles.emailHighlight, { color: themeColors.text }]}>
                {maskEmail(email)}
              </Text>
            </Text>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            {infoMessage && (
              <View style={styles.infoContainer}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary[500]} />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText}>{error}</Text>
                  {attemptsLeft !== null && attemptsLeft > 0 && (
                    <Text style={styles.attemptsText}>
                      {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before this code is invalidated.
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Text style={[styles.otpLabel, { color: themeColors.textMuted }]}>
              ENTER 6-DIGIT CODE
            </Text>

            {/* OTP Boxes - Highlight Active Box in Teal */}
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => {
                const isFocused = focusedIndex === idx;
                const isFilled = Boolean(digit);

                let boxBorder = themeColors.border;
                let boxBg = isDark ? colors.dark.background : '#F8FAFC';

                if (isFocused) {
                  boxBorder = colors.primary[500];
                  boxBg = isDark ? 'rgba(15, 157, 138, 0.12)' : colors.primary[50];
                } else if (isFilled) {
                  boxBorder = isDark ? 'rgba(15, 157, 138, 0.4)' : colors.primary[200];
                  boxBg = isDark ? 'rgba(15, 157, 138, 0.08)' : colors.primary[50];
                }

                if (error) {
                  boxBorder = colors.danger;
                  boxBg = isDark ? 'rgba(229, 72, 77, 0.1)' : '#FEF2F2';
                }

                return (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      {
                        borderColor: boxBorder,
                        backgroundColor: boxBg,
                        color: themeColors.text,
                      },
                      isFocused && styles.otpBoxActive,
                    ]}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    maxLength={1}
                    value={digit}
                    onFocus={() => setFocusedIndex(idx)}
                    onChangeText={(val) => handleDigitChange(idx, val)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                    selectTextOnFocus
                  />
                );
              })}
            </View>

            {/* Gradient Primary Button */}
            <TouchableOpacity
              onPress={() => handleVerify()}
              disabled={loading || !isComplete}
              activeOpacity={0.88}
              style={[styles.buttonWrapper, !isComplete && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={
                  isComplete
                    ? (gradients.brand as unknown as [string, string, ...string[]])
                    : ['#94A3B8', '#CBD5E1']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend Section */}
            <View style={[styles.resendSection, { borderTopColor: themeColors.border }]}>
              <Text style={[styles.resendPrompt, { color: themeColors.textMuted }]}>
                Didn't receive the email?
              </Text>
              {cooldown > 0 ? (
                <Text style={[styles.cooldownText, { color: themeColors.textMuted }]}>
                  Resend code in{' '}
                  <Text style={[styles.cooldownBold, { color: themeColors.text }]}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
                  <Text style={styles.resendLink}>
                    {resending ? 'Sending…' : 'Resend verification code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: themeColors.textMuted }]}>
              ← Back to Sign In
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  emailHighlight: {
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    ...shadows.md,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 157, 138, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(15, 157, 138, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    color: colors.primary[500],
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(229, 72, 77, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 72, 77, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  attemptsText: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 4,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 14,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  otpBoxActive: {
    borderWidth: 2,
    elevation: 3,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonWrapper: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resendSection: {
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  resendPrompt: {
    fontSize: 13,
    marginBottom: 4,
  },
  cooldownText: {
    fontSize: 12,
  },
  cooldownBold: {
    fontWeight: '700',
  },
  resendLink: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
