/**
 * src/screens/RequestsScreen.tsx (mobile)
 * Displays incoming borrow requests on items owned by the current user:
 * - Status-coloured left border on cards
 * - Coloured action buttons (Approve=green, Reject=red outline, Activate=blue, Returned=indigo)
 * - Borrower avatar with initials and palette colors
 * - Confirm Pickup Point and Decline modals
 * - Full dark mode support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, Rental, RentalStatus } from '../services/rentals.service';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LocationPicker, { LocationValue } from '../components/LocationPicker';
import { HandoverVerifyCard } from '../components/HandoverVerifyCard';
import {
  colors,
  radius,
  shadows,
  STATUS_THEMES,
  CATEGORY_THEMES,
  CategoryKey,
  getAvatarColor,
  getInitials,
} from '../utils/colors';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';
import { formatPhoneNumber } from '../utils/phone';

const TABS: { label: string; value: RentalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Declined', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function RequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { isDark, themeColors } = useTheme();

  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [requests, setRequests] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Reject modal
  const [rejectingRental, setRejectingRental] = useState<Rental | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Confirm Pickup Point Modal
  const [approvingRental, setApprovingRental] = useState<Rental | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationValue>({
    latitude: 13.0827,
    longitude: 80.2707,
    address: '',
  });
  const [pickupNote, setPickupNote] = useState('');
  const [pickupTimeFrom, setPickupTimeFrom] = useState('');
  const [pickupTimeTo, setPickupTimeTo] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [busyRentalId, setBusyRentalId] = useState<string | null>(null);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const data = await rentalsService.getIncoming(activeTab);
      setRequests(data.rentals);
    } catch {
      setError('Could not load incoming requests. Check connection and retry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApproveClick = (rental: Rental) => {
    setApprovingRental(rental);
    setPickupLocation({
      latitude: rental.pickupLatitude ?? user?.latitude ?? 13.0827,
      longitude: rental.pickupLongitude ?? user?.longitude ?? 80.2707,
      address: rental.pickupAddress || user?.address || '',
    });
    setPickupNote(rental.pickupNote || '');
    setPickupTimeFrom(rental.pickupTimeFrom ? rental.pickupTimeFrom.slice(0, 16) : '');
    setPickupTimeTo(rental.pickupTimeTo ? rental.pickupTimeTo.slice(0, 16) : '');
    setPickupError('');
  };

  const confirmApprove = async () => {
    if (!approvingRental) return;
    if (!pickupLocation.address.trim()) {
      setPickupError('Please provide a pickup address.');
      return;
    }

    setIsApproving(true);
    setPickupError('');
    try {
      await rentalsService.approve(approvingRental.id, {
        pickupLatitude: pickupLocation.latitude,
        pickupLongitude: pickupLocation.longitude,
        pickupAddress: pickupLocation.address.trim(),
        pickupNote: pickupNote.trim() ? pickupNote.trim() : null,
        pickupTimeFrom: pickupTimeFrom ? new Date(pickupTimeFrom).toISOString() : null,
        pickupTimeTo: pickupTimeTo ? new Date(pickupTimeTo).toISOString() : null,
      });
      const approvedTitle = approvingRental.item.title;
      setApprovingRental(null);
      Alert.alert('Approved! ✓', `Request for "${approvedTitle}" has been approved with confirmed pickup point.`);
      fetchRequests(true);
    } catch (err: any) {
      setPickupError(err?.response?.data?.message ?? 'Failed to approve request. Please check pickup coordinates.');
    } finally {
      setIsApproving(false);
    }
  };


  const handleReturn = async (rental: Rental) => {
    setBusyRentalId(rental.id);
    try {
      await rentalsService.return(rental.id);
      Alert.alert('Completed! 📦', `Item return confirmed for "${rental.item.title}".`);
      fetchRequests(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm return.');
    } finally {
      setBusyRentalId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRental) return;
    setIsRejecting(true);
    try {
      await rentalsService.reject(rejectingRental.id, rejectNote);
      setRejectingRental(null);
      setRejectNote('');
      fetchRequests(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to decline request.');
    } finally {
      setIsRejecting(false);
    }
  };

  const renderItem = ({ item }: { item: Rental }) => {
    const itemImage =
      item.item.images?.[0] ??
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
    const isBusy = busyRentalId === item.id;
    const statusCfg = STATUS_THEMES[item.status] || STATUS_THEMES.PENDING;
    const catKey = (item.item.category in CATEGORY_THEMES ? item.item.category : 'Other') as CategoryKey;
    const catTheme = CATEGORY_THEMES[catKey];
    const borrowerName = item.borrower.name || 'Borrower';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            borderLeftWidth: 4,
            borderLeftColor: isDark ? statusCfg.darkFg : statusCfg.fg,
          },
        ]}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        activeOpacity={0.85}
      >
        {/* Top: Item + Status */}
        <View style={styles.topRow}>
          <Image source={{ uri: itemImage }} style={styles.itemThumb} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: isDark ? catTheme.darkTint : catTheme.tint,
                  borderColor: isDark ? catTheme.darkBorder : catTheme.border,
                },
              ]}
            >
              <Text style={[styles.categoryBadgeText, { color: catTheme.primary }]}>
                {item.item.category}
              </Text>
            </View>
            <Text style={[styles.itemTitle, { color: themeColors.text }]} numberOfLines={1}>
              {item.item.title}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* Borrower info */}
        <View
          style={[
            styles.borrowerSection,
            {
              backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.borrowerRow}>
            {item.borrower.avatarUrl ? (
              <Image source={{ uri: item.borrower.avatarUrl }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: getAvatarColor(borrowerName) },
                ]}
              >
                <Text style={styles.avatarFallbackText}>
                  {getInitials(borrowerName)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.borrowerName, { color: themeColors.text }]}>
                {borrowerName}
              </Text>
              {item.borrower.phone ? (
                <View style={styles.phoneActionRow}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${item.borrower.phone}`)}
                    style={styles.phoneLink}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={12} color={colors.primary[500]} />
                    <Text style={[styles.phoneText, { color: colors.primary[500] }]}>
                      {formatPhoneNumber(item.borrower.phone)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (item.borrower.phone) {
                        await Clipboard.setStringAsync(item.borrower.phone);
                        Alert.alert('Copied!', 'Phone number copied to clipboard.');
                      }
                    }}
                    style={[
                      styles.copyBtn,
                      {
                        backgroundColor: isDark ? colors.dark.border : colors.neutral[200],
                        borderColor: themeColors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.copyBtnText, { color: themeColors.textMuted }]}>
                      Copy
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={themeColors.textMuted} />
            <Text style={[styles.dates, { color: themeColors.textMuted }]}>
              {formatDateDMY(item.startDate)} → {formatDateDMY(item.endDate)}
            </Text>
          </View>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: themeColors.textMuted }]}>Earnings: </Text>
            <Text style={styles.earningsValue}>{formatINR(item.totalPrice)}</Text>
            {item.depositAmount > 0 ? (
              <Text style={[styles.depositPill, { color: colors.secondary[500] }]}>
                {' '}(+{formatINR(item.depositAmount)} deposit)
              </Text>
            ) : null}
          </View>

          {item.borrowerNote ? (
            <Text style={[styles.noteText, { color: themeColors.textMuted }]} numberOfLines={2}>
              "{item.borrowerNote}"
            </Text>
          ) : null}
        </View>

        {/* Action Buttons with Design Spec Colors */}
        <View style={styles.actionRow}>
          {item.status === 'PENDING' && (
            <>
              {/* Reject = red outline */}
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => setRejectingRental(item)}
                disabled={isBusy}
                activeOpacity={0.7}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              {/* Approve = green */}
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApproveClick(item)}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.approveBtnText}>✓ Approve</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Confirm handover card replaces plain activate button */}
          {item.status === 'APPROVED' && (
            <HandoverVerifyCard
              rentalId={item.id}
              compact
              onSuccess={() => {
                fetchRequests(false);
                Alert.alert('Success 🎉', `Handover confirmed! Rental is now Active.`);
              }}
            />
          )}

          {/* Mark Returned = indigo */}
          {item.status === 'ACTIVE' && (
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => handleReturn(item)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isBusy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.returnBtnText}>📦 Confirm Return</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      {/* Title */}
      <View style={[styles.header, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.screenTitle, { color: themeColors.text }]}>Incoming Requests</Text>
        <Text style={[styles.screenSubtitle, { color: themeColors.textMuted }]}>
          Requests on items you listed
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabsWrapper,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const isSelected = activeTab === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary[500]
                      : isDark
                      ? colors.dark.surfaceHover
                      : colors.neutral[100],
                    borderColor: isSelected
                      ? colors.primary[600]
                      : isDark
                      ? colors.dark.border
                      : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(item.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSelected
                        ? '#ffffff'
                        : isDark
                        ? colors.dark.text
                        : colors.neutral[700],
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color={colors.danger} style={{ marginBottom: 8 }} />
          <Text style={[styles.errorText, { color: themeColors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRequests()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <View
            style={[
              styles.emptyIconBg,
              { backgroundColor: isDark ? colors.dark.surfaceHover : colors.primary[50] },
            ]}
          >
            <Ionicons name="mail-outline" size={36} color={colors.primary[500]} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No requests found</Text>
          <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
            {activeTab
              ? `No requests currently in "${activeTab}" status.`
              : 'When neighbours request to borrow your items, they will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRequests(true)}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={Boolean(rejectingRental)}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingRental(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Decline Borrow Request
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textMuted }]}>
              You are declining {rejectingRental?.borrower.name}'s request for{' '}
              {rejectingRental?.item.title}.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                  borderColor: themeColors.border,
                  color: themeColors.text,
                },
              ]}
              multiline
              numberOfLines={3}
              placeholder="Optional reason for declining…"
              placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              value={rejectNote}
              onChangeText={setRejectNote}
              maxLength={500}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setRejectingRental(null)}
                disabled={isRejecting}
              >
                <Text style={[styles.modalCancelText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Pickup Point Modal */}
      <Modal
        visible={!!approvingRental}
        transparent
        animationType="slide"
        onRequestClose={() => setApprovingRental(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              styles.pickupModalCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Confirm Pickup Point
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textMuted }]}>
              Confirm where the borrower will meet you to pick up the item.
            </Text>

            {/* Safety tip */}
            <View
              style={[
                styles.safetyBox,
                {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
                  borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#bfdbfe',
                },
              ]}
            >
              <Text style={styles.safetyText}>
                💡 Safety tip: Meet in a public, well-lit place when possible.
              </Text>
            </View>

            {pickupError ? (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>{pickupError}</Text>
            ) : null}

            <LocationPicker
              value={pickupLocation}
              onChange={setPickupLocation}
              height={140}
            />

            <TextInput
              style={[
                styles.modalInput,
                styles.noteInput,
                {
                  backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                  borderColor: themeColors.border,
                  color: themeColors.text,
                },
              ]}
              placeholder="Pickup note: Gate 2, call upon arrival... (optional, max 200)"
              placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
              value={pickupNote}
              onChangeText={setPickupNote}
              maxLength={200}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setApprovingRental(null)}
                disabled={isApproving}
              >
                <Text style={[styles.modalCancelText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
                onPress={confirmApprove}
                disabled={isApproving}
              >
                {isApproving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.approveBtnText}>Confirm & Approve</Text>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: 6,
  },
  tabChipText: {
    fontSize: 12,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemThumb: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 2,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  borrowerSection: {
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  borrowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  borrowerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  copyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dates: {
    fontSize: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent[500],
  },
  depositPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },

  // Action Buttons from Design Spec
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  approveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  activateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  activateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  returnBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.secondary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 13,
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
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalRejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  pickupModalCard: {
    maxWidth: 380,
  },
  safetyBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
  },
  safetyText: {
    fontSize: 11,
    color: colors.info,
    lineHeight: 15,
  },
  noteInput: {
    height: 48,
    marginBottom: 14,
    marginTop: 8,
  },
});
