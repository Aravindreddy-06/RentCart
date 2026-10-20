/**
 * src/screens/NotificationsScreen.tsx (mobile)
 * Vibrant notifications list with:
 * - Icon per type in a coloured circle:
 *   - request: amber
 *   - approved: green
 *   - rejected: red
 *   - message: blue
 *   - review: gold (#F5B301)
 *   - pickup: teal (#0F9D8A)
 * - Unread rows with a tinted background and an indicator dot
 * - Filter chips (All / Unread)
 * - Mark all read & delete actions
 * - Full dark mode support
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
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import {
  notificationsService,
  NotificationItem,
  NotificationType,
} from '../services/notifications.service';
import { useTheme } from '../context/ThemeContext';
import { colors, radius, shadows } from '../utils/colors';
import { formatDateDMY } from '../utils/date';

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
  return formatDateDMY(date);
}

interface TypeTheme {
  iconName: any;
  color: string;
  bg: string;
  darkBg: string;
}

function getTypeTheme(type: NotificationType): TypeTheme {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return {
        iconName: 'time-outline',
        color: '#d97706',
        bg: '#fef3c7',
        darkBg: 'rgba(245, 158, 11, 0.2)',
      };
    case 'RENTAL_APPROVED':
      return {
        iconName: 'checkmark-circle-outline',
        color: '#16a34a',
        bg: '#dcfce7',
        darkBg: 'rgba(22, 163, 74, 0.2)',
      };
    case 'RENTAL_REJECTED':
      return {
        iconName: 'close-circle-outline',
        color: '#e5484d',
        bg: '#fee2e2',
        darkBg: 'rgba(229, 72, 77, 0.2)',
      };
    case 'RENTAL_CANCELLED':
      return {
        iconName: 'ban-outline',
        color: '#667085',
        bg: '#f3f4f6',
        darkBg: 'rgba(100, 116, 139, 0.2)',
      };
    case 'RENTAL_ACTIVATED':
      return {
        iconName: 'flash-outline',
        color: '#2563eb',
        bg: '#eff6ff',
        darkBg: 'rgba(37, 99, 235, 0.2)',
      };
    case 'RENTAL_RETURNED':
      return {
        iconName: 'archive-outline',
        color: '#5b5bd6',
        bg: '#eef2ff',
        darkBg: 'rgba(91, 91, 214, 0.2)',
      };
    case 'REVIEW_RECEIVED':
      return {
        iconName: 'star',
        color: '#f5b301',
        bg: '#fef3c7',
        darkBg: 'rgba(245, 179, 1, 0.2)',
      };
    case 'NEW_MESSAGE':
      return {
        iconName: 'chatbubble-ellipses-outline',
        color: '#2563eb',
        bg: '#eff6ff',
        darkBg: 'rgba(37, 99, 235, 0.2)',
      };
    case 'PICKUP_LOCATION_SHARED':
    case 'BORROWER_ON_THE_WAY':
    case 'BORROWER_ARRIVED':
      return {
        iconName: 'location-outline',
        color: '#0f9d8a',
        bg: '#e6f7f4',
        darkBg: 'rgba(15, 157, 138, 0.2)',
      };
    case 'HANDOVER_PIN_READY':
      return {
        iconName: 'key-outline',
        color: '#0f9d8a',
        bg: '#e6f7f4',
        darkBg: 'rgba(15, 157, 138, 0.2)',
      };
    case 'HANDOVER_CONFIRMED':
      return {
        iconName: 'shield-checkmark-outline',
        color: '#2563eb',
        bg: '#eff6ff',
        darkBg: 'rgba(37, 99, 235, 0.2)',
      };
    default:
      return {
        iconName: 'notifications-outline',
        color: '#0f9d8a',
        bg: '#e6f7f4',
        darkBg: 'rgba(15, 157, 138, 0.2)',
      };
  }
}

export default function NotificationsScreen({ navigation }: Props) {
  const { isDark, themeColors } = useTheme();

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
        // Silently handle error
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

    if (item.type === 'NEW_MESSAGE' && item.data?.rentalId) {
      navigation.navigate('Chat', { rentalId: item.data.rentalId });
      return;
    }

    if (item.type === 'REVIEW_RECEIVED') {
      const targetUserId = item.data?.targetUserId || item.userId;
      navigation.navigate('PublicProfile', { userId: targetUserId });
      return;
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
    const badge = getTypeTheme(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: !item.isRead
              ? isDark
                ? 'rgba(15, 157, 138, 0.12)'
                : colors.primary[50]
              : themeColors.surface,
            borderColor: !item.isRead
              ? isDark
                ? 'rgba(15, 157, 138, 0.3)'
                : colors.primary[100]
              : themeColors.border,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Left Coloured Icon Circle */}
        <View
          style={[
            styles.badgeCircle,
            { backgroundColor: isDark ? badge.darkBg : badge.bg },
          ]}
        >
          <Ionicons name={badge.iconName} size={20} color={badge.color} />
        </View>

        {/* Text Details */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <Text
                style={[
                  styles.cardTitle,
                  { color: themeColors.text },
                  !item.isRead && styles.cardTitleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
            <Text style={[styles.timeText, { color: themeColors.textMuted }]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>

          <Text
            style={[
              styles.cardBody,
              { color: themeColors.textMuted },
              !item.isRead && { color: themeColors.text },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          {item.type === 'REVIEW_RECEIVED' ? (
            <Text style={[styles.viewLink, { color: colors.primary[500] }]}>
              View profile →
            </Text>
          ) : item.data?.rentalId ? (
            <Text style={[styles.viewLink, { color: colors.primary[500] }]}>
              View rental details →
            </Text>
          ) : null}
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={themeColors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['bottom', 'left', 'right']}
    >
      {/* Top Header Bar */}
      <View
        style={[
          styles.topActionsBar,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              filter === 'all'
                ? { backgroundColor: colors.primary[500], borderColor: colors.primary[600] }
                : {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                    borderColor: themeColors.border,
                  },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === 'all' ? '#ffffff' : themeColors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              filter === 'unread'
                ? { backgroundColor: colors.primary[500], borderColor: colors.primary[600] }
                : {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                    borderColor: themeColors.border,
                  },
            ]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === 'unread' ? '#ffffff' : themeColors.text },
              ]}
            >
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
            <Text style={[styles.markAllText, { color: colors.primary[500] }]}>
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List or States */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconBg,
              { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
            ]}
          >
            <Ionicons name="notifications-off-outline" size={36} color={colors.primary[500]} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={[styles.emptySub, { color: themeColors.textMuted }]}>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
    ...shadows.sm,
  },
  badgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardTitleUnread: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
