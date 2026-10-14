/**
 * src/screens/MyRentalsScreen.tsx (mobile)
 * Displays rentals requested by the logged-in user.
 * Supports status chips filter, pull-to-refresh, cancel confirmation, and navigation.
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, Rental, RentalStatus } from '../services/rentals.service';
import { StatusBadge } from '../components/StatusBadge';
import { colors } from '../utils/colors';
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

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        activeOpacity={0.85}
      >
        <Image source={{ uri: itemImage }} style={styles.cardImage} />

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            <Text style={styles.categoryBadge}>{item.item.category}</Text>
            <StatusBadge status={item.status} size="sm" />
          </View>

          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.item.title}
          </Text>

          <Text style={styles.dateText}>
            📅 {formatDateDMY(item.startDate)} → {formatDateDMY(item.endDate)}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.priceText}>
              {formatINR(item.totalPrice)} total
            </Text>

            <View style={styles.actions}>
              {canCancel && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item)}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Rentals</Text>
        <Text style={styles.screenSubtitle}>Items you borrowed or requested</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
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
                style={[styles.tabChip, isSelected && styles.tabChipActive]}
                onPress={() => setActiveTab(item.value)}
              >
                <Text
                  style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}
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
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRentals()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No rentals found</Text>
          <Text style={styles.emptyText}>
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
              colors={[colors.primary[600]]}
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
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: 6,
  },
  tabChipActive: {
    backgroundColor: colors.primary[600],
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  tabChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.gray[200],
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary[600],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
