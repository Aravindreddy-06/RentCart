/**
 * src/screens/MessagesScreen.tsx (mobile)
 * Conversations list tab showing all active and past rental chats:
 * - Avatar with consistent user palette initials
 * - Unread red notification badges
 * - Full dark theme support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { chatsService, type ChatConversation } from '../services/chats.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, radius, getAvatarColor, getInitials } from '../utils/colors';
import { formatDateDMY } from '../utils/date';

function formatChatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return formatDateDMY(date);
}

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await chatsService.getMyChats();
      setChats(data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Refetch when screen gains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChats(true);
    });
    return unsubscribe;
  }, [navigation, fetchChats]);

  const handleOpenChat = (chat: ChatConversation) => {
    navigation.navigate('Chat', {
      rentalId: chat.rentalId,
      otherUserName: chat.otherUser.name,
      title: chat.item.title,
    });
  };

  const renderChatItem = ({ item: chat }: { item: ChatConversation }) => {
    const userName = chat.otherUser.name || 'Neighbor';

    return (
      <TouchableOpacity
        style={[
          styles.chatRow,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
        onPress={() => handleOpenChat(chat)}
        activeOpacity={0.7}
      >
        {/* Other user avatar */}
        {chat.otherUser.avatarUrl ? (
          <Image source={{ uri: chat.otherUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(userName) },
            ]}
          >
            <Text style={styles.avatarInitial}>{getInitials(userName)}</Text>
          </View>
        )}

        <View style={styles.chatInfo}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.userName, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {userName}
            </Text>
            {chat.lastMessage && (
              <Text style={[styles.timeText, { color: themeColors.textMuted }]}>
                {formatChatTime(chat.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <Text style={[styles.itemTitle, { color: colors.primary[500] }]} numberOfLines={1}>
            📦 {chat.item.title}
          </Text>

          <View style={styles.lastMessageRow}>
            <Text
              style={[
                styles.lastMessageText,
                { color: themeColors.textMuted },
                chat.unreadCount > 0 && { color: themeColors.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {chat.lastMessage ? (
                <>
                  {chat.lastMessage.senderId === user?.id ? 'You: ' : ''}
                  {chat.lastMessage.body}
                </>
              ) : (
                'No messages yet'
              )}
            </Text>

            {chat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCountText}>{chat.unreadCount}</Text>
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
      {/* Top Header */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.screenTitle, { color: themeColors.text }]}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : chats.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchChats(true)}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIconBg,
                  { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={36} color={colors.primary[500]} />
              </View>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
                When you request or lend an item, you can chat with your neighbour here to
                coordinate pickup and return.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.rentalId}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchChats(true)}
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
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
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
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
