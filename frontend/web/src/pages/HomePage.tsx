/**
 * src/pages/HomePage.tsx
 * Main authenticated screen.
 * - Global Navbar with navigation and profile link
 * - Search bar
 * - Category filter chips
 * - Nearby Radius Selector (1, 2, 5, 10, 25 km, or Anywhere) with geolocation + profile fallback
 * - Item grid with skeletons, empty state, distance display, and error+retry
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { ItemCardSkeleton } from '../components/ItemCardSkeleton';
import { itemsService, type Item } from '../services/items.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];
const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Anywhere', value: null },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
];

export function HomePage() {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'device' | 'profile' | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Geolocation & Radius Handler ───────────────────────────────────────────
  const handleRadiusSelect = async (radius: number | null) => {
    setLocationError(null);
    if (radius === null) {
      setSelectedRadius(null);
      return;
    }

    // If coordinates already stored, simply apply the radius
    if (userCoords) {
      setSelectedRadius(radius);
      return;
    }

    setIsLocating(true);

    // 1. Try browser geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setLocationSource('device');
          setSelectedRadius(radius);
          setIsLocating(false);
        },
        (_err) => {
          // 2. Fall back to saved profile coordinates
          if (user?.latitude != null && user?.longitude != null) {
            setUserCoords({ lat: user.latitude, lng: user.longitude });
            setLocationSource('profile');
            setSelectedRadius(radius);
          } else {
            // 3. Fall back to no filtering
            setSelectedRadius(null);
            setLocationError(
              'Location permission was denied and no saved home address was found in your profile. Update your profile location to use nearby search.',
            );
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    } else {
      // Browser does not support geolocation — fall back to profile
      if (user?.latitude != null && user?.longitude != null) {
        setUserCoords({ lat: user.latitude, lng: user.longitude });
        setLocationSource('profile');
        setSelectedRadius(radius);
      } else {
        setSelectedRadius(null);
        setLocationError('Geolocation not supported by browser and no saved profile location found.');
      }
      setIsLocating(false);
    }
  };

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
          lat: selectedRadius !== null && userCoords ? userCoords.lat : undefined,
          lng: selectedRadius !== null && userCoords ? userCoords.lng : undefined,
          radiusKm: selectedRadius !== null ? selectedRadius : undefined,
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
    [search, activeCategory, selectedRadius, userCoords],
  );

  // Refetch when search, category, or radius changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(1, true);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <input
            id="search-bar"
            type="search"
            placeholder="Search for tools, electronics, camping gear to borrow…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-field pl-11 pr-4 py-3.5 text-base shadow-sm"
          />
        </div>

        {/* Nearby Radius Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <span>📍</span>
            <span>Distance Radius:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {RADIUS_OPTIONS.map((opt) => {
              const isActive = selectedRadius === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => handleRadiusSelect(opt.value)}
                  disabled={isLocating}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-300'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {isLocating && opt.value !== null && isActive ? 'Locating...' : opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Radius Notice / Error message */}
        {selectedRadius !== null && userCoords && (
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-primary-800 bg-primary-50 border border-primary-200 rounded-xl px-3.5 py-2">
            <span className="flex items-center gap-1.5">
              <span>🎯</span>
              <span>
                Filtering items within <strong>{selectedRadius} km</strong> (using{' '}
                {locationSource === 'profile' ? 'saved profile address' : 'device location'}).
              </span>
            </span>
            <button
              onClick={() => setSelectedRadius(null)}
              className="text-primary-700 hover:text-primary-950 font-bold ml-auto"
              title="Clear radius filter"
            >
              Clear filter ✕
            </button>
          </div>
        )}

        {locationError && (
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2">
            <span>⚠️ {locationError}</span>
            <button
              onClick={() => setLocationError(null)}
              className="text-amber-700 hover:text-black font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            id="cat-all"
            onClick={() => setActiveCategory('')}
            className={`chip flex-shrink-0 ${activeCategory === '' ? 'chip-active' : 'chip-inactive'}`}
          >
            All Categories
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
            {activeCategory ? `${activeCategory} items` : selectedRadius !== null ? 'Nearby items' : 'Available items'}
          </h2>
          {!isLoading && items.length > 0 && (
            <span className="text-neutral-400 text-sm">
              {items.length} {items.length === 1 ? 'item found' : 'items found'}
            </span>
          )}
        </div>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div className="card p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">Couldn't load items</p>
            <p className="text-neutral-500 text-sm mb-4">{error}</p>
            <button onClick={() => fetchItems(1, true)} className="btn-primary">
              Try again
            </button>
          </div>
        )}

        {/* ── Item grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading && items.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <ItemCardSkeleton key={i} />)
            : items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!isLoading && !error && items.length === 0 && (
          <div className="card p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl">
              🔍
            </div>
            <h3 className="font-semibold text-neutral-800 text-base mb-1">No items found</h3>
            <p className="text-neutral-500 text-sm mb-5">
              {selectedRadius !== null
                ? `No items found within ${selectedRadius} km. Try expanding the radius or selecting Anywhere.`
                : search || activeCategory
                ? 'Try broadening your search or clearing the category filter.'
                : 'No items have been listed yet. Be the first to share!'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {selectedRadius !== null && (
                <button onClick={() => setSelectedRadius(null)} className="btn-secondary text-sm">
                  Show Anywhere
                </button>
              )}
              {(search || activeCategory) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setActiveCategory('');
                  }}
                  className="btn-primary text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Load more ────────────────────────────────────────────────────── */}
        {page < totalPages && !isLoading && (
          <div className="text-center pt-4">
            <button onClick={() => fetchItems(page + 1)} className="btn-secondary px-8">
              Load more items
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
