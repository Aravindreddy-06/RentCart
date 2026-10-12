/**
 * src/screens/ChatScreen.tsx (mobile)
 * 1-on-1 rental chat between borrower and owner.
 * Features:
 * - Inverted FlatList for performance and instant auto-scroll to bottom
 * - Mine vs theirs message bubbles, timestamps, date separators
 * - "Seen" indicator for recipient read receipts
 * - Older messages pagination on pull/scroll up
 * - Socket.IO realtime with JWT handshake and AppState lifecycle
 * - Read-only banner for closed/expired rentals
 * - KeyboardAvoidingView with react-native-safe-area-context
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import {
  chatsService,
  ChatMessage,
  MessagesResponse,
} from '../services/chats.service';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ChatScreen({ route, navigation }: Props) {
  const { rentalId, otherUserName, title } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Messages are stored in DESCENDING order (index 0 is newest) for inverted FlatList
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | undefined>();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: otherUserName ? `${otherUserName}` : 'Chat',
      headerSubtitle: title ? `📦 ${title}` : undefined,
    } as any);
  }, [navigation, otherUserName, title]);

  // Initial load
  const loadInitialMessages = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
        const res: MessagesResponse = await chatsService.getRentalMessages(rentalId, {
          limit: 30,
        });
        // Backend returns oldest-to-newest; reverse for inverted FlatList
        const desc = [...res.messages].reverse();
        setMessages(desc);
        setHasMore(res.hasMore);
        setIsReadOnly(res.isReadOnly);
        setReadOnlyReason(res.readOnlyReason);

        // Mark as read
        chatsService.markMessagesAsRead(rentalId).catch(() => {});
      } catch (err: any) {
        if (showLoading) {
          Alert.alert('Error', err.response?.data?.message || 'Could not load messages.');
        }
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [rentalId],
  );

  useEffect(() => {
    loadInitialMessages(true);
  }, [loadInitialMessages]);

  // Older messages pagination (on scroll up)
  const handleLoadOlder = async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    const oldestMessage = messages[messages.length - 1];
    setLoadingOlder(true);

    try {
      const res = await chatsService.getRentalMessages(rentalId, {
        before: oldestMessage.createdAt,
        limit: 30,
      });
      const olderDesc = [...res.messages].reverse();
      setMessages((prev) => [...prev, ...olderDesc]);
      setHasMore(res.hasMore);
    } catch {
      // Non-blocking
    } finally {
      setLoadingOlder(false);
    }
  };

  // Socket.IO realtime connection & AppState handling
  useEffect(() => {
    let isMounted = true;
    let socketInstance: any = null;

    async function initSocket() {
      socketInstance = await connectSocket();
      if (!isMounted || !socketInstance) return;

      socketInstance.on('message:new', (newMsg: ChatMessage) => {
        if (!isMounted) return;
        if (newMsg.rentalId === rentalId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });

          // If incoming message from other party, mark as read
          if (newMsg.senderId !== user?.id) {
            chatsService.markMessagesAsRead(rentalId).catch(() => {});
          }
        }
      });

      socketInstance.on('message:read', (data: { rentalId: string; readAt: string }) => {
        if (!isMounted) return;
        if (data.rentalId === rentalId) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.senderId === user?.id && !m.readAt) {
                return { ...m, readAt: data.readAt };
              }
              return m;
            }),
          );
        }
      });
    }

    initSocket();

    // AppState lifecycle: connect when active, disconnect in background
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        connectSocket().then(() => {
          loadInitialMessages(false);
        });
      } else if (nextState === 'background' || nextState === 'inactive') {
        disconnectSocket();
      }
    });

    // Fallback polling every 10 seconds if socket is disconnected
    const pollInterval = setInterval(() => {
      const s = getSocket();
      if (!s || !s.connected) {
        loadInitialMessages(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      appStateSub.remove();
      clearInterval(pollInterval);
      if (socketInstance) {
        socketInstance.off('message:new');
        socketInstance.off('message:read');
      }
    };
  }, [rentalId, user?.id, loadInitialMessages]);

  // Send message
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || isReadOnly) return;

    if (trimmed.length > 1000) {
      Alert.alert('Too Long', 'Messages must be 1,000 characters or less.');
      return;
    }

    setIsSending(true);
    try {
      const newMsg = await chatsService.sendMessage(rentalId, trimmed);
      setInputText('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setIsReadOnly(true);
        setReadOnlyReason(err.response?.data?.message || 'Chat is read-only.');
        Alert.alert(
          'Read-Only',
          err.response?.data?.message || 'This conversation is read-only.',
        );
      } else if (status === 429) {
        Alert.alert(
          'Slow Down',
          'You are sending messages too quickly (max 30 per minute). Please wait a moment.',
        );
      } else {
        Alert.alert(
          'Error',
          err.response?.data?.message || 'Could not send message. Please try again.',
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  // Find latest message sent by current user to attach "Seen" indicator
  const latestMyMessageId = messages.find((m) => m.senderId === user?.id)?.id;

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === user?.id;
    const isLatestMyMessage = item.id === latestMyMessageId;

    // Check if this message starts a new day compared to the chronologically older message (index + 1)
    const olderMessage = messages[index + 1];
    const isFirstOfDay =
      !olderMessage ||
      new Date(item.createdAt).toDateString() !==
        new Date(olderMessage.createdAt).toDateString();

    return (
      <View style={styles.messageRowContainer}>
        {/* Date separator (rendered above item) */}
        {isFirstOfDay && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.createdAt)}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        <View
          style={[
            styles.bubbleRow,
            isMine ? styles.myBubbleRow : styles.theirBubbleRow,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.myBubble : styles.theirBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isMine ? styles.myBubbleText : styles.theirBubbleText,
              ]}
              selectable
            >
              {item.body}
            </Text>

            <View style={styles.bubbleFooter}>
              <Text
                style={[
                  styles.timestampText,
                  isMine ? styles.myTimestampText : styles.theirTimestampText,
                ]}
              >
                {formatMessageTime(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Seen indicator for recipient read receipt */}
        {isMine && isLatestMyMessage && item.readAt && (
          <View style={styles.seenContainer}>
            <Text style={styles.seenText}>Seen</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Item context banner */}
        {title && (
          <View style={styles.contextBanner}>
            <Text style={styles.contextText} numberOfLines={1}>
              📦 Rental: <Text style={styles.contextTitle}>{title}</Text>
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingOlder ? (
                <View style={styles.loadingOlderContainer}>
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  Say hello and coordinate rental handover details!
                </Text>
              </View>
            }
          />
        )}

        {/* Read-Only Notice or Message Input Area */}
        {isReadOnly ? (
          <View style={[styles.readOnlyBanner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.readOnlyIcon}>🔒</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.readOnlyTitle}>Conversation is read-only</Text>
              <Text style={styles.readOnlySubtitle}>
                {readOnlyReason ||
                  'This rental has concluded or was cancelled. Sending new messages is disabled.'}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Type a message (Shift+Enter or button to send)..."
              placeholderTextColor={colors.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  contextBanner: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  contextText: {
    fontSize: 13,
    color: colors.primary[700],
  },
  contextTitle: {
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingOlderContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageRowContainer: {
    marginBottom: 8,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[500],
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  myBubbleRow: {
    justifyContent: 'flex-end',
  },
  theirBubbleRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myBubbleText: {
    color: '#ffffff',
  },
  theirBubbleText: {
    color: colors.gray[900],
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '500',
  },
  myTimestampText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  theirTimestampText: {
    color: colors.gray[400],
  },
  seenContainer: {
    alignItems: 'flex-end',
    paddingRight: 6,
    marginTop: 2,
  },
  seenText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary[600],
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    transform: [{ scaleY: -1 }], // Untransform empty state inside inverted FlatList
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  readOnlyIcon: {
    fontSize: 20,
  },
  readOnlyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[800],
  },
  readOnlySubtitle: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sendButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
