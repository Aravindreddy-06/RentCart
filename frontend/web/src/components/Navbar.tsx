/**
 * src/components/Navbar.tsx (web)
 * Universal navigation bar across RentCart web.
 * Includes notification bell with unread badge, interactive dropdown (latest 10),
 * mark all as read, and 30s polling / tab focus refresh.
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rentalsService } from '../services/rentals.service';
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

function getBadgeIcon(type: NotificationType): { icon: string; bg: string } {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return { icon: '📋', bg: 'bg-amber-100 text-amber-800' };
    case 'RENTAL_APPROVED':
      return { icon: '✅', bg: 'bg-emerald-100 text-emerald-800' };
    case 'RENTAL_REJECTED':
      return { icon: '❌', bg: 'bg-rose-100 text-rose-800' };
    case 'RENTAL_CANCELLED':
      return { icon: '🚫', bg: 'bg-neutral-100 text-neutral-700' };
    case 'RENTAL_ACTIVATED':
      return { icon: '🚀', bg: 'bg-blue-100 text-blue-800' };
    case 'RENTAL_RETURNED':
      return { icon: '📦', bg: 'bg-teal-100 text-teal-800' };
    default:
      return { icon: '🔔', bg: 'bg-neutral-100 text-neutral-700' };
  }
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [dropdownNotifications, setDropdownNotifications] = useState<NotificationItem[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count & incoming requests every 30s + refresh on tab focus
  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      if (!user) return;
      try {
        const [incomingData, unreadData] = await Promise.all([
          rentalsService.getIncoming({ status: 'PENDING', limit: 50 }).catch(() => null),
          notificationsService.getUnreadCount().catch(() => null),
        ]);

        if (mounted) {
          if (incomingData) setPendingCount(incomingData.pagination.total);
          if (unreadData !== null) setUnreadCount(unreadData);
        }
      } catch {
        // Silently ignore background polling errors
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);

    const handleFocus = () => {
      fetchCounts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCounts();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const loadDropdownNotifications = async () => {
    setDropdownLoading(true);
    try {
      const data = await notificationsService.getNotifications({ limit: 10 });
      setDropdownNotifications(data.notifications);
    } catch {
      // Silently ignore
    } finally {
      setDropdownLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!dropdownOpen) {
      loadDropdownNotifications();
    }
    setDropdownOpen(!dropdownOpen);
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setDropdownNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      notificationsService.markAsRead(notif.id).catch(() => {});
      setDropdownNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setDropdownOpen(false);
    if (notif.data?.rentalId) {
      navigate(`/rentals/${notif.data.rentalId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    }`;

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <NavLink to="/home" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
            </div>
            <span className="font-bold text-neutral-900 text-lg tracking-tight">RentCart</span>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/home" className={navLinkClass}>
              Explore
            </NavLink>
            <NavLink to="/rentals" className={navLinkClass}>
              My Rentals
            </NavLink>
            <NavLink to="/requests" className={navLinkClass}>
              <span>Requests</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => navigate('/items/new')}
            className="btn-primary text-xs sm:text-sm px-3.5 py-2 shadow-sm"
            title="List an item for rent"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Item</span>
          </button>

          {/* Notification Bell Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleToggleDropdown}
              aria-label="Notifications"
              className={`relative p-2 rounded-xl transition-all ${
                dropdownOpen
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title="Notifications"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>

              {/* Unread Badge */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Dropdown Header */}
                <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-100 text-primary-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      {markingAll ? 'Marking…' : 'Mark all as read'}
                    </button>
                  )}
                </div>

                {/* Dropdown Body */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
                  {dropdownLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-200" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-neutral-200 rounded w-1/2" />
                            <div className="h-3 bg-neutral-100 rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : dropdownNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-2xl mb-1">🔔</div>
                      <p className="text-xs font-semibold text-neutral-800">No notifications yet</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        You will be notified when someone rents your items.
                      </p>
                    </div>
                  ) : (
                    dropdownNotifications.map((n) => {
                      const badge = getBadgeIcon(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-neutral-50 ${
                            !n.isRead ? 'bg-primary-50/40' : 'bg-white'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border ${badge.bg}`}
                          >
                            {badge.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs truncate ${
                                  !n.isRead
                                    ? 'font-bold text-neutral-900'
                                    : 'font-semibold text-neutral-700'
                                }`}
                              >
                                {n.title}
                              </span>
                              <span className="text-[10px] text-neutral-400 flex-shrink-0">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p
                              className={`text-xs mt-0.5 line-clamp-2 ${
                                !n.isRead ? 'text-neutral-800 font-medium' : 'text-neutral-500'
                              }`}
                            >
                              {n.body}
                            </p>
                          </div>

                          {!n.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer */}
                <div className="p-2.5 bg-neutral-50/80 border-t border-neutral-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setDropdownOpen(false)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <span>View all notifications</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          {user && (
            <NavLink
              to="/profile"
              className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200 hover:opacity-85 transition-opacity"
              title="My Profile"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-neutral-800 max-w-[120px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="btn-ghost text-xs sm:text-sm px-2.5 py-2 text-neutral-500 hover:text-red-600"
            title="Logout"
          >
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
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar below header */}
      <div className="flex md:hidden border-t border-neutral-100 px-4 py-2 bg-neutral-50 justify-around">
        <NavLink to="/home" className={navLinkClass}>
          Explore
        </NavLink>
        <NavLink to="/rentals" className={navLinkClass}>
          My Rentals
        </NavLink>
        <NavLink to="/requests" className={navLinkClass}>
          <span>Requests</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/notifications" className={navLinkClass}>
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {unreadCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Profile
        </NavLink>
      </div>
    </header>
  );
}
