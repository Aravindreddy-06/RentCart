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
import { useTheme } from '../context/ThemeContext';
import { usersService } from '../services/users.service';
import { getAvatarColor, getInitials } from '../utils/colors';
import { formatDateDMY } from '../utils/date';
import {
  cleanIndianPhoneInput,
  isIndianPhoneNumber,
  getIndianPhoneDigits,
} from '../utils/phone';
import {
  MapPin,
  Sun,
  Moon,
  Monitor,
  Camera,
  LogOut,
  Crosshair,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isIndianPhone, setIsIndianPhone] = useState(true);
  const [phoneError, setPhoneError] = useState('');
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
          const isInd = isIndianPhoneNumber(data.phone);
          setIsIndianPhone(isInd);
          setPhone(isInd ? getIndianPhoneDigits(data.phone) : (data.phone || ''));
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
    setPhoneError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    let finalPhone: string | null = null;
    if (phone.trim()) {
      if (isIndianPhone) {
        if (!/^[6-9]\d{9}$/.test(phone.trim())) {
          setPhoneError('Enter a valid 10-digit Indian mobile number');
          return;
        }
        finalPhone = `+91${phone.trim()}`;
      } else {
        finalPhone = phone.trim();
      }
    }

    setIsSavingProfile(true);
    try {
      const updated = await usersService.updateMe({
        name: name.trim(),
        phone: finalPhone,
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
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg text-neutral-900 dark:text-dark-text transition-colors">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-500 dark:text-dark-muted font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const avatarBg = getAvatarColor(name || user?.name || 'User');
  const userInitials = getInitials(name || user?.name || 'User');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg text-neutral-900 dark:text-dark-text transition-colors">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Account & Profile
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted text-sm mt-1">
            Manage your personal details, location for nearby search, and security settings.
          </p>
        </div>

        {/* ── Section 1: Hero Banner, Avatar & Personal Details ────────────── */}
        <div className="card overflow-hidden">
          {/* Brand Gradient Banner */}
          <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-primary-600 via-primary-500 to-[#12C2A8] relative">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          <div className="p-6 sm:p-8 pt-0">
            {/* Avatar & Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-6">
              <div className="flex items-end gap-4">
                <div className="relative group">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={name || 'Avatar'}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-dark-surface shadow-lg bg-neutral-100 dark:bg-dark-border"
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl text-white font-bold text-3xl sm:text-4xl flex items-center justify-center border-4 border-white dark:border-dark-surface shadow-lg ${avatarBg}`}
                    >
                      {userInitials}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    title="Change Avatar"
                    className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-transform hover:scale-105"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="pb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                    {name || user?.name || 'Member'}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-muted">
                    {user?.email}
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Stats row in coloured chips */}
            <div className="flex flex-wrap items-center gap-2.5 pb-6 border-b border-neutral-100 dark:border-dark-border">
              {user?.emailVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Account
                </span>
              )}
              {user?.createdAt && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-950/40 dark:text-primary-400 dark:border-primary-800/40">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {formatDateDMY(user.createdAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary-50 text-secondary-700 border border-secondary-200 dark:bg-secondary-950/40 dark:text-secondary-300 dark:border-secondary-800/40">
                <Sparkles className="w-3.5 h-3.5 text-secondary-500" />
                Community Lender
              </span>
            </div>

            {/* Feedback messages */}
            {profileSuccess && (
              <div className="my-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
                <span className="font-bold">✓</span> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="my-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                <span className="font-bold">✕</span> {profileError}
              </div>
            )}

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="form-field bg-neutral-100 dark:bg-dark-border/40 text-neutral-500 dark:text-dark-muted cursor-not-allowed"
                    title="Email cannot be changed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  {isIndianPhone ? (
                    <div>
                      <div className="relative flex rounded-xl border border-neutral-300 dark:border-dark-border shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent overflow-hidden">
                        <span className="inline-flex items-center px-3.5 bg-neutral-100 dark:bg-dark-border/60 border-r border-neutral-300 dark:border-dark-border text-neutral-600 dark:text-neutral-300 font-semibold text-sm select-none">
                          +91
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => {
                            setPhone(cleanIndianPhoneInput(e.target.value));
                            setPhoneError('');
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const text = e.clipboardData.getData('text');
                            setPhone(cleanIndianPhoneInput(text));
                            setPhoneError('');
                          }}
                          className="block w-full px-3.5 py-2 text-sm bg-white dark:bg-dark-surface text-neutral-900 dark:text-white focus:outline-none placeholder:text-neutral-400 font-medium"
                          placeholder="98765 43210"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-dark-muted mt-1">
                        Indian mobile number · Shared only with approved rental partners.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setPhoneError('');
                        }}
                        className="form-field"
                        placeholder="+44 7911 123456"
                      />
                      <p className="text-[11px] text-neutral-400 dark:text-dark-muted mt-1">
                        International phone number · Shared only with approved rental partners.
                      </p>
                    </div>
                  )}
                  {phoneError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{phoneError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-field"
                    placeholder="e.g. Anna Nagar, Chennai"
                  />
                </div>
              </div>

              {/* Geolocation Section */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-dark-border/30 border border-neutral-200/60 dark:border-dark-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span>Home Location Coordinates</span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
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
                        <Crosshair className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                {locationMessage && (
                  <div
                    className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                      locationMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                    }`}
                  >
                    <span>{locationMessage.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{locationMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-dark-muted">Latitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude ?? ''}
                      onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                      className="form-field text-xs py-2 mt-1"
                      placeholder="e.g. 13.0827"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-dark-muted">Longitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude ?? ''}
                      onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                      className="form-field text-xs py-2 mt-1"
                      placeholder="e.g. 80.2707"
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
        </div>

        {/* ── Section 2: Appearance & Theme Preference ────────────────────── */}
        <div className="card p-6 sm:p-8 space-y-4">
          <div className="border-b border-neutral-100 dark:border-dark-border pb-4">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Theme & Appearance</h2>
            <p className="text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
              Customize how RentCart looks on your screen.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 shadow-sm ring-2 ring-primary-500/20'
                  : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 shadow-sm ring-2 ring-primary-500/20'
                  : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 shadow-sm ring-2 ring-primary-500/20'
                  : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-dark-border text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">System</span>
            </button>
          </div>
        </div>

        {/* ── Section 3: Change Password ─────────────────────────────────── */}
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="border-b border-neutral-100 dark:border-dark-border pb-4">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Security & Password</h2>
            <p className="text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
              Change your password to keep your account secure.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
              <span className="font-bold">✓</span> {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <span className="font-bold">✕</span> {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                className="btn-secondary px-5 py-2.5 text-sm font-semibold"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Section 4: Logout & Session ─────────────────────────────────── */}
        <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/20">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Sign Out</h3>
            <p className="text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
              Sign out of your RentCart session on this device.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
