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

function getBadge(type: NotificationType) {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        label: 'Request',
        icon: '📋',
      };
    case 'RENTAL_APPROVED':
      return {
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        label: 'Approved',
        icon: '✅',
      };
    case 'RENTAL_REJECTED':
      return {
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        label: 'Declined',
        icon: '❌',
      };
    case 'RENTAL_CANCELLED':
      return {
        bg: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        label: 'Cancelled',
        icon: '🚫',
      };
    case 'RENTAL_ACTIVATED':
      return {
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Active',
        icon: '🚀',
      };
    case 'RENTAL_RETURNED':
      return {
        bg: 'bg-teal-100 text-teal-800 border-teal-200',
        label: 'Returned',
        icon: '📦',
      };
    case 'REVIEW_RECEIVED':
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        label: 'Review',
        icon: '⭐',
      };
    case 'NEW_MESSAGE':
      return {
        bg: 'bg-primary-100 text-primary-800 border-primary-200',
        label: 'Message',
        icon: '💬',
      };
    default:
      return {
        bg: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        label: 'Notice',
        icon: '🔔',
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
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Stay updated on your rental requests, approvals, and activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || (activeTab === 'all' && unreadCountInList === 0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs sm:text-sm font-semibold text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>{markingAll ? 'Marking…' : 'Mark all as read'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-neutral-200 mb-6 gap-2">
          <button
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`pb-3 px-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>All</span>
            {activeTab === 'all' && totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-bold">
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
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>Unread</span>
            {activeTab === 'unread' && totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-bold">
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
                className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-neutral-200 rounded w-1/3" />
                  <div className="h-3.5 bg-neutral-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-900 text-base mb-1">Failed to load</h3>
            <p className="text-neutral-500 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchNotifications(page, true)}
              className="btn-primary text-sm px-4 py-2"
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-neutral-200 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              🔔
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
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
                      ? 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                      : 'bg-primary-50/50 border-primary-200/80 shadow-xs hover:bg-primary-50 hover:shadow-sm'
                  }`}
                >
                  {/* Icon badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg border ${badge.bg}`}
                  >
                    {badge.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-sm font-semibold tracking-tight ${
                          notif.isRead ? 'text-neutral-800' : 'text-neutral-900 font-bold'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-neutral-400">
                        • {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`text-sm leading-relaxed ${
                        notif.isRead ? 'text-neutral-600' : 'text-neutral-800 font-medium'
                      }`}
                    >
                      {notif.body}
                    </p>

                    {notif.data?.rentalId && (
                      <div className="mt-2.5 flex items-center text-xs font-semibold text-primary-700 group-hover:text-primary-800 transition-colors">
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
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-white border border-transparent hover:border-neutral-200 transition-colors"
                      >
                        <span className="sr-only">Mark read</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Delete notification"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-neutral-200 transition-colors"
                    >
                      <span className="sr-only">Delete</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200">
            <button
              onClick={() => fetchNotifications(page - 1, true)}
              disabled={page <= 1}
              className="btn-ghost text-xs sm:text-sm px-3 py-1.5 text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchNotifications(page + 1, true)}
              disabled={page >= totalPages}
              className="btn-ghost text-xs sm:text-sm px-3 py-1.5 text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
