/**
 * src/screens/MyItemsScreen.tsx (mobile)
 * Displays items listed by the logged-in user:
 * - Category badges with theme pairing
 * - Orange price pills
 * - Add and delete actions
 * - Full dark theme support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { itemsService, Item } from '../services/items.service';
import { useTheme } from '../context/ThemeContext';
import {
  colors,
  radius,
  shadows,
  CATEGORY_THEMES,
  CategoryKey,
} from '../utils/colors';
import { formatINR } from '../utils/currency';

type Props = NativeStackScreenProps<AppStackParamList, 'MyItems'>;

export default function MyItemsScreen({ navigation }: Props) {
  const { isDark, themeColors } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyItems = useCallback(async () => {
    try {
      const data = await itemsService.getMyItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load my items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyItems();
  }, [fetchMyItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyItems();
  };

  const handleDelete = (item: Item) => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await itemsService.delete(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            Alert.alert('Deleted', 'Item removed successfully.');
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to delete item.');
          }
        },
      },
    ]);
  };

  const renderItemCard = ({ item }: { item: Item }) => {
    const catKey = (item.category in CATEGORY_THEMES ? item.category : 'Other') as CategoryKey;
    const catTheme = CATEGORY_THEMES[catKey];

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=600&q=80',
          }}
          style={styles.cardImage}
        />
        <View style={styles.cardBody}>
          <View style={styles.headerRow}>
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
                {item.category}
              </Text>
            </View>
            <Text
              style={[
                styles.statusText,
                { color: item.isAvailable ? colors.success : colors.warning },
              ]}
            >
              {item.isAvailable ? 'Available' : 'Borrowed'}
            </Text>
          </View>

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

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.viewButton,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                },
              ]}
              onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
            >
              <Text style={[styles.viewButtonText, { color: themeColors.text }]}>
                View Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>My Listings</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textMuted }]}>
            Items you are sharing with neighbours
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddItem')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconBg,
                  { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
                ]}
              >
                <Ionicons name="cube-outline" size={36} color={colors.primary[500]} />
              </View>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                No listings yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
                Got tools, kitchen gear, or electronics lying around? List them to start sharing!
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => navigation.navigate('AddItem')}
                activeOpacity={0.85}
              >
                <Text style={styles.createFirstText}>List Your First Item</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[500],
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    ...shadows.sm,
  },
  cardImage: {
    width: 96,
    height: '100%',
  },
  cardBody: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 138, 31, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginVertical: 6,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  viewButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  createFirstButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  createFirstText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
