/**
 * src/routes/rentals.routes.ts
 * Rental routes — all protected by authenticate middleware.
 */

import { Router } from 'express';
import * as rentalsController from '../controllers/rentals.controller';
import * as reviewsController from '../controllers/reviews.controller';
import * as messagesController from '../controllers/messages.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { handoverVerifyRateLimiter } from '../middlewares/handoverRateLimit.middleware';

const router = Router();

// Create rental request
router.post('/', authenticate, rentalsController.createRental);

// My rentals as borrower (must be before /:id)
router.get('/mine', authenticate, rentalsController.getMyRentals);

// Incoming requests as item owner (must be before /:id)
router.get('/incoming', authenticate, rentalsController.getIncomingRentals);

// Review status for a rental (must be before /:id or after /:id)
router.get('/:id/review-status', authenticate, reviewsController.getRentalReviewStatus);

// In-app chat messages for a rental
router.get('/:id/messages', authenticate, messagesController.getRentalMessages);
router.post('/:id/messages', authenticate, messagesController.sendMessage);
router.patch('/:id/messages/read', authenticate, messagesController.markMessagesAsRead);

// Single rental details
router.get('/:id', authenticate, rentalsController.getRental);

// Pickup point management
router.patch('/:id/pickup', authenticate, rentalsController.updatePickup);
router.get('/:id/pickup', authenticate, rentalsController.getPickup);

// Live tracking
router.post('/:id/tracking/start', authenticate, rentalsController.startTracking);
router.post('/:id/tracking/stop', authenticate, rentalsController.stopTracking);
router.post('/:id/tracking/arrived', authenticate, rentalsController.markArrived);
router.get('/:id/tracking', authenticate, rentalsController.getTracking);

// Handover PIN
router.get('/:id/handover-pin', authenticate, rentalsController.getHandoverPin);
router.post(
  '/:id/handover/verify',
  authenticate,
  handoverVerifyRateLimiter(),
  rentalsController.verifyHandover,
);

// Lifecycle transitions
router.patch('/:id/approve', authenticate, rentalsController.approveRental);
router.patch('/:id/reject', authenticate, rentalsController.rejectRental);
router.patch('/:id/cancel', authenticate, rentalsController.cancelRental);
router.patch('/:id/activate', authenticate, rentalsController.activateRental);
router.patch('/:id/return', authenticate, rentalsController.returnRental);

export default router;

