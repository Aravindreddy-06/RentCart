/**
 * src/pages/NotificationsPage.tsx (web)
 * Full notifications inbox with All/Unread tabs, pagination,
 * mark read, delete, and real-time polling/tab focus refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { notificationsService } from '../services/notifications.service';
import type { NotificationItem, NotificationType } from '../services/notifications.service';
import { formatDateDMY } from '../utils/date';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  PlayCircle,
  PackageCheck,
  Star,
  MessageSquare,
  MapPin,
  Navigation,
  Sparkles,
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

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

function getBadge(type: NotificationType) {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return {
        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
        label: 'Request',
        icon: <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      };
    case 'RENTAL_APPROVED':
      return {
        bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
        label: 'Approved',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      };
    case 'RENTAL_REJECTED':
      return {
        bg: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800/50',
        label: 'Declined',
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
      };
    case 'RENTAL_CANCELLED':
      return {
        bg: 'bg-neutral-100 text-neutral-600 dark:bg-dark-surface dark:text-dark-muted border-neutral-200 dark:border-dark-border',
        label: 'Cancelled',
        icon: <Ban className="w-5 h-5 text-neutral-500 dark:text-dark-muted" />,
      };
    case 'RENTAL_ACTIVATED':
      return {
        bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        label: 'Active',
        icon: <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      };
    case 'RENTAL_RETURNED':
      return {
        bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
        label: 'Returned',
        icon: <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      };
    case 'REVIEW_RECEIVED':
      return {
        bg: 'bg-amber-50 text-gold dark:bg-amber-950/40 dark:text-gold border-amber-300 dark:border-amber-700/50',
        label: 'Review',
        icon: <Star className="w-5 h-5 fill-gold text-gold" />,
      };
    case 'NEW_MESSAGE':
      return {
        bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        label: 'Message',
        icon: <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      };
    case 'PICKUP_LOCATION_SHARED':
      return {
        bg: 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-400 border-primary-200 dark:border-primary-800/50',
        label: 'Pickup',
        icon: <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      };
    case 'BORROWER_ON_THE_WAY':
      return {
        bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        label: 'On the way',
        icon: <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      };
    case 'BORROWER_ARRIVED':
      return {
        bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
        label: 'Arrived',
        icon: <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      };
    case 'HANDOVER_PIN_READY':
      return {
        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
        label: 'Pickup PIN',
        icon: <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      };
    case 'HANDOVER_CONFIRMED':
      return {
        bg: 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-400 border-primary-200 dark:border-primary-800/50',
        label: 'Handover Confirmed',
        icon: <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      };
    default:
      return {
        bg: 'bg-neutral-100 text-neutral-600 dark:bg-dark-surface dark:text-dark-muted border-neutral-200 dark:border-dark-border',
        label: 'Notice',
        icon: <Bell className="w-5 h-5 text-neutral-500 dark:text-dark-muted" />,
      };
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(
    async (pageNum = 1, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const data = await notificationsService.getNotifications({
          unread: activeTab === 'unread' ? true : undefined,
          page: pageNum,
          limit: 15,
        });
        setNotifications(data.notifications);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
        setPage(pageNum);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load notifications. Please try again.');
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  // Polling every 30 seconds + refresh on tab regain focus
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(page, false);
    }, 30000);

    const handleFocus = () => {
      fetchNotifications(page, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(page, false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications, page]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // Ignore background error
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (activeTab === 'unread') {
        setNotifications([]);
        setTotalCount(0);
      }
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationsService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      notificationsService.markAsRead(notif.id).catch(() => {});
    }
    if (notif.type === 'NEW_MESSAGE' && notif.data?.rentalId) {
      navigate(`/chats?rentalId=${notif.data.rentalId}`);
      return;
    }
    if (notif.type === 'REVIEW_RECEIVED') {
      const targetUserId = notif.data?.targetUserId || notif.userId;
      navigate(`/users/${targetUserId}`);
      return;
    }
    if (notif.data?.rentalId) {
      navigate(`/rentals/${notif.data.rentalId}`);
    }
  };

  const unreadCountInList = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg text-neutral-900 dark:text-dark-text flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-neutral-500 dark:text-dark-muted mt-1">
              Stay updated on your rental requests, approvals, and activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || (activeTab === 'all' && unreadCountInList === 0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-dark-border text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-dark-surface hover:bg-neutral-50 dark:hover:bg-dark-border/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>{markingAll ? 'Marking…' : 'Mark all as read'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-neutral-200 dark:border-dark-border mb-6 gap-2">
          <button
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`pb-3 px-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-neutral-500 dark:text-dark-muted hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>All</span>
            {activeTab === 'all' && totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-dark-border text-neutral-700 dark:text-neutral-300 font-bold">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('unread');
              setPage(1);
            }}
            className={`pb-3 px-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'unread'
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-neutral-500 dark:text-dark-muted hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Unread</span>
            {activeTab === 'unread' && totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/40">
                {totalCount}
              </span>
            )}
          </button>
        </div>

        {/* States: Loading, Error, Empty, List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-neutral-200 dark:border-dark-border animate-pulse flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-dark-border flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-neutral-200 dark:bg-dark-border rounded w-1/3" />
                  <div className="h-3.5 bg-neutral-100 dark:bg-dark-border/60 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-neutral-200 dark:border-dark-border text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-1">Failed to load</h3>
            <p className="text-neutral-500 dark:text-dark-muted text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchNotifications(page, true)}
              className="btn-primary text-sm px-4 py-2"
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-12 border border-neutral-200 dark:border-dark-border text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-4 text-3xl">
              🔔
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-dark-muted max-w-sm mx-auto">
              {activeTab === 'unread'
                ? "You're all caught up! Check back later or view all past notifications."
                : 'Rental requests, approvals, and reminders will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const badge = getBadge(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-4 ${
                    notif.isRead
                      ? 'bg-white dark:bg-dark-surface border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm'
                      : 'bg-primary-50/70 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/50 shadow-xs hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:shadow-sm'
                  }`}
                >
                  {/* Icon badge inside circle */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-lg border shadow-xs ${badge.bg}`}
                  >
                    {badge.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 animate-pulse" />
                      )}
                      <span
                        className={`text-sm tracking-tight ${
                          notif.isRead
                            ? 'font-semibold text-neutral-800 dark:text-neutral-200'
                            : 'font-bold text-neutral-900 dark:text-white'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-neutral-400 dark:text-dark-muted">
                        • {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`text-sm leading-relaxed ${
                        notif.isRead
                          ? 'text-neutral-600 dark:text-dark-muted'
                          : 'text-neutral-800 dark:text-neutral-200 font-medium'
                      }`}
                    >
                      {notif.body}
                    </p>

                    {notif.data?.rentalId && (
                      <div className="mt-2.5 flex items-center text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                        <span>View rental details</span>
                        <svg
                          className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Actions: Mark read & Delete */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        title="Mark as read"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-dark-border border border-transparent hover:border-neutral-200 dark:hover:border-dark-border transition-colors"
                      >
                        <span className="sr-only">Mark read</span>
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Delete notification"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-dark-border border border-transparent hover:border-neutral-200 dark:hover:border-dark-border transition-colors"
                    >
                      <span className="sr-only">Delete</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 dark:border-dark-border">
            <button
              onClick={() => fetchNotifications(page - 1, true)}
              disabled={page <= 1}
              className="btn-secondary text-xs sm:text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm text-neutral-500 dark:text-dark-muted font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchNotifications(page + 1, true)}
              disabled={page >= totalPages}
              className="btn-secondary text-xs sm:text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
