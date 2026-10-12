/**
 * src/controllers/messages.controller.ts
 * Route controllers for chats and messages.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as messagesService from '../services/messages.service';
import { success, failure } from '../utils/response';

const SendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
});

function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new messagesService.ForbiddenError('Unauthorized');
  }
  return userId;
}

function getParamId(req: Request, paramName = 'id'): string {
  const id = req.params[paramName];
  return Array.isArray(id) ? id[0] : id;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (
    err instanceof messagesService.ValidationError ||
    err instanceof messagesService.ForbiddenError ||
    err instanceof messagesService.NotFoundError ||
    err instanceof messagesService.TooManyRequestsError
  ) {
    return failure(res, err.message, err.statusCode);
  }
  next(err);
}

export async function getMyChats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const chats = await messagesService.getMyChats(userId);
    return success(res, chats);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getRentalMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const rentalId = getParamId(req, 'id');
    const { before, limit } = req.query;

    const result = await messagesService.getRentalMessages(rentalId, userId, {
      before: typeof before === 'string' ? before : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const rentalId = getParamId(req, 'id');

    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
    }

    const message = await messagesService.sendMessage(rentalId, userId, parsed.data.body);
    return success(res, message, 201);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const rentalId = getParamId(req, 'id');

    const result = await messagesService.markMessagesAsRead(rentalId, userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const result = await messagesService.getUnreadMessagesCount(userId);
    return success(res, result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
