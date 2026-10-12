/**
 * src/screens/RentalDetailScreen.tsx (mobile)
 * Full details of a rental agreement — status timeline, item info,
 * phone number with privacy gating and click-to-call, and role-based actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, Rental, RentalStatus } from '../services/rentals.service';
import { reviewsService, type ReviewStatusResponse } from '../services/reviews.service';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'RentalDetail'>;

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

  const handleApprove = async () => {
    if (!rental) return;
    setIsBusy(true);
    try {
      await rentalsService.approve(rental.id);
      Alert.alert('Approved! ✓', 'Request has been approved.');
      fetchRental(true);
    } catch (err: any) {
      Alert.alert(
        'Approval Conflict',
        err?.response?.data?.message ??
          'Could not approve request. Dates may conflict with another booking.',
      );
    } finally {
      setIsBusy(false);
    }
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
              <Text style={styles.dateValue}>📅 {rental.startDate}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>📅 {rental.endDate}</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Daily Rate</Text>
            <Text style={styles.priceVal}>${rental.item.pricePerDay} / day</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Rental Cost</Text>
            <Text style={styles.priceVal}>${rental.totalPrice.toFixed(2)}</Text>
          </View>

          {rental.depositAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Security Deposit</Text>
              <Text style={styles.priceVal}>${rental.depositAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Due on Handover</Text>
            <Text style={styles.totalVal}>
              ${(rental.totalPrice + rental.depositAmount).toFixed(2)}
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
            <TouchableOpacity
              style={styles.phoneBox}
              onPress={() => Linking.openURL(`tel:${otherPerson.phone}`)}
            >
              <Text style={styles.phoneLabel}>📞 Contact Phone (Coordination):</Text>
              <Text style={styles.phoneNumber}>{otherPerson.phone}</Text>
              <Text style={styles.phoneTap}>Tap to Call</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.hiddenPhoneBox}>
              <Text style={styles.hiddenPhoneText}>
                🔒 Phone number hidden until request is approved
              </Text>
            </View>
          )}
        </View>

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
});
