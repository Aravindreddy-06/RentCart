/**
 * src/pages/AddItemPage.tsx
 * Add Item form — upload images, fill item details, publish.
 * Route: /items/new (protected)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { itemsService } from '../services/items.service';

// ─── Schema ───────────────────────────────────────────────────────────────────

const CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other'] as const;

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(CATEGORIES, { required_error: 'Please select a category' }),
  pricePerDay: z.coerce.number().positive('Must be a positive number'),
  deposit: z.coerce.number().min(0, 'Cannot be negative').optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Tools', deposit: 0 },
  });

  // ── Image handling ──────────────────────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost p-2"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-neutral-900 text-lg">List an Item</h1>
            <p className="text-neutral-400 text-xs">Share something with your community</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {success ? (
          <div className="card p-10 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-neutral-900 font-bold text-xl mb-1">Item published! 🎉</p>
            <p className="text-neutral-500 text-sm">Redirecting to your item…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Image picker */}
            <div className="card p-5 space-y-3">
              <h2 className="font-semibold text-neutral-800">Photos</h2>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {imageFiles.length < 5 && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl p-6 cursor-pointer hover:border-primary-400 transition-colors">
                  <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <span className="text-sm text-neutral-500 font-medium">
                    Add photos ({imageFiles.length}/5)
                  </span>
                  <span className="text-xs text-neutral-400 mt-0.5">JPG, PNG, WebP · Max 5 MB each</span>
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

            {/* Item details */}
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-neutral-800">Item Details</h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="title">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. DeWalt Cordless Drill 20V"
                  className={`form-field ${errors.title ? 'form-field-error' : ''}`}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="category">
                  Category *
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const catEmoji: Record<string, string> = {
                      Tools: '🔧', Electronics: '📱', Kitchen: '🍳',
                      Sports: '⚽', Books: '📚', Other: '📦',
                    };
                    return (
                      <label key={cat} className="cursor-pointer">
                        <input type="radio" value={cat} {...register('category')} className="sr-only" />
                        <span className={`chip ${errors.category ? 'chip-inactive' : 'chip-inactive'}`}>
                          {catEmoji[cat]} {cat}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {/* Use a visible select as the actual controller for category */}
                <select
                  id="category"
                  className={`form-field mt-2 ${errors.category ? 'form-field-error' : ''}`}
                  {...register('category')}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="description">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the condition, what's included, and pickup rules…"
                  className={`form-field resize-none ${errors.description ? 'form-field-error' : ''}`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="pricePerDay">
                    Price per day ($) *
                  </label>
                  <input
                    id="pricePerDay"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="15.00"
                    className={`form-field ${errors.pricePerDay ? 'form-field-error' : ''}`}
                    {...register('pricePerDay')}
                  />
                  {errors.pricePerDay && (
                    <p className="text-red-500 text-xs mt-1">{errors.pricePerDay.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="deposit">
                    Deposit ($)
                  </label>
                  <input
                    id="deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className={`form-field ${errors.deposit ? 'form-field-error' : ''}`}
                    {...register('deposit')}
                  />
                  {errors.deposit && (
                    <p className="text-red-500 text-xs mt-1">{errors.deposit.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="publish-btn"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing…
                </>
              ) : (
                'Publish Item'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
