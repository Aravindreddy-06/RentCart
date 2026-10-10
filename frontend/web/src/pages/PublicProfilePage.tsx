/**
 * src/pages/PublicProfilePage.tsx (web)
 * Public view of a community member's profile (/users/:id).
 * Displays name, avatar, general area, member since, number of items, and listed items.
 * Never exposes email, phone, or exact coordinates.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { usersService, type PublicUserProfile } from '../services/users.service';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setIsLoading(true);
    setError('');

    usersService
      .getPublicProfile(id)
      .then((data) => {
        if (mounted) setProfile(data);
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
  }, [id]);

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
                </div>
              </div>
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
