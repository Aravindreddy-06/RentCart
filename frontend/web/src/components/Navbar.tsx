/**
 * src/components/Navbar.tsx (web)
 * Universal navigation bar across RentCart web.
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rentalsService } from '../services/rentals.service';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const data = await rentalsService.getIncoming({ status: 'PENDING', limit: 50 });
        if (mounted) {
          setPendingCount(data.pagination.total);
        }
      } catch {
        // silently ignore background badge errors
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
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

          {/* User info */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200">
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
            </div>
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
      </div>
    </header>
  );
}
