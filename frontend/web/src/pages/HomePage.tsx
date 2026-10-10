/**
 * src/pages/HomePage.tsx
 * Main authenticated screen.
 * - Greeting header with user name + logout
 * - Search bar
 * - Category chips
 * - Item grid with skeletons, empty state, and error+retry
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { ItemCardSkeleton } from '../components/ItemCardSkeleton';
import { itemsService, type Item } from '../services/items.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch items ────────────────────────────────────────────────────────────
  const fetchItems = useCallback(
    async (currentPage = 1, reset = false) => {
      setIsLoading(true);
      setError('');
      try {
        const result = await itemsService.getItems({
          search: search || undefined,
          category: activeCategory || undefined,
          page: currentPage,
          limit: 12,
        });
        setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        setTotalPages(result.pagination.totalPages);
        setPage(currentPage);
      } catch {
        setError('Failed to load items. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, activeCategory],
  );

  // Refetch when search or category changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCategoryClick = (cat: string) => {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <span className="font-bold text-neutral-900 text-lg hidden sm:inline">RentCart</span>
          </div>

          {/* Greeting */}
          <div className="flex-1 min-w-0">
            <p className="text-neutral-500 text-xs font-medium">{greeting}</p>
            <h2 className="text-neutral-900 font-semibold text-sm truncate">
              Hello, {firstName} 👋
            </h2>
          </div>

          {/* User + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full border-2 border-neutral-100 hidden sm:block"
              />
            )}
            <button
              onClick={() => navigate('/rentals')}
              className="btn-ghost text-xs sm:text-sm px-2.5 sm:px-3 py-2 text-neutral-600 hover:text-neutral-900"
              title="My Rentals"
            >
              <span>My Rentals</span>
            </button>
            <button
              onClick={() => navigate('/requests')}
              className="btn-ghost text-xs sm:text-sm px-2.5 sm:px-3 py-2 text-neutral-600 hover:text-neutral-900"
              title="Incoming Requests"
            >
              <span>Requests</span>
            </button>
            <button
              id="add-item-btn"
              onClick={() => navigate('/items/new')}
              className="btn-primary text-sm gap-1.5 px-3 py-2"
              title="Add Item"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add Item</span>
            </button>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="btn-ghost text-sm gap-1.5 text-neutral-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            id="search-bar"
            type="search"
            placeholder="Search for items to borrow…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-field pl-11 pr-4 py-3.5 text-base shadow-sm"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            id="cat-all"
            onClick={() => setActiveCategory('')}
            className={`chip flex-shrink-0 ${activeCategory === '' ? 'chip-active' : 'chip-inactive'}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`cat-${cat.toLowerCase()}`}
              onClick={() => handleCategoryClick(cat)}
              className={`chip flex-shrink-0 ${activeCategory === cat ? 'chip-active' : 'chip-inactive'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <h2 className="text-neutral-900 font-semibold text-base">
            {activeCategory ? `${activeCategory} items` : 'Nearby items'}
          </h2>
          {!isLoading && items.length > 0 && (
            <span className="text-neutral-400 text-sm">{items.length} items</span>
          )}
        </div>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div className="card p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">Couldn't load items</p>
            <p className="text-neutral-500 text-sm mb-4">{error}</p>
            <button onClick={() => fetchItems(1, true)} className="btn-primary">
              Try again
            </button>
          </div>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        {!error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading && items.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <ItemCardSkeleton key={i} />)
              : items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {!isLoading && !error && items.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">No items found</p>
            <p className="text-neutral-500 text-sm">
              {search || activeCategory
                ? 'Try adjusting your search or filters'
                : 'No items have been listed yet. Be the first to share!'}
            </p>
            {(search || activeCategory) && (
              <button
                onClick={() => {
                  setSearch('');
                  setActiveCategory('');
                }}
                className="btn-outline mt-4"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Load more ─────────────────────────────────────────────────────── */}
        {!isLoading && !error && page < totalPages && (
          <div className="flex justify-center pt-4">
            <button
              id="load-more-btn"
              onClick={() => fetchItems(page + 1, false)}
              className="btn-outline px-8"
            >
              Load more
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {isLoading && items.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
