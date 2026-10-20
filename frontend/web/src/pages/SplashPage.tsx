/**
 * src/pages/SplashPage.tsx (web)
 * Splash screen shown while checking authentication state:
 * - Full-screen brand gradient (#0F9D8A -> #12C2A8)
 * - White logo with gentle pulse/scale animation
 * - Tagline fading in
 * - Subtle loading indicator
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SplashPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      const timeout = setTimeout(() => {
        navigate(isAuthenticated ? '/home' : '/login', { replace: true });
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#09665A] via-[#0F9D8A] to-[#12C2A8] overflow-hidden select-none">
      {/* Decorative background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#12C2A8]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Logo & Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in text-center px-4">
        {/* Pulsing Logo Badge */}
        <div className="w-24 h-24 bg-white/15 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/30 animate-pulse-subtle">
          <svg
            className="w-14 h-14 text-white drop-shadow-md"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Rent<span className="text-[#C2EBE4]">Cart</span>
          </h1>
          <p className="text-primary-100 text-sm sm:text-base font-medium max-w-xs animate-slide-up">
            Borrow smart, rent local
          </p>
        </div>

        {/* Subtle loading indicator */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-10 text-white/70 text-xs sm:text-sm font-medium tracking-wide">
        Community sharing, made simple
      </p>
    </div>
  );
}
