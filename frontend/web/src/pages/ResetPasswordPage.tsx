/**
 * src/pages/ResetPasswordPage.tsx (web)
 * Polished reset password screen:
 * - Hero illustration made from simple SVG & emojis
 * - Soft tinted gradient background with dark mode support
 * - Icons inside inputs (Mail, Lock)
 * - Teal active OTP box highlight with soft glow
 * - Brand gradient primary button
 * - Preserved reset password logic, cooldown, and navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { Mail, Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, Check, RefreshCw } from 'lucide-react';

const resetSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialEmail = searchParams.get('email') || (location.state as any)?.email || '';
  const initialInfoMessage = (location.state as any)?.infoMessage || '';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [apiError, setApiError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState(initialInfoMessage);

  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: initialEmail },
  });

  const passwordValue = watch('newPassword') || '';
  const emailValue = watch('email') || initialEmail;

  const hasMinLength = passwordValue.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);

  useEffect(() => {
    if (initialEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [initialEmail]);

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
    setApiError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
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
    setApiError('');

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const onSubmit = async (data: ResetFormData) => {
    const code = otp.join('');
    if (code.length !== 6) {
      setApiError('Please enter the full 6-digit verification code.');
      return;
    }

    setApiError('');
    try {
      await authService.resetPassword({
        email: data.email,
        otp: code,
        newPassword: data.newPassword,
      });

      navigate('/login', {
        state: {
          message: 'Password reset successful! You can now log in with your new password.',
        },
      });
    } catch (err: any) {
      const resp = err.response?.data;
      setApiError(resp?.message || 'Failed to reset password. Please check your code and try again.');
      if (typeof resp?.attemptsLeft === 'number') {
        setAttemptsLeft(resp.attemptsLeft);
      }
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending || !emailValue) return;

    setIsResending(true);
    setApiError('');
    try {
      const res = await authService.resendOtp({
        email: emailValue,
        purpose: 'PASSWORD_RESET',
      });
      setInfoMessage(res.message || 'A new reset code has been sent.');
      setCooldownSeconds(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const resp = err.response?.data;
      if (err.response?.status === 429 && resp?.retryAfterSeconds) {
        setCooldownSeconds(resp.retryAfterSeconds);
      }
      setApiError(resp?.message || 'Failed to resend code. Please try again later.');
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
              <KeyRound className="w-8 h-8" />
            </div>
            <span className="absolute -top-1.5 -right-2 text-base select-none">✨</span>
            <span className="absolute -bottom-1 -left-2 text-sm select-none">🛡️</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            Set new password
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1 text-sm max-w-xs mx-auto">
            Enter the 6-digit code sent to your email along with your new password.
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 shadow-card dark:shadow-card-dark">
          {/* Info notification */}
          {infoMessage && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 text-primary-800 dark:text-primary-300 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {apiError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{apiError}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`form-field pl-10 ${errors.email ? 'form-field-error' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* 6-box OTP input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                6-digit reset code
              </label>
              <div className="flex justify-between gap-2 sm:gap-2.5">
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
                    className={`w-11 h-13 sm:w-13 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${
                      apiError
                        ? 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/10 text-red-700 dark:text-red-400 focus:border-red-500'
                        : digit
                        ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-500/10 text-neutral-900 dark:text-dark-text focus:border-primary-600 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20'
                        : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-surface text-neutral-900 dark:text-dark-text focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="reset-new-password" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                New password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`form-field pl-10 pr-11 ${errors.newPassword ? 'form-field-error' : ''}`}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-dark-text transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checklist */}
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-dark-card border border-neutral-100 dark:border-dark-border space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${hasMinLength ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                    {hasMinLength ? <Check className="w-3 h-3 stroke-[3]" /> : '•'}
                  </span>
                  <span className={hasMinLength ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-neutral-500 dark:text-dark-muted'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${hasLetter ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                    {hasLetter ? <Check className="w-3 h-3 stroke-[3]" /> : '•'}
                  </span>
                  <span className={hasLetter ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-neutral-500 dark:text-dark-muted'}>
                    At least one letter (a-z, A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${hasNumber ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                    {hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : '•'}
                  </span>
                  <span className={hasNumber ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-neutral-500 dark:text-dark-muted'}>
                    At least one number (0-9)
                  </span>
                </div>
              </div>

              {errors.newPassword && (
                <p className="mt-1.5 text-xs text-danger font-medium">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reset-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Confirm new password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  className={`form-field pl-10 pr-11 ${errors.confirmPassword ? 'form-field-error' : ''}`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-dark-text transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-danger font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.some((d) => !d)}
              className="btn-primary w-full py-3 text-sm font-bold mt-2 shadow-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Updating password…
                </span>
              ) : (
                'Reset password'
              )}
            </button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-dark-border text-center">
            {cooldownSeconds > 0 ? (
              <p className="text-xs font-medium text-neutral-400 dark:text-dark-muted">
                Resend code in <span className="text-primary-600 dark:text-primary-400 font-bold">{cooldownSeconds}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Sending…' : 'Resend reset code'}</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-neutral-500 dark:text-dark-muted">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-600 dark:text-primary-400 font-bold hover:underline transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
