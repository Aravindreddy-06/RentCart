/**
 * src/controllers/notifications.controller.ts
 * Controllers for notifications and push tokens.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as notificationsService from '../services/notifications.service';
import { success, failure } from '../utils/response';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const RegisterPushTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.string().min(1, 'Platform is required'),
});

const DeletePushTokenSchema = z.object({
  token: z.string().optional(),
});

function getParamId(req: Request): string {
  const id = req.params['id'];
  return Array.isArray(id) ? id[0] : id;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (
    err instanceof notificationsService.ValidationError ||
    err instanceof notificationsService.ForbiddenError ||
    err instanceof notificationsService.NotFoundError
  ) {
    return failure(res, err.message, err.statusCode);
  }
  next(err);
}

// ─── Notification Handlers ───────────────────────────────────────────────────

export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { unread, page, limit } = req.query;

    const unreadOnly = unread === 'true' || unread === '1';
    const parsedPage = page ? parseInt(page as string, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;

    const result = await notificationsService.getUserNotifications(req.user!.userId, {
      unreadOnly,
      page: parsedPage,
      limit: parsedLimit,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationsService.getUnreadCount(req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const notification = await notificationsService.markAsRead(id, req.user!.userId);
    return success(res, notification);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParamId(req);
    const result = await notificationsService.deleteNotification(id, req.user!.userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── Push Token Handlers ──────────────────────────────────────────────────────

export async function registerPushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RegisterPushTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
    }

    const result = await notificationsService.registerPushToken(
      req.user!.userId,
      parsed.data.token,
      parsed.data.platform,
    );

    return success(res, result, 201);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function deletePushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = DeletePushTokenSchema.safeParse(req.body || {});
    const token =
      (parsed.success ? parsed.data.token : undefined) ||
      (typeof req.query.token === 'string' ? req.query.token : undefined);

    const result = await notificationsService.deletePushToken(req.user!.userId, token);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
