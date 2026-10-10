/**
 * src/screens/NotificationsScreen.tsx (mobile)
 * Full notifications screen featuring:
 * - All / Unread filter chips
 * - Pull-to-refresh
 * - Mark all read
 * - Delete button / action
 * - Tapping marks read and navigates to RentalDetails
 * - Polling every 30s + AppState foreground refresh
 * - Styled with react-native-safe-area-context
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  AppState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import {
  notificationsService,
  NotificationItem,
  NotificationType,
} from '../services/notifications.service';
import { colors, spacing, radius } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getBadgeConfig(type: NotificationType): { icon: string; bg: string; border: string; text: string } {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return { icon: '📋', bg: '#fef3c7', border: '#fde68a', text: '#92400e' };
    case 'RENTAL_APPROVED':
      return { icon: '✅', bg: '#dcfce7', border: '#bbf7d0', text: '#166534' };
    case 'RENTAL_REJECTED':
      return { icon: '❌', bg: '#fee2e2', border: '#fecaca', text: '#991b1b' };
    case 'RENTAL_CANCELLED':
      return { icon: '🚫', bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' };
    case 'RENTAL_ACTIVATED':
      return { icon: '🚀', bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' };
    case 'RENTAL_RETURNED':
      return { icon: '📦', bg: '#ccfbf1', border: '#99f6e4', text: '#115e59' };
    default:
      return { icon: '🔔', bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' };
  }
}

export default function NotificationsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const [listData, count] = await Promise.all([
          notificationsService.getNotifications({
            unread: filter === 'unread' ? true : undefined,
            limit: 30,
          }),
          notificationsService.getUnreadCount().catch(() => 0),
        ]);
        setNotifications(listData.notifications);
        setUnreadCount(count);
      } catch {
        // Silently handle error or keep existing list
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // 30s polling + AppState foreground refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchNotifications(false);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (filter === 'unread') {
        setNotifications([]);
      }
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      notificationsService.markAsRead(item.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (item.data?.rentalId) {
      navigation.navigate('RentalDetail', { rentalId: item.data.rentalId });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationsService.delete(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete notification');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const badge = getBadgeConfig(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Left Icon Badge */}
        <View style={[styles.badgeContainer, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={styles.badgeIcon}>{badge.icon}</Text>
        </View>

        {/* Text Details */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>

          <Text style={[styles.cardBody, !item.isRead && styles.cardBodyUnread]} numberOfLines={2}>
            {item.body}
          </Text>

          {item.data?.rentalId && (
            <Text style={styles.viewLink}>View rental details →</Text>
          )}
        </View>

        {/* Actions: delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header bar controls */}
      <View style={styles.topActionsBar}>
        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, filter === 'all' && styles.chipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.chipText, filter === 'all' && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, filter === 'unread' && styles.chipActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.chipText, filter === 'unread' && styles.chipTextActive]}>
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mark All Read Button */}
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={markingAll}
          >
            <Text style={styles.markAllText}>
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List or States */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptySub}>
            {filter === 'unread'
              ? "You're all caught up!"
              : 'Updates regarding your item rentals and requests will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
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
    backgroundColor: '#f8fafc',
  },
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
  },
  chipActive: {
    backgroundColor: colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  chipTextActive: {
    color: colors.white,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary[600],
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  badgeContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.md,
  },
  badgeIcon: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: colors.gray[900],
  },
  timeText: {
    fontSize: 11,
    color: colors.gray[400],
  },
  cardBody: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 18,
  },
  cardBodyUnread: {
    color: colors.gray[800],
    fontWeight: '500',
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    marginTop: 6,
  },
  deleteButton: {
    paddingLeft: spacing.sm,
    paddingTop: 2,
  },
  deleteIcon: {
    fontSize: 14,
    color: colors.gray[400],
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
