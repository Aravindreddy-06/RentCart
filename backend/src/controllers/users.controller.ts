/**
 * src/controllers/users.controller.ts
 * Handlers for user profile endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from '../services/users.service';
import { success, failure } from '../utils/response';
import {
  isAllowedImageBuffer,
  uploadImageStream,
  deleteCloudinaryAsset,
  CloudinaryUploadError,
} from '../services/cloudinary.service';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

import { passwordSchema } from '../utils/validators';
import { normalizePhone, PhoneValidationError } from '../utils/phone';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

function getUserId(req: Request): string {
  const user = req.user;
  if (!user?.userId) throw new Error('UNAUTHORIZED');
  return user.userId;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const profile = await usersService.getUserProfile(userId);
    if (!profile) return failure(res, 'User not found', 404);
    return success(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const data = { ...parsed.data };
    if (data.phone !== undefined) {
      data.phone = normalizePhone(data.phone);
    }

    let previousAvatarUrl: string | null = null;
    if (data.avatarUrl !== undefined) {
      const current = await usersService.getUserProfile(userId);
      previousAvatarUrl = current?.avatarUrl ?? null;
    }

    const updated = await usersService.updateUserProfile(userId, data);

    if (previousAvatarUrl && previousAvatarUrl !== data.avatarUrl) {
      deleteCloudinaryAsset(previousAvatarUrl);
    }

    return success(res, updated);
  } catch (err) {
    if (err instanceof PhoneValidationError) {
      return failure(res, err.message, 400);
    }
    next(err);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    if (!req.file) {
      return failure(res, 'No avatar image uploaded', 400);
    }

    // Verify magic bytes
    if (!isAllowedImageBuffer(req.file.buffer)) {
      return failure(res, 'Only JPG, PNG, and WebP images are allowed', 400);
    }

    const currentProfile = await usersService.getUserProfile(userId);
    const previousAvatarUrl = currentProfile?.avatarUrl;

    const { secureUrl, publicId } = await uploadImageStream(req.file.buffer, 'rentcart/avatars');
    const user = await usersService.updateUserAvatar(userId, secureUrl);

    // Clean up previous Cloudinary avatar asset in the background
    if (previousAvatarUrl && previousAvatarUrl !== secureUrl) {
      deleteCloudinaryAsset(previousAvatarUrl);
    }

    return success(res, { avatarUrl: secureUrl, user, publicId });
  } catch (err: any) {
    if (err instanceof CloudinaryUploadError) {
      return failure(res, err.message, err.statusCode);
    }
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await usersService.changePassword(userId, parsed.data);
    return success(res, result);
  } catch (err: any) {
    if (err?.statusCode === 400 || err?.message === 'Current password is incorrect') {
      return failure(res, 'Current password is incorrect', 400);
    }
    if (err?.statusCode === 404) {
      return failure(res, 'User not found', 404);
    }
    next(err);
  }
}

export async function getPublicProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'];
    const userId = Array.isArray(id) ? id[0] : id;
    if (!userId) return failure(res, 'User ID is required', 400);

    const profile = await usersService.getPublicProfile(userId);
    if (!profile) return failure(res, 'User not found', 404);

    return success(res, profile);
  } catch (err) {
    next(err);
  }
}
