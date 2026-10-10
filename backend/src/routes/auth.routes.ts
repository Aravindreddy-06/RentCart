/**
 * src/routes/auth.routes.ts
 * Auth route definitions with rate limiting on sensitive endpoints.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Rate limit for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);

export default router;
