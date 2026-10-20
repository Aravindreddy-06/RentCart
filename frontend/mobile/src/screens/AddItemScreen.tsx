/**
 * src/screens/AddItemScreen.tsx (mobile)
 * Vibrant, modern item creation flow:
 * - Tinted section cards
 * - Image picker tiles with dashed teal border and plus icon
 * - Category chips with themed icons and colors
 * - Active focus states with teal glow
 * - Brand gradient publish button
 * - Full dark mode support via useTheme
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation/types';
import { itemsService } from '../services/items.service';
import { useTheme } from '../context/ThemeContext';
import {
  colors,
  gradients,
  radius,
  shadows,
  CATEGORY_THEMES,
  CategoryKey,
} from '../utils/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'AddItem'>;

const CATEGORIES: CategoryKey[] = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'];

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

export default function AddItemScreen({ navigation }: Props) {
  const { isDark, themeColors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey>('Tools');
  const [pricePerDay, setPricePerDay] = useState('');
  const [deposit, setDeposit] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [focusedField, setFocusedField] = useState<string | null>(null);

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
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to publish item. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['bottom']}
    >
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
          {/* ── Photos Section ─────────────────────────────────────────────── */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="images" size={16} color={colors.primary[500]} />
              </View>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Photos ({imageUris.length}/5)
              </Text>
            </View>

            <View style={styles.photoGrid}>
              {imageUris.map((uri, i) => (
                <View key={i} style={styles.photoThumbContainer}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removeImage(i)}
                    hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  >
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}

              {imageUris.length < 5 && (
                <TouchableOpacity
                  style={[
                    styles.addPhotoTile,
                    {
                      borderColor: colors.primary[500],
                      backgroundColor: isDark
                        ? 'rgba(15, 157, 138, 0.12)'
                        : colors.primary[50],
                    },
                  ]}
                  onPress={pickImages}
                  activeOpacity={0.8}
                >
                  <View style={styles.plusCircle}>
                    <Ionicons name="add" size={22} color="#ffffff" />
                  </View>
                  <Text style={[styles.addPhotoTileText, { color: colors.primary[600] }]}>
                    Add Photo
                  </Text>
                  <Text
                    style={[styles.addPhotoTileSub, { color: themeColors.textMuted }]}
                  >
                    Up to 5 MB
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Item Details Section ───────────────────────────────────────── */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="create" size={16} color={colors.primary[500]} />
              </View>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Item Details
              </Text>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Title *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor:
                      focusedField === 'title'
                        ? colors.primary[500]
                        : errors.title
                        ? colors.danger
                        : themeColors.border,
                    color: themeColors.text,
                  },
                  focusedField === 'title' && styles.inputFocused,
                ]}
                placeholder="e.g. DeWalt Cordless Drill 20V"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                value={title}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => {
                  setTitle(t);
                  setErrors((e) => ({ ...e, title: undefined }));
                }}
                returnKeyType="next"
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Category selection chips with icons */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catScroll}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat;
                  const theme = CATEGORY_THEMES[cat];

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isActive
                            ? theme.primary
                            : isDark
                            ? theme.darkTint
                            : theme.tint,
                          borderColor: isActive
                            ? theme.primary
                            : isDark
                            ? theme.darkBorder
                            : theme.border,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={theme.ioniconName}
                        size={14}
                        color={isActive ? '#ffffff' : theme.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.catChipText,
                          {
                            color: isActive ? '#ffffff' : theme.primary,
                            fontWeight: isActive ? '700' : '600',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                Description *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                    borderColor:
                      focusedField === 'desc'
                        ? colors.primary[500]
                        : errors.description
                        ? colors.danger
                        : themeColors.border,
                    color: themeColors.text,
                  },
                  focusedField === 'desc' && styles.inputFocused,
                ]}
                placeholder="Describe the item condition, what accessories are included, and rules for borrowing…"
                placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                value={description}
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(t) => {
                  setDescription(t);
                  setErrors((e) => ({ ...e, description: undefined }));
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Pricing row */}
            <View style={styles.pricingRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  Price per day (₹) *
                </Text>
                <View
                  style={[
                    styles.currencyInputRow,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                      borderColor:
                        focusedField === 'price'
                          ? colors.primary[500]
                          : errors.pricePerDay
                          ? colors.danger
                          : themeColors.border,
                    },
                    focusedField === 'price' && styles.inputFocused,
                  ]}
                >
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={[styles.currencyTextInput, { color: themeColors.text }]}
                    placeholder="150"
                    placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                    keyboardType="numeric"
                    value={pricePerDay}
                    onFocus={() => setFocusedField('price')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(t) => {
                      setPricePerDay(t);
                      setErrors((e) => ({ ...e, pricePerDay: undefined }));
                    }}
                  />
                </View>
                {errors.pricePerDay && (
                  <Text style={styles.errorText}>{errors.pricePerDay}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                  Deposit (₹)
                </Text>
                <View
                  style={[
                    styles.currencyInputRow,
                    {
                      backgroundColor: isDark ? colors.dark.surfaceHover : colors.neutral[50],
                      borderColor:
                        focusedField === 'deposit'
                          ? colors.primary[500]
                          : themeColors.border,
                    },
                    focusedField === 'deposit' && styles.inputFocused,
                  ]}
                >
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={[styles.currencyTextInput, { color: themeColors.text }]}
                    placeholder="500"
                    placeholderTextColor={isDark ? colors.dark.textMuted : colors.neutral[400]}
                    keyboardType="numeric"
                    value={deposit}
                    onFocus={() => setFocusedField('deposit')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setDeposit}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Submit Button with Brand Gradient ─────────────────────────── */}
          <TouchableOpacity
            disabled={loading}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={gradients.brand as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.submitButtonInner}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Publish Item</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionCard: {
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 157, 138, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoThumbContainer: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addPhotoTileText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addPhotoTileSub: {
    fontSize: 9,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.primary[500],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  catScroll: {
    marginBottom: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
  },
  pricingRow: {
    flexDirection: 'row',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent[500],
    marginRight: 6,
  },
  currencyTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 0,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
