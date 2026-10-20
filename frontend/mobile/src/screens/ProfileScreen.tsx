/**
 * src/screens/ProfileScreen.tsx (mobile)
 * Vibrant profile and settings:
 * - Brand gradient banner behind large avatar
 * - Stats row in coloured chips (items, rating, member since)
 * - Appearance switcher card (System, Light, Dark)
 * - Personal details with Indian phone input and GPS auto-fill
 * - Change password section
 * - Full dark mode support via useTheme
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { usersService } from '../services/users.service';
import { itemsService } from '../services/items.service';
import {
  colors,
  gradients,
  radius,
  shadows,
  getAvatarColor,
  getInitials,
} from '../utils/colors';
import {
  cleanIndianPhoneInput,
  isIndianPhoneNumber,
  getIndianPhoneDigits,
} from '../utils/phone';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { isDark, theme, setTheme, themeColors } = useTheme();

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isIndianPhone, setIsIndianPhone] = useState(true);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number>(0);

  // Status flags
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load user data on mount
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const [data, myItems] = await Promise.all([
          usersService.getMe(),
          itemsService.getMyItems().catch(() => []),
        ]);
        if (mounted) {
          setName(data.name || '');
          const isInd = isIndianPhoneNumber(data.phone);
          setIsIndianPhone(isInd);
          setPhone(isInd ? getIndianPhoneDigits(data.phone) : (data.phone || ''));
          setAddress(data.address || '');
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
          setAvatarUri(data.avatarUrl ?? null);
          setItemCount(myItems.length);
          await updateUser(data);
        }
      } catch {
        if (mounted && user) {
          setName(user.name || '');
          const isInd = isIndianPhoneNumber(user.phone);
          setIsIndianPhone(isInd);
          setPhone(isInd ? getIndianPhoneDigits(user.phone) : (user.phone || ''));
          setAddress(user.address || '');
          setLatitude(user.latitude ?? null);
          setLongitude(user.longitude ?? null);
          setAvatarUri(user.avatarUrl ?? null);
        }
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Avatar Picker & Upload ────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access your photo library is required to upload a profile picture.',
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const selectedUri = pickerResult.assets[0].uri;
        setAvatarUri(selectedUri);
        setIsUploadingAvatar(true);

        try {
          const { avatarUrl, user: updatedUser } = await usersService.uploadAvatar(selectedUri);
          setAvatarUri(avatarUrl);
          await updateUser(updatedUser);
          Alert.alert('Success', 'Profile photo updated successfully!');
        } catch (uploadErr: any) {
          Alert.alert('Upload Failed', uploadErr?.response?.data?.message || 'Failed to upload photo.');
          setAvatarUri(user?.avatarUrl ?? null);
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch {
      Alert.alert('Error', 'Unable to open photo picker.');
    }
  };

  // ── Geolocation Detection ─────────────────────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Please allow location access in your device settings to auto-fill your coordinates.',
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = Math.round(loc.coords.latitude * 100000) / 100000;
      const lng = Math.round(loc.coords.longitude * 100000) / 100000;
      setLatitude(lat);
      setLongitude(lng);

      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) {
          const parts = [geo.name, geo.street, geo.subregion || geo.district, geo.city]
            .filter(Boolean)
            .join(', ');
          if (parts) setAddress(parts);
        }
      } catch {
        // Reverse geocode optional
      }

      Alert.alert('Location Detected! 📍', `Coordinates updated to ${lat}, ${lng}.`);
    } catch {
      Alert.alert('Error', 'Unable to retrieve your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  // ── Save Personal Details ─────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full name is required.');
      return;
    }

    let formattedPhone = phone.trim();
    if (formattedPhone) {
      if (isIndianPhone) {
        if (formattedPhone.length !== 10) {
          Alert.alert('Validation Error', 'Indian phone number must be 10 digits.');
          return;
        }
        formattedPhone = `+91${formattedPhone}`;
      }
    } else {
      formattedPhone = '';
    }

    setIsSavingProfile(true);
    try {
      const updated = await usersService.updateMe({
        name: name.trim(),
        phone: formattedPhone || null,
        address: address.trim() || null,
        latitude: latitude != null && !isNaN(latitude) ? latitude : null,
        longitude: longitude != null && !isNaN(longitude) ? longitude : null,
      });
      await updateUser(updated);
      Alert.alert('Saved! ✓', 'Your profile details have been saved.');
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message || 'Could not update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Change Password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Validation Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await usersService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed.');
    } catch (err: any) {
      Alert.alert('Password Error', err?.response?.data?.message || 'Could not update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RentCart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  const memberYear = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Gradient Banner with Avatar ──────────────────────────────── */}
          <View style={styles.bannerContainer}>
            <LinearGradient
              colors={gradients.brand as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBanner}
            />

            {/* Overlapping Avatar */}
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={styles.avatarTouchable}
                activeOpacity={0.85}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: getAvatarColor(name || 'Neighbor') },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>
                      {getInitials(name || 'Neighbor')}
                    </Text>
                  </View>
                )}

                {isUploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                ) : (
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={14} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {name || 'Neighbor'}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.textMuted }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          {/* ── Stats Row in Coloured Chips ──────────────────────────────── */}
          <View style={styles.statsRow}>
            {/* Items Listed */}
            <View
              style={[
                styles.statChip,
                {
                  backgroundColor: isDark ? 'rgba(15, 157, 138, 0.15)' : colors.primary[50],
                  borderColor: isDark ? 'rgba(15, 157, 138, 0.3)' : colors.primary[100],
                },
              ]}
            >
              <Ionicons name="cube-outline" size={16} color={colors.primary[500]} />
              <View>
                <Text style={[styles.statValue, { color: colors.primary[600] }]}>
                  {itemCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.primary[700] }]}>
                  {itemCount === 1 ? 'Item' : 'Items'}
                </Text>
              </View>
            </View>

            {/* Rating */}
            <View
              style={[
                styles.statChip,
                {
                  backgroundColor: isDark ? 'rgba(245, 179, 1, 0.15)' : '#fef3c7',
                  borderColor: isDark ? 'rgba(245, 179, 1, 0.3)' : '#fde68a',
                },
              ]}
            >
              <Ionicons name="star" size={16} color={colors.gold} />
              <View>
                <Text style={[styles.statValue, { color: '#b45309' }]}>
                  {(user as any)?.rating ? (user as any).rating.toFixed(1) : '5.0'}
                </Text>
                <Text style={[styles.statLabel, { color: '#92400e' }]}>Rating</Text>
              </View>
            </View>

            {/* Member Since */}
            <View
              style={[
                styles.statChip,
                {
                  backgroundColor: isDark ? 'rgba(91, 91, 214, 0.15)' : colors.secondary[50],
                  borderColor: isDark ? 'rgba(91, 91, 214, 0.3)' : colors.secondary[100],
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.secondary[500]} />
              <View>
                <Text style={[styles.statValue, { color: colors.secondary[500] }]}>
                  {memberYear}
                </Text>
                <Text style={[styles.statLabel, { color: colors.secondary[600] }]}>Member</Text>
              </View>
            </View>
          </View>

          {/* ── Appearance / Dark Mode Toggle ────────────────────────────── */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name="moon-outline" size={18} color={colors.primary[500]} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Appearance</Text>
            </View>

            <View style={styles.themeToggleRow}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                const isActive = theme === mode;
                const iconMap: Record<ThemeMode, any> = {
                  system: 'phone-portrait-outline',
                  light: 'sunny-outline',
                  dark: 'moon',
                };
                const labelMap: Record<ThemeMode, string> = {
                  system: 'System',
                  light: 'Light',
                  dark: 'Dark',
                };

                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.themeModeBtn,
                      {
                        backgroundColor: isActive
                          ? colors.primary[500]
                          : isDark
                          ? colors.dark.surfaceHover
                          : colors.neutral[100],
                        borderColor: isActive ? colors.primary[600] : themeColors.border,
                      },
                    ]}
                    onPress={() => setTheme(mode)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={iconMap[mode]}
                      size={16}
                      color={isActive ? '#ffffff' : themeColors.textMuted}
                    />
                    <Text
                      style={[
                        styles.themeModeLabel,
                        {
                          color: isActive ? '#ffffff' : themeColors.text,
                          fontWeight: isActive ? '700' : '600',
                        },
                      ]}
                    >
                      {labelMap[mode]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Personal Details ──────────────────────────────────────────── */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name="person-outline" size={18} color={colors.primary[500]} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                Personal Details
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Phone Number</Text>
              {isIndianPhone ? (
                <View
                  style={[
                    styles.phoneInputRow,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneTextInput, { color: themeColors.text }]}
                    value={phone}
                    onChangeText={(text) => setPhone(cleanIndianPhoneInput(text))}
                    placeholder="98765 43210"
                    placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    },
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+44 7911 123456"
                  placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                  keyboardType="phone-pad"
                />
              )}
              <Text style={[styles.helperText, { color: themeColors.textMuted }]}>
                {isIndianPhone
                  ? 'Indian mobile number · Visible to confirmed borrowers/lenders.'
                  : 'International phone number · Visible to confirmed borrowers/lenders.'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Street Address</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Anna Nagar, Chennai"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </View>

            {/* Location Coordinates */}
            <View
              style={[
                styles.locationContainer,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={styles.locationHeader}>
                <View>
                  <Text style={[styles.locationTitle, { color: themeColors.text }]}>
                    📍 Neighbourhood Location
                  </Text>
                  <Text style={[styles.locationSubtitle, { color: themeColors.textMuted }]}>
                    Used for nearby search when device GPS is idle.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.gpsButton,
                    {
                      backgroundColor: isDark ? 'rgba(15, 157, 138, 0.2)' : colors.primary[50],
                      borderColor: isDark ? 'rgba(15, 157, 138, 0.4)' : colors.primary[100],
                    },
                  ]}
                  onPress={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  ) : (
                    <Text style={[styles.gpsButtonText, { color: colors.primary[600] }]}>
                      🎯 GPS
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.coordsRow}>
                <View style={styles.coordField}>
                  <Text style={[styles.coordLabel, { color: themeColors.textMuted }]}>
                    Latitude
                  </Text>
                  <TextInput
                    style={[
                      styles.coordInput,
                      {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      },
                    ]}
                    value={latitude != null ? String(latitude) : ''}
                    onChangeText={(t) => setLatitude(t ? parseFloat(t) : null)}
                    placeholder="13.0827"
                    placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.coordField}>
                  <Text style={[styles.coordLabel, { color: themeColors.textMuted }]}>
                    Longitude
                  </Text>
                  <TextInput
                    style={[
                      styles.coordInput,
                      {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      },
                    ]}
                    value={longitude != null ? String(longitude) : ''}
                    onChangeText={(t) => setLongitude(t ? parseFloat(t) : null)}
                    placeholder="80.2707"
                    placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Save Details CTA with Brand Gradient */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
              activeOpacity={0.85}
              style={{ marginTop: 6 }}
            >
              <LinearGradient
                colors={gradients.brand as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Details</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Security & Change Password ───────────────────────────────── */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary[500]} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                Change Password
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                Current Password *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                New Password * (min 8 chars)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                Confirm New Password *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.passwordButton,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                  borderColor: themeColors.border,
                },
              ]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Text style={[styles.passwordButtonText, { color: themeColors.text }]}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Sign Out ─────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Banner with Avatar ──────────────────────────────────────────────────────
  bannerContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  gradientBanner: {
    height: 100,
    width: '100%',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: -44,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...shadows.sm,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },

  // ── Stats Row ───────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Section Cards ───────────────────────────────────────────────────────────
  card: {
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  // ── Theme Mode Buttons ──────────────────────────────────────────────────────
  themeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  themeModeLabel: {
    fontSize: 13,
  },

  // ── Inputs ──────────────────────────────────────────────────────────────────
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: 'rgba(15, 157, 138, 0.08)',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600],
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },

  // ── Location ────────────────────────────────────────────────────────────────
  locationContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  gpsButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  gpsButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },

  // ── Buttons ─────────────────────────────────────────────────────────────────
  saveButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  passwordButton: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  passwordButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    marginTop: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
});
