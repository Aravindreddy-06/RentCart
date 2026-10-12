/**
 * src/routes/chats.routes.ts
 * Chat conversation list and unread count routes.
 */

import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Unread messages count across all chats
router.get('/unread-count', authenticate, messagesController.getUnreadCount);

// Conversation list (my chats)
router.get('/', authenticate, messagesController.getMyChats);

export default router;
