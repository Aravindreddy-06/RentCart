/**
 * src/screens/CreateItemScreen.tsx (mobile)
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { itemsService } from '../services/items.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateItem'>;

const CATEGORIES = [
  'Tools',
  'Electronics',
  'Camping & Outdoor',
  'Gardening',
  'Party & Events',
  'Kitchen',
  'Books',
  'Sports',
  'Other',
];

export default function CreateItemScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tools');
  const [dailyRate, setDailyRate] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !dailyRate || !location) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const rate = parseFloat(dailyRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Validation Error', 'Daily rate must be a valid positive number.');
      return;
    }

    setLoading(true);
    try {
      await itemsService.create({
        title,
        description,
        category,
        pricePerDay: rate,
        images: imageUrl ? [imageUrl] : [],
      });

      Alert.alert('Success! 🎉', 'Your item has been listed for your neighbours.', [
        {
          text: 'View My Items',
          onPress: () => navigation.navigate('MyItems'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to list item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>List an Item</Text>
        <Text style={styles.headerSubtitle}>
          Share tools, gear, or appliances with your neighbourhood
        </Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DeWalt Cordless Drill 20V"
              placeholderTextColor={colors.gray[400]}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    category === cat && styles.catChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      category === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Rate ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="15.00"
              placeholderTextColor={colors.gray[400]}
              keyboardType="decimal-pad"
              value={dailyRate}
              onChangeText={setDailyRate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Neighbourhood / Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Oakwood Heights, Block 4"
              placeholderTextColor={colors.gray[400]}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://images.unsplash.com/photo-..."
              placeholderTextColor={colors.gray[400]}
              value={imageUrl}
              onChangeText={setImageUrl}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe the condition, what's included, pickup rules..."
              placeholderTextColor={colors.gray[400]}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Publish Listing</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
    backgroundColor: '#fff',
  },
  catScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary[600],
  },
  catChipText: {
    fontSize: 13,
    color: colors.gray[700],
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
