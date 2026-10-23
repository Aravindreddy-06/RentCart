/**
 * src/routes/uploads.routes.ts
 * Image upload endpoint — protected by auth middleware and rate limiting.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadImages as multerUpload, uploadLimiter } from '../middlewares/upload.middleware';
import * as uploadsController from '../controllers/uploads.controller';

const router = Router();

// Wrap multer in error handler so validation errors are formatted correctly
router.post(
  '/images',
  authenticate,
  uploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    multerUpload(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5 MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, message: 'Too many files. Maximum is 5 images.' });
        }
        return res.status(400).json({ success: false, message: err.message || 'File upload error' });
      }
      next();
    });
  },
  uploadsController.uploadImages,
);

export default router;
