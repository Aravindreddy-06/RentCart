/**
 * src/pages/VerifyEmailPage.tsx
 * 6-box OTP verification page for email verification:
 * - Auto-advance, paste support, backspace navigation
 * - Masked email display
 * - 60-second resend countdown with rate limit handling
 * - Friendly error states with attempts left
 * - Auto-login to /home on verification success
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

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

  // Resend cooldown timer
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Focus first input on mount
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
    // Clean to digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
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
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the code.');
      return;
    }
    if (!email) {
      setErrorMessage('Missing email address. Please register or sign in again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setAttemptsLeft(null);

    try {
      await verifyEmail(email, fullCode);
      setSuccessMessage('Email verified successfully! Logging you in…');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 800);
    } catch (err: any) {
      const resp = err.response?.data;
      const msg = resp?.message || 'Verification failed. Please try again.';
      setErrorMessage(msg);
      if (typeof resp?.attemptsLeft === 'number') {
        setAttemptsLeft(resp.attemptsLeft);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await authService.resendOtp({ email, purpose: 'EMAIL_VERIFICATION' });
      setSuccessMessage(res.message || 'A new verification code has been sent.');
      setCooldownSeconds(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const resp = err.response?.data;
      if (err.response?.status === 429 && resp?.retryAfterSeconds) {
        setCooldownSeconds(resp.retryAfterSeconds);
      }
      setErrorMessage(resp?.message || 'Failed to resend code. Please wait a moment.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg mb-4 text-white">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Check your email</h1>
          <p className="text-neutral-500 mt-2 text-sm leading-relaxed">
            We sent a 6-digit verification code to
            {email ? (
              <span className="block font-semibold text-neutral-800 mt-0.5">{maskEmail(email)}</span>
            ) : (
              <span className="block font-semibold text-neutral-800 mt-0.5">your email address</span>
            )}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">{errorMessage}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before this code is invalidated.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 6-box OTP input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center mb-3">
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
                      ? 'border-red-300 bg-red-50/50 text-red-700 focus:border-red-500'
                      : digit
                      ? 'border-primary-500 bg-primary-50/40 text-neutral-900 focus:border-primary-600'
                      : 'border-neutral-200 bg-white text-neutral-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-400 text-center mt-3">Code expires in 10 minutes</p>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => triggerVerify()}
            disabled={isSubmitting || otp.some((d) => !d)}
            className="btn-primary w-full py-3 text-base shadow-sm"
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

          {/* Resend Cooldown Section */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-500 mb-2">Didn't receive the email?</p>
            {cooldownSeconds > 0 ? (
              <p className="text-xs font-medium text-neutral-400">
                Resend code in <span className="text-neutral-700 font-bold">{cooldownSeconds}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
              >
                {isResending ? 'Sending new code…' : 'Resend verification code'}
              </button>
            )}
          </div>
        </div>

        {/* Back to sign in */}
        <p className="text-center mt-6 text-sm text-neutral-500">
          Wrong email address?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
