/**
 * src/routes/ProtectedRoute.tsx
 * Wraps routes that require authentication.
 * Redirects to /login if the user is not logged in.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // While checking the stored token, render nothing (Splash handles this)
  if (isLoading) return null;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
