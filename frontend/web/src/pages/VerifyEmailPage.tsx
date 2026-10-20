/**
 * src/pages/VerifyEmailPage.tsx (web)
 * Polished 6-box OTP verification page:
 * - Hero illustration with friendly SVG & emojis
 * - Soft tinted gradient background with dark mode support
 * - Active OTP box highlighted with teal border and soft glow
 * - Brand gradient primary button
 * - Preserved OTP auto-advance, paste, countdown, and verification flow
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { CheckCircle2, AlertCircle, RefreshCw, MailCheck } from 'lucide-react';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(3, local.length - 3))}${local.slice(-1)}@${domain}`;
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [email] = useState(emailParam);

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newOtp.every((d) => d !== '')) {
      triggerVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    setErrorMessage('');

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      triggerVerify(pasted);
    }
  };

  const triggerVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await verifyEmail(email, code);
      setSuccessMessage('Email verified successfully! Redirecting…');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1200);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { code?: string; message?: string; attemptsLeft?: number } } })?.response?.data;
      const msg = resp?.message || 'Verification failed. Please check the code and try again.';
      setErrorMessage(msg);
      if (typeof resp?.attemptsLeft === 'number') {
        setAttemptsLeft(resp.attemptsLeft);
      }
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authService.resendOtp({ email, purpose: 'EMAIL_VERIFICATION' });
      setSuccessMessage('A fresh verification code has been sent to your email.');
      setCooldownSeconds(60);
      setAttemptsLeft(null);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (resp?.code === 'RATE_LIMITED') {
        setErrorMessage(resp.message || 'Too many attempts. Please try again later.');
      } else {
        setErrorMessage(resp?.message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F7F4]/60 via-neutral-50 to-white dark:from-dark-bg dark:via-dark-bg dark:to-dark-surface flex items-center justify-center p-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header with Illustration */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-[#12C2A8] shadow-glow flex items-center justify-center text-white">
              <MailCheck className="w-8 h-8" />
            </div>
            <span className="absolute -top-1.5 -right-2 text-base select-none">📬</span>
            <span className="absolute -bottom-1 -left-2 text-sm select-none">🔒</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            Verify your email
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1 text-sm">
            We sent a 6-digit verification code to
            {email ? (
              <span className="block font-semibold text-neutral-800 dark:text-dark-text mt-0.5">
                {maskEmail(email)}
              </span>
            ) : (
              <span className="block font-semibold text-neutral-800 dark:text-dark-text mt-0.5">your email address</span>
            )}
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 shadow-card dark:shadow-card-dark">
          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before this code is invalidated.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 6-box OTP input with active box highlighted in teal */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-dark-muted text-center mb-3">
              Enter 6-Digit Code
            </label>
            <div className="flex justify-between gap-2 sm:gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  disabled={isSubmitting}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none ${
                    errorMessage
                      ? 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/10 text-red-700 dark:text-red-400 focus:border-red-500'
                      : digit
                      ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-500/10 text-neutral-900 dark:text-dark-text focus:border-primary-600 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20'
                      : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-surface text-neutral-900 dark:text-dark-text focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-400 dark:text-dark-muted text-center mt-3 font-medium">Code expires in 10 minutes</p>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => triggerVerify()}
            disabled={isSubmitting || otp.some((d) => !d)}
            className="btn-primary w-full py-3 text-sm font-bold shadow-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : (
              'Verify & Continue'
            )}
          </button>

          {/* Resend OTP */}
          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-dark-border text-center">
            <p className="text-xs text-neutral-500 dark:text-dark-muted mb-2 font-medium">
              Didn't receive the email? Check your spam folder or
            </p>
            {cooldownSeconds > 0 ? (
              <p className="text-xs font-semibold text-neutral-400 dark:text-dark-muted">
                Resend code in <span className="text-primary-600 dark:text-primary-400">{cooldownSeconds}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Sending new code…' : 'Resend verification code'}</span>
              </button>
            )}
          </div>

          {/* Back to sign in */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-xs font-medium text-neutral-500 dark:text-dark-muted hover:text-neutral-900 dark:hover:text-dark-text transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
