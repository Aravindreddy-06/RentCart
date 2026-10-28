/**
 * src/routes/items.routes.ts
 * Items route definitions — all protected by the auth middleware.
 * NOTE: /mine must come BEFORE /:id to avoid "mine" being treated as an ID.
 */

import { Router } from 'express';
import * as itemsController from '../controllers/items.controller';
import * as reviewsController from '../controllers/reviews.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// List all items (search, category, page, limit)
router.get('/', authenticate, itemsController.listItems);

// My items — must be before /:id
router.get('/mine', authenticate, itemsController.getMyItems);

// Booked dates for an item (APPROVED/ACTIVE) — must be before /:id
router.get('/:id/booked-dates', authenticate, itemsController.getBookedDates);

// My request status for an item (state, rentalId, canRequestAt, retryAfterSeconds) — must be before /:id
router.get('/:id/my-request-status', authenticate, itemsController.getMyRequestStatus);

// Reviews for an item (pagination)
router.get('/:id/reviews', authenticate, reviewsController.getItemReviews);

// Single item details
router.get('/:id', authenticate, itemsController.getItem);

// Create item
router.post('/', authenticate, itemsController.createItem);

// Update item (owner only)
router.patch('/:id', authenticate, itemsController.updateItem);

// Delete item (owner only)
router.delete('/:id', authenticate, itemsController.deleteItem);

// Toggle availability (owner only)
router.patch('/:id/availability', authenticate, itemsController.toggleAvailability);

export default router;
