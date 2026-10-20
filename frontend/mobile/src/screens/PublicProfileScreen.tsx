/**
 * src/screens/PublicProfileScreen.tsx (mobile)
 * Public view of another user's profile:
 * - Brand gradient banner behind large avatar
 * - Stats row in coloured chips (items, rating, member since)
 * - Section cards for available listings and reviews
 * - Consistent avatar initials with palette colors
 * - Full dark mode support via useTheme
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { usersService, type PublicUserProfile } from '../services/users.service';
import { reviewsService, type Review } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { type Item } from '../services/items.service';
import { useTheme } from '../context/ThemeContext';
import {
  colors,
  gradients,
  radius,
  shadows,
  getAvatarColor,
  getInitials,
} from '../utils/colors';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { isDark, themeColors } = useTheme();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);

  const fetchReviews = useCallback(async (page = 1, isRefresh = false) => {
    if (page === 1 && !isRefresh) setIsLoadingReviews(true);
    if (page > 1) setIsLoadingMoreReviews(true);
    try {
      const res = await reviewsService.getUserReviews(userId, { page, limit: 5 });
      if (page === 1) {
        setReviews(res.reviews);
      } else {
        setReviews((prev) => [...prev, ...res.reviews]);
      }
      setReviewsPage(page);
      setTotalReviews(res.pagination.total);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingReviews(false);
      setIsLoadingMoreReviews(false);
    }
  }, [userId]);

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
    fetchReviews(1);
  }, [fetchProfile, fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchReviews(1, true);
  };

  const handleLoadMoreReviews = () => {
    if (!isLoadingMoreReviews && reviews.length < totalReviews) {
      fetchReviews(reviewsPage + 1);
    }
  };

  const formatMemberYear = (isoString?: string) => {
    try {
      if (!isoString) return 'Member';
      const d = new Date(isoString);
      return String(d.getFullYear());
    } catch {
      return 'Member';
    }
  };

  if (isLoading) {
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

  if (error || !profile) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: themeColors.background }]}
      >
        <Ionicons name="alert-circle" size={48} color={colors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: themeColors.text }]}>User Not Found</Text>
        <Text style={[styles.errorSubtitle, { color: themeColors.textMuted }]}>
          {error || 'Unable to retrieve this user.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: themeColors.textMuted }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderItemCard = ({ item }: { item: Item }) => {
    const imageUrl = item.images?.[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
      >
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        <View style={styles.itemBody}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text
            style={[styles.itemTitle, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillAmount}>{formatINR(item.pricePerDay)}</Text>
            <Text style={styles.pricePillUnit}>/ day</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* ── Gradient Banner with Avatar ──────────────────────────────── */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={gradients.brand as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBanner}
          />

          <View style={styles.avatarWrapper}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: getAvatarColor(profile.name) },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {getInitials(profile.name)}
                </Text>
              </View>
            )}

            <Text style={[styles.name, { color: themeColors.text }]}>{profile.name}</Text>

            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
              <Text style={styles.verifiedText}>Verified Neighbour</Text>
            </View>

            {/* Rating Summary */}
            <View style={styles.ratingSummaryRow}>
              {profile.reviewCount && profile.reviewCount > 0 ? (
                <StarRating
                  rating={profile.averageRating || 0}
                  size="sm"
                  showValue
                  reviewCount={profile.reviewCount}
                />
              ) : (
                <Text style={[styles.noRatingText, { color: themeColors.textMuted }]}>
                  No reviews yet
                </Text>
              )}
            </View>
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
                {profile.itemCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.primary[700] }]}>
                {profile.itemCount === 1 ? 'Item' : 'Items'}
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
                {profile.averageRating ? profile.averageRating.toFixed(1) : '5.0'}
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
                {formatMemberYear(profile.memberSince)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary[600] }]}>Member</Text>
            </View>
          </View>
        </View>

        {/* ── Area Location Notice ─────────────────────────────────────── */}
        {profile.addressArea && (
          <View
            style={[
              styles.areaBadge,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Ionicons name="location-outline" size={16} color={colors.primary[500]} />
            <Text style={[styles.areaText, { color: themeColors.text }]}>
              {profile.addressArea}
            </Text>
          </View>
        )}

        {/* ── Listings Section ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Items by {profile.name.split(' ')[0]} ({profile.items.length})
          </Text>
        </View>

        {profile.items.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Ionicons name="cube-outline" size={36} color={colors.primary[500]} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
              No items currently listed by this neighbour.
            </Text>
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

        {/* ── Reviews Received Section ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Reviews Received ({totalReviews || profile.reviewCount || 0})
          </Text>
        </View>

        {isLoadingReviews ? (
          <ActivityIndicator color={colors.primary[500]} style={{ marginVertical: 16 }} />
        ) : reviews.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Ionicons name="star-outline" size={36} color={colors.gold} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
              No reviews received yet.
            </Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((rev) => (
              <View
                key={rev.id}
                style={[
                  styles.reviewItem,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <View style={styles.reviewHeaderRow}>
                  <View style={styles.reviewerInfo}>
                    {rev.author.avatarUrl ? (
                      <Image source={{ uri: rev.author.avatarUrl }} style={styles.reviewerAvatar} />
                    ) : (
                      <View
                        style={[
                          styles.reviewerAvatar,
                          { backgroundColor: getAvatarColor(rev.author.name) },
                        ]}
                      >
                        <Text style={styles.reviewerAvatarText}>
                          {getInitials(rev.author.name)}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.reviewerName, { color: themeColors.text }]}>
                        {rev.author.name}
                      </Text>
                      <Text style={[styles.reviewDate, { color: themeColors.textMuted }]}>
                        {formatDateDMY(rev.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={rev.rating} size="sm" />
                </View>
                {rev.comment ? (
                  <Text style={[styles.reviewCommentText, { color: themeColors.text }]}>
                    {rev.comment}
                  </Text>
                ) : null}
              </View>
            ))}

            {reviews.length < totalReviews && (
              <TouchableOpacity
                style={[
                  styles.loadMoreReviewsBtn,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                  },
                ]}
                onPress={handleLoadMoreReviews}
                disabled={isLoadingMoreReviews}
              >
                {isLoadingMoreReviews ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Text style={[styles.loadMoreReviewsBtnText, { color: colors.primary[500] }]}>
                    Load more reviews
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
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
    fontSize: 14,
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
  name: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
  },
  ratingSummaryRow: {
    marginVertical: 2,
  },
  noRatingText: {
    fontSize: 12,
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
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  areaText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Listings Section ────────────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  itemImage: {
    width: '100%',
    height: 110,
  },
  itemBody: {
    padding: 10,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[500],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 138, 31, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  pricePillAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent[500],
  },
  pricePillUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent[600],
    marginLeft: 2,
  },

  // ── Reviews List ────────────────────────────────────────────────────────────
  reviewsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  reviewItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 11,
  },
  reviewCommentText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  loadMoreReviewsBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginTop: 4,
  },
  loadMoreReviewsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
