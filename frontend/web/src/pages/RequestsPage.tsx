/**
 * src/pages/RequestsPage.tsx (web)
 * "Requests" — Incoming borrow requests on items owned by the current user.
 * Supports status filtering, Approve, Reject (with optional note), Mark Active, Mark Returned.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { rentalsService, type Rental, type RentalStatus } from '../services/rentals.service';

const TABS: { label: string; value: RentalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Declined', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function RequestsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Reject modal state
  const [rejectingRental, setRejectingRental] = useState<Rental | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Processing indicator for other action buttons (approve/activate/return)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await rentalsService.getIncoming({ status: activeTab, limit: 50 });
      setRentals(data.rentals);
    } catch {
      setError('Failed to load incoming requests. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (rentalId: string) => {
    setActionInProgress(rentalId);
    setActionError('');
    try {
      await rentalsService.approve(rentalId);
      await fetchRequests();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Failed to approve request. Dates may conflict with another booking.';
      setActionError(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleActivate = async (rentalId: string) => {
    setActionInProgress(rentalId);
    setActionError('');
    try {
      await rentalsService.activate(rentalId);
      await fetchRequests();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to mark as active.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReturn = async (rentalId: string) => {
    setActionInProgress(rentalId);
    setActionError('');
    try {
      await rentalsService.return(rentalId);
      await fetchRequests();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to mark as returned.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRental) return;
    setIsRejecting(true);
    setRejectError('');
    try {
      await rentalsService.reject(rejectingRental.id, rejectNote);
      setRejectingRental(null);
      setRejectNote('');
      await fetchRequests();
    } catch (err: any) {
      setRejectError(err?.response?.data?.message ?? 'Failed to decline request.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Incoming Requests
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Review borrow requests from neighbours and manage your ongoing rentals.
          </p>
        </div>

        {/* Global Action Error */}
        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center justify-between">
            <span>⚠️ {actionError}</span>
            <button
              onClick={() => setActionError('')}
              className="text-red-500 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Tabs */}
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
                className="bg-white rounded-2xl p-6 border border-neutral-200 animate-pulse space-y-4"
              >
                <div className="h-5 bg-neutral-200 rounded w-1/3" />
                <div className="h-4 bg-neutral-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <button onClick={fetchRequests} className="btn-primary text-sm px-4 py-2">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && rentals.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/80 space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mx-auto text-2xl">
              📬
            </div>
            <h3 className="text-lg font-bold text-neutral-900">No requests found</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              {activeTab
                ? `No requests currently in "${activeTab}" status.`
                : 'When neighbours request to borrow your listed items, they will appear right here.'}
            </p>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && !error && rentals.length > 0 && (
          <div className="space-y-5">
            {rentals.map((rental) => {
              const itemImage =
                rental.item.images?.[0] ??
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
              const isBusy = actionInProgress === rental.id;

              return (
                <div
                  key={rental.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-sm space-y-4"
                >
                  {/* Top Bar: Item Info + Status */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-3 items-center">
                      <img
                        src={itemImage}
                        alt={rental.item.title}
                        className="w-14 h-14 rounded-xl object-cover bg-neutral-100 flex-shrink-0"
                      />
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                          {rental.item.category}
                        </span>
                        <h3
                          onClick={() => navigate(`/rentals/${rental.id}`)}
                          className="font-bold text-neutral-900 text-base sm:text-lg hover:text-primary-600 cursor-pointer"
                        >
                          {rental.item.title}
                        </h3>
                      </div>
                    </div>

                    <StatusBadge status={rental.status} />
                  </div>

                  {/* Middle: Borrower Profile + Date + Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-sm">
                    {/* Borrower */}
                    <div className="flex gap-3 items-start">
                      {rental.borrower.avatarUrl ? (
                        <img
                          src={rental.borrower.avatarUrl}
                          alt={rental.borrower.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                          {rental.borrower.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-neutral-900">{rental.borrower.name}</p>
                        {rental.borrower.address && (
                          <p className="text-xs text-neutral-500">📍 {rental.borrower.address}</p>
                        )}
                        {rental.borrower.phone && (
                          <p className="text-xs text-primary-600 font-medium mt-0.5">
                            📞 <a href={`tel:${rental.borrower.phone}`}>{rental.borrower.phone}</a>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dates & Financials */}
                    <div className="space-y-1">
                      <p className="text-neutral-700">
                        📅 <strong>{rental.startDate}</strong> → <strong>{rental.endDate}</strong>
                      </p>
                      <p className="text-neutral-600 text-xs">
                        Earnings:{' '}
                        <span className="font-bold text-emerald-600 text-sm">
                          ${rental.totalPrice.toFixed(2)}
                        </span>
                        {rental.depositAmount > 0 && (
                          <span> (Deposit held: ${rental.depositAmount.toFixed(2)})</span>
                        )}
                      </p>
                      {rental.borrowerNote && (
                        <p className="text-xs text-neutral-500 italic pt-1 border-t border-neutral-200/50">
                          "{rental.borrowerNote}"
                        </p>
                      )}
                      {rental.ownerNote && (
                        <p className="text-xs text-red-600 italic pt-1 border-t border-neutral-200/50">
                          Decline reason: "{rental.ownerNote}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => navigate(`/rentals/${rental.id}`)}
                      className="btn-outline text-xs sm:text-sm px-4 py-2"
                    >
                      View Full Details
                    </button>

                    <div className="flex flex-wrap gap-2.5">
                      {/* PENDING -> Approve or Reject */}
                      {rental.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setRejectingRental(rental);
                              setRejectNote('');
                              setRejectError('');
                            }}
                            disabled={isBusy}
                            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleApprove(rental.id)}
                            disabled={isBusy}
                            className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            {isBusy ? 'Approving…' : '✓ Approve Request'}
                          </button>
                        </>
                      )}

                      {/* APPROVED -> Mark Active */}
                      {rental.status === 'APPROVED' && (
                        <button
                          onClick={() => handleActivate(rental.id)}
                          disabled={isBusy}
                          className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          {isBusy ? 'Updating…' : '🤝 Hand Over Item (Mark Active)'}
                        </button>
                      )}

                      {/* ACTIVE -> Mark Returned */}
                      {rental.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleReturn(rental.id)}
                          disabled={isBusy}
                          className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                        >
                          {isBusy ? 'Updating…' : '📦 Confirm Return'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectingRental && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRejecting) setRejectingRental(null);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-lg font-bold text-neutral-900">Decline Borrow Request</h4>
            <p className="text-neutral-500 text-sm">
              You are declining {rejectingRental.borrower.name}'s request for{' '}
              <strong>{rejectingRental.item.title}</strong>.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                  Reason or message <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. Item is being serviced, or reserved for family."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
                />
              </div>

              {rejectError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {rejectError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRental(null)}
                  disabled={isRejecting}
                  className="btn-outline flex-1 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="btn-primary flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 font-semibold"
                >
                  {isRejecting ? 'Declining…' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
