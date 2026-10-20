/**
 * src/pages/AddItemPage.tsx (web)
 * Polished Add Item form:
 * - Tinted section cards with dark mode support
 * - Image picker tiles with dashed teal border and plus icon
 * - Category picker with colored category theme chips
 * - Teal input focus states
 * - Gradient primary button
 * - Preserved Zod validation, price bounds, and image upload flow
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { itemsService } from '../services/items.service';
import { CATEGORY_THEMES } from '../utils/colors';
import {
  ArrowLeft,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Zap,
  Utensils,
  Trophy,
  BookOpen,
  Package,
} from 'lucide-react';

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'] as const;

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Tools':
      return <Wrench className="w-4 h-4" />;
    case 'Electronics':
      return <Zap className="w-4 h-4" />;
    case 'Kitchen':
      return <Utensils className="w-4 h-4" />;
    case 'Sports':
      return <Trophy className="w-4 h-4" />;
    case 'Books':
      return <BookOpen className="w-4 h-4" />;
    case 'Other':
    default:
      return <Package className="w-4 h-4" />;
  }
}

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(CATEGORIES, { required_error: 'Please select a category' }),
  pricePerDay: z.coerce.number().positive('Must be a positive number').max(1_000_000, 'Maximum amount is ₹10,00,000'),
  deposit: z.coerce.number().min(0, 'Cannot be negative').max(1_000_000, 'Maximum amount is ₹10,00,000').optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddItemPage() {
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Tools', deposit: 0 },
  });

  const selectedCategory = watch('category');

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const remaining = 5 - imageFiles.length;
    const toAdd = selected.slice(0, remaining);
    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  }, [imageFiles.length]);

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await itemsService.uploadImages(imageFiles);
      }

      const item = await itemsService.create({
        title: data.title,
        description: data.description,
        category: data.category,
        pricePerDay: data.pricePerDay,
        deposit: data.deposit ?? 0,
        images: imageUrls,
      });

      setSuccess(true);
      setTimeout(() => navigate(`/items/${item.id}`), 1500);
    } catch {
      setSubmitError('Failed to publish item. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg transition-colors duration-200 pb-16">
      {/* Header */}
      <header className="bg-white/80 dark:bg-dark-surface/80 border-b border-neutral-200 dark:border-dark-border sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text py-1 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-card transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-neutral-400 dark:text-dark-muted uppercase tracking-wider">
            List an Item
          </span>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 animate-slide-up">
        {success ? (
          <div className="card p-12 text-center animate-fade-in shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-dark-text mb-1">Item Published! 🎉</h2>
            <p className="text-neutral-500 dark:text-dark-muted text-sm font-medium">Redirecting to your listing…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Section 1: Photos with Dashed Teal Border */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-dark-text">Item Photos</h2>
                  <p className="text-xs text-neutral-500 dark:text-dark-muted mt-0.5">Add up to 5 photos of your item</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300">
                  {imageFiles.length}/5
                </span>
              </div>

              {/* Existing preview thumbnails */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-dark-border group shadow-xs">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-opacity text-xs"
                        aria-label="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dashed Teal Image Picker Box */}
              {imageFiles.length < 5 && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary-400/80 dark:border-primary-500/50 bg-primary-50/20 dark:bg-primary-900/10 hover:bg-primary-50/40 rounded-2xl p-6 cursor-pointer transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-sm font-bold text-neutral-800 dark:text-dark-text">
                    Click to upload photos
                  </span>
                  <span className="text-xs text-neutral-400 dark:text-dark-muted mt-0.5 font-medium">
                    JPG, PNG, WebP · Max 5 MB each
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Section 2: Item Details */}
            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-dark-text border-b border-neutral-100 dark:border-dark-border pb-3">
                Item Information
              </h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5" htmlFor="title">
                  Item Title *
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. DeWalt 20V Max Cordless Drill Kit"
                  className={`form-field ${errors.title ? 'form-field-error' : ''}`}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-danger text-xs mt-1.5 font-medium">{errors.title.message}</p>
                )}
              </div>

              {/* Category Chips Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-2">
                  Category *
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const theme = CATEGORY_THEMES[cat];
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setValue('category', cat, { shouldValidate: true })}
                        className="chip"
                        style={
                          isSelected
                            ? {
                                backgroundColor: theme.solidBg,
                                color: theme.solidText,
                                borderColor: theme.solidBg,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              }
                            : {
                                backgroundColor: theme.tintBg,
                                color: theme.tintText,
                                borderColor: theme.borderColor,
                              }
                        }
                      >
                        {getCategoryIcon(cat)}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.category && (
                  <p className="text-danger text-xs mt-1.5 font-medium">{errors.category.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5" htmlFor="description">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the condition, included accessories, guidelines for use, and pickup instructions…"
                  className={`form-field resize-none ${errors.description ? 'form-field-error' : ''}`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-danger text-xs mt-1.5 font-medium">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Section 3: Pricing and Deposit */}
            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-dark-text border-b border-neutral-100 dark:border-dark-border pb-3">
                Pricing & Security
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price per day */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5" htmlFor="pricePerDay">
                    Price per day (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-accent-500 font-extrabold select-none pointer-events-none text-base">
                      ₹
                    </span>
                    <input
                      id="pricePerDay"
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      placeholder="150"
                      className={`form-field pl-8 font-bold ${errors.pricePerDay ? 'form-field-error' : ''}`}
                      {...register('pricePerDay')}
                    />
                  </div>
                  {errors.pricePerDay && (
                    <p className="text-danger text-xs mt-1.5 font-medium">{errors.pricePerDay.message}</p>
                  )}
                </div>

                {/* Deposit */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5" htmlFor="deposit">
                    Deposit (₹) <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary-500 font-extrabold select-none pointer-events-none text-base">
                      ₹
                    </span>
                    <input
                      id="deposit"
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      placeholder="500"
                      className={`form-field pl-8 font-bold ${errors.deposit ? 'form-field-error' : ''}`}
                      {...register('deposit')}
                    />
                  </div>
                  {errors.deposit && (
                    <p className="text-danger text-xs mt-1.5 font-medium">{errors.deposit.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-danger text-xs font-medium">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="publish-btn"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 text-sm font-bold shadow-md hover:shadow-glow"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing Listing…
                </span>
              ) : (
                'Publish Listing'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
