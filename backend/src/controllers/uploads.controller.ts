/**
 * src/controllers/uploads.controller.ts
 * Handles image upload — saves files and returns absolute URLs.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { success, failure } from '../utils/response';

export async function uploadImages(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return failure(res, 'No images provided', 400);
    }

    const urls = files.map(
      (file) => `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`,
    );

    return success(res, { urls }, 201);
  } catch (err) {
    next(err);
  }
}
