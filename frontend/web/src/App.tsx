/**
 * src/App.tsx
 * Root component — sets up the router and wraps everything in AuthProvider.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { AddItemPage } from './pages/AddItemPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { MyRentalsPage } from './pages/MyRentalsPage';
import { RequestsPage } from './pages/RequestsPage';
import { RentalDetailPage } from './pages/RentalDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<SplashPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users/:id" element={<PublicProfilePage />} />
            <Route path="/items/new" element={<AddItemPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/rentals" element={<MyRentalsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/rentals/:id" element={<RentalDetailPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
