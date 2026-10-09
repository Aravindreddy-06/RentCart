/**
 * src/pages/SplashPage.tsx
 * Loading/splash screen shown while checking for a stored auth token.
 * Animates the RentCart logo, then routes to Home or Login.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SplashPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      // Small delay so the animation is visible
      const timeout = setTimeout(() => {
        navigate(isAuthenticated ? '/home' : '/login', { replace: true });
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      {/* Logo container */}
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Cart icon */}
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm
                        shadow-2xl border border-white/30">
          <svg
            className="w-14 h-14 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">RentCart</h1>
          <p className="text-primary-100 mt-1 text-base font-medium">
            Borrow from your neighbours
          </p>
        </div>

        {/* Loading spinner */}
        <div className="mt-6">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin-slow"
               style={{ borderWidth: 3 }} />
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-12 text-primary-100/70 text-sm font-medium">
        Community sharing, made simple
      </p>
    </div>
  );
}
