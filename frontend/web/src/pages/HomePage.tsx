/**
 * src/pages/HomePage.tsx (web)
 * Polished Home marketplace screen:
 * - Brand gradient header with personalized greeting
 * - Rounded search bar floating over the header with subtle shadow
 * - Category chips with category-specific colors and Lucide icons (selected=solid, unselected=tint)
 * - Section titles and radius filter chips
 * - Polished ItemCards with image gradient overlay, orange price pill, gold stars, lift hover
 * - Floating "+" button using the warm gradient (#FF8A1F -> #FF5E62)
 * - Friendly empty & error states with retry buttons
 * - Complete dark mode support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { ItemCardSkeleton } from '../components/ItemCardSkeleton';
import { itemsService, type Item } from '../services/items.service';
import { CATEGORY_THEMES, type CategoryKey } from '../utils/colors';
import {
  Search,
  Plus,
  MapPin,
  RotateCcw,
  AlertTriangle,
  Layers,
  Wrench,
  Zap,
  Utensils,
  Trophy,
  BookOpen,
  Package,
} from 'lucide-react';

const CATEGORIES: CategoryKey[] = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];

function getCategoryIcon(cat: CategoryKey) {
  switch (cat) {
    case 'Tools':
      return <Wrench className="w-3.5 h-3.5" />;
    case 'Electronics':
      return <Zap className="w-3.5 h-3.5" />;
    case 'Kitchen':
      return <Utensils className="w-3.5 h-3.5" />;
    case 'Sports':
      return <Trophy className="w-3.5 h-3.5" />;
    case 'Books':
      return <BookOpen className="w-3.5 h-3.5" />;
    case 'Other':
    default:
      return <Package className="w-3.5 h-3.5" />;
  }
}

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
  const navigate = useNavigate();

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

    if (userCoords) {
      setSelectedRadius(radius);
      return;
    }

    setIsLocating(true);

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
          if (user?.latitude != null && user?.longitude != null) {
            setUserCoords({ lat: user.latitude, lng: user.longitude });
            setLocationSource('profile');
            setSelectedRadius(radius);
          } else {
            setSelectedRadius(null);
            setLocationError(
              'Location permission was denied and no saved address was found in your profile. Update your profile location to use nearby search.',
            );
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    } else {
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

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchItems = useCallback(
    async (targetPage = 1, replace = false) => {
      setIsLoading(true);
      setError('');
      try {
        const queryParams: Parameters<typeof itemsService.getItems>[0] = {
          page: targetPage,
          limit: 12,
        };
        if (search.trim()) queryParams.search = search.trim();
        if (activeCategory) queryParams.category = activeCategory;

        if (selectedRadius !== null && userCoords) {
          queryParams.lat = userCoords.lat;
          queryParams.lng = userCoords.lng;
          queryParams.radiusKm = selectedRadius;
        }

        const data = await itemsService.getItems(queryParams);

        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load items. Please check your connection and try again.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [search, activeCategory, selectedRadius, userCoords],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems(1, true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory((prev) => (prev === cat ? '' : cat));
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Neighbour';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg transition-colors duration-200">
      <Navbar />

      {/* ── Gradient Header with Greeting ───────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary-600 via-primary-500 to-[#12C2A8] text-white pt-8 pb-14 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle decorative glow shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/20 rounded-full blur-2xl pointer-events-none transform -translate-x-1/4 translate-y-1/4" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white mb-2 shadow-xs">
                <span>👋</span>
                <span>Welcome back, {firstName}</span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs">
                What would you like to borrow today?
              </h1>
              <p className="text-primary-100 text-sm sm:text-base mt-1 font-medium">
                Save money, reduce waste, and connect with your neighborhood.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ──────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-7 pb-16 space-y-6 relative z-20">
        {/* Floating Search Bar */}
        <div className="relative shadow-lg rounded-2xl">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
            <Search className="w-5 h-5 text-primary-500" />
          </div>
          <input
            id="search-bar"
            type="search"
            placeholder="Search for tools, electronics, camping gear, cookware…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-neutral-200/80 dark:border-dark-border bg-white dark:bg-dark-surface text-neutral-900 dark:text-dark-text placeholder-neutral-400 dark:placeholder-neutral-500 text-base font-medium shadow-card focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all outline-none"
          />
        </div>

        {/* ── Category Chips with Colored Icons & Badges ────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-dark-muted flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary-500" />
              <span>Browse Categories</span>
            </h2>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory('')}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {/* All chip */}
            <button
              id="cat-all"
              onClick={() => setActiveCategory('')}
              className={`chip flex-shrink-0 ${
                activeCategory === ''
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-white dark:bg-dark-surface text-neutral-700 dark:text-dark-text border-neutral-200 dark:border-dark-border hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </button>

            {/* Individual categories with distinct color pairs */}
            {CATEGORIES.map((cat) => {
              const theme = CATEGORY_THEMES[cat];
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  id={`cat-${cat.toLowerCase()}`}
                  onClick={() => handleCategoryClick(cat)}
                  className="chip flex-shrink-0"
                  style={
                    isSelected
                      ? {
                          backgroundColor: theme.solidBg,
                          color: theme.solidText,
                          borderColor: theme.solidBg,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }
                      : {
                          backgroundColor: theme.tintBg,
                          color: theme.tintText,
                          borderColor: theme.borderColor,
                        }
                  }
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Nearby Radius Selector ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-neutral-200/60 dark:border-dark-border">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-primary-500" />
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
                      ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-sm ring-2 ring-primary-300 dark:ring-primary-700'
                      : 'bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border text-neutral-600 dark:text-dark-muted hover:bg-neutral-100 dark:hover:bg-dark-card hover:text-neutral-900 dark:hover:text-dark-text'
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
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-primary-800 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-xl px-3.5 py-2 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <span>🎯</span>
              <span>
                Filtering items within <strong>{selectedRadius} km</strong> (using{' '}
                {locationSource === 'profile' ? 'saved profile address' : 'device location'}).
              </span>
            </span>
            <button
              onClick={() => setSelectedRadius(null)}
              className="text-primary-700 dark:text-primary-400 hover:underline font-bold ml-auto"
              title="Clear radius filter"
            >
              Clear filter ✕
            </button>
          </div>
        )}

        {locationError && (
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3.5 py-2 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{locationError}</span>
            </span>
            <button
              onClick={() => setLocationError(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-black font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section title and counts */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-neutral-900 dark:text-dark-text font-bold text-lg">
            {activeCategory ? `${activeCategory} for rent` : selectedRadius !== null ? 'Nearby items for rent' : 'Available to borrow'}
          </h2>
          {!isLoading && items.length > 0 && (
            <span className="text-neutral-500 dark:text-dark-muted text-xs font-medium">
              {items.length} {items.length === 1 ? 'item found' : 'items found'}
            </span>
          )}
        </div>

        {/* ── Error state ──────────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div className="card p-8 text-center max-w-md mx-auto animate-fade-in">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-danger">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <p className="text-neutral-900 dark:text-dark-text font-bold text-base mb-1">Couldn't load items</p>
            <p className="text-neutral-500 dark:text-dark-muted text-xs mb-5">{error}</p>
            <button onClick={() => fetchItems(1, true)} className="btn-primary text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* ── Item grid ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading && items.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <ItemCardSkeleton key={i} />)
            : items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────────── */}
        {!isLoading && !error && items.length === 0 && (
          <div className="card p-12 text-center max-w-md mx-auto animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-3xl">
              📦
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-dark-text text-lg mb-1">No items found</h3>
            <p className="text-neutral-500 dark:text-dark-muted text-xs mb-5 leading-relaxed">
              {selectedRadius !== null
                ? `No items found within ${selectedRadius} km. Try expanding the radius or selecting Anywhere.`
                : search || activeCategory
                ? 'Try broadening your search or clearing the category filter.'
                : 'No items have been listed yet. Be the first to share in your area!'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {selectedRadius !== null && (
                <button onClick={() => setSelectedRadius(null)} className="btn-outline text-xs">
                  Show Anywhere
                </button>
              )}
              {(search || activeCategory) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setActiveCategory('');
                  }}
                  className="btn-primary text-xs"
                >
                  Clear filters
                </button>
              )}
              {!search && !activeCategory && selectedRadius === null && (
                <button onClick={() => navigate('/items/new')} className="btn-warm text-xs">
                  <Plus className="w-4 h-4" />
                  <span>List your item</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Load more ────────────────────────────────────────────────────────── */}
        {page < totalPages && !isLoading && (
          <div className="text-center pt-4">
            <button onClick={() => fetchItems(page + 1)} className="btn-outline px-8 py-2.5">
              Load more items
            </button>
          </div>
        )}
      </main>

      {/* ── Floating "+" Button (Warm Gradient: #FF8A1F -> #FF5E62) ─────────────── */}
      <button
        onClick={() => navigate('/items/new')}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-accent-500 to-[#FF5E62] text-white shadow-card-hover hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        aria-label="Add new item"
        title="List an item for rent"
      >
        <Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
}
