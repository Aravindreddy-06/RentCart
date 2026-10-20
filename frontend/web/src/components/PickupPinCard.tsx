/**
 * src/components/PickupPinCard.tsx (web)
 * Borrower Pickup PIN display card for APPROVED rentals.
 * Features:
 * - Brand gradient header
 * - 4 large digit boxes (masked by default with bullets)
 * - Show PIN / Hide PIN toggle with 30-second auto-hide countdown
 * - Copy button with copied feedback
 * - Clear guidance text: "Share this PIN with the owner only when you collect the item"
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Copy, Check, KeyRound, RefreshCw, AlertCircle } from 'lucide-react';
import { rentalsService } from '../services/rentals.service';

interface PickupPinCardProps {
  rentalId: string;
}

export const PickupPinCard: React.FC<PickupPinCardProps> = ({ rentalId }) => {
  const [pin, setPin] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(30);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await rentalsService.getHandoverPin(rentalId);
      setPin(res.pin);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load pickup PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    fetchPin();
  }, [fetchPin]);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const toggleVisibility = () => {
    if (isVisible) {
      clearTimers();
      setIsVisible(false);
    } else {
      setIsVisible(true);
      setSecondsLeft(30);
      clearTimers();

      // Countdown each second
      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-hide after 30 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        clearTimers();
      }, 30000);
    }
  };

  const handleCopy = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const digits = pin ? pin.split('') : ['•', '•', '•', '•'];

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-neutral-200/80 dark:border-dark-border shadow-card overflow-hidden transition-colors">
      {/* Brand Gradient Header */}
      <div className="bg-brand-gradient px-5 py-4 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight leading-tight">Pickup PIN</h3>
            <p className="text-xs text-white/80">Show to owner when taking handover</p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20">
          APPROVED
        </span>
      </div>

      <div className="p-6 text-center space-y-5">
        {loading ? (
          <div className="flex justify-center items-center gap-3 py-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl bg-neutral-100 dark:bg-dark-card animate-pulse border border-neutral-200 dark:border-dark-border"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-danger text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchPin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-dark-card hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-dark-text transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            {/* 4 Digit Boxes */}
            <div className="flex justify-center items-center gap-3 sm:gap-4 py-1">
              {digits.map((digit, index) => (
                <div
                  key={index}
                  className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold font-mono transition-all duration-300 ${
                    isVisible
                      ? 'bg-primary-50/70 dark:bg-primary-950/40 border-2 border-primary-500 text-primary-700 dark:text-primary-300 shadow-glow'
                      : 'bg-neutral-100 dark:bg-dark-card border-2 border-neutral-200 dark:border-dark-border text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {isVisible ? digit : '•'}
                </div>
              ))}
            </div>

            {/* Toggle and Copy Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleVisibility}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isVisible
                    ? 'bg-neutral-100 dark:bg-dark-card text-neutral-700 dark:text-dark-text hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-dark-border'
                    : 'bg-primary-500 hover:bg-primary-600 text-white shadow-glow'
                }`}
              >
                {isVisible ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Hide PIN</span>
                    <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-mono">
                      {secondsLeft}s
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Show PIN</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!pin}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  copied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-dark-surface text-neutral-700 dark:text-dark-text border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-card'
                }`}
                title="Copy PIN"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Helper guidance text */}
            <p className="text-xs text-neutral-500 dark:text-dark-muted font-medium max-w-sm mx-auto leading-relaxed">
              Share this PIN with the owner only when you collect the item.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
