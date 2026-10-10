/**
 * src/pages/RentalDetailPage.tsx (web)
 * Full details of a rental agreement — status timeline, item card,
 * other party profile (with privacy-gated phone number), notes, and role-based actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { rentalsService, type Rental, type RentalStatus } from '../services/rentals.service';

export function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rental, setRental] = useState<Rental | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchRental = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await rentalsService.getById(id);
      setRental(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError('Rental not found.');
      } else if (status === 403) {
        setError('You do not have permission to view this rental agreement.');
      } else {
        setError('Failed to load rental details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRental();
  }, [fetchRental]);

  const isOwner = user?.id === rental?.item?.ownerId;
  const isBorrower = user?.id === rental?.borrowerId;

  // Lifecycle actions
  const handleApprove = async () => {
    if (!rental) return;
    setActionInProgress(true);
    setActionError('');
    try {
      await rentalsService.approve(rental.id);
      await fetchRental();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ??
          'Could not approve request. The dates may conflict with another booking.',
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleActivate = async () => {
    if (!rental) return;
    setActionInProgress(true);
    setActionError('');
    try {
      await rentalsService.activate(rental.id);
      await fetchRental();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to mark as active.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReturn = async () => {
    if (!rental) return;
    setActionInProgress(true);
    setActionError('');
    try {
      await rentalsService.return(rental.id);
      await fetchRental();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to mark as returned.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancel = async () => {
    if (!rental) return;
    setIsCancelling(true);
    setActionError('');
    try {
      await rentalsService.cancel(rental.id);
      setShowCancelModal(false);
      await fetchRental();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to cancel rental.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;
    setIsRejecting(true);
    setActionError('');
    try {
      await rentalsService.reject(rental.id, rejectNote);
      setShowRejectModal(false);
      await fetchRental();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Failed to decline request.');
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto p-8 text-center space-y-4 my-auto">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-neutral-900">{error || 'Rental Not Found'}</h2>
          <button onClick={() => navigate(-1)} className="btn-primary text-sm px-5 py-2.5">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Timeline steps
  const steps: { label: string; status: RentalStatus }[] = [
    { label: 'Requested', status: 'PENDING' },
    { label: 'Approved', status: 'APPROVED' },
    { label: 'Handed Over', status: 'ACTIVE' },
    { label: 'Returned', status: 'RETURNED' },
  ];

  const statusOrder: Record<RentalStatus, number> = {
    PENDING: 0,
    APPROVED: 1,
    ACTIVE: 2,
    RETURNED: 3,
    REJECTED: -1,
    CANCELLED: -1,
  };

  const currentStepIndex = statusOrder[rental.status];
  const isTerminated = rental.status === 'REJECTED' || rental.status === 'CANCELLED';

  const otherPerson = isBorrower ? rental.item.owner : rental.borrower;
  const otherPersonRole = isBorrower ? 'Owner' : 'Borrower';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Top bar with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(isBorrower ? '/rentals' : '/requests')}
            className="btn-ghost text-xs sm:text-sm px-3 py-1.5 gap-1 text-neutral-600"
          >
            ← Back to {isBorrower ? 'My Rentals' : 'Requests'}
          </button>
          <StatusBadge status={rental.status} size="lg" />
        </div>

        {/* Global Action Error */}
        {actionError && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 flex items-center justify-between">
            <span>⚠️ {actionError}</span>
            <button
              onClick={() => setActionError('')}
              className="text-red-500 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-5">
            Rental Progress
          </h2>

          {isTerminated ? (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 ${
                rental.status === 'REJECTED'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
              }`}
            >
              <span className="text-2xl">{rental.status === 'REJECTED' ? '✕' : '⊘'}</span>
              <div>
                <p className="font-bold text-sm">
                  {rental.status === 'REJECTED' ? 'Request Declined' : 'Request Cancelled'}
                </p>
                <p className="text-xs mt-0.5">
                  {rental.status === 'REJECTED'
                    ? rental.ownerNote
                      ? `Reason: "${rental.ownerNote}"`
                      : 'The owner was unable to accommodate this request.'
                    : 'This rental request was cancelled by the borrower.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 relative">
              {steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.status} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors z-10 ${
                        isCurrent
                          ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-md'
                          : isPassed
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                      }`}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-xs mt-2 font-semibold ${
                        isCurrent
                          ? 'text-primary-700'
                          : isPassed
                            ? 'text-neutral-800'
                            : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Item + Rental Terms (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Item Card */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex gap-4 items-start">
              <img
                src={
                  rental.item.images?.[0] ??
                  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
                }
                alt={rental.item.title}
                className="w-24 h-24 rounded-xl object-cover bg-neutral-100 flex-shrink-0"
              />
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                  {rental.item.category}
                </span>
                <h3
                  onClick={() => navigate(`/items/${rental.item.id}`)}
                  className="font-bold text-lg text-neutral-900 hover:text-primary-600 cursor-pointer"
                >
                  {rental.item.title}
                </h3>
                <p className="text-xs text-neutral-500 line-clamp-2">
                  {rental.item.description}
                </p>
                <button
                  onClick={() => navigate(`/items/${rental.item.id}`)}
                  className="text-xs text-primary-600 font-semibold hover:underline pt-1 block"
                >
                  View Listing Page →
                </button>
              </div>
            </div>

            {/* Rental Agreement Details */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Rental Period & Pricing
              </h2>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-neutral-100">
                <div>
                  <p className="text-xs text-neutral-400">Start Date</p>
                  <p className="font-bold text-neutral-900 text-base mt-0.5">
                    📅 {rental.startDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">End Date</p>
                  <p className="font-bold text-neutral-900 text-base mt-0.5">
                    📅 {rental.endDate}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm pt-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Rental Rate</span>
                  <span className="font-medium text-neutral-900">
                    ${rental.item.pricePerDay} / day
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Total Rental Price</span>
                  <span className="font-bold text-neutral-900">
                    ${rental.totalPrice.toFixed(2)}
                  </span>
                </div>
                {rental.depositAmount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Security Deposit</span>
                    <span className="font-medium text-neutral-900">
                      ${rental.depositAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-100 flex justify-between font-extrabold text-base text-neutral-900">
                  <span>Total Due</span>
                  <span className="text-primary-600">
                    ${(rental.totalPrice + (rental.depositAmount ?? 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {rental.borrowerNote && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-500 uppercase">
                    Borrower's Note
                  </p>
                  <p className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-xl mt-1.5 italic">
                    "{rental.borrowerNote}"
                  </p>
                </div>
              )}

              {rental.ownerNote && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs font-semibold text-red-500 uppercase">
                    Owner's Note
                  </p>
                  <p className="text-sm text-red-700 bg-red-50 p-3 rounded-xl mt-1.5 italic border border-red-200">
                    "{rental.ownerNote}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Other Party & Action Controls (1 col) */}
          <div className="space-y-6">
            {/* Other Party Profile Card */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {otherPersonRole} Information
              </h2>

              <div className="flex items-center gap-3">
                {otherPerson?.avatarUrl ? (
                  <img
                    src={otherPerson.avatarUrl}
                    alt={otherPerson.name}
                    className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-base">
                    {otherPerson?.name ? otherPerson.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-neutral-900 text-base">{otherPerson?.name}</h3>
                  {otherPerson?.address && (
                    <p className="text-xs text-neutral-500 mt-0.5">📍 {otherPerson.address}</p>
                  )}
                </div>
              </div>

              {/* Phone display / privacy rule */}
              <div className="pt-3 border-t border-neutral-100">
                {otherPerson?.phone ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <p className="text-xs font-semibold text-emerald-800">
                      📞 Verified Phone Number
                    </p>
                    <a
                      href={`tel:${otherPerson.phone}`}
                      className="text-sm font-bold text-emerald-700 hover:underline block"
                    >
                      {otherPerson.phone}
                    </a>
                    <p className="text-[11px] text-emerald-600">
                      Shared for pickup and handover coordination.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1">
                    <p className="text-xs font-medium text-neutral-600">
                      🔒 Phone number hidden
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Contact phone will be revealed once the request is approved.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Actions
              </h2>

              {/* Owner actions */}
              {isOwner && (
                <div className="space-y-2.5">
                  {rental.status === 'PENDING' && (
                    <>
                      <button
                        onClick={handleApprove}
                        disabled={actionInProgress}
                        className="btn-primary w-full py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700"
                      >
                        {actionInProgress ? 'Approving…' : '✓ Approve Request'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionInProgress}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        Decline Request
                      </button>
                    </>
                  )}

                  {rental.status === 'APPROVED' && (
                    <button
                      onClick={handleActivate}
                      disabled={actionInProgress}
                      className="btn-primary w-full py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionInProgress ? 'Updating…' : '🤝 Hand Over Item (Mark Active)'}
                    </button>
                  )}

                  {rental.status === 'ACTIVE' && (
                    <button
                      onClick={handleReturn}
                      disabled={actionInProgress}
                      className="btn-primary w-full py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-700"
                    >
                      {actionInProgress ? 'Updating…' : '📦 Mark Item as Returned'}
                    </button>
                  )}

                  {(rental.status === 'RETURNED' ||
                    rental.status === 'REJECTED' ||
                    rental.status === 'CANCELLED') && (
                    <p className="text-xs text-neutral-500 text-center py-2">
                      No further actions needed for this agreement.
                    </p>
                  )}
                </div>
              )}

              {/* Borrower actions */}
              {isBorrower && (
                <div className="space-y-2.5">
                  {(rental.status === 'PENDING' || rental.status === 'APPROVED') && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionInProgress}
                      className="w-full py-2.5 text-sm font-semibold rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}

                  {rental.status === 'ACTIVE' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                      Item is currently in your possession. Return the item to the owner by{' '}
                      <strong>{rental.endDate}</strong>.
                    </div>
                  )}

                  {(rental.status === 'RETURNED' ||
                    rental.status === 'REJECTED' ||
                    rental.status === 'CANCELLED') && (
                    <p className="text-xs text-neutral-500 text-center py-2">
                      Rental completed.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) setShowCancelModal(false);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h4 className="text-lg font-bold text-neutral-900">Cancel Rental Request?</h4>
            <p className="text-neutral-500 text-sm">
              Are you sure you want to cancel this request for{' '}
              <strong>{rental.item.title}</strong>?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="btn-outline flex-1 py-2.5 text-sm"
              >
                No, Keep
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRejecting) setShowRejectModal(false);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-lg font-bold text-neutral-900">Decline Borrow Request</h4>
            <p className="text-neutral-500 text-sm">
              Add an optional message explaining why you cannot accept this request:
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Item unavailable on those dates."
                rows={3}
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 text-sm"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
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
                  {isRejecting ? 'Declining…' : 'Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
