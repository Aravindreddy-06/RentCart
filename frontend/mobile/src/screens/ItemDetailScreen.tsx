/**
 * src/screens/ItemDetailScreen.tsx (mobile)
 * Vibrant, modern item details:
 * - Swipeable image gallery with indicator dots
 * - Price in orange with "per day" caption
 * - Deposit in a tinted info chip
 * - Owner card with avatar and initials
 * - Verified/rating details
 * - Sticky bottom action bar with brand gradient "Request to Borrow" button
 * - Full dark mode support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { itemsService, Item } from '../services/items.service';
import { reviewsService, Review } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  colors,
  gradients,
  radius,
  shadows,
  CATEGORY_THEMES,
  CategoryKey,
  getAvatarColor,
  getInitials,
} from '../utils/colors';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop';

interface GalleryProps {
  images: string[];
  onIndexChange: (index: number) => void;
}

function ImageGallery({ images, onIndexChange }: GalleryProps) {
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        onIndexChange(viewableItems[0].index);
      }
    }
  ).current;

  return (
    <FlatList
      data={images}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item: uri }) => (
        <Image
          source={{ uri }}
          style={{ width: SCREEN_WIDTH, height: 300 }}
          resizeMode="cover"
        />
      )}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
}

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const { user } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

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
      const res = await reviewsService.getItemReviews(itemId, { page, limit: 5 });
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
  }, [itemId]);

  const fetchItem = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await itemsService.getById(itemId);
      setItem(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setError('Item not found.');
      else if (status === 401) navigation.replace('Home');
      else setError('Failed to load item details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId, navigation]);

  useEffect(() => {
    fetchItem();
    fetchReviews(1);
  }, [fetchItem, fetchReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItem(true);
    fetchReviews(1, true);
  };

  const handleLoadMoreReviews = () => {
    if (!isLoadingMoreReviews && reviews.length < totalReviews) {
      fetchReviews(reviewsPage + 1);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemsService.delete(itemId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async () => {
    if (!item) return;
    setIsTogglingAvailability(true);
    try {
      const updated = await itemsService.toggleAvailability(item.id, !item.isAvailable);
      setItem(updated);
    } catch {
      Alert.alert('Error', 'Failed to update availability.');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: themeColors.background }]}
      >
        <Ionicons name="alert-circle" size={48} color={colors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: themeColors.text }]}>
          {error || 'Something went wrong'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchItem()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: themeColors.textMuted }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === item.ownerId;
  const images = item.images.length > 0 ? item.images : [PLACEHOLDER];
  const catKey = (item.category in CATEGORY_THEMES ? item.category : 'Other') as CategoryKey;
  const catTheme = CATEGORY_THEMES[catKey];
  const ownerName = item.owner?.name || 'Item Owner';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* ── Image Gallery ─────────────────────────────────────────────────── */}
        <View style={styles.galleryContainer}>
          <ImageGallery images={images} onIndexChange={setActiveImageIndex} />

          {/* Availability badge */}
          <View style={styles.availabilityBadgeContainer}>
            <View
              style={[
                styles.availabilityBadge,
                {
                  backgroundColor: item.isAvailable
                    ? colors.success
                    : isDark
                    ? colors.neutral[600]
                    : colors.neutral[500],
                },
              ]}
            >
              <View style={styles.availabilityDot} />
              <Text style={styles.availabilityText}>
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Dots indicator */}
          {images.length > 1 && (
            <View
              style={[
                styles.dotsContainer,
                { backgroundColor: themeColors.surface },
              ]}
            >
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === activeImageIndex
                          ? colors.primary[500]
                          : isDark
                          ? colors.dark.border
                          : colors.neutral[300],
                    },
                    i === activeImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <View style={[styles.content, { backgroundColor: themeColors.surface }]}>
          {/* Category Chip */}
          <View style={styles.tagRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: isDark ? catTheme.darkTint : catTheme.tint,
                  borderColor: isDark ? catTheme.darkBorder : catTheme.border,
                },
              ]}
            >
              <Ionicons name={catTheme.ioniconName} size={13} color={catTheme.primary} />
              <Text style={[styles.categoryBadgeText, { color: catTheme.primary }]}>
                {item.category}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: themeColors.text }]}>{item.title}</Text>

          {/* Rating summary */}
          <View style={styles.ratingSummaryRow}>
            {item.reviewCount && item.reviewCount > 0 ? (
              <StarRating
                rating={item.averageRating || 0}
                size="sm"
                showValue
                reviewCount={item.reviewCount}
              />
            ) : (
              <Text style={[styles.noRatingText, { color: themeColors.textMuted }]}>
                No reviews yet
              </Text>
            )}
          </View>

          {/* Pricing Row in Orange */}
          <View style={styles.priceRow}>
            <View style={styles.pricePill}>
              <Text style={styles.price}>{formatINR(item.pricePerDay)}</Text>
              <Text style={styles.priceUnit}> / day</Text>
            </View>
            {item.deposit > 0 && (
              <View
                style={[
                  styles.depositChip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(91, 91, 214, 0.15)'
                      : colors.secondary[50],
                    borderColor: isDark
                      ? 'rgba(91, 91, 214, 0.3)'
                      : colors.secondary[200],
                  },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.secondary[500]} />
                <Text style={styles.depositText}>
                  {formatINR(item.deposit)} refundable deposit
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: themeColors.text }]}>
            {item.description}
          </Text>

          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

          {/* Owner card */}
          <View style={styles.ownerHeaderRow}>
            <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Owner</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PublicProfile', { userId: item.owner.id })}
            >
              <Text style={[styles.viewProfileText, { color: colors.primary[500] }]}>
                View Profile →
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.ownerCard,
              {
                backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                borderColor: themeColors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PublicProfile', { userId: item.owner.id })}
          >
            {item.owner.avatarUrl ? (
              <Image
                source={{ uri: item.owner.avatarUrl }}
                style={styles.ownerAvatar}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.ownerAvatar,
                  { backgroundColor: getAvatarColor(ownerName) },
                ]}
              >
                <Text style={styles.ownerAvatarText}>{getInitials(ownerName)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.ownerName, { color: themeColors.text }]}>
                {ownerName}
              </Text>
              {item.owner.address ? (
                <Text style={[styles.ownerAddress, { color: themeColors.textMuted }]}>
                  📍 {item.owner.address}
                </Text>
              ) : (
                <Text style={[styles.ownerAddress, { color: themeColors.textMuted }]}>
                  Verified Member
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

          {/* Reviews list */}
          <View style={styles.reviewsSectionHeader}>
            <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
              Reviews ({totalReviews || item.reviewCount || 0})
            </Text>
          </View>

          {isLoadingReviews ? (
            <ActivityIndicator color={colors.primary[500]} style={{ marginVertical: 16 }} />
          ) : reviews.length === 0 ? (
            <Text style={[styles.emptyReviewsText, { color: themeColors.textMuted }]}>
              No reviews for this item yet.
            </Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[
                    styles.reviewItem,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <View style={styles.reviewHeaderRow}>
                    <TouchableOpacity
                      style={styles.reviewerInfo}
                      onPress={() => navigation.navigate('PublicProfile', { userId: rev.author.id })}
                    >
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
                    </TouchableOpacity>
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
        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.isAvailable
                  ? {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fcd34d',
                    }
                  : {
                      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
                      borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : '#86efac',
                    },
              ]}
              onPress={handleToggleAvailability}
              disabled={isTogglingAvailability}
            >
              {isTogglingAvailability ? (
                <ActivityIndicator
                  color={item.isAvailable ? '#b45309' : '#15803d'}
                  size="small"
                />
              ) : (
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: item.isAvailable ? '#d97706' : '#16a34a' },
                  ]}
                >
                  {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            disabled={!item.isAvailable}
            activeOpacity={0.85}
            onPress={() => {
              navigation.navigate('RequestBorrow', {
                itemId: item.id,
                title: item.title,
                pricePerDay: item.pricePerDay,
                deposit: item.deposit,
                ownerName: item.owner.name,
              });
            }}
          >
            {item.isAvailable ? (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.borrowButtonGradient}
              >
                <Ionicons name="hand-right-outline" size={18} color="#ffffff" />
                <Text style={styles.borrowButtonText}>Request to Borrow</Text>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.borrowButtonGradient,
                  { backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[300] },
                ]}
              >
                <Text
                  style={[
                    styles.borrowButtonText,
                    { color: isDark ? colors.dark.textMuted : colors.neutral[500] },
                  ]}
                >
                  Currently Unavailable
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    paddingBottom: 20,
  },

  // ── Gallery ──────────────────────────────────────────────────────────────────
  galleryContainer: {
    position: 'relative',
  },
  availabilityBadgeContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  availabilityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  content: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    ...shadows.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 28,
  },
  ratingSummaryRow: {
    marginVertical: 4,
  },
  noRatingText: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 16,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 138, 31, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accent[500],
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent[600],
  },
  depositChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  depositText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary[500],
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },

  // ── Owner ─────────────────────────────────────────────────────────────────────
  ownerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  ownerAddress: {
    fontSize: 12,
    marginTop: 2,
  },

  // ── Reviews ───────────────────────────────────────────────────────────────────
  reviewsSectionHeader: {
    marginBottom: 10,
  },
  emptyReviewsText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  reviewsList: {
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
    marginTop: 6,
  },
  loadMoreReviewsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Bottom Bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  borrowButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 14,
    ...shadows.sm,
  },
  borrowButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  // ── States ────────────────────────────────────────────────────────────────────
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
  },
});
