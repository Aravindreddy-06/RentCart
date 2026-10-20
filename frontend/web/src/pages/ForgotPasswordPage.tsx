/**
 * src/pages/ForgotPasswordPage.tsx (web)
 * Polished forgot password screen:
 * - Hero illustration made from simple SVG & emojis
 * - Soft tinted gradient background with dark mode support
 * - Mail icon inside email input with teal focus glow
 * - Brand gradient primary button
 * - Preserved request flow and redirection
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError('');
    try {
      await authService.forgotPassword({ email: data.email });
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`, {
        state: {
          infoMessage: 'If an account exists with this email, a 6-digit reset code has been sent.',
        },
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.';
      setApiError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F7F4]/60 via-neutral-50 to-white dark:from-dark-bg dark:via-dark-bg dark:to-dark-surface flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header with Illustration */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-[#12C2A8] shadow-glow flex items-center justify-center text-white">
              <KeyRound className="w-8 h-8" />
            </div>
            <span className="absolute -top-1.5 -right-2 text-base select-none">🔑</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            Forgot password?
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1 text-sm max-w-xs mx-auto">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 shadow-card dark:shadow-card-dark">
          {apiError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="forgot-email"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold mt-2 shadow-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending code…
                </span>
              ) : (
                'Send reset code'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-neutral-500 dark:text-dark-muted">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-bold hover:underline transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
