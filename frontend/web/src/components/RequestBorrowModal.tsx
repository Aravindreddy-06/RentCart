/**
 * src/components/RequestBorrowModal.tsx (web)
 * Modal for borrowing an item:
 * - Date pickers with conflict calculation
 * - Live cost summary with ₹ formatting
 * - Brand gradient action button
 * - Complete dark mode support
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { rentalsService, type BookedDateRange } from '../services/rentals.service';
import type { Item } from '../services/items.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';
import { X, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RequestBorrowModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestBorrowModal({ item, isOpen, onClose, onSuccess }: RequestBorrowModalProps) {
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(tomorrowStr);
  const [note, setNote] = useState('');
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    rentalsService
      .getBookedDates(item.id)
      .then((ranges) => {
        if (mounted) setBookedDates(ranges);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isOpen, item.id]);

  const overlapConflict = useMemo(() => {
    if (!startDate || !endDate) return null;
    for (const b of bookedDates) {
      if (b.startDate <= endDate && b.endDate >= startDate) {
        return b;
      }
    }
    return null;
  }, [bookedDates, startDate, endDate]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [startDate, endDate]);

  const totalPrice = days * item.pricePerDay;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double taps immediately

    setError('');

    if (days <= 0) {
      setError('End date must be after start date.');
      return;
    }

    if (overlapConflict) {
      setError('The selected dates overlap with an existing booking.');
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalsService.create({
        itemId: item.id,
        startDate,
        endDate,
        borrowerNote: note.trim() || undefined,
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
        navigate('/rentals');
      }, 1500);
    } catch (err: any) {
      const res = err?.response?.data;
      if (err?.response?.status === 409 || res?.code === 'DUPLICATE_REQUEST') {
        setError(res?.message || 'You already have an active request for this item.');
      } else if (err?.response?.status === 429 || res?.code === 'REQUEST_COOLDOWN') {
        const canRequestAtStr = res?.canRequestAt
          ? new Date(res.canRequestAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        const retryAfter = res?.retryAfterSeconds;
        const waitMsg = retryAfter
          ? ` Please retry in ${Math.ceil(retryAfter / 60)} minutes${canRequestAtStr ? ` (around ${canRequestAtStr})` : ''}.`
          : '';
        setError((res?.message || 'Rental request is currently in cooldown.') + waitMsg);
      } else {
        const msg =
          res?.message ??
          'Failed to submit rental request. Please try again.';
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-neutral-200 dark:border-dark-border animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-primary-50/60 to-white dark:from-dark-card/50 dark:to-dark-surface">
          <div>
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">Request to Borrow</h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-muted mt-0.5 font-medium">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-dark-card flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-dark-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-xl font-bold text-neutral-900 dark:text-dark-text">Request Submitted! 🎉</h4>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-dark-muted">
              Your request was sent to {item.owner?.name ?? 'the owner'}. Redirecting to your rentals…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Booked dates warning banner */}
            {bookedDates.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-300">
                <span className="font-bold flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Reserved Dates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bookedDates.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 rounded-md font-medium text-[11px]"
                    >
                      {formatDateDMY(b.startDate)} → {formatDateDMY(b.endDate)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="form-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="form-field"
                />
              </div>
            </div>

            {/* Overlap Error */}
            {overlapConflict && (
              <p className="text-danger text-xs font-semibold bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-200 dark:border-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Dates overlap with a confirmed booking ({formatDateDMY(overlapConflict.startDate)} to{' '}
                  {formatDateDMY(overlapConflict.endDate)}).
                </span>
              </p>
            )}

            {/* Note to Owner */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Note to Owner <span className="text-neutral-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Let the owner know what you'll be using this for, pick up time preferences, etc."
                rows={3}
                maxLength={500}
                className="form-field resize-none"
              />
              <p className="text-[11px] text-neutral-400 dark:text-dark-muted text-right mt-1 font-medium">
                {note.length}/500 characters
              </p>
            </div>

            {/* Price Summary Calculation Card */}
            <div className="bg-neutral-50 dark:bg-dark-card/60 rounded-2xl p-4 border border-neutral-200/80 dark:border-dark-border space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-neutral-600 dark:text-dark-muted">
                <span>
                  Rate ({days} {days === 1 ? 'day' : 'days'} × {formatINR(item.pricePerDay)})
                </span>
                <span className="font-bold text-neutral-900 dark:text-dark-text">{formatINR(totalPrice)}</span>
              </div>
              {item.deposit > 0 && (
                <div className="flex justify-between text-neutral-600 dark:text-dark-muted">
                  <span>Refundable Security Deposit</span>
                  <span className="font-bold text-neutral-900 dark:text-dark-text">
                    {formatINR(item.deposit)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-neutral-200 dark:border-dark-border flex justify-between font-extrabold text-sm sm:text-base text-neutral-900 dark:text-dark-text">
                <span>Total Due on Handover</span>
                <span className="text-accent-600 dark:text-accent-400">
                  {formatINR(totalPrice + (item.deposit ?? 0))}
                </span>
              </div>
            </div>

            {/* Global Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-danger text-xs border border-red-200 dark:border-red-500/30 font-medium">
                {error}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-outline flex-1 py-3 text-xs sm:text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(overlapConflict) || days <= 0}
                className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-md"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
