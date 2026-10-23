/**
 * src/controllers/uploads.controller.ts
 * Handles image upload to Cloudinary and returns HTTPS URLs.
 */

import { Request, Response, NextFunction } from 'express';
import { success, failure } from '../utils/response';
import {
  isAllowedImageBuffer,
  uploadImageStream,
  CloudinaryUploadError,
} from '../services/cloudinary.service';

export async function uploadImages(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return failure(res, 'No images provided', 400);
    }

    // Verify magic bytes for every file
    for (const file of files) {
      if (!isAllowedImageBuffer(file.buffer)) {
        return failure(res, 'Only JPG, PNG, and WebP images are allowed', 400);
      }
    }

    // Upload files concurrently to Cloudinary
    const uploadResults = await Promise.all(
      files.map((file) => uploadImageStream(file.buffer, 'rentcart/items')),
    );

    const urls = uploadResults.map((r) => r.secureUrl);
    const publicIds = uploadResults.map((r) => r.publicId);

    return success(res, { urls, publicIds }, 201);
  } catch (err: any) {
    if (err instanceof CloudinaryUploadError) {
      return failure(res, err.message, err.statusCode);
    }
    next(err);
  }
}
