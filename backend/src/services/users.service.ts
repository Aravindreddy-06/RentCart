/**
 * src/services/users.service.ts
 * Business logic for user profiles, password changes, avatar updates,
 * and sanitized public profiles.
 */

import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avatarUrl?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Extracts a neighborhood/city area from a street address
 * e.g., "12 Maple Street, Springfield" -> "Springfield"
 * or "45 Oak Avenue" -> "Oak Avenue Area"
 */
export function extractAddressArea(address?: string | null): string | null {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.slice(1).join(', ');
  }
  // Strip street number if only one part
  const stripped = address.replace(/^\d+[\w-]*\s+/, '').trim();
  return stripped ? `${stripped} Area` : address;
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      address: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      address: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function updateUserAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      address: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    const err = new Error('Current password is incorrect');
    (err as any).statusCode = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { message: 'Password updated successfully' };
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      address: true,
      createdAt: true,
      items: {
        where: { isAvailable: true },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          images: true,
          pricePerDay: true,
          deposit: true,
          isAvailable: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  if (!user) return null;

  // Round items coordinates to ~3 decimals to protect exact owner location
  const sanitizedItems = user.items.map((item) => ({
    ...item,
    latitude: item.latitude != null ? Math.round(item.latitude * 1000) / 1000 : null,
    longitude: item.longitude != null ? Math.round(item.longitude * 1000) / 1000 : null,
  }));

  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    addressArea: extractAddressArea(user.address),
    memberSince: user.createdAt,
    itemCount: user._count.items,
    items: sanitizedItems,
  };
}
