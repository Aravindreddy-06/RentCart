/**
 * src/pages/ChatsPage.tsx (web)
 * In-app chat interface between borrower and owner for a rental.
 * - Split-pane layout: conversation list on left, open chat on right
 * - Responsive view switching on mobile
 * - Realtime Socket.IO with automatic reconnect and 10s polling fallback
 * - Optimistic message sending with retry on failure
 * - Date separators, timestamps, "Seen" indicator, read-only status enforcement
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  chatsService,
  type ChatConversation,
  type ChatMessage,
} from '../services/chats.service';
import { formatDateDMY } from '../utils/date';
import { connectSocket, getSocket } from '../services/socket';

interface PendingMessage {
  tempId: string;
  rentalId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: 'sending' | 'failed';
  error?: string;
}

function formatDateSeparator(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return formatDateDMY(date);
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatChatListTime(isoString: string): string {
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

export function ChatsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetRentalId = searchParams.get('rentalId');

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [activeRentalId, setActiveRentalId] = useState<string | null>(targetRentalId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);

  const [inputText, setInputText] = useState<string>('');
  const [activeRentalInfo, setActiveRentalInfo] = useState<{
    id: string;
    status: string;
    isReadOnly: boolean;
    readOnlyReason?: string;
    otherUser: { id: string; name: string; avatarUrl?: string | null };
    item: { id: string; title: string; imageUrl?: string | null };
  } | null>(null);

  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(Boolean(targetRentalId));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync activeRentalId from URL
  useEffect(() => {
    if (targetRentalId && targetRentalId !== activeRentalId) {
      setActiveRentalId(targetRentalId);
      setShowMobileChat(true);
    }
  }, [targetRentalId, activeRentalId]);

  // Fetch all chats
  const fetchChats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoadingChats(true);
    try {
      const data = await chatsService.getMyChats();
      setChats(data);
    } catch {
      // Silently handle
    } finally {
      if (showSpinner) setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    fetchChats(true);
  }, [fetchChats]);

  // Fetch messages for active rental
  const fetchMessages = useCallback(
    async (rentalId: string, before?: string, isOlder = false) => {
      if (!isOlder) setLoadingMessages(true);
      else setLoadingOlder(true);

      try {
        const data = await chatsService.getRentalMessages(rentalId, {
          before,
          limit: 30,
        });

        if (isOlder) {
          // Prepend older messages while maintaining scroll position
          const scrollContainer = messagesContainerRef.current;
          const oldScrollHeight = scrollContainer?.scrollHeight || 0;

          setMessages((prev) => [...data.messages, ...prev]);
          setHasMoreMessages(data.hasMore);

          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop =
                scrollContainer.scrollHeight - oldScrollHeight;
            }
          });
        } else {
          setMessages(data.messages);
          setHasMoreMessages(data.hasMore);
          setActiveRentalInfo({
            id: data.rental.id,
            status: data.rental.status,
            isReadOnly: data.isReadOnly,
            readOnlyReason: data.readOnlyReason,
            otherUser: data.rental.otherUser,
            item: data.rental.item,
          });

          // Mark messages as read when opening chat
          void chatsService.markMessagesAsRead(rentalId).catch(() => {});

          // Decrement unread count locally for this chat
          setChats((prev) =>
            prev.map((c) =>
              c.rentalId === rentalId ? { ...c, unreadCount: 0 } : c,
            ),
          );

          // Scroll to bottom
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          });
        }
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          setActiveRentalInfo(null);
        }
      } finally {
        setLoadingMessages(false);
        setLoadingOlder(false);
      }
    },
    [],
  );

  // Load messages when activeRentalId changes
  useEffect(() => {
    if (activeRentalId) {
      setMessages([]);
      setPendingMessages([]);
      fetchMessages(activeRentalId);
    } else {
      setActiveRentalInfo(null);
    }
  }, [activeRentalId, fetchMessages]);

  // Setup Socket.IO listener and 10s polling fallback
  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    if (socket) {
      setSocketConnected(socket.connected);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      const onNewMessage = (newMsg: ChatMessage) => {
        // If message is for currently open chat, append and mark as read
        if (newMsg.rentalId === activeRentalId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read immediately if window is focused
          if (document.hasFocus()) {
            chatsService.markMessagesAsRead(newMsg.rentalId).catch(() => {});
          }

          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          });
        }

        // Update last message in chat list
        setChats((prev) => {
          const index = prev.findIndex((c) => c.rentalId === newMsg.rentalId);
          if (index !== -1) {
            const updated = [...prev];
            const chat = { ...updated[index] };
            chat.lastMessage = newMsg;
            chat.updatedAt = newMsg.createdAt;
            if (newMsg.rentalId !== activeRentalId) {
              chat.unreadCount += 1;
            }
            updated.splice(index, 1);
            return [chat, ...updated];
          } else {
            // New rental conversation triggered
            fetchChats(false);
            return prev;
          }
        });
      };

      const onMessageRead = ({
        rentalId,
        readAt,
      }: {
        rentalId: string;
        readBy: string;
        readAt: string;
      }) => {
        if (rentalId === activeRentalId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === user?.id && !m.readAt ? { ...m, readAt } : m,
            ),
          );
        }
      };

      socket.on('message:new', onNewMessage);
      socket.on('message:read', onMessageRead);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('message:new', onNewMessage);
        socket.off('message:read', onMessageRead);
      };
    }
  }, [activeRentalId, user?.id, fetchChats]);

  // 10s fallback polling if socket is disconnected
  useEffect(() => {
    const interval = setInterval(() => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        if (activeRentalId) {
          fetchMessages(activeRentalId);
        }
        fetchChats(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeRentalId, fetchMessages, fetchChats]);

  // Window focus listener: mark open chat as read
  useEffect(() => {
    const handleFocus = () => {
      if (activeRentalId) {
        chatsService.markMessagesAsRead(activeRentalId).catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeRentalId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMessages.length]);

  const selectChat = (rentalId: string) => {
    setActiveRentalId(rentalId);
    setSearchParams({ rentalId });
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSearchParams({});
    setActiveRentalId(null);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeRentalId || !user) return;
    if (activeRentalInfo?.isReadOnly) return;

    const tempId = `temp_${Date.now()}`;
    const pending: PendingMessage = {
      tempId,
      rentalId: activeRentalId,
      senderId: user.id,
      body: text,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setPendingMessages((prev) => [...prev, pending]);
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const savedMsg = await chatsService.sendMessage(activeRentalId, text);
      // Remove from pending, add to messages
      setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));
      setMessages((prev) => [...prev, savedMsg]);

      // Update in conversation list
      setChats((prev) => {
        const index = prev.findIndex((c) => c.rentalId === activeRentalId);
        if (index !== -1) {
          const updated = [...prev];
          const chat = { ...updated[index] };
          chat.lastMessage = savedMsg;
          chat.updatedAt = savedMsg.createdAt;
          updated.splice(index, 1);
          return [chat, ...updated];
        }
        return prev;
      });
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        (err?.response?.status === 429
          ? 'Rate limit exceeded: maximum 30 messages/min'
          : 'Failed to send message');

      setPendingMessages((prev) =>
        prev.map((p) =>
          p.tempId === tempId ? { ...p, status: 'failed', error: errorMessage } : p,
        ),
      );
    }
  };

  const handleRetry = async (pending: PendingMessage) => {
    setPendingMessages((prev) =>
      prev.map((p) =>
        p.tempId === pending.tempId ? { ...p, status: 'sending', error: undefined } : p,
      ),
    );

    try {
      const savedMsg = await chatsService.sendMessage(pending.rentalId, pending.body);
      setPendingMessages((prev) => prev.filter((p) => p.tempId !== pending.tempId));
      setMessages((prev) => [...prev, savedMsg]);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || 'Failed to send message';
      setPendingMessages((prev) =>
        prev.map((p) =>
          p.tempId === pending.tempId
            ? { ...p, status: 'failed', error: errorMessage }
            : p,
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Find the other user from active chat or conversation list
  const currentChatSummary = chats.find((c) => c.rentalId === activeRentalId);
  const otherUser = activeRentalInfo?.otherUser || currentChatSummary?.otherUser;
  const currentItem = activeRentalInfo?.item || currentChatSummary?.item;
  const isReadOnly = activeRentalInfo?.isReadOnly || currentChatSummary?.isReadOnly;
  const readOnlyReason =
    activeRentalInfo?.readOnlyReason || currentChatSummary?.readOnlyReason;

  // Group messages by date for separators
  const combinedMessages: Array<
    | { type: 'date'; label: string; key: string }
    | { type: 'message'; message: ChatMessage; key: string }
    | { type: 'pending'; pending: PendingMessage; key: string }
  > = [];

  let lastDateLabel = '';
  messages.forEach((m) => {
    const dateLabel = formatDateSeparator(m.createdAt);
    if (dateLabel !== lastDateLabel) {
      combinedMessages.push({
        type: 'date',
        label: dateLabel,
        key: `date_${dateLabel}_${m.id}`,
      });
      lastDateLabel = dateLabel;
    }
    combinedMessages.push({
      type: 'message',
      message: m,
      key: m.id,
    });
  });

  pendingMessages.forEach((p) => {
    combinedMessages.push({
      type: 'pending',
      pending: p,
      key: p.tempId,
    });
  });


  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex max-w-7xl w-full mx-auto p-2 sm:p-4 gap-4 overflow-hidden">
        {/* ── Left Pane: Conversation List ── */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col flex-shrink-0 overflow-hidden ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* List Header */}
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Messages</h1>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
                title={socketConnected ? 'Connected (Realtime)' : 'Reconnecting...'}
              />
              <span className="hidden sm:inline">
                {socketConnected ? 'Live' : 'Polling'}
              </span>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {loadingChats ? (
              <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2 my-auto">
                <span className="text-3xl block">💬</span>
                <p className="text-sm font-semibold text-neutral-700">No messages yet</p>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  When you request or lend an item, you can coordinate pickup and details
                  directly with your neighbour here.
                </p>
              </div>
            ) : (
              chats.map((chat) => {
                const isSelected = chat.rentalId === activeRentalId;
                return (
                  <button
                    key={chat.rentalId}
                    onClick={() => selectChat(chat.rentalId)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-neutral-50 ${
                      isSelected ? 'bg-primary-50/70 border-r-2 border-primary-600' : ''
                    }`}
                  >
                    {/* User Avatar */}
                    {chat.otherUser.avatarUrl ? (
                      <img
                        src={chat.otherUser.avatarUrl}
                        alt={chat.otherUser.name}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {chat.otherUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Chat Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-sm text-neutral-900 truncate">
                          {chat.otherUser.name}
                        </span>
                        {chat.lastMessage && (
                          <span className="text-[11px] text-neutral-400 flex-shrink-0">
                            {formatChatListTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-primary-700 font-medium mb-1 truncate">
                        <span>📦 {chat.item.title}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-neutral-500 truncate flex-1">
                          {chat.lastMessage ? (
                            <span>
                              {chat.lastMessage.senderId === user?.id ? 'You: ' : ''}
                              {chat.lastMessage.body}
                            </span>
                          ) : (
                            <span className="italic text-neutral-400">No messages yet</span>
                          )}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white flex-shrink-0 animate-pulse">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Pane: Active Chat Window ── */}
        <div
          className={`flex-1 bg-white rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col overflow-hidden ${
            !showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeRentalId && (otherUser || activeRentalInfo) ? (
            <>
              {/* Chat Top Header */}
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1.5 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
                    title="Back to conversations"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {otherUser?.avatarUrl ? (
                    <img
                      src={otherUser.avatarUrl}
                      alt={otherUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {otherUser?.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-neutral-900 truncate">
                        {otherUser?.name}
                      </h2>
                      {activeRentalInfo && (
                        <StatusBadge status={activeRentalInfo.status as any} />
                      )}
                    </div>
                    {currentItem && (
                      <Link
                        to={`/rentals/${activeRentalId}`}
                        className="text-xs text-primary-600 hover:underline truncate block"
                      >
                        Item: {currentItem.title} →
                      </Link>
                    )}
                  </div>
                </div>

                <Link
                  to={`/rentals/${activeRentalId}`}
                  className="btn-ghost text-xs px-2.5 py-1.5 text-neutral-600 hover:text-primary-700 hidden sm:inline-flex items-center gap-1"
                >
                  <span>Rental Details</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>

              {/* Chat Messages Stream */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/60"
              >
                {/* Load Older Messages Button */}
                {hasMoreMessages && (
                  <div className="text-center py-1">
                    <button
                      onClick={() =>
                        messages[0] &&
                        fetchMessages(activeRentalId, messages[0].id, true)
                      }
                      disabled={loadingOlder}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-white border border-neutral-200 px-3 py-1 rounded-full shadow-2xs disabled:opacity-50"
                    >
                      {loadingOlder ? 'Loading older...' : '↑ Load older messages'}
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs">Loading chat history...</span>
                  </div>
                ) : messages.length === 0 && pendingMessages.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 space-y-2 my-auto">
                    <span className="text-3xl block">👋</span>
                    <p className="text-sm font-semibold text-neutral-700">
                      Start the conversation
                    </p>
                    <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                      Coordinate handover times, question item condition, or ask for
                      directions.
                    </p>
                  </div>
                ) : (
                  combinedMessages.map((item) => {
                    if (item.type === 'date') {
                      return (
                        <div key={item.key} className="flex items-center justify-center my-3">
                          <span className="text-[11px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/15 border border-primary-200/60 dark:border-primary-500/30 px-3 py-0.5 rounded-full shadow-2xs">
                            {item.label}
                          </span>
                        </div>
                      );
                    }

                    if (item.type === 'message') {
                      const msg = item.message;
                      const isMine = msg.senderId === user?.id;

                      return (
                        <div
                          key={item.key}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                              isMine
                                ? 'bg-gradient-to-r from-primary-600 to-[#12C2A8] text-white rounded-tr-xs shadow-xs'
                                : 'bg-white dark:bg-dark-card text-neutral-900 dark:text-dark-text border border-neutral-200/80 dark:border-dark-border rounded-tl-xs'
                            }`}
                          >
                            {msg.body}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            <span className="text-[10px] text-neutral-400 dark:text-dark-muted font-medium">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
                                {msg.readAt ? '✓✓ Seen' : '✓ Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (item.type === 'pending') {
                      const pending = item.pending;
                      return (
                        <div key={item.key} className="flex flex-col items-end">
                          <div className="max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs bg-gradient-to-r from-primary-600/70 to-[#12C2A8]/70 text-white rounded-tr-xs">
                            {pending.body}
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1">
                            {pending.status === 'sending' ? (
                              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <div className="w-2.5 h-2.5 border border-primary-500 border-t-transparent rounded-full animate-spin" />
                                Sending...
                              </span>
                            ) : (
                              <span className="text-[10px] text-danger flex items-center gap-1">
                                <span>Failed to send.</span>
                                <button
                                  onClick={() => handleRetry(pending)}
                                  className="underline font-bold"
                                >
                                  Retry
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar / Read-only Notice */}
              {isReadOnly ? (
                <div className="p-4 bg-amber-50/80 dark:bg-amber-500/10 border-t border-amber-200/60 dark:border-amber-500/20 text-center">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center justify-center gap-1.5">
                    <span>🔒</span>
                    <span>{readOnlyReason || 'This conversation is read-only.'}</span>
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-dark-surface border-t border-neutral-100 dark:border-dark-border">
                  <div className="flex items-center gap-2 bg-neutral-50 dark:bg-dark-card rounded-2xl p-2 border border-neutral-200/80 dark:border-dark-border focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                      maxLength={1000}
                      rows={1}
                      className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-neutral-900 dark:text-dark-text placeholder-neutral-400 dark:placeholder-neutral-500 resize-none max-h-32 px-2 py-1 leading-normal outline-none"
                    />

                    {/* Round Send Button in Teal */}
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-sm hover:shadow-glow transition-all active:scale-95 flex-shrink-0"
                      title="Send message"
                    >
                      <svg className="w-4 h-4 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1 mt-1 text-[10px] text-neutral-400 dark:text-dark-muted font-medium">
                    <span>Press Enter to send</span>
                    <span>{inputText.length}/1000</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No conversation selected state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center text-2xl font-bold">
                💬
              </div>
              <h2 className="text-base font-bold text-neutral-800">Select a conversation</h2>
              <p className="text-xs text-neutral-500 max-w-sm">
                Choose a conversation from the list on the left to start messaging your
                neighbour about a rental.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
