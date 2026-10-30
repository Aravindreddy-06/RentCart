/**
 * src/middlewares/upload.middleware.ts
 * Multer configuration with in-memory storage (no files written to disk)
 * and rate limiting for image uploads.
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// In-memory storage for Cloudinary streaming (no local disk writes)
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = /\.(jpe?g|png|webp)$/i;

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  }
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5,
  },
}).array('images', 5);

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 1,
  },
}).single('avatar');

/**
 * Rate limit uploads per user (20 uploads per 10 minutes).
 * Falls back to IP address if req.user is absent.
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 20, // 20 requests per window
  keyGenerator: (req: Request) => req.user?.userId || req.ip || 'anonymous',
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many upload requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
