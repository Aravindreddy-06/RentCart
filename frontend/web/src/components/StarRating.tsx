/**
 * src/components/StarRating.tsx (web)
 * Reusable StarRating component supporting:
 * - Display mode (read-only fractional or integer rating with optional numerical/count labels)
 * - Input mode (interactive 1-5 star selector with hover previews and full keyboard accessibility)
 */

import React, { useState } from 'react';

export interface StarRatingProps {
  /** Mode: 'display' for showing ratings, 'input' for selecting rating */
  mode?: 'display' | 'input';
  /** Rating value (0 to 5) */
  rating?: number;
  /** Value for input mode (1 to 5) */
  value?: number;
  /** Callback when rating changes in input mode */
  onChange?: (rating: number) => void;
  /** Maximum number of stars (defaults to 5) */
  maxStars?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Optional review count to display alongside stars in display mode */
  reviewCount?: number;
  /** Whether to show numeric rating value (e.g., 4.5) in display mode */
  showValue?: boolean;
  /** Disabled state for input mode */
  disabled?: boolean;
  /** Optional custom className */
  className?: string;
}

export function StarRating({
  mode = 'display',
  rating = 0,
  value,
  onChange,
  maxStars = 5,
  size = 'md',
  reviewCount,
  showValue = false,
  disabled = false,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Size styling map
  const sizeClasses = {
    xs: { star: 'w-3 h-3', text: 'text-[11px]' },
    sm: { star: 'w-4 h-4', text: 'text-xs' },
    md: { star: 'w-5 h-5', text: 'text-sm' },
    lg: { star: 'w-7 h-7', text: 'text-base' },
  }[size];

  // If in input mode:
  if (mode === 'input') {
    const currentRating = hoverRating ?? value ?? 0;

    const handleKeyDown = (e: React.KeyboardEvent, starValue: number) => {
      if (disabled || !onChange) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(maxStars, (value ?? 0) + 1);
        onChange(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const prev = Math.max(1, (value ?? 1) - 1);
        onChange(prev);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(starValue);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        if (num <= maxStars) onChange(num);
      }
    };

    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        role="radiogroup"
        aria-label="Rating selector"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= currentRating;
          const isChecked = value === starValue;

          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={isChecked}
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
              disabled={disabled}
              tabIndex={disabled ? -1 : isChecked || (!value && starValue === 1) ? 0 : -1}
              onClick={() => onChange?.(starValue)}
              onMouseEnter={() => !disabled && setHoverRating(starValue)}
              onKeyDown={(e) => handleKeyDown(e, starValue)}
              className={`p-1 rounded-md transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 active:scale-95'
              }`}
            >
              <svg
                className={`${sizeClasses.star} transition-colors ${
                  isFilled ? 'text-amber-400 fill-amber-400' : 'text-neutral-300 fill-neutral-100 hover:text-amber-300'
                }`}
                viewBox="0 0 20 20"
                stroke="currentColor"
                strokeWidth={isFilled ? 0 : 1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </button>
          );
        })}
      </div>
    );
  }

  // Display mode
  const effectiveRating = Math.max(0, Math.min(maxStars, rating));

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const fillPercentage = Math.max(0, Math.min(100, (effectiveRating - i) * 100));

          return (
            <div key={starValue} className={`relative ${sizeClasses.star} flex-shrink-0`}>
              {/* Empty background star */}
              <svg
                className={`${sizeClasses.star} text-neutral-200 dark:text-dark-border fill-neutral-200 dark:fill-dark-border`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              {/* Filled foreground star clipped to fill percentage */}
              {fillPercentage > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercentage}%` }}
                >
                  <svg
                    className={`${sizeClasses.star} text-[#F5B301] fill-[#F5B301]`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Numeric value / review count */}
      {(showValue || reviewCount !== undefined) && (
        <span className={`font-semibold text-neutral-700 dark:text-dark-text ${sizeClasses.text}`}>
          {showValue && <span>{effectiveRating > 0 ? effectiveRating.toFixed(1) : '0.0'}</span>}
          {reviewCount !== undefined && (
            <span className="text-neutral-500 dark:text-dark-muted font-normal ml-1">
              ({reviewCount})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
