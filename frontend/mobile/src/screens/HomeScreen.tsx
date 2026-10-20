/**
 * src/screens/HomeScreen.tsx (mobile)
 * Vibrant, modern marketplace design with:
 * - Brand gradient header with personalized greeting
 * - Floating rounded search bar with focus states
 * - Coloured category chips with Ionicons (solid when active, tinted when inactive)
 * - Distance selector chips (1, 2, 5, 10, 25 km, Anywhere)
 * - Modern item cards with orange price pill, gold stars, distance chip, and availability status
 * - Full dark mode support via useTheme
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { itemsService, Item } from '../services/items.service';
import { notificationsService } from '../services/notifications.service';
import { StarRating } from '../components/StarRating';
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

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const CATEGORIES: CategoryKey[] = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];
const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Anywhere', value: null },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
];

function ItemSkeleton({ isDark }: { isDark: boolean }) {
  const bg = isDark ? colors.dark.surfaceHover : colors.neutral[200];
  const cardBg = isDark ? colors.dark.card : '#ffffff';
  const borderCol = isDark ? colors.dark.border : colors.border;

  return (
    <View style={[styles.cardSkeleton, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.imageSkeleton, { backgroundColor: bg }]} />
      <View style={styles.bodySkeleton}>
        <View style={[styles.badgeSkeleton, { backgroundColor: bg }]} />
        <View style={[styles.titleSkeleton, { backgroundColor: bg }]} />
        <View style={[styles.priceSkeleton, { backgroundColor: bg }]} />
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Radius & Location state
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setLocationSource] = useState<'device' | 'profile' | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Poll unread count every 30s + refresh on AppState active or screen focus
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // Silently ignore background polling errors
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchUnread();
      }
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchUnread();
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
      unsubscribeFocus();
    };
  }, [navigation]);

  // ── Geolocation & Radius Handler ───────────────────────────────────────────
  const handleRadiusSelect = async (radiusKm: number | null) => {
    if (radiusKm === null) {
      setSelectedRadius(null);
      return;
    }

    if (userCoords) {
      setSelectedRadius(radiusKm);
      return;
    }

    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setUserCoords({ lat, lng });
        setLocationSource('device');
        setSelectedRadius(radiusKm);
      } else {
        // Fall back to saved profile coordinates
        if (user?.latitude != null && user?.longitude != null) {
          setUserCoords({ lat: user.latitude, lng: user.longitude });
          setLocationSource('profile');
          setSelectedRadius(radiusKm);
          Alert.alert('Using Profile Address', 'Using your saved profile location for nearby search.');
        } else {
          setSelectedRadius(null);
          Alert.alert(
            'Location Required',
            'Location permission was denied and no saved profile address was found. Update your profile location to use nearby search.',
          );
        }
      }
    } catch {
      if (user?.latitude != null && user?.longitude != null) {
        setUserCoords({ lat: user.latitude, lng: user.longitude });
        setLocationSource('profile');
        setSelectedRadius(radiusKm);
      } else {
        setSelectedRadius(null);
        Alert.alert('Location Error', 'Unable to retrieve location.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const fetchItems = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError('');
      try {
        const response = await itemsService.getItems({
          search: search || undefined,
          category: activeCategory || undefined,
          page: 1,
          limit: 30,
          lat: selectedRadius !== null && userCoords ? userCoords.lat : undefined,
          lng: selectedRadius !== null && userCoords ? userCoords.lng : undefined,
          radiusKm: selectedRadius !== null ? selectedRadius : undefined,
        });
        setItems(response.items || []);
      } catch {
        setError('Failed to load items. Please check your connection.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeCategory, selectedRadius, userCoords],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems(true);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Neighbor';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const renderItemCard = ({ item }: { item: Item }) => {
    const price = item.pricePerDay ?? 0;
    const imageUrl =
      item.images && item.images.length > 0 && item.images[0].startsWith('http')
        ? item.images[0]
        : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&auto=format&fit=crop&q=80';

    const catKey = (item.category in CATEGORY_THEMES ? item.category : 'Other') as CategoryKey;
    const catTheme = CATEGORY_THEMES[catKey];
    const ownerName = item.owner?.name || 'Owner';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />

          {/* Distance Badge */}
          {item.distanceKm != null && (
            <View
              style={[
                styles.distanceBadge,
                { backgroundColor: isDark ? 'rgba(19, 28, 46, 0.9)' : 'rgba(255, 255, 255, 0.95)' },
              ]}
            >
              <Ionicons name="location" size={12} color={colors.primary[500]} />
              <Text
                style={[
                  styles.distanceBadgeText,
                  { color: isDark ? colors.dark.text : colors.primary[700] },
                ]}
              >
                {item.distanceKm} km away
              </Text>
            </View>
          )}

          {/* Availability Status Badge */}
          <View
            style={[
              styles.availabilityBadge,
              {
                backgroundColor: item.isAvailable
                  ? isDark
                    ? 'rgba(22, 163, 74, 0.9)'
                    : colors.success
                  : isDark
                  ? 'rgba(100, 116, 139, 0.85)'
                  : colors.neutral[500],
              },
            ]}
          >
            <View style={styles.statusDotWhite} />
            <Text style={styles.availabilityBadgeText}>
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Category Chip Row */}
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.cardCatChip,
                {
                  backgroundColor: isDark ? catTheme.darkTint : catTheme.tint,
                  borderColor: isDark ? catTheme.darkBorder : catTheme.border,
                },
              ]}
            >
              <Ionicons name={catTheme.ioniconName} size={11} color={catTheme.primary} />
              <Text style={[styles.cardCatText, { color: catTheme.primary }]}>
                {item.category}
              </Text>
            </View>

            {Boolean(item.reviewCount && item.reviewCount > 0) && (
              <StarRating
                rating={item.averageRating}
                reviewCount={item.reviewCount}
                showValue
                size="xs"
              />
            )}
          </View>

          {/* Title */}
          <Text
            style={[styles.itemTitle, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {/* Card Footer */}
          <View style={[styles.cardFooter, { borderTopColor: themeColors.border }]}>
            {/* Price Pill in Orange */}
            <View style={styles.pricePill}>
              <Text style={styles.pricePillAmount}>{formatINR(price)}</Text>
              <Text style={styles.pricePillUnit}>/ day</Text>
            </View>

            {/* Owner with Initials */}
            {item.owner && (
              <View style={styles.ownerRow}>
                <View
                  style={[
                    styles.ownerAvatar,
                    { backgroundColor: getAvatarColor(ownerName) },
                  ]}
                >
                  <Text style={styles.ownerAvatarText}>{getInitials(ownerName)}</Text>
                </View>
                <Text
                  style={[styles.ownerText, { color: themeColors.textMuted }]}
                  numberOfLines={1}
                >
                  {ownerName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* ── Top Header with Brand Gradient ──────────────────────────────────── */}
      <LinearGradient
        colors={gradients.brand as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerTop}>
          <View style={styles.logoGroup}>
            <View style={styles.logoBadge}>
              <Ionicons name="cart" size={20} color={colors.primary[600]} />
            </View>
            <View>
              <Text style={styles.greetingSub}>{greeting}</Text>
              <Text style={styles.greetingName}>Hello, {firstName} 👋</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: themeColors.surface,
              borderColor: isDark ? colors.dark.border : '#ffffff',
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? colors.dark.textMuted : colors.neutral[400]}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search tools, cameras, gear..."
            placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? colors.dark.textMuted : colors.neutral[400]}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* ── Filter Bar: Distance & Categories ───────────────────────────────── */}
      <View
        style={[
          styles.filtersContainer,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        {/* Distance Chips */}
        <View style={styles.radiusRow}>
          <View style={styles.radiusLabelBadge}>
            <Ionicons name="navigate-outline" size={13} color={colors.primary[500]} />
            <Text style={[styles.radiusLabel, { color: themeColors.textMuted }]}>Distance:</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={RADIUS_OPTIONS}
            keyExtractor={(opt) => opt.label}
            contentContainerStyle={styles.radiusList}
            renderItem={({ item: opt }) => {
              const isActive = selectedRadius === opt.value;
              return (
                <TouchableOpacity
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor: isActive
                        ? colors.primary[500]
                        : isDark
                        ? colors.dark.surfaceHover
                        : colors.neutral[100],
                      borderColor: isActive
                        ? colors.primary[600]
                        : isDark
                        ? colors.dark.border
                        : colors.border,
                    },
                  ]}
                  onPress={() => handleRadiusSelect(opt.value)}
                  disabled={isLocating}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      {
                        color: isActive
                          ? '#ffffff'
                          : isDark
                          ? colors.dark.text
                          : colors.neutral[700],
                      },
                    ]}
                  >
                    {isLocating && opt.value !== null && isActive ? 'Locating...' : opt.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Category Chips with Icons */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...CATEGORIES]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isAll = item === 'All';
            const isActive = isAll ? activeCategory === '' : activeCategory === item;
            const theme = !isAll ? CATEGORY_THEMES[item as CategoryKey] : null;

            let chipBg: string = isDark ? colors.dark.surfaceHover : colors.neutral[100];
            let chipBorder: string = isDark ? colors.dark.border : colors.border;
            let iconColor: string = isDark ? colors.dark.textMuted : colors.neutral[600];
            let textColor: string = isDark ? colors.dark.text : colors.neutral[700];

            if (isActive) {
              if (isAll) {
                chipBg = colors.primary[500];
                chipBorder = colors.primary[600];
                textColor = '#ffffff';
                iconColor = '#ffffff';
              } else if (theme) {
                chipBg = theme.primary;
                chipBorder = theme.primary;
                textColor = '#ffffff';
                iconColor = '#ffffff';
              }
            } else if (theme) {
              chipBg = isDark ? theme.darkTint : theme.tint;
              chipBorder = isDark ? theme.darkBorder : theme.border;
              textColor = theme.primary;
              iconColor = theme.primary;
            }

            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: chipBg,
                    borderColor: chipBorder,
                  },
                ]}
                onPress={() => (isAll ? setActiveCategory('') : handleCategoryClick(item))}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isAll ? 'apps-outline' : theme?.ioniconName || 'cube-outline'}
                  size={14}
                  color={iconColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: textColor,
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Items Content ────────────────────────────────────────────────────── */}
      <View style={[styles.content, { backgroundColor: themeColors.background }]}>
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: themeColors.text }]}>
            {activeCategory
              ? `${activeCategory} Items`
              : selectedRadius !== null
              ? `Nearby (${selectedRadius} km)`
              : 'Discover Items'}
          </Text>
          {!isLoading && !error && (
            <View
              style={[
                styles.resultsCountBadge,
                { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
              ]}
            >
              <Text style={styles.resultsCountText}>{items.length} available</Text>
            </View>
          )}
        </View>

        {/* Error State */}
        {error && !isLoading ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.errorIconBg}>
              <Ionicons name="alert-circle" size={32} color={colors.danger} />
            </View>
            <Text style={[styles.stateTitle, { color: themeColors.text }]}>
              Couldn't load items
            </Text>
            <Text style={[styles.stateSubtitle, { color: themeColors.textMuted }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchItems()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Skeletons Loading */}
        {isLoading && !refreshing ? (
          <View style={styles.skeletonContainer}>
            <ItemSkeleton isDark={isDark} />
            <ItemSkeleton isDark={isDark} />
          </View>
        ) : null}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconBg,
                { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
              ]}
            >
              <Ionicons name="search" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.stateTitle, { color: themeColors.text }]}>
              No items found
            </Text>
            <Text style={[styles.stateSubtitle, { color: themeColors.textMuted }]}>
              {selectedRadius !== null
                ? `No items found within ${selectedRadius} km. Try expanding your search distance.`
                : search || activeCategory
                ? 'Try broadening your search keywords or clearing the category filter.'
                : 'No items are available right now. Check back soon!'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {selectedRadius !== null && (
                <TouchableOpacity
                  style={[
                    styles.clearFilterButton,
                    {
                      backgroundColor: colors.primary[500],
                      borderColor: colors.primary[600],
                    },
                  ]}
                  onPress={() => setSelectedRadius(null)}
                >
                  <Text style={[styles.clearFilterText, { color: '#ffffff' }]}>
                    Show Anywhere
                  </Text>
                </TouchableOpacity>
              )}
              {(search || activeCategory) && (
                <TouchableOpacity
                  style={[
                    styles.clearFilterButton,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => {
                    setSearch('');
                    setActiveCategory('');
                  }}
                >
                  <Text style={[styles.clearFilterText, { color: themeColors.text }]}>
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Items List */}
        {!isLoading && !error && items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItemCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary[500]]}
                tintColor={colors.primary[500]}
              />
            }
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  greetingSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Floating Search ─────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    ...shadows.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  // ── Filters & Chips ─────────────────────────────────────────────────────────
  filtersContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  radiusLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  radiusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  radiusList: {
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryList: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },

  // ── Content ─────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  resultsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[600],
  },
  listContent: {
    paddingBottom: 32,
    gap: 14,
  },

  // ── Modern Item Card ────────────────────────────────────────────────────────
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.sm,
  },
  imageContainer: {
    position: 'relative',
    height: 170,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  statusDotWhite: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  availabilityBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  cardCatText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 138, 31, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pricePillAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent[500],
  },
  pricePillUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent[600],
    marginLeft: 3,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 110,
  },

  // ── Skeletons ───────────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 14,
  },
  cardSkeleton: {
    borderRadius: radius.lg,
    height: 230,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageSkeleton: {
    height: 140,
  },
  bodySkeleton: {
    padding: 14,
    gap: 8,
  },
  badgeSkeleton: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
  titleSkeleton: {
    width: 160,
    height: 18,
    borderRadius: 4,
  },
  priceSkeleton: {
    width: 90,
    height: 18,
    borderRadius: 4,
  },

  // ── State Card ──────────────────────────────────────────────────────────────
  stateCard: {
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
    ...shadows.sm,
  },
  errorIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  clearFilterButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
