/**
 * src/screens/ItemDetailScreen.tsx (mobile)
 * Item Details — swipeable image gallery, owner card, availability badge,
 * owner management (edit, delete, availability toggle), and borrower action.
 * Uses react-native-safe-area-context and pull-to-refresh.
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
import { AppStackParamList } from '../navigation/types';
import { itemsService, Item } from '../services/items.service';
import { reviewsService, Review } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop';

// ─── Image Gallery ────────────────────────────────────────────────────────────

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
          style={{ width: SCREEN_WIDTH, height: 280 }}
          resizeMode="cover"
        />
      )}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const { user } = useAuth();

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
        setReviews(prev => [...prev, ...res.reviews]);
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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !item) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>{error || 'Something went wrong'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchItem()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === item.ownerId;
  const images = item.images.length > 0 ? item.images : [PLACEHOLDER];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
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
                { backgroundColor: item.isAvailable ? '#22c55e' : '#6b7280' },
              ]}
            >
              <View
                style={[
                  styles.availabilityDot,
                  { backgroundColor: item.isAvailable ? '#fff' : '#d1d5db' },
                ]}
              />
              <Text style={styles.availabilityText}>
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Dots indicator */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <View style={styles.content}>
          {/* Category + title */}
          <View style={styles.tagRow}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>

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
              <Text style={styles.noRatingText}>No reviews yet</Text>
            )}
          </View>

          {/* Pricing */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.pricePerDay}</Text>
            <Text style={styles.priceUnit}> / day</Text>
            {item.deposit > 0 && (
              <Text style={styles.deposit}> + ${item.deposit} deposit</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.divider} />

          {/* Owner card */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Owner</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: item.owner.id })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary[600] }}>View Profile →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.ownerCard}
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
              <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                <Text style={styles.ownerAvatarText}>
                  {item.owner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{item.owner.name}</Text>
              {item.owner.address ? (
                <Text style={styles.ownerAddress}>📍 {item.owner.address}</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.gray[400], fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Reviews list */}
          <View style={styles.reviewsSectionHeader}>
            <Text style={styles.sectionLabel}>Reviews ({totalReviews || item.reviewCount || 0})</Text>
          </View>

          {isLoadingReviews ? (
            <ActivityIndicator color={colors.primary[600]} style={{ marginVertical: 16 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyReviewsText}>No reviews for this item yet.</Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeaderRow}>
                    <TouchableOpacity
                      style={styles.reviewerInfo}
                      onPress={() => navigation.navigate('PublicProfile', { userId: rev.author.id })}
                    >
                      {rev.author.avatarUrl ? (
                        <Image source={{ uri: rev.author.avatarUrl }} style={styles.reviewerAvatar} />
                      ) : (
                        <View style={[styles.reviewerAvatar, styles.reviewerAvatarFallback]}>
                          <Text style={styles.reviewerAvatarText}>
                            {rev.author.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.reviewerName}>{rev.author.name}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <StarRating rating={rev.rating} size="sm" />
                  </View>
                  {rev.comment ? (
                    <Text style={styles.reviewCommentText}>{rev.comment}</Text>
                  ) : null}
                </View>
              ))}

              {reviews.length < totalReviews && (
                <TouchableOpacity
                  style={styles.loadMoreReviewsBtn}
                  onPress={handleLoadMoreReviews}
                  disabled={isLoadingMoreReviews}
                >
                  {isLoadingMoreReviews ? (
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                  ) : (
                    <Text style={styles.loadMoreReviewsBtnText}>Load more reviews</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ─────────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            {/* Toggle availability */}
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.isAvailable ? styles.toggleButtonUnavailable : styles.toggleButtonAvailable,
              ]}
              onPress={handleToggleAvailability}
              disabled={isTogglingAvailability}
            >
              {isTogglingAvailability ? (
                <ActivityIndicator color={item.isAvailable ? '#b45309' : '#15803d'} size="small" />
              ) : (
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: item.isAvailable ? '#b45309' : '#15803d' },
                  ]}
                >
                  {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.borrowButton,
              !item.isAvailable && styles.borrowButtonDisabled,
            ]}
            disabled={!item.isAvailable}
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
            <Text
              style={[
                styles.borrowButtonText,
                !item.isAvailable && styles.borrowButtonTextDisabled,
              ]}
            >
              {item.isAvailable ? 'Request to Borrow' : 'Currently Unavailable'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 12,
  },

  // ── Gallery ──────────────────────────────────────────────────────────────────
  galleryContainer: {
    position: 'relative',
  },
  availabilityBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray[300],
  },
  dotActive: {
    backgroundColor: colors.primary[600],
    width: 18,
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  content: {
    padding: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
    marginBottom: 8,
    lineHeight: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary[600],
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray[500],
  },
  deposit: {
    fontSize: 13,
    color: colors.gray[500],
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.gray[700],
  },

  // ── Owner ─────────────────────────────────────────────────────────────────────
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[200],
  },
  ownerAvatarFallback: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[700],
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  ownerAddress: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: '#ffffff',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleButtonAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  toggleButtonUnavailable: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  borrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    paddingVertical: 16,
  },
  borrowButtonDisabled: {
    backgroundColor: colors.gray[200],
  },
  borrowButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  borrowButtonTextDisabled: {
    color: colors.gray[400],
  },

  // ── Error state ───────────────────────────────────────────────────────────────
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 20,
    textAlign: 'center',
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
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: colors.gray[500],
    fontSize: 14,
  },
  ratingSummaryRow: {
    marginVertical: 4,
  },
  noRatingText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 13,
    color: colors.gray[500],
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
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
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewerAvatarFallback: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 13,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[900],
  },
  reviewDate: {
    fontSize: 11,
    color: colors.gray[400],
  },
  reviewCommentText: {
    fontSize: 13,
    color: colors.gray[700],
    lineHeight: 18,
    marginTop: 4,
  },
  loadMoreReviewsBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 10,
    marginTop: 6,
  },
  loadMoreReviewsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[600],
  },
});
