/**
 * src/components/HandoverVerifyCard.tsx (web)
 * Owner PIN verification card for APPROVED rentals.
 * Features:
 * - 4-box PIN input with auto-advance, backspace navigation, paste support, and numeric filtering
 * - Confirm button with loading state
 * - Wrong-PIN error with attempts left count
 * - 429 lockout countdown timer
 * - Success state ("Handover confirmed, rental is now Active")
 * - "Skip PIN" warning dialog calling activate with confirmWithoutPin: true
 */

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { rentalsService } from '../services/rentals.service';

interface HandoverVerifyCardProps {
  rentalId: string;
  onSuccess: () => void;
  compact?: boolean;
}

export const HandoverVerifyCard: React.FC<HandoverVerifyCardProps> = ({
  rentalId,
  onSuccess,
  compact = false,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Skip PIN dialog
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState('');

  const inputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock countdown handler
  useEffect(() => {
    if (isLocked && lockSecondsLeft > 0) {
      lockTimerRef.current = setInterval(() => {
        setLockSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockTimerRef.current) {
        clearInterval(lockTimerRef.current);
        lockTimerRef.current = null;
      }
    };
  }, [isLocked, lockSecondsLeft]);

  const formatLockTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    if (isLocked || isSubmitting || isSuccess) return;

    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    next[index] = cleaned[cleaned.length - 1]; // take last entered digit
    setDigits(next);
    setError('');

    // Auto-advance
    if (index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isLocked || isSubmitting || isSuccess) return;
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!paste) return;

    const next = ['', '', '', ''];
    for (let i = 0; i < paste.length; i++) {
      next[i] = paste[i];
    }
    setDigits(next);
    setError('');

    if (paste.length === 4) {
      inputRefs[3].current?.focus();
    } else {
      inputRefs[Math.min(3, paste.length)].current?.focus();
    }
  };

  const pinValue = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinValue.length !== 4 || isLocked || isSubmitting || isSuccess) return;

    setIsSubmitting(true);
    setError('');

    try {
      await rentalsService.verifyHandover(rentalId, pinValue);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 429) {
        setIsLocked(true);
        const retryAfter = data?.retryAfterSeconds || 900;
        setLockSecondsLeft(retryAfter);
        setError(data?.message || 'Verification is locked due to too many failed attempts.');
        setDigits(['', '', '', '']);
      } else if (status === 400 && typeof data?.attemptsLeft === 'number') {
        setAttemptsLeft(data.attemptsLeft);
        setError(`Incorrect PIN. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? '' : 's'} remaining.`);
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        setError(data?.message || 'Verification failed. Please check the PIN and try again.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipConfirm = async () => {
    setIsSkipping(true);
    setSkipError('');
    try {
      await rentalsService.activate(rentalId, { confirmWithoutPin: true });
      setShowSkipModal(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setSkipError(err?.response?.data?.message || 'Failed to activate rental.');
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-dark-surface rounded-2xl border border-neutral-200/80 dark:border-dark-border shadow-card overflow-hidden transition-colors ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-dark-text">Confirm Handover</h3>
            <p className="text-[11px] text-neutral-500 dark:text-dark-muted">Enter the 4-digit PIN provided by the borrower</p>
          </div>
        </div>
      </div>

      {isSuccess ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-2 animate-fade-in">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            Handover confirmed, rental is now Active
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Updating agreement status...</p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          {/* 4 Box PIN Input */}
          <div className="flex justify-center items-center gap-2.5 sm:gap-3 py-1">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={isLocked || isSubmitting}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-extrabold font-mono rounded-xl border-2 transition-all outline-none ${
                  isLocked
                    ? 'bg-neutral-100 dark:bg-dark-card border-neutral-200 dark:border-dark-border text-neutral-400 cursor-not-allowed'
                    : digit
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-card text-neutral-900 dark:text-dark-text focus:border-blue-500'
                }`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Error / Lock Messages */}
          {isLocked ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Locked for <strong>{formatLockTime(lockSecondsLeft)}</strong>. Too many incorrect attempts.
              </span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-danger font-semibold flex items-center justify-between">
              <span>⚠️ {error}</span>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <span className="text-[10px] uppercase font-bold text-danger px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40">
                  {attemptsLeft} left
                </span>
              )}
            </div>
          ) : null}

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              type="submit"
              disabled={pinValue.length !== 4 || isLocked || isSubmitting}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
                pinValue.length === 4 && !isLocked && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                  : 'bg-neutral-300 dark:bg-dark-card text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN…</span>
                </>
              ) : (
                <>
                  <span>Confirm Handover</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Skip PIN fallback link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setSkipError('');
                  setShowSkipModal(true);
                }}
                className="text-xs text-neutral-500 dark:text-dark-muted hover:text-neutral-800 dark:hover:text-neutral-200 underline font-semibold transition-colors"
              >
                Skip PIN
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Warning Dialog Modal for Skip PIN */}
      {showSkipModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSkipping) setShowSkipModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 dark:border-dark-border space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-neutral-900 dark:text-dark-text">Skip Handover PIN?</h4>
                <p className="text-xs text-neutral-500 dark:text-dark-muted">Alternative activation</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-dark-muted leading-relaxed">
              <strong>Only skip if the borrower cannot show the PIN.</strong>
            </p>

            <p className="text-[11px] text-neutral-500 dark:text-dark-muted">
              Skipping will directly mark this rental as Active without 4-digit authentication.
            </p>

            {skipError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-danger text-xs font-semibold">
                ⚠️ {skipError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                disabled={isSkipping}
                className="btn-outline flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipConfirm}
                disabled={isSkipping}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSkipping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Skipping…</span>
                  </>
                ) : (
                  <span>Skip & Activate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
