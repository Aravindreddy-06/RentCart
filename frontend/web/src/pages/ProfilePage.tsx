/**
 * src/pages/ProfilePage.tsx (web)
 * Profile management:
 * - Avatar upload with instant preview
 * - Edit name, phone, address
 * - "Use my current location" (browser geolocation with error handling)
 * - Change password form (validates current + new password min 8)
 * - Logout
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/users.service';

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Loading & status states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Geolocation states
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Fetch current profile on mount
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const data = await usersService.getMe();
        if (mounted) {
          setName(data.name || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
          setAvatarPreview(data.avatarUrl ?? null);
          setUser(data);
        }
      } catch (err: any) {
        if (mounted) {
          setProfileError('Failed to load profile. Please refresh.');
        }
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  // ── Geolocation Handler ───────────────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage({
        text: 'Geolocation is not supported by your browser.',
        type: 'error',
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 100000) / 100000;
        const lng = Math.round(position.coords.longitude * 100000) / 100000;
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        setLocationMessage({
          text: `Location captured: ${lat}, ${lng}`,
          type: 'success',
        });
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage({
            text: 'Location permission was denied. Please allow location access in browser settings.',
            type: 'error',
          });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationMessage({
            text: 'Location information is currently unavailable.',
            type: 'error',
          });
        } else {
          setLocationMessage({
            text: 'Location request timed out. Please try again.',
            type: 'error',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  // ── Avatar Upload Handler ─────────────────────────────────────────────────
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Avatar image must be under 5 MB.');
      return;
    }

    // Immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setIsUploadingAvatar(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const { avatarUrl, user: updatedUser } = await usersService.uploadAvatar(file);
      setAvatarPreview(avatarUrl);
      setUser(updatedUser);
      setProfileSuccess('Avatar updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload avatar image.';
      setProfileError(msg);
      // Revert preview to existing user avatar
      setAvatarPreview(user?.avatarUrl ?? null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── Save Profile Info ─────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await usersService.updateMe({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      });
      setUser(updated);
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save profile changes.';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Change Password Handler ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await usersService.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Account & Profile
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage your personal details, location for nearby search, and security settings.
          </p>
        </div>

        {/* ── Section 1: Personal Details & Avatar ───────────────────────── */}
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-neutral-900">Personal Information</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Update your photo, public name, and contact information.
            </p>
          </div>

          {/* Feedback messages */}
          {profileSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <span className="font-bold">✓</span> {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span className="font-bold">✕</span> {profileError}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-2">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={name || 'Avatar'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-neutral-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 font-bold text-3xl flex items-center justify-center border-4 border-white shadow-md">
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center sm:text-left space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="btn-secondary text-xs sm:text-sm py-2 px-4 shadow-sm"
              >
                {isUploadingAvatar ? 'Uploading...' : 'Upload New Avatar'}
              </button>
              <p className="text-[11px] text-neutral-400">
                JPG, PNG, or WebP. Max file size: 5 MB.
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-field"
                  placeholder="e.g. Alice Johnson"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="form-field bg-neutral-100 text-neutral-500 cursor-not-allowed"
                  title="Email cannot be changed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-field"
                  placeholder="e.g. +1-555-0101"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Shared only with approved rental partners.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-field"
                  placeholder="e.g. 12 Maple Street, Springfield"
                />
              </div>
            </div>

            {/* Geolocation Section */}
            <div className="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>📍</span> Home Location Coordinates
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Used to find items nearby when browser location is disabled.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-1.5"
                >
                  {isLocating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <span>🎯</span>
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {locationMessage && (
                <div
                  className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                    locationMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>{locationMessage.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{locationMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">Latitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude ?? ''}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                    className="form-field text-xs py-2 mt-1"
                    placeholder="e.g. 37.7749"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">Longitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude ?? ''}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                    className="form-field text-xs py-2 mt-1"
                    placeholder="e.g. -122.4194"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary px-6 py-2.5 text-sm font-semibold"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Section 2: Change Password ─────────────────────────────────── */}
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-neutral-900">Security & Password</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Change your password to keep your account secure.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <span className="font-bold">✓</span> {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span className="font-bold">✕</span> {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-field"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                New Password * (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-field"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-field"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn-secondary px-5 py-2.5 text-sm font-semibold hover:border-neutral-400"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Section 3: Logout & Session ─────────────────────────────────── */}
        <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-red-100 bg-red-50/20">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Sign Out</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Sign out of your RentCart session on this device.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
          >
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
