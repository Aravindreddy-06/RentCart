/**
 * src/controllers/items.controller.ts
 * Express route handlers for the items endpoints.
 * All write operations are owner-only (403 for non-owners, 404 for missing items).
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as itemsService from '../services/items.service';
import { success, failure } from '../utils/response';

import { MAX_PRICE_OR_DEPOSIT } from '../config/constants';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CreateItemSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other']),
  images: z.array(z.string().url()).default([]),
  pricePerDay: z
    .number()
    .min(0, 'Price per day must be non-negative')
    .max(MAX_PRICE_OR_DEPOSIT, 'Price per day must not exceed 10,00,000'),
  deposit: z
    .number()
    .min(0, 'Deposit must be non-negative')
    .max(MAX_PRICE_OR_DEPOSIT, 'Deposit must not exceed 10,00,000')
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const UpdateItemSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  category: z.enum(['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books', 'Other']).optional(),
  images: z.array(z.string().url()).optional(),
  pricePerDay: z
    .number()
    .min(0, 'Price per day must be non-negative')
    .max(MAX_PRICE_OR_DEPOSIT, 'Price per day must not exceed 10,00,000')
    .optional(),
  deposit: z
    .number()
    .min(0, 'Deposit must be non-negative')
    .max(MAX_PRICE_OR_DEPOSIT, 'Deposit must not exceed 10,00,000')
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const AvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParamId(req: Request): string {
  const id = req.params['id'];
  return Array.isArray(id) ? id[0] : id;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, page, limit, lat, lng, radiusKm } = req.query;

    const parsedLat =
      lat !== undefined && lat !== '' ? parseFloat(lat as string) : undefined;
    const parsedLng =
      lng !== undefined && lng !== '' ? parseFloat(lng as string) : undefined;
    const parsedRadius =
      radiusKm !== undefined && radiusKm !== ''
        ? Math.min(50, Math.max(0.1, parseFloat(radiusKm as string)))
        : 5;

    const result = await itemsService.getItems({
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      lat: parsedLat !== undefined && !isNaN(parsedLat) ? parsedLat : undefined,
      lng: parsedLng !== undefined && !isNaN(parsedLng) ? parsedLng : undefined,
      radiusKm: !isNaN(parsedRadius) ? parsedRadius : 5,
      currentUserId: req.user?.userId,
    });

    return success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await itemsService.getItemById(getParamId(req), req.user?.userId);
    if (!item) return failure(res, 'Item not found', 404);
    return success(res, item);
  } catch (err) {
    next(err);
  }
}

export async function getMyItems(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await itemsService.getMyItems(req.user!.userId);
    return success(res, items);
  } catch (err) {
    next(err);
  }
}

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const item = await itemsService.createItem({
      ...parsed.data,
      ownerId: req.user!.userId,
    });

    return success(res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const item = await itemsService.getItemById(id);
    if (!item) return failure(res, 'Item not found', 404);
    if (item.ownerId !== req.user!.userId) return failure(res, 'Forbidden', 403);

    const parsed = UpdateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const updated = await itemsService.updateItem(id, parsed.data);
    return success(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const item = await itemsService.getItemById(id);
    if (!item) return failure(res, 'Item not found', 404);
    if (item.ownerId !== req.user!.userId) return failure(res, 'Forbidden', 403);

    await itemsService.deleteItem(id);
    return success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function toggleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const item = await itemsService.getItemById(id);
    if (!item) return failure(res, 'Item not found', 404);
    if (item.ownerId !== req.user!.userId) return failure(res, 'Forbidden', 403);

    const parsed = AvailabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const updated = await itemsService.toggleAvailability(id, parsed.data.isAvailable);
    return success(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function getBookedDates(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const dates = await itemsService.getBookedDates(id);
    return success(res, dates);
  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.statusCode === 404) {
      return failure(res, 'Item not found', 404);
    }
    next(err);
  }
}

