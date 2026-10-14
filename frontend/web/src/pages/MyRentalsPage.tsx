/**
 * src/pages/MyRentalsPage.tsx (web)
 * "My Rentals" — Displays items borrowed or requested by the logged-in user.
 * Includes status filter tabs, cancel dialog, and view details link.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { rentalsService, type Rental, type RentalStatus } from '../services/rentals.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

const TABS: { label: string; value: RentalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Declined', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function MyRentalsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel dialog state
  const [rentalToCancel, setRentalToCancel] = useState<Rental | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchRentals = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await rentalsService.getMyRentals({ status: activeTab, limit: 50 });
      setRentals(data.rentals);
    } catch {
      setError('Unable to load your rentals. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const handleCancel = async () => {
    if (!rentalToCancel) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      await rentalsService.cancel(rentalToCancel.id);
      setRentalToCancel(null);
      await fetchRentals();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message ?? 'Failed to cancel rental request.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            My Rentals
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Track and manage items you have requested or borrowed from your neighbours.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-neutral-200/80 animate-pulse flex flex-col sm:flex-row gap-5"
              >
                <div className="w-full sm:w-36 h-28 bg-neutral-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  <div className="h-4 bg-neutral-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <button onClick={fetchRentals} className="btn-primary text-sm px-4 py-2">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && rentals.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/80 space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <h3 className="text-lg font-bold text-neutral-900">No rentals found</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              {activeTab
                ? `You don't have any rentals with status "${activeTab}".`
                : "You haven't requested to borrow any items yet. Browse available tools, electronics, and gear nearby!"}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="btn-primary text-sm px-5 py-2.5 shadow-sm"
            >
              Explore Items
            </button>
          </div>
        )}

        {/* Rentals List */}
        {!isLoading && !error && rentals.length > 0 && (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const itemImage =
                rental.item.images?.[0] ??
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';

              const canCancel =
                rental.status === 'PENDING' || rental.status === 'APPROVED';

              return (
                <div
                  key={rental.id}
                  className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                >
                  {/* Left: Image & Info */}
                  <div className="flex gap-4 items-start w-full md:w-auto flex-1">
                    <img
                      src={itemImage}
                      alt={rental.item.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-neutral-100 flex-shrink-0"
                    />

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                          {rental.item.category}
                        </span>
                        <StatusBadge status={rental.status} size="sm" />
                      </div>

                      <h3
                        onClick={() => navigate(`/rentals/${rental.id}`)}
                        className="font-bold text-neutral-900 text-base sm:text-lg hover:text-primary-600 cursor-pointer truncate"
                      >
                        {rental.item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-neutral-600 flex items-center gap-1.5">
                        <span>📅 {formatDateDMY(rental.startDate)} → {formatDateDMY(rental.endDate)}</span>
                      </p>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1">
                        <span>
                          Owner: <strong>{rental.item.owner?.name ?? 'Neighbour'}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-primary-600">
                          {formatINR(rental.totalPrice)} total
                        </span>
                        {rental.depositAmount > 0 && (
                          <span className="text-neutral-400">
                            (+{formatINR(rental.depositAmount)} dep)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100">
                    <button
                      onClick={() => navigate(`/rentals/${rental.id}`)}
                      className="btn-outline text-xs sm:text-sm px-4 py-2"
                    >
                      Details
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => {
                          setRentalToCancel(rental);
                          setCancelError('');
                        }}
                        className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {rentalToCancel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) setRentalToCancel(null);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
              ✕
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-neutral-900">Cancel Rental Request?</h4>
              <p className="text-neutral-500 text-sm mt-1">
                Are you sure you want to cancel your request for{' '}
                <strong>{rentalToCancel.item.title}</strong>?
              </p>
            </div>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {cancelError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRentalToCancel(null)}
                disabled={isCancelling}
                className="btn-outline flex-1 py-2.5 text-sm"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="btn-primary flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 font-semibold"
              >
                {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
