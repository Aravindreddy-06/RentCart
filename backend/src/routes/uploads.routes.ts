/**
 * src/routes/uploads.routes.ts
 * Image upload endpoint — protected by auth middleware.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadImages as multerUpload } from '../middlewares/upload.middleware';
import * as uploadsController from '../controllers/uploads.controller';

const router = Router();

// Wrap multer in error handler so validation errors are formatted correctly
router.post(
  '/images',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    multerUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadsController.uploadImages,
);

export default router;
