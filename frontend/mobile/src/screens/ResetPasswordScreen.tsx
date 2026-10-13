/**
 * src/screens/ResetPasswordScreen.tsx (mobile)
 * Reset password screen with 6-box OTP input, new password strength checklist,
 * confirm password, show/hide toggle, resend countdown, and redirect to Login on success.
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { authService } from '../services/auth.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const initialEmail = route.params?.email || '';
  const initialInfoMessage = route.params?.infoMessage || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
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

    // Handle paste
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

      // Navigate to Login with success banner
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to your email and your new password.
            </Text>
          </View>

          <View style={styles.card}>
            {infoMessage && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <Text style={styles.attemptsText}>
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining.
                  </Text>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.otpLabel}>6-DIGIT RESET CODE</Text>
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(ref) => {
                    inputRefs.current[idx] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    error ? styles.otpBoxError : null,
                  ]}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(idx, val)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>New Password</Text>
                <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
                  <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.gray[400]}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              {/* Password hints */}
              <View style={styles.hintsBox}>
                <View style={styles.hintRow}>
                  <Text style={[styles.hintDot, hasMinLength && styles.hintDotActive]}>
                    {hasMinLength ? '✓' : '•'}
                  </Text>
                  <Text style={[styles.hintText, hasMinLength && styles.hintTextActive]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.hintRow}>
                  <Text style={[styles.hintDot, hasLetter && styles.hintDotActive]}>
                    {hasLetter ? '✓' : '•'}
                  </Text>
                  <Text style={[styles.hintText, hasLetter && styles.hintTextActive]}>
                    At least one letter (a-z, A-Z)
                  </Text>
                </View>
                <View style={styles.hintRow}>
                  <Text style={[styles.hintDot, hasNumber && styles.hintDotActive]}>
                    {hasNumber ? '✓' : '•'}
                  </Text>
                  <Text style={[styles.hintText, hasNumber && styles.hintTextActive]}>
                    At least one number (0-9)
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)}>
                  <Text style={styles.toggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Repeat your new password"
                placeholderTextColor={colors.gray[400]}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendSection}>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>
                  Resend code in <Text style={styles.cooldownBold}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
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
          >
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: 24,
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
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  infoContainer: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    color: colors.primary[700],
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  attemptsText: {
    color: '#b91c1c',
    fontSize: 11,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },
  input: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[400],
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
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  otpBoxFilled: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  otpBoxError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  hintsBox: {
    marginTop: 8,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintDot: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[400],
    width: 14,
  },
  hintDotActive: {
    color: colors.primary[600],
  },
  hintText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  hintTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendSection: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cooldownText: {
    fontSize: 12,
    color: colors.gray[400],
  },
  cooldownBold: {
    fontWeight: '700',
    color: colors.gray[700],
  },
  resendLink: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.gray[500],
    fontWeight: '600',
  },
});
