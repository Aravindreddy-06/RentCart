/**
 * src/routes/items.routes.ts
 * Items route definitions — all protected by the auth middleware.
 * NOTE: /mine must come BEFORE /:id to avoid "mine" being treated as an ID.
 */

import { Router } from 'express';
import * as itemsController from '../controllers/items.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// List all items (search, category, page, limit)
router.get('/', authenticate, itemsController.listItems);

// My items — must be before /:id
router.get('/mine', authenticate, itemsController.getMyItems);

// Booked dates for an item (APPROVED/ACTIVE) — must be before /:id
router.get('/:id/booked-dates', authenticate, itemsController.getBookedDates);

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
