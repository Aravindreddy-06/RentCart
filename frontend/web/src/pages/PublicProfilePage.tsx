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
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <span>← Back</span>
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-neutral-500 font-medium">Loading user profile...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✕
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">User Not Found</h2>
            <p className="text-sm text-neutral-500 mb-6">{error}</p>
            <button onClick={() => navigate('/home')} className="btn-primary">
              Return to Home
            </button>
          </div>
        )}

        {/* Profile Details */}
        {profile && !isLoading && (
          <>
            {/* Header Card */}
            <div className="card p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gradient-to-br from-white to-neutral-50/50">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md bg-neutral-100 flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-100 text-primary-700 font-bold text-4xl flex items-center justify-center border-4 border-white shadow-md flex-shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="text-center sm:text-left space-y-2.5 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                    {profile.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 self-center sm:self-auto">
                    ✓ Verified Member
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 text-xs sm:text-sm text-neutral-500 font-medium">
                  {profile.addressArea && (
                    <span className="flex items-center gap-1">
                      <span>📍</span> {profile.addressArea}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span>🗓️</span> Joined {formatDate(profile.memberSince)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>📦</span> {profile.itemCount} {profile.itemCount === 1 ? 'item listed' : 'items listed'}
                  </span>
                  {Boolean(profile.reviewCount && profile.reviewCount > 0) ? (
                    <div className="flex items-center gap-1">
                      <StarRating
                        rating={profile.averageRating}
                        reviewCount={profile.reviewCount}
                        showValue
                        size="xs"
                      />
                    </div>
                  ) : (
                    <span className="text-neutral-400">★ No reviews yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews Received Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-neutral-900">
                    Reviews Received
                  </h2>
                  {profile.reviewCount != null && profile.reviewCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 font-bold text-neutral-700">
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
                <div className="card p-8 text-center bg-white/60">
                  <p className="text-neutral-400 text-sm">No reviews received yet.</p>
                </div>
              ) : (
                <div className="card divide-y divide-neutral-100 overflow-hidden">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-4 sm:p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {rev.author.avatarUrl ? (
                            <img
                              src={rev.author.avatarUrl}
                              alt={rev.author.name}
                              className="w-9 h-9 rounded-full object-cover bg-neutral-100 border border-neutral-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                              {rev.author.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-neutral-900">{rev.author.name}</p>
                            <p className="text-[11px] text-neutral-400">
                              {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <StarRating mode="display" rating={rev.rating} size="xs" />
                      </div>

                      {rev.comment && (
                        <p className="text-sm text-neutral-600 leading-relaxed pl-12">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}

                  {reviewsPage < reviewsTotalPages && (
                    <div className="p-4 text-center bg-neutral-50/50">
                      <button
                        onClick={handleLoadMoreReviews}
                        disabled={isLoadingMoreReviews}
                        className="btn-outline text-xs py-2 px-5 font-semibold"
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
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-lg font-bold text-neutral-900">
                  Items by {profile.name.split(' ')[0]}
                </h2>
                <span className="text-xs text-neutral-500 font-medium">
                  {profile.items.length} {profile.items.length === 1 ? 'item available' : 'items available'}
                </span>
              </div>

              {profile.items.length === 0 ? (
                <div className="card p-12 text-center bg-white/60">
                  <p className="text-neutral-500 font-medium">
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
