/**
 * src/routes/users.routes.ts
 * User profile routes.
 * NOTE: /me routes MUST be registered before /:id so Express does not treat 'me' as an ID parameter.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadAvatar as multerUploadAvatar, uploadLimiter } from '../middlewares/upload.middleware';
import * as usersController from '../controllers/users.controller';
import * as reviewsController from '../controllers/reviews.controller';

const router = Router();

// Current user profile
router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.updateMe);

// Avatar upload (single file, max 5MB)
router.post(
  '/me/avatar',
  authenticate,
  uploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    multerUploadAvatar(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5 MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, message: 'Too many files. Only 1 avatar image is allowed.' });
        }
        return res.status(400).json({ success: false, message: err.message || 'File upload error' });
      }
      next();
    });
  },
  usersController.uploadAvatar,
);

// Password change
router.patch('/me/password', authenticate, usersController.changePassword);

// Reviews received by user — must be before /:id or after /:id (Express matches :id/reviews correctly)
router.get('/:id/reviews', authenticate, reviewsController.getUserReviews);

// Public profile
router.get('/:id', authenticate, usersController.getPublicProfile);

export default router;
