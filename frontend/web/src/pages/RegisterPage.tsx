/**
 * src/pages/RegisterPage.tsx (web)
 * Polished registration screen:
 * - Hero illustration made from simple SVG & emojis
 * - Soft tinted gradient background with dark mode support
 * - Icons inside inputs (User, Mail, Phone, Lock)
 * - Fixed +91 Indian phone input with dark mode support
 * - Brand gradient primary button and teal focus glow
 * - Preserved validation, phone cleaning, and auth flow
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { cleanIndianPhoneInput } from '../utils/phone';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^[6-9]\d{9}$/.test(val), {
        message: 'Enter a valid 10-digit Indian mobile number',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password') || '';
  const hasMinLength = passwordValue.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setApiError('');
    try {
      const normalizedPhone = data.phone?.trim() ? `+91${data.phone.trim()}` : undefined;
      await registerUser({
        name: data.name,
        email: data.email,
        phone: normalizedPhone,
        password: data.password,
      });
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F7F4]/60 via-neutral-50 to-white dark:from-dark-bg dark:via-dark-bg dark:to-dark-surface flex items-center justify-center p-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header with Illustration */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-[#12C2A8] shadow-glow flex items-center justify-center text-white">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-2 text-base select-none">🌱</span>
            <span className="absolute -bottom-1 -left-2 text-sm select-none">✨</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
            Join RentCart
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1 text-sm">
            Share and borrow with your neighbours
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
            {/* Full name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Alice Johnson"
                  className={`form-field pl-10 ${errors.name ? 'form-field-error' : ''}`}
                  {...register('name')}
                />
              </div>
              {errors.name && <p className="mt-1.5 text-xs text-danger font-medium">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`form-field pl-10 ${errors.email ? 'form-field-error' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-danger font-medium">{errors.email.message}</p>}
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Phone <span className="text-neutral-400 dark:text-neutral-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative flex rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-xs focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 overflow-hidden transition-all">
                <span className="inline-flex items-center px-3.5 bg-neutral-100 dark:bg-dark-card border-r border-neutral-200 dark:border-dark-border text-neutral-700 dark:text-dark-text font-semibold text-sm select-none">
                  +91
                </span>
                <input
                  id="reg-phone"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  className="block w-full px-3.5 py-2.5 text-sm bg-transparent text-neutral-900 dark:text-dark-text focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-medium"
                  {...register('phone', {
                    onChange: (e) => {
                      const cleaned = cleanIndianPhoneInput(e.target.value);
                      setValue('phone', cleaned, { shouldValidate: true });
                    },
                  })}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text');
                    const cleaned = cleanIndianPhoneInput(text);
                    setValue('phone', cleaned, { shouldValidate: true });
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-dark-muted font-medium">Indian mobile number</p>
              {errors.phone && <p className="mt-1 text-xs text-danger font-medium">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={`form-field pl-10 pr-11 ${errors.password ? 'form-field-error' : ''}`}
                  {...register('password')}
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

              {/* Password strength hints */}
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-dark-card border border-neutral-100 dark:border-dark-border space-y-1.5 text-xs">
                <p className="font-semibold text-neutral-600 dark:text-dark-muted mb-1">Password requirements:</p>
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

              {errors.password && <p className="mt-1.5 text-xs text-danger font-medium">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-dark-muted mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={`form-field pl-10 ${errors.confirmPassword ? 'form-field-error' : ''}`}
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-danger font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold mt-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-neutral-500 dark:text-dark-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-bold hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
