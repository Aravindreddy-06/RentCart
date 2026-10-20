/**
 * src/components/Navbar.tsx (web)
 * Universal navigation bar across RentCart web:
 * - Subtle gradient / glassmorphism with teal active underline
 * - Dark mode toggle button (Sun/Moon)
 * - Notification bell with unread badge and dropdown with colored category circles
 * - Consistent avatar initials & color palette
 * - 30s polling / tab focus refresh
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { rentalsService } from '../services/rentals.service';
import { notificationsService } from '../services/notifications.service';
import { chatsService } from '../services/chats.service';
import type { NotificationItem, NotificationType } from '../services/notifications.service';
import { getAvatarColor, getInitials } from '../utils/colors';
import {
  Sun,
  Moon,
  Bell,
  Plus,
  LogOut,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Ban,
  Rocket,
  PackageCheck,
  MessageSquare,
  Star,
  MapPin,
  Car,
  PartyPopper,
  ChevronRight,
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationBadge(type: NotificationType) {
  switch (type) {
    case 'RENTAL_REQUESTED':
      return {
        icon: <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
      };
    case 'RENTAL_APPROVED':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30',
      };
    case 'RENTAL_REJECTED':
      return {
        icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
        bg: 'bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30',
      };
    case 'RENTAL_CANCELLED':
      return {
        icon: <Ban className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />,
        bg: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
      };
    case 'RENTAL_ACTIVATED':
      return {
        icon: <Rocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30',
      };
    case 'RENTAL_RETURNED':
      return {
        icon: <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
        bg: 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30',
      };
    case 'NEW_MESSAGE':
      return {
        icon: <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30',
      };
    case 'REVIEW_RECEIVED':
      return {
        icon: <Star className="w-4 h-4 text-[#F5B301] fill-[#F5B301]" />,
        bg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
      };
    case 'PICKUP_LOCATION_SHARED':
      return {
        icon: <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />,
        bg: 'bg-primary-100 dark:bg-primary-500/20 border-primary-200 dark:border-primary-500/30',
      };
    case 'BORROWER_ON_THE_WAY':
      return {
        icon: <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30',
      };
    case 'BORROWER_ARRIVED':
      return {
        icon: <PartyPopper className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />,
        bg: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
      };
  }
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
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
        const [incomingData, unreadData, unreadChats] = await Promise.all([
          rentalsService.getIncoming({ status: 'PENDING', limit: 50 }).catch(() => null),
          notificationsService.getUnreadCount().catch(() => null),
          chatsService.getUnreadCount().catch(() => null),
        ]);

        if (mounted) {
          if (incomingData) setPendingCount(incomingData.pagination.total);
          if (unreadData !== null) setUnreadCount(unreadData);
          if (unreadChats !== null) setUnreadChatsCount(unreadChats);
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
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const loadDropdownNotifications = async () => {
    setDropdownLoading(true);
    try {
      const [res, count] = await Promise.all([
        notificationsService.getNotifications({ page: 1, limit: 10 }),
        notificationsService.getUnreadCount(),
      ]);
      setDropdownNotifications(res.notifications);
      setUnreadCount(count);
    } catch {
      // Ignore
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
    if (notif.type === 'NEW_MESSAGE' && notif.data?.rentalId) {
      navigate(`/chats?rentalId=${notif.data.rentalId}`);
    } else if (notif.data?.rentalId) {
      navigate(`/rentals/${notif.data.rentalId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-all ${
      isActive
        ? 'text-primary-600 dark:text-primary-400 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary-500 after:rounded-full'
        : 'text-neutral-600 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text hover:bg-neutral-100/70 dark:hover:bg-dark-card rounded-xl'
    }`;

  const avatarColor = getAvatarColor(user?.name);
  const initials = getInitials(user?.name);

  return (
    <header className="bg-white/95 dark:bg-dark-surface/95 border-b border-neutral-200 dark:border-dark-border sticky top-0 z-30 shadow-xs backdrop-blur-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <NavLink to="/home" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-[#12C2A8] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
            </div>
            <span className="font-extrabold text-neutral-900 dark:text-dark-text text-xl tracking-tight">
              Rent<span className="text-primary-500">Cart</span>
            </span>
          </NavLink>

          {/* Navigation Links with Teal Underline */}
          <nav className="hidden md:flex items-center gap-1">
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
            <NavLink to="/chats" className={navLinkClass}>
              <span>Messages</span>
              {unreadChatsCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white animate-pulse">
                  {unreadChatsCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-neutral-600 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text hover:bg-neutral-100 dark:hover:bg-dark-card transition-colors active:scale-95"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600" />
            )}
          </button>

          {/* Add Item Button */}
          <button
            onClick={() => navigate('/items/new')}
            className="btn-primary text-xs sm:text-sm px-3.5 py-2 shadow-sm"
            title="List an item for rent"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Item</span>
          </button>

          {/* Notification Bell Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleToggleDropdown}
              aria-label="Notifications"
              className={`relative p-2 rounded-xl transition-all ${
                dropdownOpen
                  ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text hover:bg-neutral-100 dark:hover:bg-dark-card'
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />

              {/* Unread Badge (Red) */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-dark-surface animate-pulse shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-neutral-200 dark:border-dark-border overflow-hidden z-50 animate-fade-in">
                {/* Dropdown Header */}
                <div className="p-3.5 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between bg-neutral-50/70 dark:bg-dark-card/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-dark-text text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      {markingAll ? 'Marking…' : 'Mark all as read'}
                    </button>
                  )}
                </div>

                {/* Dropdown Body */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-dark-border">
                  {dropdownLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-dark-card" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-neutral-200 dark:bg-dark-card rounded w-1/2" />
                            <div className="h-3 bg-neutral-100 dark:bg-dark-card/50 rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : dropdownNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-neutral-100 dark:bg-dark-card flex items-center justify-center text-xl text-neutral-400">
                        🔔
                      </div>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-dark-text">No notifications yet</p>
                      <p className="text-[11px] text-neutral-500 dark:text-dark-muted mt-0.5">
                        You will be notified when someone rents your items.
                      </p>
                    </div>
                  ) : (
                    dropdownNotifications.map((n) => {
                      const badge = getNotificationBadge(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-dark-card/60 ${
                            !n.isRead ? 'bg-primary-50/40 dark:bg-primary-500/10' : 'bg-transparent'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm border shadow-xs ${badge.bg}`}
                          >
                            {badge.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs truncate ${
                                  !n.isRead
                                    ? 'font-bold text-neutral-900 dark:text-dark-text'
                                    : 'font-semibold text-neutral-700 dark:text-dark-muted'
                                }`}
                              >
                                {n.title}
                              </span>
                              <span className="text-[10px] text-neutral-400 dark:text-dark-muted flex-shrink-0">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p
                              className={`text-xs mt-0.5 line-clamp-2 ${
                                !n.isRead
                                  ? 'text-neutral-800 dark:text-neutral-200 font-medium'
                                  : 'text-neutral-500 dark:text-dark-muted'
                              }`}
                            >
                              {n.body}
                            </p>
                          </div>

                          {!n.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-400 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer */}
                <div className="p-2.5 bg-neutral-50/80 dark:bg-dark-card/50 border-t border-neutral-100 dark:border-dark-border text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setDropdownOpen(false)}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <span>View all notifications</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          {user && (
            <NavLink
              to="/profile"
              className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-dark-border hover:opacity-85 transition-opacity"
              title="My Profile"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-neutral-200 dark:border-dark-border object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
              )}
              <span className="text-sm font-semibold text-neutral-800 dark:text-dark-text max-w-[120px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="btn-ghost text-xs sm:text-sm px-2.5 py-2 text-neutral-500 dark:text-dark-muted hover:text-danger dark:hover:text-danger"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar below header */}
      <div className="flex md:hidden border-t border-neutral-100 dark:border-dark-border px-4 py-2 bg-neutral-50 dark:bg-dark-card justify-around">
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
        <NavLink to="/chats" className={navLinkClass}>
          <span>Messages</span>
          {unreadChatsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white">
              {unreadChatsCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/notifications" className={navLinkClass}>
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-danger text-white">
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
