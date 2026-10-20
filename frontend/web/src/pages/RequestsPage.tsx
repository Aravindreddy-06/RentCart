/**
 * src/pages/RequestsPage.tsx (web)
 * Polished "Requests" screen for incoming borrower requests:
 * - Status-coloured left border on cards
 * - Coloured action buttons (Approve = green, Reject = red outline, Activate = blue, Mark Returned = indigo)
 * - Pickup confirmation modal with teal header
 * - Phone formatted with tap-to-call and Copy button
 * - Deterministic borrower avatar initials & colors
 * - Complete dark mode support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { LocationPicker, type LocationValue } from '../components/LocationPicker';
import { HandoverVerifyCard } from '../components/HandoverVerifyCard';
import { useAuth } from '../context/AuthContext';
import { rentalsService, type Rental, type RentalStatus } from '../services/rentals.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';
import { formatPhoneNumber } from '../utils/phone';
import { getAvatarColor, getInitials, CATEGORY_THEMES, type CategoryKey } from '../utils/colors';
import {
  Calendar,
  Phone,
  Copy,
  Check,
  MapPin,
  ArrowRight,
} from 'lucide-react';

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

export function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Reject modal state
  const [rejectingRental, setRejectingRental] = useState<Rental | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Approve pickup confirmation modal state
  const [approvingRental, setApprovingRental] = useState<Rental | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationValue>({
    latitude: 13.0827,
    longitude: 80.2707,
    address: '',
  });
  const [pickupNote, setPickupNote] = useState('');
  const [pickupTimeFrom, setPickupTimeFrom] = useState('');
  const [pickupTimeTo, setPickupTimeTo] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

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

  const openApproveModal = (rental: Rental) => {
    setApprovingRental(rental);
    setPickupLocation({
      latitude: rental.pickupLatitude ?? user?.latitude ?? 13.0827,
      longitude: rental.pickupLongitude ?? user?.longitude ?? 80.2707,
      address: rental.pickupAddress || user?.address || '',
    });
    setPickupNote(rental.pickupNote || '');
    setPickupTimeFrom(rental.pickupTimeFrom ? rental.pickupTimeFrom.slice(0, 16) : '');
    setPickupTimeTo(rental.pickupTimeTo ? rental.pickupTimeTo.slice(0, 16) : '');
    setApproveError('');
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRental) return;

    if (!pickupLocation.address.trim()) {
      setApproveError('Please provide a pickup address.');
      return;
    }

    setIsApproving(true);
    setApproveError('');

    try {
      await rentalsService.approve(approvingRental.id, {
        pickupLatitude: pickupLocation.latitude,
        pickupLongitude: pickupLocation.longitude,
        pickupAddress: pickupLocation.address,
        pickupNote: pickupNote.trim() || undefined,
        pickupTimeFrom: pickupTimeFrom ? new Date(pickupTimeFrom).toISOString() : undefined,
        pickupTimeTo: pickupTimeTo ? new Date(pickupTimeTo).toISOString() : undefined,
      });

      setApprovingRental(null);
      await fetchRequests();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to approve request.';
      setApproveError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRental) return;

    setIsRejecting(true);
    setRejectError('');
    try {
      await rentalsService.reject(rejectingRental.id, rejectNote.trim() || undefined);
      setRejectingRental(null);
      setRejectNote('');
      await fetchRequests();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to decline request.';
      setRejectError(msg);
    } finally {
      setIsRejecting(false);
    }
  };


  const handleReturn = async (rentalId: string) => {
    setActionInProgress(rentalId);
    setActionError('');
    try {
      await rentalsService.return(rentalId);
      await fetchRequests();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to confirm item return.';
      setActionError(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full animate-slide-up">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            Borrow Requests
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted text-sm mt-1">
            Review and approve requests from neighbours wanting to borrow your items.
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

        {actionError && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-danger text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError('')} className="font-bold">✕</button>
          </div>
        )}

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
            <button onClick={fetchRequests} className="btn-primary text-xs px-4 py-2">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && rentals.length === 0 && (
          <div className="card p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto text-3xl">
              📥
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-dark-text">No incoming requests</h3>
            <p className="text-neutral-500 dark:text-dark-muted text-xs leading-relaxed">
              {activeTab
                ? `You don't have any requests with status "${activeTab}".`
                : "You don't have any pending requests from borrowers right now. When neighbours request your items, they'll show up here!"}
            </p>
          </div>
        )}

        {/* Requests List with Status-Coloured Left Border & Styled Action Buttons */}
        {!isLoading && !error && rentals.length > 0 && (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const itemImage =
                rental.item.images?.[0] ??
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
              const isBusy = actionInProgress === rental.id;
              const categoryTheme =
                CATEGORY_THEMES[rental.item.category as CategoryKey] ?? CATEGORY_THEMES.Other;
              const borderAccent = getStatusBorderClass(rental.status);
              const borrowerAvatarColor = getAvatarColor(rental.borrower.name);
              const borrowerInitials = getInitials(rental.borrower.name);

              return (
                <div
                  key={rental.id}
                  className={`card p-5 space-y-4 transition-all duration-200 hover:shadow-card-hover overflow-hidden ${borderAccent}`}
                >
                  {/* Top Bar: Item Info + Status Badge */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                      <img
                        src={itemImage}
                        alt={rental.item.title}
                        className="w-14 h-14 rounded-xl object-cover bg-neutral-100 dark:bg-dark-card border border-neutral-200/50 dark:border-dark-border flex-shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{
                              backgroundColor: categoryTheme.tintBg,
                              color: categoryTheme.tintText,
                              borderColor: categoryTheme.borderColor,
                            }}
                          >
                            {rental.item.category}
                          </span>
                        </div>
                        <h3
                          onClick={() => navigate(`/rentals/${rental.id}`)}
                          className="font-bold text-neutral-900 dark:text-dark-text hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer text-base line-clamp-1"
                        >
                          {rental.item.title}
                        </h3>
                      </div>
                    </div>

                    <StatusBadge status={rental.status} size="sm" />
                  </div>

                  {/* Middle: Borrower Details & Booking Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm bg-neutral-50 dark:bg-dark-card/40 p-4 rounded-2xl border border-neutral-100 dark:border-dark-border">
                    {/* Borrower info */}
                    <div className="flex items-start gap-3">
                      {rental.borrower.avatarUrl ? (
                        <img
                          src={rental.borrower.avatarUrl}
                          alt={rental.borrower.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-dark-border"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs flex-shrink-0"
                          style={{ backgroundColor: borrowerAvatarColor }}
                        >
                          {borrowerInitials}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-dark-text">{rental.borrower.name}</p>
                        {rental.borrower.address && (
                          <p className="text-xs text-neutral-500 dark:text-dark-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{rental.borrower.address}</span>
                          </p>
                        )}
                        {rental.borrower.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${rental.borrower.phone}`}
                              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{formatPhoneNumber(rental.borrower.phone)}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rental.borrower.phone || '');
                                setCopiedPhoneId(rental.id);
                                setTimeout(() => setCopiedPhoneId(null), 2000);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-dark-card hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-dark-text transition-colors flex items-center gap-1 font-bold"
                              title="Copy phone number"
                            >
                              {copiedPhoneId === rental.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-success" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates & Earnings */}
                    <div className="space-y-1">
                      <p className="text-neutral-700 dark:text-dark-muted flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        <span>
                          <strong>{formatDateDMY(rental.startDate)}</strong> → <strong>{formatDateDMY(rental.endDate)}</strong>
                        </span>
                      </p>
                      <p className="text-neutral-600 dark:text-dark-muted text-xs">
                        Earnings:{' '}
                        <span className="font-extrabold text-accent-600 dark:text-accent-400 text-sm">
                          {formatINR(rental.totalPrice)}
                        </span>
                        {rental.depositAmount > 0 && (
                          <span className="text-neutral-400 dark:text-dark-muted"> (Deposit: {formatINR(rental.depositAmount)})</span>
                        )}
                      </p>
                      {rental.borrowerNote && (
                        <p className="text-xs text-neutral-500 dark:text-dark-muted italic pt-1 border-t border-neutral-200/50 dark:border-dark-border">
                          "{rental.borrowerNote}"
                        </p>
                      )}
                      {rental.ownerNote && (
                        <p className="text-xs text-danger italic pt-1 border-t border-neutral-200/50 dark:border-dark-border">
                          Decline reason: "{rental.ownerNote}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => navigate(`/rentals/${rental.id}`)}
                      className="btn-outline text-xs px-3.5 py-2 font-bold"
                    >
                      <span>Full Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex flex-wrap gap-2.5">
                      {/* PENDING -> Approve (green) or Reject (red outline) */}
                      {rental.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setRejectingRental(rental);
                              setRejectNote('');
                              setRejectError('');
                            }}
                            disabled={isBusy}
                            className="px-4 py-2 text-xs font-bold rounded-xl text-danger border border-danger/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => openApproveModal(rental)}
                            disabled={isBusy}
                            className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-success hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            ✓ Approve Request
                          </button>
                        </>
                      )}

                      {/* APPROVED -> Edit Pickup */}
                      {rental.status === 'APPROVED' && (
                        <button
                          onClick={() => openApproveModal(rental)}
                          disabled={isBusy}
                          className="btn-outline px-3.5 py-2 text-xs font-bold"
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary-500" />
                          <span>Edit Pickup</span>
                        </button>
                      )}

                      {/* ACTIVE -> Mark Returned (indigo) */}
                      {rental.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleReturn(rental.id)}
                          disabled={isBusy}
                          className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-secondary-500 hover:bg-secondary-600 transition-colors shadow-sm"
                        >
                          {isBusy ? 'Updating…' : 'Confirm Return'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* APPROVED -> Confirm Handover Card */}
                  {rental.status === 'APPROVED' && (
                    <div className="w-full pt-3">
                      <HandoverVerifyCard
                        rentalId={rental.id}
                        onSuccess={fetchRequests}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectingRental && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRejecting) setRejectingRental(null);
          }}
        >
          <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-neutral-200 dark:border-dark-border animate-slide-up">
            <h4 className="text-lg font-bold text-neutral-900 dark:text-dark-text">Decline Borrow Request</h4>
            <p className="text-neutral-500 dark:text-dark-muted text-xs leading-relaxed">
              You are declining {rejectingRental.borrower.name}'s request for{' '}
              <strong className="text-neutral-800 dark:text-dark-text">{rejectingRental.item.title}</strong>.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                  Reason or note <span className="font-normal text-neutral-400 lowercase">(optional)</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. Item is undergoing maintenance or reserved offline"
                  rows={3}
                  maxLength={500}
                  className="form-field resize-none text-xs"
                />
              </div>

              {rejectError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-danger text-xs font-medium border border-red-200 dark:border-red-500/30">
                  {rejectError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRental(null)}
                  disabled={isRejecting}
                  className="btn-outline text-xs px-4 py-2.5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="btn-warm text-xs px-5 py-2.5 font-bold bg-red-500 hover:bg-red-600 border-none"
                >
                  {isRejecting ? 'Declining…' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Pickup Confirmation Modal with Teal Header */}
      {approvingRental && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isApproving) setApprovingRental(null);
          }}
        >
          <div className="bg-white dark:bg-dark-surface rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8 border border-neutral-200 dark:border-dark-border animate-slide-up">
            {/* Modal Teal Header */}
            <div className="p-5 bg-gradient-to-r from-primary-600 to-[#12C2A8] text-white">
              <h4 className="text-lg font-extrabold tracking-tight">
                {approvingRental.status === 'APPROVED' ? 'Edit Pickup Details' : 'Approve Borrow Request'}
              </h4>
              <p className="text-xs text-primary-100 mt-0.5">
                Share your pickup address and preferred timing for {approvingRental.borrower.name}.
              </p>
            </div>

            <form onSubmit={handleConfirmApprove} className="p-6 space-y-4">
              {/* Location Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                  Pickup Location & Address *
                </label>
                <LocationPicker
                  value={pickupLocation}
                  onChange={setPickupLocation}
                />
              </div>

              {/* Pickup window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1">
                    Available From <span className="font-normal text-neutral-400 lowercase">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupTimeFrom}
                    onChange={(e) => setPickupTimeFrom(e.target.value)}
                    className="form-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1">
                    Available To <span className="font-normal text-neutral-400 lowercase">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupTimeTo}
                    onChange={(e) => setPickupTimeTo(e.target.value)}
                    className="form-field text-xs"
                  />
                </div>
              </div>

              {/* Pickup Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1">
                  Pickup Instructions <span className="font-normal text-neutral-400 lowercase">(optional)</span>
                </label>
                <textarea
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder="e.g. Ring bell #4B, call when at gate"
                  rows={2}
                  maxLength={500}
                  className="form-field resize-none text-xs"
                />
              </div>

              {approveError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-danger text-xs font-medium border border-red-200 dark:border-red-500/30">
                  {approveError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingRental(null)}
                  disabled={isApproving}
                  className="btn-outline text-xs px-4 py-2.5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="btn-primary text-xs px-5 py-2.5 font-bold shadow-sm"
                >
                  {isApproving
                    ? 'Saving…'
                    : approvingRental.status === 'APPROVED'
                    ? 'Save Pickup Details'
                    : 'Approve & Share Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
