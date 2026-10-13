/**
 * src/screens/RegisterScreen.tsx (mobile)
 * Registration screen with password rules (min 8 chars, at least 1 letter, 1 number),
 * password requirement indicators, and navigation to VerifyEmail.
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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

    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      // Navigate to VerifyEmail screen
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Join RentCart</Text>
            <Text style={styles.subtitle}>
              Connect with your local community to share and borrow items
            </Text>
          </View>

          <View style={styles.formCard}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor={colors.gray[400]}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
                placeholderTextColor={colors.gray[400]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {/* Password strength hints */}
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 555-0192"
                placeholderTextColor={colors.gray[400]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Neighbourhood / Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Oakwood Heights, Apt 4B"
                placeholderTextColor={colors.gray[400]}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
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
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.gray[200],
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
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 6,
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
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  linkText: {
    fontSize: 14,
    color: colors.primary[600],
    fontWeight: '700',
  },
});
