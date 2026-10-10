/**
 * src/routes/notifications.routes.ts
 * Express router for in-app notification endpoints.
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

// All notification routes are protected
router.use(authenticate);

// List notifications (supports ?unread=true&page=1&limit=20)
router.get('/', notificationsController.getMyNotifications);

// Unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Mark all as read (must be before /:id/read)
router.patch('/read-all', notificationsController.markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', notificationsController.markAsRead);

// Delete notification (owner only)
router.delete('/:id', notificationsController.deleteNotification);

export default router;
