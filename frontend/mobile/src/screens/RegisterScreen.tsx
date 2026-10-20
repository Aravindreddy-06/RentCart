/**
 * src/screens/RegisterScreen.tsx (mobile)
 * Polished Registration screen:
 * - Hero icon badge with subtle glow
 * - Soft tinted background with dark mode support
 * - Input icons and teal focused state
 * - Password checklist with checkmark animations/indicators
 * - Fixed +91 Indian phone number input
 * - Gradient primary button
 */

import React, { useState } from 'react';
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
import { colors, gradients, shadows } from '../utils/colors';
import { cleanIndianPhoneInput } from '../utils/phone';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError('Password must be at least 8 characters and include at least one letter and one number.');
      return;
    }

    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim() ? `+91${phone.trim()}` : undefined;
      await register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        address: address.trim() || undefined,
      });

      navigation.navigate('VerifyEmail', { email: normalizedEmail });
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to create account.'
      );
    } finally {
      setLoading(false);
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
                styles.logoBadge,
                {
                  backgroundColor: isDark ? 'rgba(15, 157, 138, 0.15)' : colors.primary[50],
                  borderColor: isDark ? 'rgba(15, 157, 138, 0.3)' : colors.primary[200],
                },
              ]}
            >
              <Ionicons name="person-add" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }]}>Join RentCart</Text>
            <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
              Borrow what you need · Lend what you don't
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Full Name *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedField === 'name' ? colors.primary[500] : themeColors.border,
                  },
                  focusedField === 'name' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={focusedField === 'name' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="e.g. Priya Sharma"
                  placeholderTextColor={themeColors.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Email Address *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedField === 'email' ? colors.primary[500] : themeColors.border,
                  },
                  focusedField === 'email' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Password *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedField === 'password' ? colors.primary[500] : themeColors.border,
                  },
                  focusedField === 'password' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={themeColors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Phone Number (Optional)</Text>
              <View
                style={[
                  styles.phoneInputRow,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedField === 'phone' ? colors.primary[500] : themeColors.border,
                  },
                  focusedField === 'phone' && styles.focusedGlow,
                ]}
              >
                <View
                  style={[
                    styles.phonePrefix,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : '#EEF2F6',
                      borderRightColor: themeColors.border,
                    },
                  ]}
                >
                  <Text style={[styles.phonePrefixText, { color: themeColors.text }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.phoneTextInput, { color: themeColors.text }]}
                  placeholder="98765 43210"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(cleanIndianPhoneInput(text));
                    setError(null);
                  }}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <Text style={[styles.helperText, { color: themeColors.textMuted }]}>
                Indian mobile number · Shared only with confirmed rental partners
              </Text>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Neighbourhood / Area (Optional)</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.dark.background : '#F8FAFC',
                    borderColor:
                      focusedField === 'address' ? colors.primary[500] : themeColors.border,
                  },
                  focusedField === 'address' && styles.focusedGlow,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={focusedField === 'address' ? colors.primary[500] : themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="e.g. Anna Nagar, Chennai"
                  placeholderTextColor={themeColors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Gradient Primary Button */}
            <TouchableOpacity
              onPress={handleRegister}
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
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer Row */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginBottom: 20,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
    maxWidth: 280,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    ...shadows.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRightWidth: 1,
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '700',
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
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
    marginTop: 10,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '700',
  },
});
