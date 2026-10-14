/**
 * src/screens/RentalDetailScreen.tsx (mobile)
 * Full details of a rental agreement — status timeline, item info,
 * phone number with privacy gating and click-to-call, and role-based actions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { AppStackParamList } from '../navigation/types';
import {
  rentalsService,
  Rental,
  RentalStatus,
  type LiveTrackingData,
} from '../services/rentals.service';
import { reviewsService, type ReviewStatusResponse } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { MapView, openMapNavigation } from '../components/MapView';
import LocationPicker, { type LocationValue } from '../components/LocationPicker';
import { connectSocket } from '../services/socket';
import { colors } from '../utils/colors';
import * as Clipboard from 'expo-clipboard';
import { formatINR } from '../utils/currency';
import { formatDateDMY, formatTime12 } from '../utils/date';
import { formatPhoneNumber } from '../utils/phone';

type Props = NativeStackScreenProps<AppStackParamList, 'RentalDetail'>;

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

function formatPickupWindow(from?: string | null, to?: string | null): string | null {
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

const TIMELINE_STEPS: { label: string; status: RentalStatus }[] = [
  { label: 'Requested', status: 'PENDING' },
  { label: 'Approved', status: 'APPROVED' },
  { label: 'Handed Over', status: 'ACTIVE' },
  { label: 'Returned', status: 'RETURNED' },
];

const STATUS_ORDER: Record<RentalStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  ACTIVE: 2,
  RETURNED: 3,
  REJECTED: -1,
  CANCELLED: -1,
};

export default function RentalDetailScreen({ route, navigation }: Props) {
  const { rentalId } = route.params;
  const { user } = useAuth();

  const [rental, setRental] = useState<Rental | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  // Review state
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  // Pickup modal (Confirm on approve or Edit pickup)
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
  const [pickupSaveError, setPickupSaveError] = useState('');
  const [isSavingPickup, setIsSavingPickup] = useState(false);

  // Borrower location & tracking state
  const [borrowerCoords, setBorrowerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);
  const trackingSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastEmitRef = useRef<number>(0);

  // Owner live tracking view state
  const [liveTracking, setLiveTracking] = useState<LiveTrackingData | null>(null);

  const fetchReviewStatus = useCallback(async (id: string) => {
    setIsLoadingReview(true);
    try {
      const status = await reviewsService.getRentalReviewStatus(id);
      setReviewStatus(status);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingReview(false);
    }
  }, []);

  const fetchRental = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const data = await rentalsService.getById(rentalId);
      setRental(data);
      if (data.status === 'RETURNED') {
        void fetchReviewStatus(data.id);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setError('Rental request not found.');
      else if (status === 403) setError('You are not authorized to view this rental.');
      else setError('Failed to load rental details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rentalId, fetchReviewStatus]);

  useEffect(() => {
    fetchRental();
  }, [fetchRental]);

  const handleSubmitReview = async () => {
    if (!rental || ratingInput < 1) return;
    setIsSubmittingReview(true);
    try {
      await reviewsService.createReview({
        rentalId: rental.id,
        rating: ratingInput,
        comment: commentInput.trim() || undefined,
      });
      setCommentInput('');
      Alert.alert('Review Submitted! ⭐', 'Thank you for rating your experience.');
      fetchReviewStatus(rental.id);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = () => {
    if (!reviewStatus?.myReview || !rental) return;
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeletingReview(true);
          try {
            await reviewsService.deleteReview(reviewStatus.myReview!.id);
            setRatingInput(5);
            setCommentInput('');
            fetchReviewStatus(rental.id);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete review.');
          } finally {
            setIsDeletingReview(false);
          }
        },
      },
    ]);
  };

  const isOwner = user?.id === rental?.item?.ownerId;
  const isBorrower = user?.id === rental?.borrowerId;

  // Borrower: fetch initial position for straight-line distance to pickup point
  useEffect(() => {
    if (isBorrower && (rental?.status === 'APPROVED' || rental?.status === 'ACTIVE')) {
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then((pos) => {
              setBorrowerCoords({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            })
            .catch(() => {});
        }
      });
    }
  }, [isBorrower, rental?.status]);

  // Stop watching when app moves to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && trackingSubRef.current) {
        trackingSubRef.current.remove();
        trackingSubRef.current = null;
        setIsTracking(false);
        Alert.alert(
          'Location Sharing Paused',
          'Live tracking stopped because RentCart went to the background. Please keep the app open while sharing your live location.',
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Stop watching on screen blur or unmount
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (trackingSubRef.current) {
        trackingSubRef.current.remove();
        trackingSubRef.current = null;
        setIsTracking(false);
      }
    });

    return () => {
      unsubscribeBlur();
      if (trackingSubRef.current) {
        trackingSubRef.current.remove();
        trackingSubRef.current = null;
      }
    };
  }, [navigation]);

  // Owner: Listen for live tracking updates via Socket.IO + 10s fallback poll
  useEffect(() => {
    if (!rental || !isOwner || rental.status !== 'APPROVED') return;

    // Fetch initial tracking state
    void rentalsService.getTracking(rental.id).then(setLiveTracking).catch(() => {});

    let activeSocket: any = null;

    void connectSocket().then((sock) => {
      if (!sock) return;
      activeSocket = sock;

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

      const handleArrived = (data: any) => {
        if (data?.rentalId === rental.id) {
          setHasArrived(true);
          setLiveTracking((prev) => (prev ? { ...prev, isSharing: false } : null));
        }
      };

      sock.on('tracking:location', handleLocation);
      sock.on('tracking:started', handleStarted);
      sock.on('tracking:stopped', handleStopped);
      sock.on('tracking:arrived', handleArrived);
    });

    // 10-second REST fallback polling
    const pollInterval = setInterval(() => {
      rentalsService
        .getTracking(rental.id)
        .then(setLiveTracking)
        .catch(() => {});
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (activeSocket) {
        activeSocket.off('tracking:location');
        activeSocket.off('tracking:started');
        activeSocket.off('tracking:stopped');
        activeSocket.off('tracking:arrived');
      }
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

  const handleSavePickup = async () => {
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
        Alert.alert('Updated! ✓', 'Pickup location updated.');
      } else {
        await rentalsService.approve(rental.id, payload);
        Alert.alert('Approved! ✓', 'Rental request approved with confirmed pickup point.');
      }
      setShowPickupModal(false);
      fetchRental(true);
    } catch (err: any) {
      setPickupSaveError(err?.response?.data?.message ?? 'Failed to save pickup location.');
    } finally {
      setIsSavingPickup(false);
    }
  };

  // Borrower tracking actions
  const handleStartTracking = async () => {
    if (!rental) return;
    setTrackingError('');
    setShowSettingsBtn(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setTrackingError('Location permission denied. Please allow location access in your device settings.');
        setShowSettingsBtn(true);
        return;
      }

      const hasServices = await Location.hasServicesEnabledAsync();
      if (!hasServices) {
        setTrackingError('Location services (GPS) are disabled on your device. Please turn them on.');
        setShowSettingsBtn(true);
        return;
      }

      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = Number(initialPos.coords.latitude.toFixed(6));
      const lng = Number(initialPos.coords.longitude.toFixed(6));
      const heading = initialPos.coords.heading ?? null;

      await rentalsService.startTracking(rental.id, {
        latitude: lat,
        longitude: lng,
        heading,
      });

      const socket = await connectSocket();

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (loc) => {
          const now = Date.now();
          if (now - lastEmitRef.current >= 3000) {
            lastEmitRef.current = now;
            const wLat = Number(loc.coords.latitude.toFixed(6));
            const wLng = Number(loc.coords.longitude.toFixed(6));
            setBorrowerCoords({ latitude: wLat, longitude: wLng });

            socket?.emit('tracking:update', {
              rentalId: rental.id,
              latitude: wLat,
              longitude: wLng,
              heading: loc.coords.heading ?? null,
            });
          }
        },
      );

      trackingSubRef.current = sub;
      setIsTracking(true);
      setHasArrived(false);
    } catch (err: any) {
      setTrackingError(err?.response?.data?.message || err?.message || 'Failed to start live tracking.');
    }
  };

  const handleStopTracking = async () => {
    if (!rental) return;
    if (trackingSubRef.current) {
      trackingSubRef.current.remove();
      trackingSubRef.current = null;
    }
    setIsTracking(false);
    try {
      await rentalsService.stopTracking(rental.id);
    } catch {
      // Best effort
    }
  };

  const handleMarkArrived = async () => {
    if (!rental) return;
    if (trackingSubRef.current) {
      trackingSubRef.current.remove();
      trackingSubRef.current = null;
    }
    setIsTracking(false);
    try {
      await rentalsService.markArrived(rental.id);
      setHasArrived(true);
      Alert.alert('Arrived! 🎉', 'The owner has been notified that you arrived at the pickup location.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to record arrival.');
    }
  };

  const handleApprove = async () => {
    openApprovePickupModal();
  };

  const handleActivate = async () => {
    if (!rental) return;
    setIsBusy(true);
    try {
      await rentalsService.activate(rental.id);
      Alert.alert('Active', 'Item handed over.');
      fetchRental(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to activate rental.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReturn = async () => {
    if (!rental) return;
    setIsBusy(true);
    try {
      await rentalsService.return(rental.id);
      Alert.alert('Returned! 📦', 'Rental completed successfully.');
      fetchRental(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to mark as returned.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = () => {
    if (!rental) return;
    Alert.alert(
      'Cancel Rental?',
      `Are you sure you want to cancel this request for "${rental.item.title}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsBusy(true);
            try {
              await rentalsService.cancel(rental.id);
              fetchRental(true);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel.');
            } finally {
              setIsBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleConfirmReject = async () => {
    if (!rental) return;
    setIsBusy(true);
    try {
      await rentalsService.reject(rental.id, rejectNote);
      setShowRejectModal(false);
      setRejectNote('');
      fetchRental(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to decline request.');
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Rental Not Found'}</Text>
        <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.goBack()}>
          <Text style={styles.btnOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const otherPerson = isBorrower ? rental.item.owner : rental.borrower;
  const otherPersonRole = isBorrower ? 'Owner' : 'Borrower';
  const itemImage =
    rental.item.images?.[0] ??
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';

  const stepIndex = STATUS_ORDER[rental.status];
  const isTerminated = rental.status === 'REJECTED' || rental.status === 'CANCELLED';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rental Agreement</Text>
        <StatusBadge status={rental.status} size="sm" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchRental(true)}
            colors={[colors.primary[600]]}
          />
        }
      >
        {/* Progress Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardHeader}>Progress</Text>

          {isTerminated ? (
            <View
              style={[
                styles.terminatedBanner,
                rental.status === 'REJECTED' ? styles.rejectedBg : styles.cancelledBg,
              ]}
            >
              <Text style={styles.terminatedTitle}>
                {rental.status === 'REJECTED' ? '✕ Request Declined' : '⊘ Request Cancelled'}
              </Text>
              {rental.ownerNote ? (
                <Text style={styles.terminatedDesc}>"{rental.ownerNote}"</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.stepsRow}>
              {TIMELINE_STEPS.map((step, idx) => {
                const isPassed = stepIndex >= idx;
                const isCurrent = stepIndex === idx;

                return (
                  <View key={step.status} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        isCurrent && styles.stepCurrent,
                        isPassed && !isCurrent && styles.stepPassed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNum,
                          (isCurrent || isPassed) && styles.stepNumActive,
                        ]}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCurrent && styles.stepLabelCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Item Card */}
        <TouchableOpacity
          style={styles.itemCard}
          onPress={() => navigation.navigate('ItemDetail', { itemId: rental.item.id })}
          activeOpacity={0.85}
        >
          <Image source={{ uri: itemImage }} style={styles.itemImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.categoryBadge}>{rental.item.category}</Text>
            <Text style={styles.itemTitle}>{rental.item.title}</Text>
            <Text style={styles.viewListingText}>View Listing Details →</Text>
          </View>
        </TouchableOpacity>

        {/* Rental Terms Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Rental Terms</Text>

          <View style={styles.dateBlock}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>📅 {formatDateDMY(rental.startDate)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>📅 {formatDateDMY(rental.endDate)}</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Daily Rate</Text>
            <Text style={styles.priceVal}>{formatINR(rental.item.pricePerDay)} / day</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Rental Cost</Text>
            <Text style={styles.priceVal}>{formatINR(rental.totalPrice)}</Text>
          </View>

          {rental.depositAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Security Deposit</Text>
              <Text style={styles.priceVal}>{formatINR(rental.depositAmount)}</Text>
            </View>
          )}

          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Due on Handover</Text>
            <Text style={styles.totalVal}>
              {formatINR(rental.totalPrice + rental.depositAmount)}
            </Text>
          </View>

          {rental.borrowerNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Borrower's Note:</Text>
              <Text style={styles.noteContent}>"{rental.borrowerNote}"</Text>
            </View>
          ) : null}
        </View>

        {/* Other Party Profile */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{otherPersonRole} Info</Text>

          <View style={styles.userRow}>
            {otherPerson?.avatarUrl ? (
              <Image source={{ uri: otherPerson.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {otherPerson?.name ? otherPerson.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.userName}>{otherPerson?.name}</Text>
              {otherPerson?.address ? (
                <Text style={styles.userAddress}>📍 {otherPerson.address}</Text>
              ) : null}
            </View>
          </View>

          {/* Privacy-gated Phone Number */}
          {otherPerson?.phone ? (
            <View style={styles.phoneBox}>
              <View style={styles.phoneHeaderRow}>
                <Text style={styles.phoneLabel}>📞 Contact Phone (Coordination):</Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (otherPerson.phone) {
                      await Clipboard.setStringAsync(otherPerson.phone);
                      Alert.alert('Copied!', 'Phone number copied to clipboard.');
                    }
                  }}
                  style={styles.copyPhoneBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyPhoneBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${otherPerson.phone}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.phoneNumber}>{formatPhoneNumber(otherPerson.phone)}</Text>
                <Text style={styles.phoneTap}>Tap to Call</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.hiddenPhoneBox}>
              <Text style={styles.hiddenPhoneText}>
                🔒 Phone number hidden until request is approved
              </Text>
            </View>
          )}

          {/* In-app Chat Button */}
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() =>
              navigation.navigate('Chat', {
                rentalId: rental.id,
                otherUserName: otherPerson?.name,
                title: rental.item.title,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.messageBtnText}>
              💬 Message {otherPerson?.name || otherPersonRole}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pickup Location Card */}
        {((isOwner && (rental.pickupLatitude != null || rental.pickupAddress || rental.status === 'APPROVED' || rental.status === 'ACTIVE')) ||
          (isBorrower && (rental.status === 'APPROVED' || rental.status === 'ACTIVE'))) && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>📍 Pickup Location</Text>
              {isOwner && (rental.status === 'APPROVED' || rental.status === 'ACTIVE') && (
                <TouchableOpacity onPress={openEditPickupModal} style={styles.editPickupBtn}>
                  <Text style={styles.editPickupBtnText}>Edit Pickup</Text>
                </TouchableOpacity>
              )}
            </View>

            {rental.pickupLatitude != null && rental.pickupLongitude != null ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                <MapView
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
                  address={rental.pickupAddress || undefined}
                  height={180}
                  showNavigateButton={true}
                />

                <View style={styles.pickupDetailsBox}>
                  <Text style={styles.pickupAddressTitle}>Address</Text>
                  <Text style={styles.pickupAddressText}>
                    {rental.pickupAddress || 'Coordinates provided'}
                  </Text>

                  {isBorrower && borrowerCoords && (
                    <Text style={styles.pickupDistanceText}>
                      🧭 ~{getDistanceKm(borrowerCoords.latitude, borrowerCoords.longitude, rental.pickupLatitude, rental.pickupLongitude)} km straight-line distance from you
                    </Text>
                  )}

                  {formatPickupWindow(rental.pickupTimeFrom, rental.pickupTimeTo) ? (
                    <Text style={styles.pickupTimeWindowText}>
                      🕒 Window: {formatPickupWindow(rental.pickupTimeFrom, rental.pickupTimeTo)}
                    </Text>
                  ) : null}

                  {rental.pickupNote ? (
                    <View style={styles.pickupNoteBox}>
                      <Text style={styles.pickupNoteLabel}>Owner's Note:</Text>
                      <Text style={styles.pickupNoteText}>"{rental.pickupNote}"</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.pickupActionsRow}>
                  <TouchableOpacity
                    style={styles.navigateBtnPrimary}
                    onPress={() => openMapNavigation(rental.pickupLatitude!, rental.pickupLongitude!, 'Pickup')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navigateBtnPrimaryText}>🧭 Navigate in Maps</Text>
                  </TouchableOpacity>

                  {rental.pickupAddress ? (
                    <TouchableOpacity
                      style={styles.copyAddressBtn}
                      onPress={() => {
                        Share.share({ message: rental.pickupAddress || '' });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.copyAddressBtnText}>📋 Share / Copy</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.noPickupBox}>
                <Text style={styles.noPickupText}>
                  {isOwner
                    ? 'No pickup point specified yet. Tap below to set one.'
                    : 'The owner has not specified an exact pickup point yet.'}
                </Text>
                {isOwner && (
                  <TouchableOpacity onPress={openEditPickupModal} style={styles.setPickupBtn}>
                    <Text style={styles.setPickupBtnText}>Set Pickup Point</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Live Tracking Cards (APPROVED status only) */}
        {rental.status === 'APPROVED' && (
          <>
            {/* Borrower live tracking controls */}
            {isBorrower && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeader}>🚗 Live Location Sharing</Text>
                  {isTracking && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>Live</Text>
                    </View>
                  )}
                </View>

                {trackingError ? (
                  <View style={styles.alertBox}>
                    <Text style={styles.alertText}>{trackingError}</Text>
                    {showSettingsBtn && (
                      <TouchableOpacity
                        style={styles.settingsAlertBtn}
                        onPress={() => Linking.openSettings()}
                      >
                        <Text style={styles.settingsAlertBtnText}>Open Settings</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {isTracking ? (
                  <View style={{ gap: 10, marginTop: 6 }}>
                    <View style={styles.trackingBanner}>
                      <Text style={styles.trackingBannerTitle}>
                        📡 Sharing your live location with owner
                      </Text>
                      <Text style={styles.trackingBannerDesc}>
                        Updates are sent every 5 seconds. Please keep RentCart open while traveling.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={styles.stopTrackingBtn}
                        onPress={handleStopTracking}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.stopTrackingBtnText}>Stop Sharing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.arrivedBtn}
                        onPress={handleMarkArrived}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.arrivedBtnText}>✓ I've Arrived</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : hasArrived ? (
                  <View style={styles.arrivedSuccessBox}>
                    <Text style={styles.arrivedSuccessTitle}>🎉 You marked yourself as arrived!</Text>
                    <Text style={styles.arrivedSuccessDesc}>
                      The owner has been notified that you are waiting at the pickup location.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Text style={styles.trackingIntroText}>
                      Heading to the pickup location? Tap below to share your live ETA and vehicle location with the owner.
                    </Text>
                    <TouchableOpacity
                      style={styles.startTrackingBtn}
                      onPress={handleStartTracking}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startTrackingBtnText}>🚗 I'm on my way</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Owner live tracking view */}
            {isOwner && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeader}>📡 Borrower Live Tracking</Text>
                  {liveTracking?.isSharing ? (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>On the way</Text>
                    </View>
                  ) : (
                    <Text style={styles.notSharingText}>Not sharing</Text>
                  )}
                </View>

                {liveTracking?.isSharing && liveTracking.location ? (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <View style={styles.etaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.etaLabel}>Estimated Arrival</Text>
                        <Text style={styles.etaVal}>
                          {liveTracking.etaMinutes != null ? `~${liveTracking.etaMinutes} mins` : 'Calculating…'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.etaLabel}>Last Updated</Text>
                        <Text style={styles.etaTime}>
                          {liveTracking.updatedAt ? new Date(liveTracking.updatedAt).toLocaleTimeString() : 'Just now'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.etaHint}>
                      The blue marker on the map above reflects the borrower's moving location.
                    </Text>
                  </View>
                ) : hasArrived ? (
                  <View style={styles.arrivedSuccessBox}>
                    <Text style={styles.arrivedSuccessTitle}>🎉 Borrower has arrived!</Text>
                    <Text style={styles.arrivedSuccessDesc}>
                      The borrower is at the designated pickup location. Please meet them with the item.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noTrackingNotice}>
                    The borrower hasn't started sharing their live location yet. When they tap "I'm on my way", their real-time position and ETA will appear here.
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Reviews and Ratings Section */}
        {rental.status === 'RETURNED' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            {isLoadingReview ? (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 20 }]}>
                <ActivityIndicator size="small" color={colors.primary[600]} />
              </View>
            ) : (
              <>
                {/* Rate your experience form if user can review */}
                {reviewStatus?.canReview && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>Rate Your Experience</Text>
                    <Text style={styles.reviewSubText}>
                      How was your rental experience with {otherPerson?.name || 'this user'}?
                    </Text>

                    <View style={styles.starInputContainer}>
                      <StarRating
                        rating={ratingInput}
                        onRatingChange={setRatingInput}
                        mode="input"
                        size="lg"
                      />
                    </View>

                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.fieldLabel}>Feedback (optional)</Text>
                      <Text style={styles.charCount}>{commentInput.length}/500</Text>
                    </View>
                    <TextInput
                      style={styles.reviewTextInput}
                      placeholder="Share your experience (communication, item condition, etc.)..."
                      placeholderTextColor={colors.gray[400]}
                      multiline
                      maxLength={500}
                      value={commentInput}
                      onChangeText={setCommentInput}
                    />

                    <TouchableOpacity
                      style={[
                        styles.btnSubmitReview,
                        isSubmittingReview && { opacity: 0.7 },
                      ]}
                      onPress={handleSubmitReview}
                      disabled={isSubmittingReview || ratingInput < 1}
                    >
                      {isSubmittingReview ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.btnSubmitReviewText}>Submit Review</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* My Review display if already reviewed */}
                {reviewStatus?.hasReviewed && reviewStatus.myReview && (
                  <View style={styles.card}>
                    <View style={styles.reviewCardHeaderRow}>
                      <Text style={styles.cardHeader}>Your Review</Text>
                      <TouchableOpacity
                        onPress={handleDeleteReview}
                        disabled={isDeletingReview}
                      >
                        {isDeletingReview ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <Text style={styles.deleteReviewText}>Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.myReviewBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <StarRating rating={reviewStatus.myReview.rating} size="md" />
                        <Text style={styles.myReviewDate}>
                          {new Date(reviewStatus.myReview.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {reviewStatus.myReview.comment ? (
                        <Text style={styles.myReviewComment}>"{reviewStatus.myReview.comment}"</Text>
                      ) : (
                        <Text style={styles.myReviewNoComment}>No written comment provided.</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Other person's review display if exists */}
                {reviewStatus?.otherReview && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>{otherPersonRole}'s Review of You</Text>
                    <View style={styles.otherReviewBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <StarRating rating={reviewStatus.otherReview.rating} size="md" />
                        <Text style={styles.myReviewDate}>
                          {new Date(reviewStatus.otherReview.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {reviewStatus.otherReview.comment ? (
                        <Text style={styles.myReviewComment}>"{reviewStatus.otherReview.comment}"</Text>
                      ) : (
                        <Text style={styles.myReviewNoComment}>No written comment provided.</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </KeyboardAvoidingView>
        )}
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        {isOwner && (
          <View style={styles.actionButtons}>
            {rental.status === 'PENDING' && (
              <>
                <TouchableOpacity
                  style={styles.btnDecline}
                  onPress={() => setShowRejectModal(true)}
                  disabled={isBusy}
                >
                  <Text style={styles.btnDeclineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnApprove}
                  onPress={handleApprove}
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnApproveText}>✓ Approve Request</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {rental.status === 'APPROVED' && (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleActivate}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>🤝 Mark as Handed Over (Active)</Text>
                )}
              </TouchableOpacity>
            )}

            {rental.status === 'ACTIVE' && (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#9333ea' }]}
                onPress={handleReturn}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>📦 Confirm Item Returned</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isBorrower && (
          <View style={styles.actionButtons}>
            {(rental.status === 'PENDING' || rental.status === 'APPROVED') && (
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={handleCancel}
                disabled={isBusy}
              >
                <Text style={styles.btnCancelText}>Cancel Request</Text>
              </TouchableOpacity>
            )}
            {rental.status === 'ACTIVE' && (
              <Text style={styles.infoFooterText}>
                Item active. Please return by {rental.endDate}.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline Request</Text>
            <Text style={styles.modalSubtitle}>
              Optionally provide a reason for the borrower:
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="e.g. Item unavailable on those dates."
              placeholderTextColor={colors.gray[400]}
              value={rejectNote}
              onChangeText={setRejectNote}
              maxLength={500}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRejectModal(false)}
                disabled={isBusy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={handleConfirmReject}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm / Edit Pickup Point Modal */}
      <Modal
        visible={showPickupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPickupModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, styles.pickupModalCard]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {isEditingPickup ? 'Edit Pickup Location' : 'Confirm Pickup Point'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isEditingPickup
                  ? 'Update the designated pickup location and instructions.'
                  : 'Confirm where the borrower should meet you to pick up the item.'}
              </Text>

              {/* Safety tip */}
              <View style={styles.safetyBox}>
                <Text style={styles.safetyText}>
                  💡 Safety tip: Meet in a public, well-lit place when possible.
                </Text>
              </View>

              {pickupSaveError ? (
                <Text style={[styles.errorText, { marginBottom: 8 }]}>{pickupSaveError}</Text>
              ) : null}

              <LocationPicker
                value={pickupFormLocation}
                onChange={setPickupFormLocation}
                height={150}
              />

              <TextInput
                style={[styles.modalInput, styles.noteInput]}
                placeholder="Pickup note: Gate 2, call upon arrival... (optional, max 200)"
                placeholderTextColor={colors.gray[400]}
                value={pickupFormNote}
                onChangeText={setPickupFormNote}
                maxLength={200}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowPickupModal(false)}
                  disabled={isSavingPickup}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnApprove, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
                  onPress={handleSavePickup}
                  disabled={isSavingPickup}
                >
                  {isSavingPickup ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnApproveText}>
                      {isEditingPickup ? 'Save Location' : 'Confirm & Approve'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[700],
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.gray[900],
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 16,
  },
  timelineCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 16,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepPassed: {
    backgroundColor: colors.primary[500],
  },
  stepCurrent: {
    backgroundColor: colors.primary[600],
    borderWidth: 3,
    borderColor: colors.primary[200],
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[600],
  },
  stepNumActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.gray[500],
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: colors.primary[700],
    fontWeight: '700',
  },
  terminatedBanner: {
    padding: 12,
    borderRadius: 12,
  },
  rejectedBg: {
    backgroundColor: '#fee2e2',
  },
  cancelledBg: {
    backgroundColor: colors.gray[200],
  },
  terminatedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  terminatedDesc: {
    fontSize: 12,
    color: '#7f1d1d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.gray[200],
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: 2,
  },
  viewListingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 16,
  },
  dateBlock: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dateLabel: {
    fontSize: 11,
    color: colors.gray[500],
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.gray[600],
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gray[900],
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  noteBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[500],
  },
  noteContent: {
    fontSize: 12,
    color: colors.gray[700],
    fontStyle: 'italic',
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[700],
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  userAddress: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 1,
  },
  phoneBox: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
  },
  phoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyPhoneBtn: {
    backgroundColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  copyPhoneBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  phoneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
    marginTop: 2,
  },
  phoneTap: {
    fontSize: 10,
    color: '#16a34a',
    marginTop: 2,
    fontWeight: '600',
  },
  hiddenPhoneBox: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 12,
  },
  hiddenPhoneText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    padding: 16,
    backgroundColor: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  btnApprove: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnApproveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDecline: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  btnDeclineText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  infoFooterText: {
    fontSize: 13,
    color: colors.primary[700],
    textAlign: 'center',
    width: '100%',
  },
  btnOutline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
    marginTop: 12,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  errorText: {
    fontSize: 15,
    color: '#b91c1c',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.gray[900],
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  modalRejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  reviewSubText: {
    fontSize: 13,
    color: colors.gray[600],
    marginBottom: 8,
  },
  starInputContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
  },
  charCount: {
    fontSize: 11,
    color: colors.gray[400],
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.gray[900],
    backgroundColor: '#ffffff',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  btnSubmitReview: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitReviewText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteReviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  myReviewBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  otherReviewBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  myReviewDate: {
    fontSize: 11,
    color: colors.gray[500],
  },
  myReviewComment: {
    fontSize: 13,
    color: colors.gray[800],
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  myReviewNoComment: {
    fontSize: 12,
    color: colors.gray[400],
    fontStyle: 'italic',
    marginTop: 4,
  },
  messageBtn: {
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  messageBtnText: {
    color: colors.primary[700],
    fontSize: 14,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  editPickupBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  editPickupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },
  pickupDetailsBox: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  pickupAddressTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.neutral[400],
  },
  pickupAddressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  pickupDistanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
    marginTop: 2,
  },
  pickupTimeWindowText: {
    fontSize: 12,
    color: colors.neutral[600],
    marginTop: 2,
  },
  pickupNoteBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  pickupNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854d0e',
  },
  pickupNoteText: {
    fontSize: 12,
    color: '#713f12',
    fontStyle: 'italic',
    marginTop: 1,
  },
  pickupActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navigateBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary[600],
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateBtnPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  copyAddressBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyAddressBtnText: {
    color: colors.neutral[700],
    fontSize: 12,
    fontWeight: '600',
  },
  noPickupBox: {
    padding: 14,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  noPickupText: {
    fontSize: 12,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  setPickupBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setPickupBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  alertBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginVertical: 6,
  },
  alertText: {
    fontSize: 12,
    color: '#991b1b',
  },
  settingsAlertBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  settingsAlertBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  trackingBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  trackingBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  trackingBannerDesc: {
    fontSize: 11,
    color: '#15803d',
  },
  stopTrackingBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopTrackingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  arrivedBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  arrivedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  arrivedSuccessBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    gap: 2,
    marginTop: 4,
  },
  arrivedSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  arrivedSuccessDesc: {
    fontSize: 11,
    color: '#15803d',
  },
  trackingIntroText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  startTrackingBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  startTrackingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  notSharingText: {
    fontSize: 11,
    color: colors.neutral[400],
    fontWeight: '500',
  },
  etaRow: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#166534',
  },
  etaVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14532d',
    marginTop: 2,
  },
  etaTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginTop: 4,
  },
  etaHint: {
    fontSize: 11,
    color: colors.neutral[400],
    fontStyle: 'italic',
  },
  noTrackingNotice: {
    fontSize: 12,
    color: colors.neutral[500],
    paddingVertical: 6,
  },
  pickupModalCard: {
    maxWidth: 380,
    maxHeight: '88%',
  },
  safetyBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  safetyText: {
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 15,
  },
  noteInput: {
    height: 44,
    marginBottom: 12,
    marginTop: 8,
  },
});
