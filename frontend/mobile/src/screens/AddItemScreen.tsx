/**
 * src/screens/AddItemScreen.tsx (mobile)
 * Add Item — image picker, form, validation, upload, and create.
 * Replaces the old CreateItemScreen with full photo support.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { AppStackParamList } from '../navigation/types';
import { itemsService } from '../services/items.service';
import { colors } from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'AddItem'>;

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'] as const;
type Category = (typeof CATEGORIES)[number];

// ── Validation ────────────────────────────────────────────────────────────────

interface FormErrors {
  title?: string;
  description?: string;
  pricePerDay?: string;
}

function validate(title: string, description: string, pricePerDay: string): FormErrors {
  const errors: FormErrors = {};
  if (!title.trim() || title.trim().length < 2) {
    errors.title = 'Title must be at least 2 characters';
  }
  if (!description.trim() || description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  const rate = parseFloat(pricePerDay);
  if (!pricePerDay || isNaN(rate) || rate <= 0) {
    errors.pricePerDay = 'Enter a valid positive price';
  } else if (rate > 1000000) {
    errors.pricePerDay = 'Maximum amount is ₹10,00,000';
  }
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddItemScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Tools');
  const [pricePerDay, setPricePerDay] = useState('');
  const [deposit, setDeposit] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Image picker ────────────────────────────────────────────────────────────

  const pickImages = async () => {
    const remaining = 5 - imageUris.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', 'You can add up to 5 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library in Settings to add photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = result.assets.map((a) => a.uri).slice(0, remaining);
      setImageUris((prev) => [...prev, ...selected]);
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const validationErrors = validate(title, description, pricePerDay);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      let imageUrls: string[] = [];
      if (imageUris.length > 0) {
        imageUrls = await itemsService.uploadImages(imageUris);
      }

      const item = await itemsService.create({
        title: title.trim(),
        description: description.trim(),
        category,
        pricePerDay: parseFloat(pricePerDay),
        deposit: deposit ? parseFloat(deposit) : 0,
        images: imageUrls,
      });

      Alert.alert('Published! 🎉', 'Your item has been listed.', [
        {
          text: 'View Item',
          onPress: () => navigation.replace('ItemDetail', { itemId: item.id }),
        },
      ]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to publish item. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Photos ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({imageUris.length}/5)</Text>

            {imageUris.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoRow}
              >
                {imageUris.map((uri, i) => (
                  <View key={i} style={styles.photoThumbContainer}>
                    <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => removeImage(i)}
                      hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
                    >
                      <Text style={styles.removePhotoBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {imageUris.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                <Text style={styles.addPhotoBtnIcon}>📷</Text>
                <Text style={styles.addPhotoBtnText}>Add Photos</Text>
                <Text style={styles.addPhotoBtnSub}>JPG, PNG, WebP · Max 5 MB each</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Item Details ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item Details</Text>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g. DeWalt Cordless Drill 20V"
                placeholderTextColor={colors.gray[400]}
                value={title}
                onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: undefined })); }}
                returnKeyType="next"
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catScroll}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && styles.catChipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                placeholder="Describe the condition, what's included, and pickup rules…"
                placeholderTextColor={colors.gray[400]}
                value={description}
                onChangeText={(t) => { setDescription(t); setErrors((e) => ({ ...e, description: undefined })); }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            {/* Pricing row */}
            <View style={styles.pricingRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Price per day (₹) *</Text>
                <View style={[styles.currencyInputRow, errors.pricePerDay && styles.inputError]}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.currencyTextInput}
                    placeholder="150"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                    value={pricePerDay}
                    onChangeText={(t) => { setPricePerDay(t); setErrors((e) => ({ ...e, pricePerDay: undefined })); }}
                  />
                </View>
                {errors.pricePerDay && <Text style={styles.errorText}>{errors.pricePerDay}</Text>}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Deposit (₹)</Text>
                <View style={styles.currencyInputRow}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.currencyTextInput}
                    placeholder="500"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                    value={deposit}
                    onChangeText={setDeposit}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Submit ─────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Publish Item</Text>
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
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
  },
  photoRow: {
    marginBottom: 10,
  },
  photoThumbContainer: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.gray[200],
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  addPhotoBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray[300],
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtnIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  addPhotoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: 2,
  },
  addPhotoBtnSub: {
    fontSize: 11,
    color: colors.gray[400],
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.gray[900],
    backgroundColor: '#fff',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[600],
    marginRight: 6,
  },
  currencyTextInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.gray[900],
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    height: 96,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  catScroll: {
    flexDirection: 'row',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  catChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[700],
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pricingRow: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
