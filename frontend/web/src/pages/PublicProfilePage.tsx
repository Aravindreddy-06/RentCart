/**
 * src/pages/PublicProfilePage.tsx (web)
 * Public view of a community member's profile (/users/:id).
 * Displays name, avatar, general area, member since, number of items, and listed items.
 * Never exposes email, phone, or exact coordinates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { StarRating } from '../components/StarRating';
import { usersService, type PublicUserProfile } from '../services/users.service';
import { reviewsService, type Review } from '../services/reviews.service';
import { formatDateDMY } from '../utils/date';
import { getAvatarColor, getInitials } from '../utils/colors';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  ShieldCheck,
} from 'lucide-react';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Reviews received state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);

  const fetchUserReviews = useCallback(async (userId: string, page = 1) => {
    if (page === 1) setIsLoadingReviews(true);
    else setIsLoadingMoreReviews(true);

    try {
      const data = await reviewsService.getUserReviews(userId, { page, limit: 5 });
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
    fetchUserReviews(id, reviewsPage + 1);
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setIsLoading(true);
    setError('');

    usersService
      .getPublicProfile(id)
      .then((data) => {
        if (mounted) {
          setProfile(data);
          void fetchUserReviews(id, 1);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.response?.data?.message || 'Failed to load user profile.');
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, fetchUserReviews]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg text-neutral-900 dark:text-dark-text transition-colors">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-500 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-neutral-500 dark:text-dark-muted font-medium">Loading user profile...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✕
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">User Not Found</h2>
            <p className="text-sm text-neutral-500 dark:text-dark-muted mb-6">{error}</p>
            <button onClick={() => navigate('/home')} className="btn-primary">
              Return to Home
            </button>
          </div>
        )}

        {/* Profile Details */}
        {profile && !isLoading && (
          <>
            {/* Header Card with Gradient Banner */}
            <div className="card overflow-hidden">
              <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-primary-600 via-primary-500 to-[#12C2A8] relative">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              </div>

              <div className="p-6 sm:p-8 pt-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-5 text-center sm:text-left">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white dark:border-dark-surface shadow-xl bg-neutral-100 dark:bg-dark-border flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl text-white font-bold text-4xl sm:text-5xl flex items-center justify-center border-4 border-white dark:border-dark-surface shadow-xl flex-shrink-0 ${getAvatarColor(
                        profile.name,
                      )}`}
                    >
                      {getInitials(profile.name)}
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1 pb-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                        {profile.name}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 self-center sm:self-auto">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Member
                      </span>
                    </div>

                    {/* Stats row in coloured chips */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                      {profile.addressArea && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-dark-border/60 dark:text-neutral-300 dark:border-dark-border">
                          <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                          {profile.addressArea}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-950/40 dark:text-primary-400 dark:border-primary-800/40">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {formatDate(profile.memberSince)}
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-950/30 dark:text-accent-300 dark:border-accent-800/40">
                        <Package className="w-3.5 h-3.5" />
                        {profile.itemCount} {profile.itemCount === 1 ? 'item listed' : 'items listed'}
                      </span>

                      {Boolean(profile.reviewCount && profile.reviewCount > 0) ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                          <StarRating
                            rating={profile.averageRating}
                            reviewCount={profile.reviewCount}
                            showValue
                            size="xs"
                          />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-neutral-400 dark:text-dark-muted">
                          No reviews yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Received Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-dark-border pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Reviews Received
                  </h2>
                  {profile.reviewCount != null && profile.reviewCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-dark-border font-bold text-neutral-700 dark:text-neutral-300">
                      {profile.reviewCount}
                    </span>
                  )}
                </div>

                {Boolean(profile.reviewCount && profile.reviewCount > 0) && (
                  <StarRating rating={profile.averageRating} showValue size="xs" />
                )}
              </div>

              {isLoadingReviews ? (
                <div className="card p-8 text-center flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="card p-8 text-center bg-white/60 dark:bg-dark-surface/60">
                  <p className="text-neutral-400 dark:text-dark-muted text-sm">No reviews received yet.</p>
                </div>
              ) : (
                <div className="card divide-y divide-neutral-100 dark:divide-dark-border overflow-hidden">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-4 sm:p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {rev.author.avatarUrl ? (
                            <img
                              src={rev.author.avatarUrl}
                              alt={rev.author.name}
                              className="w-9 h-9 rounded-full object-cover bg-neutral-100 dark:bg-dark-border border border-neutral-200 dark:border-dark-border"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center ${getAvatarColor(
                                rev.author.name,
                              )}`}
                            >
                              {getInitials(rev.author.name)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{rev.author.name}</p>
                            <p className="text-[11px] text-neutral-400 dark:text-dark-muted">
                              {formatDateDMY(rev.createdAt)}
                            </p>
                          </div>
                        </div>

                        <StarRating mode="display" rating={rev.rating} size="xs" />
                      </div>

                      {rev.comment && (
                        <p className="text-sm text-neutral-600 dark:text-dark-muted leading-relaxed pl-12">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}

                  {reviewsPage < reviewsTotalPages && (
                    <div className="p-4 text-center bg-neutral-50/50 dark:bg-dark-border/20">
                      <button
                        onClick={handleLoadMoreReviews}
                        disabled={isLoadingMoreReviews}
                        className="btn-secondary text-xs py-2 px-5 font-semibold"
                      >
                        {isLoadingMoreReviews ? 'Loading more…' : 'Load more reviews'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Listed Items Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-dark-border pb-3">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Items by {profile.name.split(' ')[0]}
                </h2>
                <span className="text-xs text-neutral-500 dark:text-dark-muted font-medium">
                  {profile.items.length} {profile.items.length === 1 ? 'item available' : 'items available'}
                </span>
              </div>

              {profile.items.length === 0 ? (
                <div className="card p-12 text-center bg-white/60 dark:bg-dark-surface/60">
                  <p className="text-neutral-500 dark:text-dark-muted font-medium">
                    This user doesn't have any items available for borrowing right now.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {profile.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={{
                        ...item,
                        owner: {
                          id: profile.id,
                          name: profile.name,
                          avatarUrl: profile.avatarUrl || undefined,
                          address: profile.addressArea || undefined,
                        },
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
