/**
 * src/screens/MessagesScreen.tsx (mobile)
 * Conversations list tab showing all active and past rental chats.
 * Uses react-native-safe-area-context and pull-to-refresh.
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
import { AppStackParamList } from '../navigation/types';
import { chatsService, type ChatConversation } from '../services/chats.service';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

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

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();

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
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => handleOpenChat(chat)}
        activeOpacity={0.7}
      >
        {/* Other user avatar */}
        {chat.otherUser.avatarUrl ? (
          <Image source={{ uri: chat.otherUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {chat.otherUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.chatInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {chat.otherUser.name}
            </Text>
            {chat.lastMessage && (
              <Text style={styles.timeText}>
                {formatChatTime(chat.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <Text style={styles.itemTitle} numberOfLines={1}>
            📦 {chat.item.title}
          </Text>

          <View style={styles.lastMessageRow}>
            <Text
              style={[
                styles.lastMessageText,
                chat.unreadCount > 0 && styles.lastMessageUnread,
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
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
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
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
    backgroundColor: '#ffffff',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gray[900],
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
    borderBottomColor: colors.gray[100],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[200],
  },
  avatarFallback: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[700],
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
    color: colors.gray[900],
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: colors.gray[400],
    fontWeight: '500',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 3,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 13,
    color: colors.gray[500],
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: colors.gray[900],
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
