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

// Stricter rate limit for OTP verification and password reset per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify-email', otpLimiter, authController.verifyEmail);
router.post('/resend-otp', otpLimiter, authController.resendOtp);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', otpLimiter, authController.resetPassword);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);

if (process.env.NODE_ENV !== 'production') {
  router.get('/dev-otp', (req, res) => {
    const email = req.query.email as string;
    const { getDevOtp } = require('../services/mail.service');
    return res.json({ success: true, otp: getDevOtp(email) });
  });
}

export default router;
