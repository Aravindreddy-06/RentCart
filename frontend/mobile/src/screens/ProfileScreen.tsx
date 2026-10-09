/**
 * src/screens/ProfileScreen.tsx (mobile)
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Verified Neighbour</Text>
          </View>
        </View>

        {/* Info list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📞</Text>
            <View>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoVal}>
                {user.phone || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🏠</Text>
            <View>
              <Text style={styles.infoLabel}>Neighbourhood Address</Text>
              <Text style={styles.infoVal}>
                {user.address || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Nav Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('MyItems')}
          >
            <Text style={styles.navLabel}>📦 My Listed Items</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Requests')}
          >
            <Text style={styles.navLabel}>📋 Borrow & Lend Requests</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gray[900],
  },
  userEmail: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 2,
  },
  badge: {
    marginTop: 8,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
  },
  chevron: {
    fontSize: 20,
    color: colors.gray[400],
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});
