/**
 * src/pages/ItemDetailPage.tsx
 * Item Details — image gallery, info, owner card, and owner/borrower actions.
 * Route: /items/:id (protected)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemsService, type Item } from '../services/items.service';
import { RequestBorrowModal } from '../components/RequestBorrowModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop';

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await itemsService.getById(id);
      setItem(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError('Item not found.');
      } else if (status === 401) {
        navigate('/login', { replace: true });
      } else {
        setError('Failed to load item. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      await itemsService.delete(item.id);
      navigate('/home', { replace: true });
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setError('Failed to delete item.');
    }
  };

  const handleToggleAvailability = async () => {
    if (!item) return;
    setIsTogglingAvailability(true);
    try {
      const updated = await itemsService.toggleAvailability(item.id, !item.isAvailable);
      setItem(updated);
    } catch {
      setError('Failed to update availability.');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !item) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-neutral-700 font-semibold">{error || 'Something went wrong'}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="btn-outline">Go back</button>
          <button onClick={fetchItem} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === item.ownerId;
  const images = item.images.length > 0 ? item.images : [PLACEHOLDER];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost p-2"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="font-bold text-neutral-900 text-lg truncate flex-1">{item.title}</h1>
          {isOwner && (
            <button
              onClick={() => navigate(`/items/${item.id}/edit`)}
              className="btn-ghost text-sm"
            >
              Edit
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Image Gallery */}
        <div className="card overflow-hidden">
          <div className="relative bg-neutral-100 aspect-[4/3] sm:aspect-video">
            <img
              key={activeImage}
              src={images[activeImage]}
              alt={item.title}
              className="w-full h-full object-cover animate-fade-in"
            />
            {/* Availability badge */}
            <div className="absolute top-3 right-3">
              {item.isAvailable ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-neutral-600 text-white shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                  Unavailable
                </span>
              )}
            </div>
            {/* Prev/Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((p) => (p - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveImage((p) => (p + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImage ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title, category, pricing */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                  {item.category}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">{item.title}</h2>
            </div>
          </div>

          <div className="flex items-end gap-3 mb-4">
            <div>
              <span className="text-3xl font-extrabold text-primary-600">{formatPrice(item.pricePerDay)}</span>
              <span className="text-neutral-400 text-sm font-medium ml-1">/ day</span>
            </div>
            {item.deposit > 0 && (
              <span className="text-neutral-500 text-sm pb-1">+ {formatPrice(item.deposit)} deposit</span>
            )}
          </div>

          <p className="text-neutral-600 leading-relaxed">{item.description}</p>
        </div>

        {/* Owner card */}
        <div
          onClick={() => navigate(`/users/${item.owner.id}`)}
          className="card p-5 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all group"
          role="button"
          tabIndex={0}
          title="View public profile"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Owner</h3>
            <span className="text-xs font-semibold text-primary-600 group-hover:underline flex items-center gap-1">
              View Profile →
            </span>
          </div>
          <div className="flex items-center gap-3">
            {item.owner.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={item.owner.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-neutral-100 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-primary-700 font-bold text-lg">
                  {item.owner.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                {item.owner.name}
              </p>
              {item.owner.address && (
                <p className="text-neutral-500 text-sm flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {item.owner.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner ? (
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Manage Listing</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/items/${item.id}/edit`)}
                className="btn-outline flex-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleToggleAvailability}
                disabled={isTogglingAvailability}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 ${
                  item.isAvailable
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {isTogglingAvailability ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : item.isAvailable ? (
                  'Mark Unavailable'
                ) : (
                  'Mark Available'
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ) : (
          /* Borrower action */
          <div className="card p-5">
            {item.isAvailable ? (
              <button
                id="request-borrow-btn"
                onClick={() => setIsBorrowModalOpen(true)}
                className="btn-primary w-full py-3.5 text-base font-semibold shadow-md hover:shadow-lg"
              >
                🤝 Request to Borrow
              </button>
            ) : (
              <div className="text-center py-2">
                <p className="text-neutral-500 font-medium text-sm">
                  This item is currently marked unavailable by the owner.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Request to Borrow modal */}
      {item && (
        <RequestBorrowModal
          item={item}
          isOpen={isBorrowModalOpen}
          onClose={() => setIsBorrowModalOpen(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-neutral-900 font-bold text-center mb-1">Delete item?</h3>
            <p className="text-neutral-500 text-sm text-center mb-5">
              This will permanently delete <strong>{item.title}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all duration-200"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
