/**
 * src/screens/RequestBorrowScreen.tsx (mobile)
 * Request to Borrow — date range selection with conflict prevention,
 * price calculation, optional note, and submit request.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, BookedDateRange } from '../services/rentals.service';
import { colors } from '../utils/colors';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'RequestBorrow'>;

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RequestBorrowScreen({ route, navigation }: Props) {
  const { itemId, title, pricePerDay, deposit, ownerName } = route.params;

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);

  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(tomorrow);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [note, setNote] = useState('');
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const startDateStr = formatDateStr(startDate);
  const endDateStr = formatDateStr(endDate);

  // Load reserved dates
  useEffect(() => {
    let mounted = true;
    rentalsService
      .getBookedDates(itemId)
      .then((ranges) => {
        if (mounted) setBookedDates(ranges);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [itemId]);

  // Conflict detection
  const overlapConflict = useMemo(() => {
    for (const b of bookedDates) {
      if (b.startDate <= endDateStr && b.endDate >= startDateStr) {
        return b;
      }
    }
    return null;
  }, [bookedDates, startDateStr, endDateStr]);

  // Pricing calculation
  const { days, totalPrice } = useMemo(() => {
    if (endDate < startDate) return { days: 0, totalPrice: 0 };
    const diff =
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const d = Math.max(1, diff);
    return { days: d, totalPrice: Number((d * pricePerDay).toFixed(2)) };
  }, [startDate, endDate, pricePerDay]);

  const handleSubmit = async () => {
    setError('');
    const todayStr = formatDateStr(today);
    if (startDateStr < todayStr) {
      setError('Start date cannot be in the past');
      return;
    }
    if (endDateStr < startDateStr) {
      setError('End date must be on or after start date');
      return;
    }
    if (overlapConflict) {
      setError(
        `Selected dates overlap with an existing booking (${formatDateDMY(overlapConflict.startDate)} to ${formatDateDMY(overlapConflict.endDate)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalsService.create({
        itemId,
        startDate: startDateStr,
        endDate: endDateStr,
        borrowerNote: note.trim() || undefined,
      });

      Alert.alert(
        'Request Sent! 🎉',
        `Your request has been sent to ${ownerName}. You can track it under My Rentals.`,
        [
          {
            text: 'View My Rentals',
            onPress: () => {
              navigation.navigate('MainTabs');
            },
          },
        ],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Failed to submit request. Please check your dates and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Request to Borrow</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Reserved Dates Warning */}
          {bookedDates.length > 0 && (
            <View style={styles.bookedContainer}>
              <Text style={styles.bookedTitle}>📅 Reserved Dates for this Item:</Text>
              <View style={styles.bookedChips}>
                {bookedDates.map((b, i) => (
                  <View key={i} style={styles.bookedChip}>
                    <Text style={styles.bookedChipText}>
                      {b.startDate} → {b.endDate}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date Pickers */}
          <Text style={styles.sectionTitle}>Rental Period</Text>
          <View style={styles.dateRow}>
            {/* Start Date */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateBtnText}>📅 {startDateStr}</Text>
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateBtnText}>📅 {endDateStr}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={today}
              onChange={(_, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) {
                  setStartDate(date);
                  if (date > endDate) setEndDate(date);
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={startDate}
              onChange={(_, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (date) setEndDate(date);
              }}
            />
          )}

          {/* Conflict Error */}
          {overlapConflict && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                ⚠️ Dates overlap with an existing booking ({overlapConflict.startDate} to{' '}
                {overlapConflict.endDate}). Please select other dates.
              </Text>
            </View>
          )}

          {/* Note to Owner */}
          <Text style={styles.sectionTitle}>Note to {ownerName} (optional)</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            numberOfLines={4}
            placeholder="Let the owner know your pickup time preferences or what you'll be using it for…"
            placeholderTextColor={colors.gray[400]}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          <Text style={styles.charCount}>{note.length}/500</Text>

          {/* Summary Box */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Estimated Cost Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Daily Rate ({days} {days === 1 ? 'day' : 'days'} × {formatINR(pricePerDay)})
              </Text>
              <Text style={styles.summaryValue}>{formatINR(totalPrice)}</Text>
            </View>

            {deposit > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Refundable Security Deposit</Text>
                <Text style={styles.summaryValue}>{formatINR(deposit)}</Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.totalLabel}>Total Due on Handover</Text>
              <Text style={styles.totalValue}>{formatINR(totalPrice + deposit)}</Text>
            </View>
          </View>

          {/* Global error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (Boolean(overlapConflict) || isSubmitting || days <= 0) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={Boolean(overlapConflict) || isSubmitting || days <= 0}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Send Borrow Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: colors.gray[700],
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  bookedContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bookedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  bookedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bookedChip: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  bookedChipText: {
    fontSize: 11,
    color: '#854d0e',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: 6,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.gray[50],
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
    height: 100,
  },
  charCount: {
    fontSize: 11,
    color: colors.gray[400],
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[900],
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gray[900],
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
