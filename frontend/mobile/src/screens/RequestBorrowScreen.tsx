/**
 * src/screens/RequestBorrowScreen.tsx (mobile)
 * Vibrant request flow:
 * - Date range selection with conflict prevention
 * - Price calculation with INR formatting
 * - Themed cost summary card
 * - Brand gradient submit CTA
 * - Full dark mode support
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { rentalsService, BookedDateRange } from '../services/rentals.service';
import { useTheme } from '../context/ThemeContext';
import { colors, gradients, radius, shadows } from '../utils/colors';
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
  const { isDark, themeColors } = useTheme();

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const handleViewMyRentals = () => {
    setShowSuccessModal(false);
    // Reset back stack to MainTabs with MyRentalsTab active
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'MyRentalsTab',
          },
        },
      ],
    });
  };

  const handleDismiss = () => {
    setShowSuccessModal(false);
    // Return to Item Details and clear RequestBorrow from back stack
    navigation.goBack();
  };

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

      // Close the form & reset loading state
      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsSubmitting(false);
      const msg =
        err?.response?.data?.message ??
        'Failed to submit request. Please check your dates and try again.';
      setError(msg);
    }
  };

  const isDisabled = Boolean(overlapConflict) || isSubmitting || days <= 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100] },
            ]}
          >
            <Ionicons name="close" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              Request to Borrow
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: themeColors.textMuted }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Reserved Dates Warning */}
          {bookedDates.length > 0 && (
            <View
              style={[
                styles.bookedContainer,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
                },
              ]}
            >
              <View style={styles.bookedTitleRow}>
                <Ionicons name="calendar-outline" size={14} color="#d97706" />
                <Text style={styles.bookedTitle}>Reserved Dates for this Item:</Text>
              </View>
              <View style={styles.bookedChips}>
                {bookedDates.map((b, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bookedChip,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef9c3',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fef08a',
                      },
                    ]}
                  >
                    <Text style={styles.bookedChipText}>
                      {b.startDate} → {b.endDate}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date Pickers */}
          <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
            Rental Period
          </Text>
          <View style={styles.dateRow}>
            {/* Start Date */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.dateLabel, { color: themeColors.textMuted }]}>
                Start Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar" size={15} color={colors.primary[500]} />
                <Text style={[styles.dateBtnText, { color: themeColors.text }]}>
                  {startDateStr}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.dateLabel, { color: themeColors.textMuted }]}>
                End Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar" size={15} color={colors.primary[500]} />
                <Text style={[styles.dateBtnText, { color: themeColors.text }]}>
                  {endDateStr}
                </Text>
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
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? 'rgba(229, 72, 77, 0.15)' : '#fee2e2',
                  borderColor: isDark ? 'rgba(229, 72, 77, 0.3)' : '#fca5a5',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>
                Dates overlap with an existing booking ({overlapConflict.startDate} to{' '}
                {overlapConflict.endDate}). Please select other dates.
              </Text>
            </View>
          )}

          {/* Note to Owner */}
          <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
            Note to {ownerName} (optional)
          </Text>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            multiline
            numberOfLines={4}
            placeholder="Let the owner know your pickup time preferences or what you'll be using it for…"
            placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: themeColors.textMuted }]}>
            {note.length}/500
          </Text>

          {/* Summary Box */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: themeColors.text }]}>
              Estimated Cost Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>
                Daily Rate ({days} {days === 1 ? 'day' : 'days'} × {formatINR(pricePerDay)})
              </Text>
              <Text style={[styles.summaryValue, { color: themeColors.text }]}>
                {formatINR(totalPrice)}
              </Text>
            </View>

            {deposit > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>
                  Refundable Security Deposit
                </Text>
                <Text style={[styles.summaryValue, { color: themeColors.text }]}>
                  {formatINR(deposit)}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.summaryRow,
                styles.summaryTotalRow,
                { borderTopColor: themeColors.border },
              ]}
            >
              <Text style={[styles.totalLabel, { color: themeColors.text }]}>
                Total Due on Handover
              </Text>
              <Text style={styles.totalValue}>{formatINR(totalPrice + deposit)}</Text>
            </View>
          </View>

          {/* Global error */}
          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? 'rgba(229, 72, 77, 0.15)' : '#fee2e2',
                  borderColor: isDark ? 'rgba(229, 72, 77, 0.3)' : '#fca5a5',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            disabled={isDisabled}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {!isDisabled ? (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Borrow Request</Text>
                )}
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.submitBtn,
                  { backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[300] },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: isDark ? colors.dark.textMuted : colors.neutral[500] },
                    ]}
                  >
                    Send Borrow Request
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Themed Success Dialog Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)' },
          ]}
          activeOpacity={1}
          onPress={handleDismiss}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.dialogCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            {/* Top Close Icon Button */}
            <TouchableOpacity
              onPress={handleDismiss}
              style={[
                styles.dialogCloseBtn,
                { backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100] },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={themeColors.text} />
            </TouchableOpacity>

            {/* Success Icon Badge */}
            <View
              style={[
                styles.dialogIconBadge,
                {
                  backgroundColor: isDark ? 'rgba(15, 157, 138, 0.2)' : colors.primary[50],
                  borderColor: isDark ? 'rgba(15, 157, 138, 0.4)' : colors.primary[200],
                },
              ]}
            >
              <Ionicons name="paper-plane" size={32} color={colors.primary[500]} />
            </View>

            {/* Title */}
            <Text style={[styles.dialogTitle, { color: themeColors.text }]}>
              Request Sent! 🎉
            </Text>

            {/* Description */}
            <Text style={[styles.dialogMessage, { color: themeColors.textMuted }]}>
              Your request has been sent to{' '}
              <Text style={{ fontWeight: '700', color: themeColors.text }}>{ownerName}</Text>.
              You can track approval status and coordinate handover under My Rentals.
            </Text>

            {/* Action Buttons */}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogPrimaryBtnWrapper}
                onPress={handleViewMyRentals}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={gradients.brand as unknown as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.dialogPrimaryBtn}
                >
                  <Ionicons name="receipt-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.dialogPrimaryBtnText}>View My Rentals</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogSecondaryBtn,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[100],
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Text style={[styles.dialogSecondaryBtnText, { color: themeColors.text }]}>
                  Back to Item Details
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  bookedContainer: {
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 20,
    borderWidth: 1,
  },
  bookedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bookedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  bookedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bookedChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  bookedChipText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
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
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
    height: 100,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent[500],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    ...shadows.lg,
  },
  dialogCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dialogIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  dialogActions: {
    width: '100%',
    gap: 10,
  },
  dialogPrimaryBtnWrapper: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  dialogPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dialogPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  dialogSecondaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dialogSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
