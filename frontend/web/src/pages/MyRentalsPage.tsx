/**
 * src/pages/MyRentalsPage.tsx (web)
 * Polished "My Rentals" screen:
 * - Status-coloured left border on rental cards
 * - Coloured action buttons (Cancel = red outline, Details = primary outline)
 * - Category badge with category-specific colors
 * - Complete dark mode support
 * - Preserved filters, pagination, and cancel flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { rentalsService, type Rental, type RentalStatus } from '../services/rentals.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';
import { CATEGORY_THEMES, type CategoryKey } from '../utils/colors';
import { Calendar, AlertTriangle, ArrowRight } from 'lucide-react';

const TABS: { label: string; value: RentalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Declined', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function getStatusBorderClass(status: RentalStatus) {
  switch (status) {
    case 'PENDING':
      return 'border-l-4 border-l-amber-500';
    case 'APPROVED':
      return 'border-l-4 border-l-primary-500';
    case 'ACTIVE':
      return 'border-l-4 border-l-blue-500';
    case 'RETURNED':
      return 'border-l-4 border-l-secondary-500';
    case 'REJECTED':
      return 'border-l-4 border-l-danger';
    case 'CANCELLED':
      return 'border-l-4 border-l-neutral-400 dark:border-l-neutral-600';
    default:
      return '';
  }
}

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
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full animate-slide-up">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            My Rentals
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted text-sm mt-1">
            Track and manage items you have requested or borrowed from your neighbours.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-surface text-neutral-600 dark:text-dark-muted border border-neutral-200 dark:border-dark-border hover:bg-neutral-100 dark:hover:bg-dark-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse flex gap-4">
                <div className="w-24 h-24 rounded-2xl bg-neutral-200 dark:bg-dark-card" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-neutral-200 dark:bg-dark-card rounded w-1/3" />
                  <div className="h-5 bg-neutral-200 dark:bg-dark-card rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 dark:bg-dark-card/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="card p-8 text-center space-y-3 border-danger/30 bg-red-50/50 dark:bg-red-500/10">
            <p className="text-danger text-sm font-semibold">{error}</p>
            <button onClick={fetchRentals} className="btn-primary text-xs px-4 py-2">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && rentals.length === 0 && (
          <div className="card p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto text-3xl">
              📦
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-dark-text">No rentals found</h3>
            <p className="text-neutral-500 dark:text-dark-muted text-xs leading-relaxed">
              {activeTab
                ? `You don't have any rentals with status "${activeTab}".`
                : "You haven't requested to borrow any items yet. Browse available tools, electronics, and gear nearby!"}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="btn-primary text-xs px-5 py-2.5 shadow-sm"
            >
              Explore Items
            </button>
          </div>
        )}

        {/* Rentals List with Status-Coloured Left Border */}
        {!isLoading && !error && rentals.length > 0 && (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const itemImage =
                rental.item.images?.[0] ??
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
              const canCancel =
                rental.status === 'PENDING' || rental.status === 'APPROVED';
              const categoryTheme =
                CATEGORY_THEMES[rental.item.category as CategoryKey] ?? CATEGORY_THEMES.Other;
              const borderAccent = getStatusBorderClass(rental.status);

              return (
                <div
                  key={rental.id}
                  className={`card p-5 transition-all duration-200 hover:shadow-card-hover flex flex-col md:flex-row gap-5 items-start md:items-center justify-between overflow-hidden ${borderAccent}`}
                >
                  {/* Left: Image & Info */}
                  <div className="flex gap-4 items-start w-full md:w-auto flex-1">
                    <img
                      src={itemImage}
                      alt={rental.item.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-neutral-100 dark:bg-dark-card flex-shrink-0 border border-neutral-200/50 dark:border-dark-border"
                    />

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs"
                          style={{
                            backgroundColor: categoryTheme.tintBg,
                            color: categoryTheme.tintText,
                            borderColor: categoryTheme.borderColor,
                          }}
                        >
                          {rental.item.category}
                        </span>
                        <StatusBadge status={rental.status} size="sm" />
                      </div>

                      <h3
                        onClick={() => navigate(`/rentals/${rental.id}`)}
                        className="font-bold text-neutral-900 dark:text-dark-text text-base sm:text-lg hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer truncate transition-colors"
                      >
                        {rental.item.title}
                      </h3>

                      <p className="text-xs text-neutral-600 dark:text-dark-muted flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        <span>{formatDateDMY(rental.startDate)} → {formatDateDMY(rental.endDate)}</span>
                      </p>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-neutral-500 dark:text-dark-muted pt-1">
                        <span>
                          Owner: <strong className="text-neutral-800 dark:text-dark-text">{rental.item.owner?.name ?? 'Neighbour'}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-bold text-accent-600 dark:text-accent-400">
                          {formatINR(rental.totalPrice)}
                        </span>
                        {rental.depositAmount > 0 && (
                          <span className="text-neutral-400 dark:text-dark-muted">
                            (+{formatINR(rental.depositAmount)} dep)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-dark-border">
                    <button
                      onClick={() => navigate(`/rentals/${rental.id}`)}
                      className="btn-outline text-xs px-4 py-2 font-bold"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => setRentalToCancel(rental)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <span>Cancel</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) setRentalToCancel(null);
          }}
        >
          <div className="bg-white dark:bg-dark-surface rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-dark-border animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 text-danger flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-dark-text mb-1">
              Cancel Rental Request?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-dark-muted text-center leading-relaxed mb-4">
              Are you sure you want to cancel your request for{' '}
              <strong className="text-neutral-800 dark:text-dark-text">{rentalToCancel.item.title}</strong>?
            </p>

            {cancelError && (
              <p className="text-danger text-xs bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl border border-red-200 dark:border-red-500/30 mb-4 font-medium">
                {cancelError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRentalToCancel(null)}
                disabled={isCancelling}
                className="btn-outline flex-1 py-2.5 text-xs font-bold"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="btn-warm flex-1 py-2.5 text-xs font-bold bg-red-500 hover:bg-red-600 border-none"
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
