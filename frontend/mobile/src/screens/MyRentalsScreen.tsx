/**
 * src/screens/MyRentalsScreen.tsx (mobile)
 * Displays rentals requested by the logged-in user:
 * - Status-coloured left border on cards
 * - Shared StatusBadge with dot
 * - Filter tabs with badge counts
 * - Cancel action button
 * - Full dark mode support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, Rental, RentalStatus } from '../services/rentals.service';
import { StatusBadge } from '../components/StatusBadge';
import { useTheme } from '../context/ThemeContext';
import {
  colors,
  radius,
  shadows,
  STATUS_THEMES,
  CATEGORY_THEMES,
  CategoryKey,
} from '../utils/colors';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

const TABS: { label: string; value: RentalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Declined', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function MyRentalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark, themeColors } = useTheme();

  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRentals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const data = await rentalsService.getMyRentals(activeTab);
      setRentals(data.rentals);
    } catch {
      setError('Could not load rentals. Check connection and retry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useFocusEffect(
    useCallback(() => {
      fetchRentals(true);
    }, [fetchRentals])
  );

  const handleCancel = (rental: Rental) => {
    Alert.alert(
      'Cancel Request?',
      `Are you sure you want to cancel your request for "${rental.item.title}"?`,
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await rentalsService.cancel(rental.id);
              fetchRentals(true);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel rental.');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Rental }) => {
    const itemImage =
      item.item.images?.[0] ??
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
    const canCancel = item.status === 'PENDING' || item.status === 'APPROVED';
    const statusCfg = STATUS_THEMES[item.status] || STATUS_THEMES.PENDING;
    const catKey = (item.item.category in CATEGORY_THEMES ? item.item.category : 'Other') as CategoryKey;
    const catTheme = CATEGORY_THEMES[catKey];

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            borderLeftWidth: 4,
            borderLeftColor: isDark ? statusCfg.darkFg : statusCfg.fg,
          },
        ]}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        activeOpacity={0.85}
      >
        <Image source={{ uri: itemImage }} style={styles.cardImage} />

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: isDark ? catTheme.darkTint : catTheme.tint,
                  borderColor: isDark ? catTheme.darkBorder : catTheme.border,
                },
              ]}
            >
              <Text style={[styles.categoryBadgeText, { color: catTheme.primary }]}>
                {item.item.category}
              </Text>
            </View>
            <StatusBadge status={item.status} size="sm" />
          </View>

          <Text style={[styles.itemTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.item.title}
          </Text>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={themeColors.textMuted} />
            <Text style={[styles.dateText, { color: themeColors.textMuted }]}>
              {formatDateDMY(item.startDate)} → {formatDateDMY(item.endDate)}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>{formatINR(item.totalPrice)}</Text>
              <Text style={styles.priceUnit}> total</Text>
            </View>

            <View style={styles.actions}>
              {canCancel && (
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(229, 72, 77, 0.15)' : '#fee2e2',
                      borderColor: isDark ? 'rgba(229, 72, 77, 0.3)' : '#fca5a5',
                    },
                  ]}
                  onPress={() => handleCancel(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
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
      {/* Title */}
      <View style={[styles.header, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.screenTitle, { color: themeColors.text }]}>My Rentals</Text>
        <Text style={[styles.screenSubtitle, { color: themeColors.textMuted }]}>
          Items you borrowed or requested
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabsWrapper,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const isSelected = activeTab === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary[500]
                      : isDark
                      ? colors.dark.surfaceHover
                      : colors.neutral[100],
                    borderColor: isSelected
                      ? colors.primary[600]
                      : isDark
                      ? colors.dark.border
                      : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(item.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSelected
                        ? '#ffffff'
                        : isDark
                        ? colors.dark.text
                        : colors.neutral[700],
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color={colors.danger} style={{ marginBottom: 8 }} />
          <Text style={[styles.errorText, { color: themeColors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRentals()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.centered}>
          <View
            style={[
              styles.emptyIconBg,
              { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
            ]}
          >
            <Ionicons name="cube-outline" size={36} color={colors.primary[500]} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No rentals found</Text>
          <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
            {activeTab
              ? `No rentals with status "${activeTab}".`
              : 'You have not requested to borrow any items yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRentals(true)}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: 6,
  },
  tabChipText: {
    fontSize: 12,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    ...shadows.sm,
  },
  cardImage: {
    width: 82,
    height: 82,
    borderRadius: radius.md,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent[500],
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent[600],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
