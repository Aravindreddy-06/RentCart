/**
 * src/screens/MyItemsScreen.tsx (mobile)
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
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { itemsService, Item } from '../services/items.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'MyItems'>;

export default function MyItemsScreen({ navigation }: Props) {
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

  const renderItemCard = ({ item }: { item: Item }) => (
    <View style={styles.card}>
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
          <Text style={styles.categoryBadge}>{item.category}</Text>
          <Text
            style={[
              styles.statusText,
              { color: item.isAvailable ? colors.success : colors.warning },
            ]}
          >
            {item.isAvailable ? 'Available' : 'Borrowed'}
          </Text>
        </View>

        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.price}>${item.dailyRate} / day</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSubtitle}>Items you are sharing with neighbours</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateItem')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
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
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛠️</Text>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>
                Got items lying around? List them to start sharing!
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => navigation.navigate('CreateItem')}
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
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
  },
  addButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardImage: {
    width: 100,
    height: '100%',
    backgroundColor: colors.gray[200],
  },
  cardBody: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600],
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  viewButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray[100],
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createFirstText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
