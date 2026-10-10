/**
 * src/screens/HomeScreen.tsx (mobile)
 * Main authenticated mobile screen matching web design and behavior.
 * - Header with greeting, user name, and Logout
 * - Search bar
 * - Category filter chips
 * - Skeletons loading state
 * - Error state with Try Again button
 * - Empty state with Clear Filters button
 * - Items list with pulled-to-refresh
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { itemsService, Item } from '../services/items.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];

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
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError('');
      try {
        const response = await itemsService.getItems({
          search: search || undefined,
          category: activeCategory || undefined,
          page: 1,
          limit: 20,
        });
        setItems(response.items || []);
      } catch (err: any) {
        console.error('Failed to fetch items:', err);
        setError('Failed to load items. Please check your connection.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeCategory]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
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
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />

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

          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>
              ${price} <Text style={styles.priceUnit}>/ day</Text>
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

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
            {activeCategory ? `${activeCategory} items` : 'Nearby items'}
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
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.grid}>
            <ItemSkeleton />
            <ItemSkeleton />
            <ItemSkeleton />
            <ItemSkeleton />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItemCard}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary[600]]}
              />
            }
            ListEmptyComponent={
              <View style={styles.stateCard}>
                <View style={styles.emptyIconBg}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                </View>
                <Text style={styles.stateTitle}>No items found</Text>
                <Text style={styles.stateSubtitle}>
                  {search || activeCategory
                    ? 'Try adjusting your search or category filters'
                    : 'No items have been listed yet. Be the first to share!'}
                </Text>
                {search || activeCategory ? (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setSearch('');
                      setActiveCategory('');
                    }}
                  >
                    <Text style={styles.clearFilterText}>Clear filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  greetingSub: {
    fontSize: 12,
    color: colors.gray[500],
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.gray[900],
  },
  clearIcon: {
    fontSize: 16,
    color: colors.gray[400],
    padding: 4,
  },
  categoryList: {
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[700],
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  resultsCount: {
    fontSize: 13,
    color: colors.gray[500],
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.gray[200],
  },
  cardBody: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray[500],
  },
  ownerText: {
    fontSize: 12,
    color: colors.gray[500],
    maxWidth: 140,
  },

  // ── Skeletons Styles ────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'column',
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

  // ── State Card Styles (Error & Empty) ───────────────────────────────────────
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
