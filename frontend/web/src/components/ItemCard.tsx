/**
 * src/components/ItemCard.tsx (web)
 * Displays a single item in a marketplace card:
 * - Image with subtle bottom gradient overlay
 * - Category badge with category color pair
 * - Availability badge (green Available / grey Unavailable)
 * - Price pill in accent orange with /day caption
 * - Distance chip
 * - Consistent avatar initials & color
 * - Subtle hover lift animation and dark mode styling
 */

import { useNavigate } from 'react-router-dom';
import type { Item } from '../services/items.service';
import { StarRating } from './StarRating';
import { formatINR } from '../utils/currency';
import { CATEGORY_THEMES, type CategoryKey, getAvatarColor, getInitials } from '../utils/colors';
import { MapPin } from 'lucide-react';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate();
  const imageUrl = item.images[0] ?? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
  const categoryTheme = CATEGORY_THEMES[item.category as CategoryKey] ?? CATEGORY_THEMES.Other;
  const avatarColor = getAvatarColor(item.owner?.name);
  const initials = getInitials(item.owner?.name);

  return (
    <article
      className="card card-hoverable overflow-hidden group flex flex-col h-full"
      onClick={() => navigate(`/items/${item.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/items/${item.id}`)}
      aria-label={`View details for ${item.title}`}
    >
      {/* Image Container with Gradient Overlay */}
      <div className="relative h-48 overflow-hidden bg-neutral-100 dark:bg-dark-card flex-shrink-0">
        <img
          src={imageUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Bottom subtle gradient overlay for badge readability */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

        {/* Availability badge */}
        <div className="absolute top-3 right-3 z-10">
          {item.isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success text-white shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-600/90 text-white shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
              Unavailable
            </span>
          )}
        </div>

        {/* Distance chip if available */}
        {item.distanceKm != null && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-dark-surface/95 text-neutral-800 dark:text-dark-text shadow-sm backdrop-blur-sm border border-black/5 dark:border-white/10">
              <MapPin className="w-3 h-3 text-primary-500" />
              {item.distanceKm} km
            </span>
          </div>
        )}

        {/* Category badge with category-specific colors */}
        <div className="absolute bottom-3 left-3 z-10">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm border backdrop-blur-md"
            style={{
              backgroundColor: categoryTheme.tintBg,
              color: categoryTheme.tintText,
              borderColor: categoryTheme.borderColor,
            }}
          >
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-neutral-900 dark:text-dark-text text-base leading-snug line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {item.title}
            </h3>
          </div>

          {/* Rating */}
          {Boolean(item.reviewCount && item.reviewCount > 0) ? (
            <div className="mb-2">
              <StarRating
                rating={item.averageRating}
                reviewCount={item.reviewCount}
                showValue
                size="xs"
              />
            </div>
          ) : (
            <div className="text-xs text-neutral-400 dark:text-dark-muted mb-2 font-medium">
              New listing
            </div>
          )}

          <p className="text-neutral-500 dark:text-dark-muted text-xs line-clamp-2 mb-3 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Bottom row: Orange Price Pill + Owner Avatar */}
        <div className="pt-2 border-t border-neutral-100 dark:border-dark-border flex items-center justify-between mt-auto">
          {/* Price pill in accent orange */}
          <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-accent-500/10 border border-orange-200/80 dark:border-accent-500/20">
            <span className="text-sm font-bold text-accent-600 dark:text-accent-400">
              {formatINR(item.pricePerDay)}
            </span>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-dark-muted">
              /day
            </span>
          </div>

          {/* Owner Avatar & Name */}
          <div className="flex items-center gap-2">
            {item.owner.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={item.owner.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
            )}
            <span className="text-neutral-600 dark:text-dark-muted text-xs font-medium truncate max-w-[85px]">
              {item.owner.name.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
