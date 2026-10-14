/**
 * src/screens/RequestsScreen.tsx (mobile)
 * Displays incoming borrow requests on items owned by the current user.
 * Supports status chips filter, pull-to-refresh, Approve, Decline, Mark Active, Mark Returned.
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
import { AppStackParamList } from '../navigation/types';
import { rentalsService, Rental, RentalStatus } from '../services/rentals.service';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import LocationPicker, { LocationValue } from '../components/LocationPicker';
import { colors } from '../utils/colors';
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
  const [activeTab, setActiveTab] = useState<RentalStatus | ''>('');
  const [requests, setRequests] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Reject modal
  const { user } = useAuth();
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

  const handleActivate = async (rental: Rental) => {
    setBusyRentalId(rental.id);
    try {
      await rentalsService.activate(rental.id);
      Alert.alert('Active', `Item handed over to ${rental.borrower.name}.`);
      fetchRequests(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setBusyRentalId(null);
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

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        activeOpacity={0.85}
      >
        {/* Top: Item + Status */}
        <View style={styles.topRow}>
          <Image source={{ uri: itemImage }} style={styles.itemThumb} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.categoryBadge}>{item.item.category}</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.item.title}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* Borrower info */}
        <View style={styles.borrowerSection}>
          <View style={styles.borrowerRow}>
            {item.borrower.avatarUrl ? (
              <Image source={{ uri: item.borrower.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {item.borrower.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.borrowerName}>{item.borrower.name}</Text>
              {item.borrower.phone ? (
                <View style={styles.phoneActionRow}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${item.borrower.phone}`)}
                    style={styles.phoneLink}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.phoneText}>📞 {formatPhoneNumber(item.borrower.phone)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (item.borrower.phone) {
                        await Clipboard.setStringAsync(item.borrower.phone);
                        Alert.alert('Copied!', 'Phone number copied to clipboard.');
                      }
                    }}
                    style={styles.copyBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          <Text style={styles.dates}>
            📅 {formatDateDMY(item.startDate)} → {formatDateDMY(item.endDate)}
          </Text>

          <Text style={styles.earnings}>
            Earnings: <Text style={styles.earningsValue}>{formatINR(item.totalPrice)}</Text>
            {item.depositAmount > 0 ? ` (+${formatINR(item.depositAmount)} dep)` : ''}
          </Text>

          {item.borrowerNote ? (
            <Text style={styles.noteText} numberOfLines={2}>
              "{item.borrowerNote}"
            </Text>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {item.status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => setRejectingRental(item)}
                disabled={isBusy}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApproveClick(item)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.approveBtnText}>✓ Approve</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {item.status === 'APPROVED' && (
            <TouchableOpacity
              style={styles.activateBtn}
              onPress={() => handleActivate(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.activateBtnText}>🤝 Hand Over Item</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'ACTIVE' && (
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => handleReturn(item)}
              disabled={isBusy}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Incoming Requests</Text>
        <Text style={styles.screenSubtitle}>Requests on items you listed</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
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
                style={[styles.tabChip, isSelected && styles.tabChipActive]}
                onPress={() => setActiveTab(item.value)}
              >
                <Text
                  style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}
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
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRequests()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptyText}>
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
              colors={[colors.primary[600]]}
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline Borrow Request</Text>
            <Text style={styles.modalSubtitle}>
              You are declining {rejectingRental?.borrower.name}'s request for{' '}
              {rejectingRental?.item.title}.
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Optional reason for declining…"
              placeholderTextColor={colors.gray[400]}
              value={rejectNote}
              onChangeText={setRejectNote}
              maxLength={500}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectingRental(null)}
                disabled={isRejecting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
          <View style={[styles.modalCard, styles.pickupModalCard]}>
            <Text style={styles.modalTitle}>Confirm Pickup Point</Text>
            <Text style={styles.modalSubtitle}>
              Confirm where the borrower will meet you to pick up the item.
            </Text>

            {/* Safety tip */}
            <View style={styles.safetyBox}>
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
              style={[styles.modalInput, styles.noteInput]}
              placeholder="Pickup note: Gate 2, call upon arrival... (optional, max 200)"
              placeholderTextColor={colors.gray[400]}
              value={pickupNote}
              onChangeText={setPickupNote}
              maxLength={200}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setApprovingRental(null)}
                disabled={isApproving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: 6,
  },
  tabChipActive: {
    backgroundColor: colors.primary[600],
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  tabChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
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
  },
  borrowerSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  borrowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },
  borrowerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[900],
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  phoneLink: {
    paddingVertical: 2,
  },
  phoneText: {
    fontSize: 11,
    color: colors.primary[600],
    fontWeight: '600',
  },
  copyBtn: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray[700],
  },
  dates: {
    fontSize: 12,
    color: colors.gray[700],
    marginBottom: 4,
  },
  earnings: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
  },
  earningsValue: {
    fontWeight: '800',
    color: '#166534',
  },
  noteText: {
    fontSize: 11,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  approveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  activateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  activateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  returnBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#9333ea',
    alignItems: 'center',
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 14,
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
  pickupModalCard: {
    maxWidth: 380,
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
