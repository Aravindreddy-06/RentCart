/**
 * src/components/ItemCard.tsx
 * Displays a single item in a card — image, title, price, owner, availability badge.
 * Clicking the card navigates to the item's detail page.
 */

import { useNavigate } from 'react-router-dom';
import type { Item } from '../services/items.service';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate();
  const imageUrl = item.images[0] ?? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';

  return (
    <article
      className="card overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
      onClick={() => navigate(`/items/${item.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/items/${item.id}`)}
      aria-label={`View details for ${item.title}`}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-neutral-100">
        <img
          src={imageUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Availability badge */}
        <div className="absolute top-3 right-3">
          {item.isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-600 text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
              Rented
            </span>
          )}
        </div>
        {/* Distance badge if available */}
        {item.distanceKm != null && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-primary-700 shadow-sm backdrop-blur-sm">
              📍 {item.distanceKm} km away
            </span>
          </div>
        )}
        {/* Category label */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-1">
            {item.title}
          </h3>
          {item.distanceKm != null && (
            <span className="flex-shrink-0 text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-md">
              {item.distanceKm} km
            </span>
          )}
        </div>
        <p className="text-neutral-500 text-xs line-clamp-2 mb-3 leading-relaxed">
          {item.description}
        </p>

        <div className="flex items-center justify-between">
          {/* Price */}
          <div>
            <span className="text-lg font-bold text-primary-600">${item.pricePerDay}</span>
            <span className="text-neutral-400 text-xs font-medium"> / day</span>
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1.5">
            {item.owner.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={item.owner.name}
                className="w-6 h-6 rounded-full object-cover bg-neutral-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 text-xs font-bold">
                  {item.owner.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-neutral-500 text-xs font-medium truncate max-w-[80px]">
              {item.owner.name.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
