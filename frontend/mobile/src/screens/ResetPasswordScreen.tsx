/**
 * src/screens/ResetPasswordScreen.tsx (mobile)
 * Polished Reset Password screen:
 * - Active OTP box highlighted in teal
 * - Input icons and focused states
 * - Password requirement checklist
 * - Gradient primary button
 * - Full dark mode support
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
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth.service';
import { colors, gradients, shadows } from '../utils/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { isDark, themeColors } = useTheme();

  const initialEmail = route.params?.email || '';
  const initialInfoMessage = route.params?.infoMessage || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number>(0);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(initialInfoMessage);

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  useEffect(() => {
    if (initialEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [initialEmail]);

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
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    setError(null);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError('New password must be at least 8 characters and contain at least one letter and one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setAttemptsLeft(null);
    setLoading(true);

    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: code,
        newPassword,
      });

      navigation.navigate('Login', {
        message: 'Password reset successfully! Please sign in with your new password.',
      });
    } catch (err: any) {
      const resp = err.response?.data;
      setError(resp?.message || 'Failed to reset password. Please check your code and try again.');
      if (typeof resp?.attemptsLeft === 'number') {
        setAttemptsLeft(resp.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email.trim()) return;

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await authService.resendOtp({
        email: email.trim().toLowerCase(),
        purpose: 'PASSWORD_RESET',
      });
      setInfoMessage(res.message || 'A new reset code has been sent.');
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
              <Ionicons name="key-outline" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }]}>Set New Password</Text>
            <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
              Enter the 6-digit code sent to your email and your new password.
            </Text>
          </View>

          {/* Form Card */}
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
                      {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedInput === 'email' ? colors.primary[500] : themeColors.border,
                  },
                  focusedInput === 'email' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedInput === 'email' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* OTP Section with Teal Highlight on Active Box */}
            <Text style={[styles.otpLabel, { color: themeColors.textMuted }]}>
              6-DIGIT RESET CODE
            </Text>
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => {
                const isFocused = focusedOtpIndex === idx;
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
                    onFocus={() => setFocusedOtpIndex(idx)}
                    onChangeText={(val) => handleDigitChange(idx, val)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                    selectTextOnFocus
                  />
                );
              })}
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>New Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedInput === 'newPassword' ? colors.primary[500] : themeColors.border,
                  },
                  focusedInput === 'newPassword' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedInput === 'newPassword' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={themeColors.textMuted}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedInput('newPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={themeColors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Password checklist */}
              <View
                style={[
                  styles.hintsBox,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <View style={styles.hintRow}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? colors.success : themeColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.hintText,
                      { color: hasMinLength ? colors.success : themeColors.textMuted },
                    ]}
                  >
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.hintRow}>
                  <Ionicons
                    name={hasLetter ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasLetter ? colors.success : themeColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.hintText,
                      { color: hasLetter ? colors.success : themeColors.textMuted },
                    ]}
                  >
                    At least one letter (a-z, A-Z)
                  </Text>
                </View>
                <View style={styles.hintRow}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? colors.success : themeColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.hintText,
                      { color: hasNumber ? colors.success : themeColors.textMuted },
                    ]}
                  >
                    At least one number (0-9)
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Confirm New Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedInput === 'confirmPassword'
                        ? colors.primary[500]
                        : themeColors.border,
                  },
                  focusedInput === 'confirmPassword' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={
                    focusedInput === 'confirmPassword'
                      ? colors.primary[500]
                      : themeColors.textMuted
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Repeat your new password"
                  placeholderTextColor={themeColors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={themeColors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Gradient Primary Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.88}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={gradients.brand as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend link */}
            <View style={[styles.resendSection, { borderTopColor: themeColors.border }]}>
              {cooldown > 0 ? (
                <Text style={[styles.cooldownText, { color: themeColors.textMuted }]}>
                  Resend code in{' '}
                  <Text style={[styles.cooldownBold, { color: themeColors.text }]}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
                  <Text style={styles.resendLink}>
                    {resending ? 'Sending…' : 'Resend reset code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

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
    width: 68,
    height: 68,
    borderRadius: 20,
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
  card: {
    borderRadius: 20,
    padding: 20,
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
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  focusedGlow: {
    borderColor: colors.primary[500],
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeButton: {
    padding: 4,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
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
  hintsBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonWrapper: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.sm,
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
    paddingTop: 12,
    borderTopWidth: 1,
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
