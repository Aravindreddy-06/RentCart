/**
 * src/components/ItemCardSkeleton.tsx
 * Pulse skeleton placeholder shown while items are loading.
 */

export function ItemCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton h-44 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-6 w-16" />
          <div className="flex items-center gap-2">
            <div className="skeleton w-6 h-6 rounded-full" />
            <div className="skeleton h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
