/**
 * src/screens/ItemDetailScreen.tsx (mobile)
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { itemsService, Item } from '../services/items.service';
import { requestsService } from '../services/requests.service';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Borrow form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    async function loadItem() {
      try {
        const data = await itemsService.getById(itemId);
        setItem(data);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const in3Days = new Date();
        in3Days.setDate(in3Days.getDate() + 3);

        setStartDate(tomorrow.toISOString().split('T')[0]);
        setEndDate(in3Days.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Failed to load item:', err);
        Alert.alert('Error', 'Could not load item details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [itemId]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const itemPrice = item ? item.pricePerDay ?? item.dailyRate ?? 0 : 0;
  const days = calculateDays();
  const totalCost = itemPrice * days;

  const handleRequestBorrow = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Missing dates', 'Please specify both start and end dates.');
      return;
    }

    setRequestLoading(true);
    try {
      await requestsService.create({
        itemId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes: notes || undefined,
      });

      setModalVisible(false);
      Alert.alert('Request Sent! 🎉', 'Your borrow request has been sent to the owner.', [
        {
          text: 'View My Requests',
          onPress: () => navigation.navigate('Requests'),
        },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Request Failed',
        err.response?.data?.error || 'Failed to send borrow request.'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === item.ownerId;
  const imageUrl =
    item.images && item.images.length > 0 && item.images[0].startsWith('http')
      ? item.images[0]
      : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=600&q=80';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

        <View style={styles.content}>
          <View style={styles.tagRow}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <Text
              style={[
                styles.availabilityBadge,
                {
                  backgroundColor: item.isAvailable ? '#dcfce7' : '#fef3c7',
                  color: item.isAvailable ? '#15803d' : '#b45309',
                },
              ]}
            >
              {item.isAvailable ? 'Available Now' : 'Currently Borrowed'}
            </Text>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>
            ${itemPrice} <Text style={styles.priceUnit}>/ day</Text>
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoVal}>
                {item.locationName || item.location || 'Neighbourhood'}
              </Text>
            </View>
          </View>

          {item.owner && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <View>
                <Text style={styles.infoLabel}>Lender</Text>
                <Text style={styles.infoVal}>{item.owner.name}</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total for 1 day</Text>
          <Text style={styles.bottomPriceVal}>${itemPrice}</Text>
        </View>

        {isOwner ? (
          <TouchableOpacity style={[styles.actionButton, styles.disabledButton]} disabled>
            <Text style={styles.actionButtonText}>Your Listing</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, !item.isAvailable && styles.disabledButton]}
            disabled={!item.isAvailable}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>Request to Borrow</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Borrow Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalItemTitle}>{item.title}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-10-10"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-10-13"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note for Lender (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Let the lender know how/when you'd like to pick it up..."
                multiline
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  ${itemPrice} × {days} day{days > 1 ? 's' : ''}
                </Text>
                <Text style={styles.summaryVal}>${totalCost}</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalVal}>${totalCost}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleRequestBorrow}
              disabled={requestLoading}
            >
              {requestLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Confirm & Send Request</Text>
              )}
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: colors.gray[200],
  },
  content: {
    padding: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  availabilityBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary[600],
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  infoVal: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray[700],
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  bottomPriceVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gray[900],
  },
  actionButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: colors.gray[400],
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  closeIcon: {
    fontSize: 20,
    color: colors.gray[500],
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray[900],
  },
  summaryCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.gray[600],
  },
  summaryVal: {
    fontSize: 13,
    color: colors.gray[900],
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  summaryTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary[600],
  },
  modalSubmitButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
