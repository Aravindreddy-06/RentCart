/**
 * src/pages/RentalDetailPage.tsx (web)
 * Full details of a rental agreement — status timeline, item card,
 * other party profile (with privacy-gated phone number), notes, and role-based actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { StarRating } from '../components/StarRating';
import { MapView } from '../components/MapView';
import { LocationPicker, type LocationValue } from '../components/LocationPicker';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../services/socket';
import {
  rentalsService,
  type Rental,
  type RentalStatus,
  type LiveTrackingData,
} from '../services/rentals.service';
import { reviewsService, type ReviewStatusResponse } from '../services/reviews.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY, formatTime12 } from '../utils/date';
import { formatPhoneNumber } from '../utils/phone';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function formatPickupTimeWindow(from?: string | null, to?: string | null) {
  if (!from && !to) return null;
  if (from && to) {
    const fromDate = formatDateDMY(from);
    const toDate = formatDateDMY(to);
    const fromTime = formatTime12(from);
    const toTime = formatTime12(to);
    if (fromDate === toDate) {
      return `${fromDate}, ${fromTime} – ${toTime}`;
    }
    return `${fromDate} ${fromTime} – ${toDate} ${toTime}`;
  }
  if (from) {
    return `From ${formatDateDMY(from)} ${formatTime12(from)}`;
  }
  return `Until ${formatDateDMY(to!)} ${formatTime12(to!)}`;
}

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

  // Pickup point modal (confirm on approve OR edit pickup)
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  const [pickupFormLocation, setPickupFormLocation] = useState<LocationValue>({
    latitude: 13.0827,
    longitude: 80.2707,
    address: '',
  });
  const [pickupFormNote, setPickupFormNote] = useState('');
  const [pickupFormTimeFrom, setPickupFormTimeFrom] = useState('');
  const [pickupFormTimeTo, setPickupFormTimeTo] = useState('');
  const [isSavingPickup, setIsSavingPickup] = useState(false);
  const [pickupSaveError, setPickupSaveError] = useState('');

  // Borrower location & tracking state
  const [borrowerCoords, setBorrowerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [hasArrived, setHasArrived] = useState(false);
  const lastEmitRef = useRef<number>(0);

  // Owner live tracking view state
  const [liveTracking, setLiveTracking] = useState<LiveTrackingData | null>(null);

  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState('');

  // Review state
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [showDeleteReviewModal, setShowDeleteReviewModal] = useState(false);

  const fetchReviewStatus = useCallback(async (rentalId: string) => {
    setIsLoadingReview(true);
    try {
      const status = await reviewsService.getRentalReviewStatus(rentalId);
      setReviewStatus(status);
    } catch {
      // Ignored if non-returned or not ready
    } finally {
      setIsLoadingReview(false);
    }
  }, []);

  const fetchRental = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await rentalsService.getById(id);
      setRental(data);
      if (data.status === 'RETURNED') {
        void fetchReviewStatus(data.id);
      }
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
  }, [id, fetchReviewStatus]);

  useEffect(() => {
    fetchRental();
  }, [fetchRental]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental || ratingInput < 1) return;
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      await reviewsService.createReview({
        rentalId: rental.id,
        rating: ratingInput,
        comment: commentInput.trim() || undefined,
      });
      setCommentInput('');
      await fetchReviewStatus(rental.id);
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewStatus?.myReview || !rental) return;
    setIsDeletingReview(true);
    setReviewError('');
    try {
      await reviewsService.deleteReview(reviewStatus.myReview.id);
      setShowDeleteReviewModal(false);
      await fetchReviewStatus(rental.id);
      setRatingInput(5);
      setCommentInput('');
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || 'Failed to delete review.');
    } finally {
      setIsDeletingReview(false);
    }
  };

  const isOwner = user?.id === rental?.item?.ownerId;
  const isBorrower = user?.id === rental?.borrowerId;

  // Borrower: fetch current position to display distance to pickup point
  useEffect(() => {
    if (isBorrower && (rental?.status === 'APPROVED' || rental?.status === 'ACTIVE') && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBorrowerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { timeout: 8000 },
      );
    }
  }, [isBorrower, rental?.status]);

  // Clean up location watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Owner: Listen for live tracking updates via Socket.IO
  useEffect(() => {
    if (!rental || !isOwner || rental.status !== 'APPROVED') return;

    // Fetch initial tracking state
    void rentalsService
      .getTracking(rental.id)
      .then((data) => {
        setLiveTracking(data);
      })
      .catch(() => {});

    const socket = connectSocket();
    if (!socket) return;

    const handleLocation = (data: any) => {
      if (data?.rentalId === rental.id) {
        setLiveTracking({
          isSharing: true,
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
            heading: data.heading ?? null,
          },
          startedAt: liveTracking?.startedAt || data.updatedAt,
          updatedAt: data.updatedAt,
          etaMinutes: data.etaMinutes,
        });
      }
    };

    const handleStarted = (data: any) => {
      if (data?.rentalId === rental.id) {
        void rentalsService.getTracking(rental.id).then(setLiveTracking).catch(() => {});
      }
    };

    const handleStopped = (data: any) => {
      if (data?.rentalId === rental.id) {
        setLiveTracking((prev) => (prev ? { ...prev, isSharing: false } : null));
      }
    };

    const handleArrivedEvt = (data: any) => {
      if (data?.rentalId === rental.id) {
        setHasArrived(true);
        setLiveTracking((prev) => (prev ? { ...prev, isSharing: false } : null));
      }
    };

    socket.on('tracking:location', handleLocation);
    socket.on('tracking:started', handleStarted);
    socket.on('tracking:stopped', handleStopped);
    socket.on('tracking:arrived', handleArrivedEvt);

    return () => {
      socket.off('tracking:location', handleLocation);
      socket.off('tracking:started', handleStarted);
      socket.off('tracking:stopped', handleStopped);
      socket.off('tracking:arrived', handleArrivedEvt);
    };
  }, [rental?.id, rental?.status, isOwner]);

  // Pickup Modal open helpers
  const openApprovePickupModal = () => {
    if (!rental) return;
    setIsEditingPickup(false);
    setPickupFormLocation({
      latitude: rental.pickupLatitude ?? user?.latitude ?? 13.0827,
      longitude: rental.pickupLongitude ?? user?.longitude ?? 80.2707,
      address: rental.pickupAddress || user?.address || '',
    });
    setPickupFormNote(rental.pickupNote || '');
    setPickupFormTimeFrom(rental.pickupTimeFrom ? rental.pickupTimeFrom.slice(0, 16) : '');
    setPickupFormTimeTo(rental.pickupTimeTo ? rental.pickupTimeTo.slice(0, 16) : '');
    setPickupSaveError('');
    setShowPickupModal(true);
  };

  const openEditPickupModal = () => {
    if (!rental) return;
    setIsEditingPickup(true);
    setPickupFormLocation({
      latitude: rental.pickupLatitude ?? user?.latitude ?? 13.0827,
      longitude: rental.pickupLongitude ?? user?.longitude ?? 80.2707,
      address: rental.pickupAddress || user?.address || '',
    });
    setPickupFormNote(rental.pickupNote || '');
    setPickupFormTimeFrom(rental.pickupTimeFrom ? rental.pickupTimeFrom.slice(0, 16) : '');
    setPickupFormTimeTo(rental.pickupTimeTo ? rental.pickupTimeTo.slice(0, 16) : '');
    setPickupSaveError('');
    setShowPickupModal(true);
  };

  const handleSavePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;
    if (!pickupFormLocation.address.trim()) {
      setPickupSaveError('Please provide a pickup address.');
      return;
    }

    setIsSavingPickup(true);
    setPickupSaveError('');
    try {
      const payload = {
        pickupLatitude: pickupFormLocation.latitude,
        pickupLongitude: pickupFormLocation.longitude,
        pickupAddress: pickupFormLocation.address.trim(),
        pickupNote: pickupFormNote.trim() ? pickupFormNote.trim() : null,
        pickupTimeFrom: pickupFormTimeFrom ? new Date(pickupFormTimeFrom).toISOString() : null,
        pickupTimeTo: pickupFormTimeTo ? new Date(pickupFormTimeTo).toISOString() : null,
      };

      if (isEditingPickup) {
        await rentalsService.updatePickup(rental.id, payload);
      } else {
        await rentalsService.approve(rental.id, payload);
      }
      setShowPickupModal(false);
      await fetchRental();
    } catch (err: any) {
      setPickupSaveError(
        err?.response?.data?.message ?? 'Failed to save pickup location. Please verify coordinates and address.',
      );
    } finally {
      setIsSavingPickup(false);
    }
  };

  // Borrower tracking actions
  const handleStartTracking = () => {
    if (!rental) return;
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by your browser.');
      return;
    }

    setTrackingError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const heading = pos.coords.heading ?? null;

          await rentalsService.startTracking(rental.id, {
            latitude: lat,
            longitude: lng,
            heading,
          });

          const socket = connectSocket();

          const id = navigator.geolocation.watchPosition(
            (watchPos) => {
              const now = Date.now();
              // Throttle socket updates to 1 per 3 seconds
              if (now - lastEmitRef.current >= 3000) {
                lastEmitRef.current = now;
                const wLat = Number(watchPos.coords.latitude.toFixed(6));
                const wLng = Number(watchPos.coords.longitude.toFixed(6));
                setBorrowerCoords({ lat: wLat, lng: wLng });

                socket?.emit('tracking:update', {
                  rentalId: rental.id,
                  latitude: wLat,
                  longitude: wLng,
                  heading: watchPos.coords.heading ?? null,
                });
              }
            },
            (watchErr) => {
              console.warn('[Tracking] Watch position warning:', watchErr.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );

          setWatchId(id);
          setIsTracking(true);
          setHasArrived(false);
        } catch (err: any) {
          setTrackingError(err?.response?.data?.message || 'Failed to start live location sharing.');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setTrackingError('Location permission denied. Please allow location access in your browser settings.');
        } else {
          setTrackingError('Could not retrieve current location. Please check your GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleStopTracking = async () => {
    if (!rental) return;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    try {
      await rentalsService.stopTracking(rental.id);
    } catch {
      // Best effort
    }
    setIsTracking(false);
  };

  const handleMarkArrived = async () => {
    if (!rental) return;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    try {
      await rentalsService.markArrived(rental.id);
      setIsTracking(false);
      setHasArrived(true);
    } catch (err: any) {
      setTrackingError(err?.response?.data?.message || 'Failed to record arrival.');
    }
  };

  const handleCopyAddress = () => {
    if (!rental?.pickupAddress) return;
    navigator.clipboard.writeText(rental.pickupAddress).then(() => {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    });
  };

  // Lifecycle actions
  const handleApprove = () => {
    openApprovePickupModal();
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
                    📅 {formatDateDMY(rental.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">End Date</p>
                  <p className="font-bold text-neutral-900 text-base mt-0.5">
                    📅 {formatDateDMY(rental.endDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm pt-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Rental Rate</span>
                  <span className="font-medium text-neutral-900">
                    {formatINR(rental.item.pricePerDay)} / day
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Total Rental Price</span>
                  <span className="font-bold text-neutral-900">
                    {formatINR(rental.totalPrice)}
                  </span>
                </div>
                {rental.depositAmount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Security Deposit</span>
                    <span className="font-medium text-neutral-900">
                      {formatINR(rental.depositAmount)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-100 flex justify-between font-extrabold text-base text-neutral-900">
                  <span>Total Due</span>
                  <span className="text-primary-600">
                    {formatINR(rental.totalPrice + (rental.depositAmount ?? 0))}
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

            {/* ── Pickup Location Card ── */}
            {((isOwner && (rental.pickupLatitude != null || rental.pickupAddress || rental.status === 'APPROVED' || rental.status === 'ACTIVE')) ||
              (isBorrower && (rental.status === 'APPROVED' || rental.status === 'ACTIVE'))) && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
                      📍
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900">Pickup Location</h2>
                      <p className="text-xs text-neutral-500">
                        {isOwner ? 'Your designated pickup point for this rental' : 'Confirmed pickup location for this item'}
                      </p>
                    </div>
                  </div>
                  {isOwner && (rental.status === 'APPROVED' || rental.status === 'ACTIVE') && (
                    <button
                      type="button"
                      onClick={openEditPickupModal}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold px-3 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                    >
                      Edit Pickup
                    </button>
                  )}
                </div>

                {rental.pickupLatitude != null && rental.pickupLongitude != null ? (
                  <div className="space-y-3">
                    <MapView
                      center={[rental.pickupLatitude, rental.pickupLongitude]}
                      zoom={14}
                      height="240px"
                      pickupMarker={{
                        latitude: rental.pickupLatitude,
                        longitude: rental.pickupLongitude,
                        label: 'Pickup Point',
                      }}
                      borrowerMarker={
                        isOwner && liveTracking?.isSharing && liveTracking.location
                          ? {
                              latitude: liveTracking.location.latitude,
                              longitude: liveTracking.location.longitude,
                              label: "Borrower's Live Location",
                            }
                          : undefined
                      }
                    />

                    <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Address
                          </p>
                          <p className="text-sm font-medium text-neutral-800 mt-0.5">
                            {rental.pickupAddress || 'Coordinates provided'}
                          </p>
                        </div>
                        {rental.pickupAddress && (
                          <button
                            type="button"
                            onClick={handleCopyAddress}
                            className="shrink-0 text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2.5 py-1 rounded-md border border-neutral-200 hover:bg-neutral-100 transition-colors"
                          >
                            {copiedAddress ? '✓ Copied' : 'Copy address'}
                          </button>
                        )}
                      </div>

                      {isBorrower && borrowerCoords && (
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 inline-flex">
                          <span>🧭</span>
                          <span>
                            ~{getDistanceKm(borrowerCoords.lat, borrowerCoords.lng, rental.pickupLatitude, rental.pickupLongitude)} km straight-line distance from you
                          </span>
                        </div>
                      )}

                      {formatPickupTimeWindow(rental.pickupTimeFrom, rental.pickupTimeTo) && (
                        <div className="text-xs text-neutral-600 flex items-center gap-1.5 pt-1 border-t border-neutral-200/60">
                          <span className="font-semibold text-neutral-700">🕒 Pickup Window:</span>
                          <span>{formatPickupTimeWindow(rental.pickupTimeFrom, rental.pickupTimeTo)}</span>
                        </div>
                      )}

                      {rental.pickupNote && (
                        <div className="text-xs text-neutral-700 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-lg italic">
                          <span className="font-semibold not-italic text-amber-900 block mb-0.5">Note from Owner:</span>
                          "{rental.pickupNote}"
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${rental.pickupLatitude},${rental.pickupLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span>Navigate in Google Maps</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-neutral-50 rounded-xl text-center text-xs text-neutral-500">
                    {isOwner ? (
                      <div className="space-y-2">
                        <p>You have not configured a pickup point yet.</p>
                        <button
                          type="button"
                          onClick={openEditPickupModal}
                          className="btn-primary py-2 px-4 text-xs font-semibold"
                        >
                          Set Pickup Point
                        </button>
                      </div>
                    ) : (
                      <p>The owner has not specified an exact pickup point yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Live Tracking Cards (APPROVED status only) ── */}
            {rental.status === 'APPROVED' && (
              <>
                {/* Borrower Live Tracking Control */}
                {isBorrower && (
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚗</span>
                        <div>
                          <h2 className="text-base font-bold text-neutral-900">Live Location Sharing</h2>
                          <p className="text-xs text-neutral-500">
                            Keep the owner informed as you head to the pickup point
                          </p>
                        </div>
                      </div>
                      {isTracking && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live
                        </span>
                      )}
                    </div>

                    {trackingError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{trackingError}</span>
                      </div>
                    )}

                    {isTracking ? (
                      <div className="space-y-3">
                        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <span>📡 Sharing your live location</span>
                          </p>
                          <p className="text-emerald-700 text-[11px]">
                            Updates are sent to the owner every few seconds while this screen stays active.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleStopTracking}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs transition-colors"
                          >
                            Stop Sharing
                          </button>
                          <button
                            type="button"
                            onClick={handleMarkArrived}
                            className="flex-1 btn-primary py-2.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                          >
                            ✓ I've Arrived
                          </button>
                        </div>
                      </div>
                    ) : hasArrived ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                        <span className="text-lg">🎉</span>
                        <div>
                          <p className="font-bold">You marked yourself as arrived!</p>
                          <p className="text-[11px] text-emerald-700">The owner has been notified that you are at the pickup point.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-neutral-600">
                          Going to pick up the item? Tap below to share your route and let the owner track your estimated arrival time.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartTracking}
                          className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <span>🚗 I'm on my way</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Owner Live Tracking View */}
                {isOwner && (
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📡</span>
                        <div>
                          <h2 className="text-base font-bold text-neutral-900">Borrower Live Tracking</h2>
                          <p className="text-xs text-neutral-500">Live arrival updates from the borrower</p>
                        </div>
                      </div>
                      {liveTracking?.isSharing ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> On the way
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full font-medium">
                          Not sharing
                        </span>
                      )}
                    </div>

                    {liveTracking?.isSharing && liveTracking.location ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700 uppercase">Estimated Arrival</p>
                            <p className="text-lg font-extrabold text-emerald-900 mt-0.5">
                              {liveTracking.etaMinutes != null ? `~${liveTracking.etaMinutes} min` : 'Calculating…'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700 uppercase">Last Updated</p>
                            <p className="text-xs font-medium text-emerald-800 mt-1">
                              {liveTracking.updatedAt ? new Date(liveTracking.updatedAt).toLocaleTimeString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500 italic">
                          The blue vehicle marker on the map above reflects the borrower's live location.
                        </p>
                      </div>
                    ) : hasArrived ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                        <span className="text-lg">🎉</span>
                        <div>
                          <p className="font-bold">Borrower has arrived!</p>
                          <p className="text-[11px] text-emerald-700">Please prepare the item for hand-over.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-500">
                        The borrower hasn't started sharing their live location yet. When they tap "I'm on my way", their moving position and ETA will appear here in real time.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Review Section (when rental is RETURNED) ── */}
            {rental.status === 'RETURNED' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
                {isLoadingReview ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviewStatus?.canReview ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                        <span className="text-amber-400">★</span> Rate your experience
                      </h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        Leave a rating and review for{' '}
                        <strong>{reviewStatus.targetUser?.name ?? 'the other party'}</strong>.
                      </p>
                    </div>

                    {reviewError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                        {reviewError}
                      </div>
                    )}

                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Select Rating (1 to 5 stars)
                        </label>
                        <StarRating
                          mode="input"
                          value={ratingInput}
                          onChange={setRatingInput}
                          size="lg"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-semibold text-neutral-700">
                            Comment <span className="font-normal text-neutral-400">(optional)</span>
                          </label>
                          <span className="text-[11px] text-neutral-400">
                            {commentInput.length}/500
                          </span>
                        </div>
                        <textarea
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="How was the communication, item condition, or overall experience?"
                          maxLength={500}
                          rows={3}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingReview || ratingInput < 1}
                        className="btn-primary py-2.5 px-6 text-sm font-semibold disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                ) : reviewStatus?.hasReviewed && reviewStatus.myReview ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                          <span className="text-amber-400">★</span> Your Review
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Submitted on {new Date(reviewStatus.myReview.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteReviewModal(true)}
                        disabled={isDeletingReview}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                      >
                        Delete Review
                      </button>
                    </div>

                    {reviewError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                        {reviewError}
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                      <StarRating
                        mode="display"
                        rating={reviewStatus.myReview.rating}
                        showValue
                        size="md"
                      />
                      {reviewStatus.myReview.comment && (
                        <p className="text-sm text-neutral-700 leading-relaxed italic">
                          "{reviewStatus.myReview.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Other participant's review */}
                {reviewStatus?.otherReview && (
                  <div className="pt-4 border-t border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700">
                        Review from {reviewStatus.otherReview.author.name}:
                      </span>
                      <StarRating
                        mode="display"
                        rating={reviewStatus.otherReview.rating}
                        size="xs"
                        showValue
                      />
                    </div>
                    {reviewStatus.otherReview.comment && (
                      <p className="text-xs text-neutral-600 italic">
                        "{reviewStatus.otherReview.comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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
                    <div className="flex items-center justify-between">
                      <a
                        href={`tel:${otherPerson.phone}`}
                        className="text-sm font-bold text-emerald-700 hover:underline block"
                      >
                        {formatPhoneNumber(otherPerson.phone)}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(otherPerson.phone || '');
                          setCopiedPhone(true);
                          setTimeout(() => setCopiedPhone(false), 2000);
                        }}
                        className="text-xs px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold transition-colors"
                      >
                        {copiedPhone ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
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

              {/* In-app Chat Button */}
              <button
                type="button"
                onClick={() => navigate(`/chats?rentalId=${rental.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold text-sm transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Message {otherPerson?.name || 'Party'}</span>
              </button>
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

      {/* Delete Review Confirmation Modal */}
      {showDeleteReviewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingReview) setShowDeleteReviewModal(false);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h4 className="text-lg font-bold text-neutral-900">Delete Your Review?</h4>
            <p className="text-neutral-500 text-sm">
              Are you sure you want to delete your review? This will remove your rating and comment.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteReviewModal(false)}
                disabled={isDeletingReview}
                className="btn-outline flex-1 py-2.5 text-sm"
              >
                Keep Review
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={isDeletingReview}
                className="btn-primary flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 font-semibold"
              >
                {isDeletingReview ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm / Edit Pickup Point Modal */}
      {showPickupModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingPickup) setShowPickupModal(false);
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div>
              <h4 className="text-lg font-bold text-neutral-900">
                {isEditingPickup ? 'Edit Pickup Point' : 'Confirm Pickup Point'}
              </h4>
              <p className="text-neutral-500 text-xs mt-1">
                {isEditingPickup
                  ? 'Update the designated pickup location and instructions for this rental.'
                  : 'Confirm where the borrower should meet you to pick up the item.'}
              </p>
            </div>

            {/* Safety tip */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
              <span className="text-base leading-none">💡</span>
              <p className="leading-relaxed">
                <strong>Safety Tip:</strong> Meet in a public, well-lit place when possible (e.g. outside a store, library, or transit station).
              </p>
            </div>

            {pickupSaveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {pickupSaveError}
              </div>
            )}

            <form onSubmit={handleSavePickup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Pickup Location & Address <span className="text-red-500">*</span>
                </label>
                <LocationPicker
                  value={pickupFormLocation}
                  onChange={setPickupFormLocation}
                  height="220px"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Pickup Note <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {pickupFormNote.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={pickupFormNote}
                  onChange={(e) => setPickupFormNote(e.target.value)}
                  placeholder="e.g. Gate 2, ring the bell, meet near the entrance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Pickup Time Window <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">From</label>
                    <input
                      type="datetime-local"
                      value={pickupFormTimeFrom}
                      onChange={(e) => setPickupFormTimeFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-primary-500 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">To</label>
                    <input
                      type="datetime-local"
                      value={pickupFormTimeTo}
                      onChange={(e) => setPickupFormTimeTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-primary-500 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  disabled={isSavingPickup}
                  className="btn-outline flex-1 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPickup}
                  className="btn-primary flex-1 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSavingPickup
                    ? 'Saving…'
                    : isEditingPickup
                      ? 'Save Pickup Location'
                      : 'Confirm & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
