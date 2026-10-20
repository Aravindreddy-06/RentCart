/**
 * src/pages/ItemDetailPage.tsx (web)
 * Polished item details screen:
 * - Image gallery with rounded corners, thumbnails, and indicator dots
 * - Price in accent orange with "per day" caption
 * - Deposit in a tinted info chip
 * - Owner card with deterministic avatar color & initials
 * - Reviews list with StarRating
 * - Sticky bottom action bar with gradient "Request to Borrow" button
 * - Preserved all existing business logic, modals, reviews, and deletion flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsService, type Item } from '../services/items.service';
import { reviewsService, type Review } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { RequestBorrowModal } from '../components/RequestBorrowModal';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';
import { CATEGORY_THEMES, type CategoryKey, getAvatarColor, getInitials } from '../utils/colors';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop';

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);

  const fetchReviews = useCallback(async (itemId: string, page = 1) => {
    if (page === 1) setIsLoadingReviews(true);
    else setIsLoadingMoreReviews(true);

    try {
      const data = await reviewsService.getItemReviews(itemId, { page, limit: 5 });
      if (page === 1) {
        setReviews(data.reviews);
      } else {
        setReviews((prev) => [...prev, ...data.reviews]);
      }
      setReviewsPage(data.pagination.page);
      setReviewsTotalPages(data.pagination.totalPages);
    } catch {
      // Ignored
    } finally {
      setIsLoadingReviews(false);
      setIsLoadingMoreReviews(false);
    }
  }, []);

  const handleLoadMoreReviews = () => {
    if (!id || isLoadingMoreReviews || reviewsPage >= reviewsTotalPages) return;
    fetchReviews(id, reviewsPage + 1);
  };

  const fetchItem = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await itemsService.getById(id);
      setItem(data);
      void fetchReviews(data.id, 1);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError('Item not found.');
      } else if (status === 401) {
        navigate('/login', { replace: true });
      } else {
        setError('Failed to load item. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, fetchReviews]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      await itemsService.delete(item.id);
      navigate('/home', { replace: true });
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!item) return;
    setIsTogglingAvailability(true);
    try {
      const updated = await itemsService.toggleAvailability(item.id, !item.isAvailable);
      setItem(updated);
    } catch {
      // Ignored
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg p-4 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg p-4 flex flex-col items-center justify-center">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-danger">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-dark-text mb-2">Item Unavailable</h2>
          <p className="text-neutral-500 dark:text-dark-muted text-sm mb-6">{error || 'This item could not be loaded.'}</p>
          <button onClick={() => navigate('/home')} className="btn-primary w-full">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === item.owner.id;
  const images = item.images.length > 0 ? item.images : [PLACEHOLDER];
  const categoryTheme = CATEGORY_THEMES[item.category as CategoryKey] ?? CATEGORY_THEMES.Other;
  const ownerAvatarColor = getAvatarColor(item.owner.name);
  const ownerInitials = getInitials(item.owner.name);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg transition-colors duration-200 pb-28">
      {/* Top Bar with Back Button */}
      <header className="bg-white/80 dark:bg-dark-surface/80 border-b border-neutral-200 dark:border-dark-border sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text py-1 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-card transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-bold text-neutral-400 dark:text-dark-muted uppercase tracking-wider">
            Item Details
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Image Gallery with Rounded Corners & Indicator Dots ────────────── */}
        <div className="card overflow-hidden">
          <div className="relative h-64 sm:h-96 w-full bg-neutral-100 dark:bg-dark-card overflow-hidden">
            <img
              src={images[activeImage]}
              alt={item.title}
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Availability Badge */}
            <div className="absolute top-4 right-4 z-10">
              {item.isAvailable ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success text-white shadow-md backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Available to borrow
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-700/90 text-white shadow-md backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  Currently unavailable
                </span>
              )}
            </div>

            {/* Gallery Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((p) => (p - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-xs transition-colors shadow-sm"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImage((p) => (p + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-xs transition-colors shadow-sm"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Indicator Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === activeImage ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2.5 p-3 overflow-x-auto bg-neutral-50/50 dark:bg-dark-card/30 border-t border-neutral-100 dark:border-dark-border">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === activeImage ? 'border-primary-500 scale-105 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Title, Pricing, Chips & Details ─────────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="space-y-2">
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs"
                style={{
                  backgroundColor: categoryTheme.tintBg,
                  color: categoryTheme.tintText,
                  borderColor: categoryTheme.borderColor,
                }}
              >
                {item.category}
              </span>

              {item.distanceKm != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-dark-card text-neutral-700 dark:text-dark-muted border border-neutral-200 dark:border-dark-border">
                  <MapPin className="w-3 h-3 text-primary-500" />
                  {item.distanceKm} km away
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
              {item.title}
            </h1>

            {/* Rating display */}
            {Boolean(item.reviewCount && item.reviewCount > 0) ? (
              <div className="flex items-center gap-2 pt-0.5">
                <StarRating rating={item.averageRating} reviewCount={item.reviewCount} showValue size="sm" />
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-dark-muted font-medium">No reviews yet • Be the first!</p>
            )}
          </div>

          {/* Pricing Row: Price in Orange + Deposit in Tinted Chip */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-dark-card/50 border border-neutral-200/80 dark:border-dark-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase font-bold text-neutral-500 dark:text-dark-muted block">Rental Price</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-accent-500 dark:text-accent-400">
                  {formatINR(item.pricePerDay)}
                </span>
                <span className="text-neutral-500 dark:text-dark-muted text-sm font-semibold">/ day</span>
              </div>
            </div>

            {/* Deposit chip */}
            {item.deposit > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-500/30">
                <ShieldCheck className="w-4 h-4 text-secondary-500" />
                <span>{formatINR(item.deposit)} Refundable Deposit</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-dark-muted mb-2">Description</h2>
            <p className="text-neutral-700 dark:text-dark-text text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          </div>
        </div>

        {/* ── Owner Card with Avatar and Rating details ───────────────────────── */}
        <div
          onClick={() => navigate(`/users/${item.owner.id}`)}
          className="card p-5 cursor-pointer hover:border-primary-400 hover:shadow-card-hover transition-all group"
          role="button"
          tabIndex={0}
          title="View public profile"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-neutral-500 dark:text-dark-muted uppercase tracking-wider">Listed by</h3>
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-1">
              View Profile →
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {item.owner.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={item.owner.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/40 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: ownerAvatarColor }}
              >
                {ownerInitials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-bold text-neutral-900 dark:text-dark-text group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {item.owner.name}
              </p>
              {item.owner.address && (
                <p className="text-neutral-500 dark:text-dark-muted text-xs flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span>{item.owner.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Reviews Card ────────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-dark-text">Reviews</h3>
              {item.reviewCount != null && item.reviewCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-dark-card font-bold text-neutral-700 dark:text-dark-text">
                  {item.reviewCount}
                </span>
              )}
            </div>

            {Boolean(item.reviewCount && item.reviewCount > 0) && (
              <StarRating rating={item.averageRating} showValue size="xs" />
            )}
          </div>

          {isLoadingReviews ? (
            <div className="py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-6 text-center text-neutral-400 dark:text-dark-muted text-sm">
              No reviews for this item yet. Be the first to rent and review!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="border-b border-neutral-100 dark:border-dark-border pb-4 last:border-b-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {rev.author.avatarUrl ? (
                        <img
                          src={rev.author.avatarUrl}
                          alt={rev.author.name}
                          className="w-8 h-8 rounded-full object-cover bg-neutral-100 border border-neutral-200"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-xs"
                          style={{ backgroundColor: getAvatarColor(rev.author.name) }}
                        >
                          {getInitials(rev.author.name)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-dark-text">{rev.author.name}</p>
                        <p className="text-[11px] text-neutral-400 dark:text-dark-muted">{formatDateDMY(rev.createdAt)}</p>
                      </div>
                    </div>
                    <StarRating mode="display" rating={rev.rating} size="xs" />
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-neutral-600 dark:text-dark-muted leading-relaxed pl-10">
                      {rev.comment}
                    </p>
                  )}
                </div>
              ))}

              {reviewsPage < reviewsTotalPages && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleLoadMoreReviews}
                    disabled={isLoadingMoreReviews}
                    className="btn-outline text-xs py-2 px-4 w-full sm:w-auto font-semibold"
                  >
                    {isLoadingMoreReviews ? 'Loading more…' : 'Load more reviews'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Owner Action Panel (if owner) ─────────────────────────────────── */}
        {isOwner && (
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 dark:text-dark-muted uppercase tracking-wider">Manage Listing</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/items/${item.id}/edit`)}
                className="btn-outline flex-1 py-2.5 text-xs font-bold"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleToggleAvailability}
                disabled={isTogglingAvailability}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 disabled:opacity-50 ${
                  item.isAvailable
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100'
                }`}
              >
                {isTogglingAvailability ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : item.isAvailable ? (
                  'Mark Unavailable'
                ) : (
                  'Mark Available'
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky Bottom Action Bar with Gradient "Request to Borrow" Button ── */}
      {!isOwner && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-dark-surface/95 border-t border-neutral-200 dark:border-dark-border p-4 shadow-lg backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden xs:block">
              <span className="text-[11px] uppercase font-bold text-neutral-400 dark:text-dark-muted block">Daily Rate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-accent-500 dark:text-accent-400">{formatINR(item.pricePerDay)}</span>
                <span className="text-xs text-neutral-500 dark:text-dark-muted font-medium">/ day</span>
              </div>
            </div>

            {item.isAvailable ? (
              <button
                id="request-borrow-btn"
                onClick={() => setIsBorrowModalOpen(true)}
                className="btn-primary flex-1 sm:flex-initial sm:px-8 py-3.5 text-sm sm:text-base font-bold shadow-md hover:shadow-glow active:scale-95"
              >
                <span>Request to Borrow</span>
              </button>
            ) : (
              <div className="flex-1 py-3 px-4 rounded-xl bg-neutral-100 dark:bg-dark-card text-center text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                Currently marked unavailable by the owner
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request to Borrow Modal */}
      {item && (
        <RequestBorrowModal
          item={item}
          isOpen={isBorrowModalOpen}
          onClose={() => setIsBorrowModalOpen(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 animate-fade-in backdrop-blur-xs"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 dark:border-dark-border">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-danger">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-neutral-900 dark:text-dark-text font-bold text-center mb-1">Delete item?</h3>
            <p className="text-neutral-500 dark:text-dark-muted text-xs text-center mb-5 leading-relaxed">
              This will permanently remove <strong>{item.title}</strong> from RentCart. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline flex-1 text-xs">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-warm flex-1 text-xs bg-red-500 hover:bg-red-600 border-none"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
