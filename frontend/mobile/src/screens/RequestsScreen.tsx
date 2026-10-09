/**
 * src/screens/RequestsScreen.tsx (mobile)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { requestsService, BorrowRequest } from '../services/requests.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Requests'>;

export default function RequestsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'borrower' | 'lender'>('borrower');
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await requestsService.getAll(tab);
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleUpdateStatus = async (
    id: string,
    status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
  ) => {
    try {
      await requestsService.updateStatus(id, status);
      fetchRequests();
      Alert.alert('Status Updated', `Request marked as ${status.toLowerCase()}.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update request.');
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { bg: '#dcfce7', text: '#15803d' };
      case 'PENDING':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#b91c1c' };
      case 'COMPLETED':
        return { bg: '#e0e7ff', text: '#3730a3' };
      default:
        return { bg: colors.gray[100], text: colors.gray[600] };
    }
  };

  const renderRequestCard = ({ item }: { item: BorrowRequest }) => {
    const statusStyle = getStatusBadgeStyle(item.status);
    const startDateFormatted = new Date(item.startDate).toLocaleDateString();
    const endDateFormatted = new Date(item.endDate).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemTitle}>{item.item?.title || 'Borrowed Item'}</Text>
          <Text
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, color: statusStyle.text },
            ]}
          >
            {item.status}
          </Text>
        </View>

        <Text style={styles.dateText}>
          📅 {startDateFormatted} → {endDateFormatted}
        </Text>

        <Text style={styles.userText}>
          {tab === 'borrower'
            ? `Lender: ${item.lender?.name || 'Neighbour'}`
            : `Borrower: ${item.borrower?.name || 'Neighbour'}`}
        </Text>

        {item.notes ? (
          <Text style={styles.notesText}>"{item.notes}"</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.totalPrice}>${item.totalCost}</Text>

          {/* Action buttons depending on tab and status */}
          <View style={styles.actionsRow}>
            {tab === 'lender' && item.status === 'PENDING' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleUpdateStatus(item.id, 'ACCEPTED')}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}

            {tab === 'borrower' && item.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleUpdateStatus(item.id, 'CANCELLED')}
              >
                <Text style={styles.rejectBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {item.status === 'ACCEPTED' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.completeBtn]}
                onPress={() => handleUpdateStatus(item.id, 'COMPLETED')}
              >
                <Text style={styles.completeBtnText}>Mark Returned</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Borrow Requests</Text>
        
        {/* Sub-tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'borrower' && styles.tabButtonActive]}
            onPress={() => setTab('borrower')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'borrower' && styles.tabTextActive,
              ]}
            >
              Borrowed by Me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tab === 'lender' && styles.tabButtonActive]}
            onPress={() => setTab('lender')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'lender' && styles.tabTextActive,
              ]}
            >
              Lent by Me
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No requests found</Text>
              <Text style={styles.emptySubtitle}>
                {tab === 'borrower'
                  ? "You haven't requested any items to borrow yet."
                  : "No neighbours have requested your items yet."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gray[900],
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[600],
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.primary[700],
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  dateText: {
    fontSize: 13,
    color: colors.gray[600],
    marginBottom: 4,
  },
  userText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.gray[500],
    marginBottom: 8,
    backgroundColor: colors.gray[50],
    padding: 8,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: 6,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: colors.primary[600],
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#fee2e2',
  },
  rejectBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#e0e7ff',
  },
  completeBtnText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 4,
  },
});
