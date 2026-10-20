/**
 * src/screens/ChatScreen.tsx (mobile)
 * 1-on-1 rental chat with:
 * - My bubbles in brand gradient with white text
 * - Their bubbles in neutral card with dark mode support
 * - Coloured "Seen" indicator (✓✓ Seen) in teal
 * - Tinted pill date separators
 * - Round send button in teal with Ionicons
 * - Full dark mode support via useTheme
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import {
  chatsService,
  ChatMessage,
  MessagesResponse,
} from '../services/chats.service';
import { connectSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors, gradients, radius, shadows } from '../utils/colors';
import { formatDateDMY } from '../utils/date';

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

  return formatDateDMY(date);
}

export default function ChatScreen({ route, navigation }: Props) {
  const { rentalId, otherUserName, title } = route.params;
  const { user } = useAuth();
  const { isDark, themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  // Messages in DESCENDING order for inverted FlatList
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

  // Older messages pagination
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
          chatsService.markMessagesAsRead(rentalId).catch(() => {});
        }
      });

      socketInstance.on('messages:read', ({ rentalId: rId, readAt }: { rentalId: string; readAt: string }) => {
        if (!isMounted) return;
        if (rId === rentalId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === user?.id && !m.readAt ? { ...m, readAt } : m
            )
          );
        }
      });
    }

    initSocket();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        loadInitialMessages(false);
      }
    });

    return () => {
      isMounted = false;
      appStateSub.remove();
      if (socketInstance) {
        socketInstance.off('message:new');
        socketInstance.off('messages:read');
      }
    };
  }, [rentalId, user?.id, loadInitialMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || isReadOnly) return;

    setIsSending(true);
    setInputText('');

    try {
      const sentMsg = await chatsService.sendMessage(rentalId, text);
      setMessages((prev) => [sentMsg, ...prev]);
    } catch (err: any) {
      setInputText(text);
      Alert.alert('Failed to send', err?.response?.data?.message || 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  };

  const latestMyMessageId = messages.find((m) => m.senderId === user?.id)?.id;

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === user?.id;
    const isLatestMyMessage = item.id === latestMyMessageId;

    const olderMessage = messages[index + 1];
    const isFirstOfDay =
      !olderMessage ||
      new Date(item.createdAt).toDateString() !==
        new Date(olderMessage.createdAt).toDateString();

    return (
      <View style={styles.messageRowContainer}>
        {/* Date separator with tinted pill */}
        {isFirstOfDay && (
          <View style={styles.dateSeparator}>
            <View
              style={[
                styles.dateSeparatorLine,
                { backgroundColor: themeColors.border },
              ]}
            />
            <View
              style={[
                styles.dateSeparatorPill,
                {
                  backgroundColor: isDark ? 'rgba(15, 157, 138, 0.15)' : colors.primary[50],
                  borderColor: isDark ? 'rgba(15, 157, 138, 0.3)' : colors.primary[100],
                },
              ]}
            >
              <Text style={styles.dateSeparatorText}>
                {formatDateSeparator(item.createdAt)}
              </Text>
            </View>
            <View
              style={[
                styles.dateSeparatorLine,
                { backgroundColor: themeColors.border },
              ]}
            />
          </View>
        )}

        <View
          style={[
            styles.bubbleRow,
            isMine ? styles.myBubbleRow : styles.theirBubbleRow,
          ]}
        >
          {isMine ? (
            /* My Bubble with Brand Gradient */
            <LinearGradient
              colors={gradients.brand as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.myBubble]}
            >
              <Text style={styles.myBubbleText} selectable>
                {item.body}
              </Text>
              <View style={styles.bubbleFooter}>
                <Text style={styles.myTimestampText}>
                  {formatMessageTime(item.createdAt)}
                </Text>
              </View>
            </LinearGradient>
          ) : (
            /* Their Bubble in Neutral / Dark Surface */
            <View
              style={[
                styles.bubble,
                styles.theirBubble,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                  borderColor: isDark ? colors.dark.border : colors.neutral[200],
                },
              ]}
            >
              <Text
                style={[styles.theirBubbleText, { color: themeColors.text }]}
                selectable
              >
                {item.body}
              </Text>
              <View style={styles.bubbleFooter}>
                <Text style={[styles.theirTimestampText, { color: themeColors.textMuted }]}>
                  {formatMessageTime(item.createdAt)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Coloured Seen Indicator (✓✓ Seen) */}
        {isMine && isLatestMyMessage && item.readAt && (
          <View style={styles.seenContainer}>
            <Ionicons name="checkmark-done" size={13} color={colors.primary[500]} />
            <Text style={styles.seenText}>Seen</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Item context banner */}
        {title && (
          <View
            style={[
              styles.contextBanner,
              {
                backgroundColor: isDark ? 'rgba(15, 157, 138, 0.15)' : colors.primary[50],
                borderBottomColor: isDark ? 'rgba(15, 157, 138, 0.3)' : colors.primary[100],
              },
            ]}
          >
            <Ionicons name="cube-outline" size={15} color={colors.primary[500]} />
            <Text style={[styles.contextText, { color: colors.primary[600] }]} numberOfLines={1}>
              Rental: <Text style={styles.contextTitle}>{title}</Text>
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
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
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconBg,
                    { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
                  ]}
                >
                  <Ionicons name="chatbubbles" size={36} color={colors.primary[500]} />
                </View>
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  No messages yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
                  Say hello and coordinate rental handover details!
                </Text>
              </View>
            }
          />
        )}

        {/* Read-Only Notice or Message Input Area */}
        {isReadOnly ? (
          <View
            style={[
              styles.readOnlyBanner,
              {
                backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                borderTopColor: themeColors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Ionicons name="lock-closed" size={18} color={themeColors.textMuted} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.readOnlyTitle, { color: themeColors.text }]}>
                Conversation is read-only
              </Text>
              <Text style={[styles.readOnlySubtitle, { color: themeColors.textMuted }]}>
                {readOnlyReason ||
                  'This rental has concluded or was cancelled. Sending new messages is disabled.'}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: themeColors.surface,
                borderTopColor: themeColors.border,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                  borderColor: themeColors.border,
                  color: themeColors.text,
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isSending}
            />
            {/* Round Send Button in Teal */}
            <TouchableOpacity
              style={[
                styles.roundSendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={17} color="#ffffff" style={{ marginLeft: 2 }} />
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
  },
  keyboardAvoid: {
    flex: 1,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  contextText: {
    fontSize: 13,
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
  },
  dateSeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    marginHorizontal: 10,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[600],
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
    ...shadows.sm,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  myBubbleText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
  },
  theirBubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  myTimestampText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  theirTimestampText: {
    fontSize: 10,
    fontWeight: '500',
  },
  seenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingRight: 6,
    marginTop: 2,
  },
  seenText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[500],
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    transform: [{ scaleY: -1 }],
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
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  readOnlyTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  readOnlySubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
  },
  roundSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary[500],
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
