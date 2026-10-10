/**
 * src/routes/push-tokens.routes.ts
 * Express router for push token registration and deletion.
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

// All push token routes are protected
router.use(authenticate);

// Register / upsert Expo push token
router.post('/', notificationsController.registerPushToken);

// Delete push token (logout)
router.delete('/', notificationsController.deletePushToken);

export default router;
