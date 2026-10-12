/**
 * src/routes/reviews.routes.ts
 * Reviews routes — protected by authenticate middleware.
 */

import { Router } from 'express';
import * as reviewsController from '../controllers/reviews.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Create review (rental must be RETURNED, borrower or owner)
router.post('/', authenticate, reviewsController.createReview);

// Edit review (within 7 days, author only)
router.patch('/:id', authenticate, reviewsController.updateReview);

// Delete review (author only)
router.delete('/:id', authenticate, reviewsController.deleteReview);

export default router;
