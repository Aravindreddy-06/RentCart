/**
 * src/components/RequestBorrowModal.tsx
 * Modal for borrowing an item — date pickers, booked-date conflicts, live cost calculation, and submit.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { rentalsService, type BookedDateRange } from '../services/rentals.service';
import type { Item } from '../services/items.service';
import { formatINR } from '../utils/currency';
import { formatDateDMY } from '../utils/date';

interface RequestBorrowModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestBorrowModal({ item, isOpen, onClose }: RequestBorrowModalProps) {
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

  // Fetch booked dates on mount / open
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    rentalsService
      .getBookedDates(item.id)
      .then((ranges) => {
        if (mounted) setBookedDates(ranges);
      })
      .catch(() => {
        // ignore booked date load failure
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, item.id]);

  // Check overlap with booked dates
  const overlapConflict = useMemo(() => {
    if (!startDate || !endDate) return null;
    for (const b of bookedDates) {
      if (b.startDate <= endDate && b.endDate >= startDate) {
        return b;
      }
    }
    return null;
  }, [startDate, endDate, bookedDates]);

  // Days and total calculation
  const { days, totalPrice } = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) {
      return { days: 0, totalPrice: 0 };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const d = Math.max(1, diff);
    const price = Number((d * item.pricePerDay).toFixed(2));
    return { days: d, totalPrice: price };
  }, [startDate, endDate, item.pricePerDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (startDate < todayStr) {
      setError('Start date cannot be in the past.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }
    if (overlapConflict) {
      setError(
        `Selected dates overlap with an existing booking (${formatDateDMY(overlapConflict.startDate)} to ${formatDateDMY(overlapConflict.endDate)}).`,
      );
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
      setTimeout(() => {
        onClose();
        navigate('/rentals');
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Failed to submit rental request. Please check your dates and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-neutral-100 animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 to-white">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Request to Borrow</h3>
            <p className="text-sm text-neutral-500 mt-0.5">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h4 className="text-xl font-bold text-neutral-900">Request Submitted! 🎉</h4>
            <p className="text-sm text-neutral-600">
              Your request was sent to {item.owner?.name ?? 'the owner'}. Redirecting to your
              rentals…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Booked dates warning banner if any */}
            {bookedDates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-semibold block mb-1">📅 Reserved Dates:</span>
                <div className="flex flex-wrap gap-1.5">
                  {bookedDates.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded font-medium"
                    >
                      {b.startDate} → {b.endDate}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm font-medium"
                />
              </div>
            </div>

            {/* Overlap Error */}
            {overlapConflict && (
              <p className="text-red-600 text-xs font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
                ⚠️ Dates overlap with a confirmed booking ({formatDateDMY(overlapConflict.startDate)} to{' '}
                {formatDateDMY(overlapConflict.endDate)}). Please select different dates.
              </p>
            )}

            {/* Note to Owner */}
            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1.5">
                Note to Owner <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Let the owner know what you'll be using this for, pick up time preferences, etc."
                rows={3}
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm placeholder:text-neutral-400"
              />
              <p className="text-[11px] text-neutral-400 text-right mt-1">
                {note.length}/500 characters
              </p>
            </div>

            {/* Price Summary Calculation Card */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>
                  Rate ({days} {days === 1 ? 'day' : 'days'} × {formatINR(item.pricePerDay)})
                </span>
                <span className="font-semibold text-neutral-900">{formatINR(totalPrice)}</span>
              </div>
              {item.deposit > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Refundable Security Deposit</span>
                  <span className="font-semibold text-neutral-900">
                    {formatINR(item.deposit)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-base text-neutral-900">
                <span>Total Due on Handover</span>
                <span className="text-primary-600">
                  {formatINR(totalPrice + (item.deposit ?? 0))}
                </span>
              </div>
            </div>

            {/* Global Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 font-medium">
                {error}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-outline flex-1 py-3 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(overlapConflict) || days <= 0}
                className="btn-primary flex-1 py-3 text-sm font-semibold shadow-md"
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
