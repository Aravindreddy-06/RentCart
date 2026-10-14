/**
 * src/screens/HomeScreen.tsx (mobile)
 * Main authenticated mobile screen matching web design and behavior:
 * - Header with greeting and user name
 * - Search bar
 * - Distance Radius selector chips (1, 2, 5, 10, 25 km, Anywhere) with device location & profile fallback
 * - Category filter chips
 * - Skeletons loading state
 * - Item cards with distance display ("1.2 km away")
 * - Error state with Try Again button
 * - Empty state with Clear Filters button
 * - Pull-to-refresh keeping active filters
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
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { AppStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { itemsService, Item } from '../services/items.service';
import { notificationsService } from '../services/notifications.service';
import { StarRating } from '../components/StarRating';
import { colors } from '../utils/colors';
import { formatINR } from '../utils/currency';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];
const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Anywhere', value: null },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
];

// ── Skeletons Component ──────────────────────────────────────────────────────
function ItemSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.imageSkeleton} />
      <View style={styles.bodySkeleton}>
        <View style={styles.badgeSkeleton} />
        <View style={styles.titleSkeleton} />
        <View style={styles.priceSkeleton} />
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Radius & Location state
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'device' | 'profile' | null>(null);
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
  const handleRadiusSelect = async (radius: number | null) => {
    if (radius === null) {
      setSelectedRadius(null);
      return;
    }

    if (userCoords) {
      setSelectedRadius(radius);
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
        setSelectedRadius(radius);
      } else {
        // Fall back to saved profile coordinates
        if (user?.latitude != null && user?.longitude != null) {
          setUserCoords({ lat: user.latitude, lng: user.longitude });
          setLocationSource('profile');
          setSelectedRadius(radius);
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
        setSelectedRadius(radius);
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
      } catch (err: any) {
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

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const renderItemCard = ({ item }: { item: Item }) => {
    const price = item.pricePerDay ?? 0;
    const imageUrl =
      item.images && item.images.length > 0 && item.images[0].startsWith('http')
        ? item.images[0]
        : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&auto=format&fit=crop&q=80';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          {item.distanceKm != null && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>📍 {item.distanceKm} km away</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.categoryBadge}>{item.category}</Text>

            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.isAvailable ? colors.success : colors.warning },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.isAvailable ? '#15803d' : '#b45309' },
                ]}
              >
                {item.isAvailable ? 'Available' : 'Borrowed'}
              </Text>
            </View>
          </View>

          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {Boolean(item.reviewCount && item.reviewCount > 0) && (
            <View style={{ marginTop: 2, marginBottom: 4 }}>
              <StarRating
                rating={item.averageRating}
                reviewCount={item.reviewCount}
                showValue
                size="xs"
              />
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>
              {formatINR(price)} <Text style={styles.priceUnit}>/ day</Text>
            </Text>
            {item.owner && (
              <Text style={styles.ownerText} numberOfLines={1}>
                {item.owner.name}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoGroup}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🤝</Text>
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
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items to borrow..."
            placeholderTextColor={colors.gray[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Radius Filter Chips */}
        <View style={styles.radiusContainer}>
          <Text style={styles.radiusLabel}>📍 Distance:</Text>
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
                  style={[styles.radiusChip, isActive && styles.radiusChipActive]}
                  onPress={() => handleRadiusSelect(opt.value)}
                  disabled={isLocating}
                >
                  <Text style={[styles.radiusChipText, isActive && styles.radiusChipTextActive]}>
                    {isLocating && opt.value !== null && isActive ? 'Locating...' : opt.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Category Chips Horizontal Scroll */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...CATEGORIES]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isAll = item === 'All';
            const isActive = isAll ? activeCategory === '' : activeCategory === item;
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => (isAll ? setActiveCategory('') : handleCategoryClick(item))}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Items Content ────────────────────────────────────────────────────── */}
      <View style={styles.content}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {activeCategory
              ? `${activeCategory} items`
              : selectedRadius !== null
              ? `Nearby (${selectedRadius} km)`
              : 'Available items'}
          </Text>
          {!isLoading && !error && (
            <Text style={styles.resultsCount}>{items.length} items</Text>
          )}
        </View>

        {/* Error State */}
        {error && !isLoading ? (
          <View style={styles.stateCard}>
            <View style={styles.errorIconBg}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            <Text style={styles.stateTitle}>Couldn't load items</Text>
            <Text style={styles.stateSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchItems()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Skeletons Loading */}
        {isLoading && !refreshing ? (
          <View style={styles.skeletonContainer}>
            <ItemSkeleton />
            <ItemSkeleton />
          </View>
        ) : null}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIconBg}>
              <Text style={styles.emptyIcon}>🔍</Text>
            </View>
            <Text style={styles.stateTitle}>No items found</Text>
            <Text style={styles.stateSubtitle}>
              {selectedRadius !== null
                ? `No items found within ${selectedRadius} km. Try expanding your search distance.`
                : search || activeCategory
                ? 'Try broadening your search or clearing the category filter.'
                : 'No items are available right now. Check back soon!'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {selectedRadius !== null && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => setSelectedRadius(null)}
                >
                  <Text style={styles.clearFilterText}>Show Anywhere</Text>
                </TouchableOpacity>
              )}
              {(search || activeCategory) && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setSearch('');
                    setActiveCategory('');
                  }}
                >
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
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
                colors={[colors.primary[600]]}
                tintColor={colors.primary[600]}
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
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  greetingSub: {
    fontSize: 11,
    color: colors.gray[500],
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 16,
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
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
    color: colors.gray[400],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 13,
    color: colors.gray[400],
    padding: 4,
  },

  // ── Radius Selector ─────────────────────────────────────────────────────────
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[600],
    marginRight: 8,
  },
  radiusList: {
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  radiusChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[700],
  },
  radiusChipTextActive: {
    color: '#ffffff',
  },

  // ── Category Chips ──────────────────────────────────────────────────────────
  categoryList: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  chipActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  chipTextActive: {
    color: colors.primary[700],
    fontWeight: '700',
  },

  // ── Content ─────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    backgroundColor: colors.gray[50],
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[800],
  },
  resultsCount: {
    fontSize: 12,
    color: colors.gray[500],
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },

  // ── Item Card ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    height: 160,
    width: '100%',
    backgroundColor: colors.gray[200],
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[700],
  },
  cardBody: {
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[600],
    textTransform: 'uppercase',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray[400],
  },
  ownerText: {
    fontSize: 12,
    color: colors.gray[500],
    fontWeight: '500',
    maxWidth: 120,
  },

  // ── Skeletons ───────────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 12,
  },
  cardSkeleton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    height: 220,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
  },
  imageSkeleton: {
    height: 130,
    backgroundColor: colors.gray[200],
  },
  bodySkeleton: {
    padding: 12,
    gap: 8,
  },
  badgeSkeleton: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
  },
  titleSkeleton: {
    width: 140,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
  },
  priceSkeleton: {
    width: 80,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
  },

  // ── State Card ──────────────────────────────────────────────────────────────
  stateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginTop: 20,
  },
  errorIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorIcon: {
    fontSize: 28,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 28,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  clearFilterButton: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFilterText: {
    color: colors.gray[700],
    fontSize: 13,
    fontWeight: '600',
  },
});
