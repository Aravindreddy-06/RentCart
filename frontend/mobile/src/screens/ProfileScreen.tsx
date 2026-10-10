/**
 * src/screens/ProfileScreen.tsx (mobile)
 * Full profile management matching web features:
 * - Avatar upload with expo-image-picker
 * - Edit name, phone, address
 * - "Use my current location" with expo-location (handles permission denied gracefully)
 * - Change password form (min 8 chars, validates current password)
 * - Sign out
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
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/users.service';
import { colors } from '../utils/colors';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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
        const data = await usersService.getMe();
        if (mounted) {
          setName(data.name || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
          setAvatarUri(data.avatarUrl ?? null);
          await updateUser(data);
        }
      } catch {
        // Fall back to cached user in context
        if (mounted && user) {
          setName(user.name || '');
          setPhone(user.phone || '');
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
      Alert.alert('Location Detected', `Coordinates set to ${lat}, ${lng}`);
    } catch (err: any) {
      Alert.alert('Location Error', err?.message || 'Failed to detect location.');
    } finally {
      setIsLocating(false);
    }
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await usersService.updateMe({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      });
      await updateUser(updated);
      Alert.alert('Success', 'Profile details saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save changes.');
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
    if (newPassword.length < 8) {
      Alert.alert('Validation Error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await usersService.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Password Error', err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RentCart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Title */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>Profile & Settings</Text>
            <Text style={styles.pageSubtitle}>
              Update your neighbourhood details and account security.
            </Text>
          </View>

          {/* ── Avatar Section ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={styles.avatarTouchable}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isUploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                ) : (
                  <View style={styles.cameraBadge}>
                    <Text style={styles.cameraIcon}>📷</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.avatarTextContainer}>
                <Text style={styles.profileName}>{name || 'Neighbour'}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                  style={styles.changePhotoButton}
                >
                  <Text style={styles.changePhotoText}>
                    {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Personal Details ──────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1-555-0101"
                placeholderTextColor={colors.gray[400]}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Only visible to neighbours with APPROVED or ACTIVE rentals.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 12 Maple Street, Springfield"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            {/* Location Coordinates */}
            <View style={styles.locationContainer}>
              <View style={styles.locationHeader}>
                <View>
                  <Text style={styles.locationTitle}>📍 Home Location</Text>
                  <Text style={styles.locationSubtitle}>
                    Used to find nearby items when GPS is unavailable.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                  ) : (
                    <Text style={styles.gpsButtonText}>🎯 GPS</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.coordsRow}>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={latitude != null ? String(latitude) : ''}
                    onChangeText={(t) => setLatitude(t ? parseFloat(t) : null)}
                    placeholder="37.7749"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={longitude != null ? String(longitude) : ''}
                    onChangeText={(t) => setLongitude(t ? parseFloat(t) : null)}
                    placeholder="-122.4194"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Details</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Security & Change Password ───────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password *</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password * (min 8 chars)</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password *</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.gray[400]}
              />
            </View>

            <TouchableOpacity
              style={styles.passwordButton}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color={colors.gray[700]} />
              ) : (
                <Text style={styles.passwordButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Sign Out ─────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
    backgroundColor: colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[500],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 4,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 14,
  },

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.gray[100],
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary[700],
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cameraIcon: {
    fontSize: 12,
  },
  avatarTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  profileEmail: {
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 8,
  },
  changePhotoButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[700],
  },

  // ── Form Inputs ─────────────────────────────────────────────────────────────
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.gray[900],
  },
  helperText: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 4,
  },

  // ── Location ────────────────────────────────────────────────────────────────
  locationContainer: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
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
    color: colors.gray[800],
  },
  locationSubtitle: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
  },
  gpsButton: {
    backgroundColor: '#ffffff',
    borderColor: colors.gray[300],
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gpsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray[500],
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: '#ffffff',
    borderColor: colors.gray[200],
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.gray[800],
  },

  // ── Buttons ─────────────────────────────────────────────────────────────────
  saveButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  passwordButton: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  passwordButtonText: {
    color: colors.gray[800],
    fontWeight: '700',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
});
