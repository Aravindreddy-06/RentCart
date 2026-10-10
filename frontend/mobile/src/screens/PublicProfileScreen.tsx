/**
 * src/screens/PublicProfileScreen.tsx (mobile)
 * Public view of another user's profile.
 * Displays name, avatar, general area, member since, item count, and available listings.
 * Never exposes email, phone, or exact coordinates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { usersService, type PublicUserProfile } from '../services/users.service';
import { type Item } from '../services/items.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setError('');
      const data = await usersService.getPublicProfile(userId);
      setProfile(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load user profile.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>User Not Found</Text>
        <Text style={styles.errorSubtitle}>{error || 'Unable to retrieve this user.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderItemCard = ({ item }: { item: Item }) => {
    const imageUrl = item.images?.[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
    return (
      <TouchableOpacity
        style={styles.itemCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        <View style={styles.itemBody}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>
            ${item.pricePerDay} <Text style={styles.itemPriceUnit}>/ day</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]]} />}
      >
        {/* Profile Card Header */}
        <View style={styles.headerCard}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified Neighbour</Text>
          </View>

          <View style={styles.metaRow}>
            {profile.addressArea && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{profile.addressArea}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🗓️</Text>
              <Text style={styles.metaText}>Joined {formatDate(profile.memberSince)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📦</Text>
              <Text style={styles.metaText}>
                {profile.itemCount} {profile.itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
        </View>

        {/* Listings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Items by {profile.name.split(' ')[0]} ({profile.items.length})
          </Text>
        </View>

        {profile.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No items currently listed by this neighbour.</Text>
          </View>
        ) : (
          <FlatList
            data={profile.items}
            keyExtractor={(i) => i.id}
            renderItem={renderItemCard}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
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
    padding: 24,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[500],
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: colors.gray[500],
    fontSize: 14,
  },

  // ── Header Card ─────────────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: colors.gray[100],
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary[700],
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gray[900],
    marginBottom: 6,
  },
  verifiedBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 16,
  },
  verifiedText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: 14,
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
  },

  // ── Grid Items ──────────────────────────────────────────────────────────────
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '48%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.gray[100],
  },
  itemBody: {
    padding: 10,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[600],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary[700],
  },
  itemPriceUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray[400],
  },
});
