/**
 * src/pages/RegisterPage.tsx
 * Registration form: name, email, phone (optional), password, confirm password.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

// ─── Validation schema ────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Component ────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError('');
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Join RentCart</h1>
          <p className="text-neutral-500 mt-1">Share and borrow with your neighbours</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {apiError && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full name */}
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Alice Johnson"
                className={`form-field ${errors.name ? 'form-field-error' : ''}`}
                {...register('name')}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`form-field ${errors.email ? 'form-field-error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Phone{' '}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1-555-0100"
                className="form-field"
                {...register('phone')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`form-field pr-11 ${errors.password ? 'form-field-error' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`form-field ${errors.confirmPassword ? 'form-field-error' : ''}`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-base mt-2"
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

          <p className="text-center mt-6 text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
