/**
 * src/components/ItemCard.tsx
 * Displays a single item in a card — image, title, price, owner, availability badge.
 */

import type { Item } from '../services/items.service';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const imageUrl = item.images[0] ?? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';

  return (
    <article className="card overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
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
        {/* Category label */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-1 mb-1">
          {item.title}
        </h3>
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
