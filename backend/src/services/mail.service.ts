/**
 * src/services/mail.service.ts
 * Mail service using Nodemailer with HTML and text templates.
 * Supports Gmail/SMTP with secure TLS on port 465, 503 on sending failure,
 * and startup connection verification with non-crashing warning.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

// In-memory store for development / test verification hooks
const devOtpStore = new Map<string, { otp: string; purpose: string; timestamp: number }>();

export function setDevOtp(email: string, purpose: string, otp: string) {
  devOtpStore.set(email.toLowerCase(), { otp, purpose, timestamp: Date.now() });
}

export function getDevOtp(email: string): string | undefined {
  return devOtpStore.get(email.toLowerCase())?.otp;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

let transporter: Transporter | null = null;

if (isSmtpConfigured()) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Verify SMTP connection on startup without crashing the application.
 */
export function verifySmtpConnection(): void {
  if (!transporter) {
    if (env.NODE_ENV === 'development') {
      console.log('ℹ️  SMTP not configured. In development, OTP codes will be printed to console.');
    } else {
      console.warn('⚠️  SMTP is not configured.');
    }
    return;
  }

  transporter.verify((error: Error | null) => {
    if (error) {
      console.warn(`⚠️  SMTP connection verification failed: ${error.message}`);
    } else {
      console.log('✅  SMTP connection verified and ready');
    }
  });
}

function renderHtmlEmail(title: string, preheader: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background-color: #0F9D8A; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; color: #ccfbf4; font-size: 13px; font-weight: 500; }
    .body { padding: 36px 32px; }
    .otp-box { background: #f0fdfa; border: 2px dashed #0F9D8A; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0F9D8A; font-family: 'Courier New', Courier, monospace; margin: 0; }
    .otp-caption { font-size: 13px; color: #0d8c7a; margin-top: 6px; font-weight: 600; }
    .footer { padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
    .muted { color: #64748b; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>
  <div class="wrapper">
    <div class="header">
      <h1>🤝 RentCart</h1>
      <p>Neighbourhood Sharing Platform</p>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0;">RentCart • Safe, friendly local equipment sharing</p>
      <p style="margin: 4px 0 0;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send an email via Nodemailer or output to console in dev mode if SMTP unconfigured.
 */
async function dispatchEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  otpForDev?: string;
  purposeForDev?: string;
}): Promise<void> {
  const { to, subject, text, html, otpForDev, purposeForDev } = params;

  if (otpForDev && purposeForDev) {
    setDevOtp(to, purposeForDev, otpForDev);
  }

  // Development fallback when SMTP is not configured
  if (!isSmtpConfigured() || !transporter) {
    if (env.NODE_ENV === 'development') {
      console.log(`\n======================================================`);
      console.log(`[RentCart DEV MAIL]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (otpForDev) {
        console.log(`OTP Code: ${otpForDev} (valid 10 minutes)`);
      }
      console.log(`======================================================\n`);
    }
    return;
  }

  try {
    await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
  } catch (err: any) {
    // If running in development and external SMTP fails, log and fallback gracefully
    if (env.NODE_ENV === 'development') {
      console.warn(`[SMTP Warning] Could not deliver email via SMTP: ${err.message}`);
      if (otpForDev) {
        console.log(`[RentCart DEV MAIL FALLBACK] OTP Code: ${otpForDev}`);
      }
      return;
    }

    const error = new Error('Email delivery service is currently unavailable. Please try again later.');
    (error as any).statusCode = 503;
    throw error;
  }
}

/**
 * Send 6-digit OTP for email verification.
 */
export async function sendEmailVerificationOtp(to: string, otp: string): Promise<void> {
  const subject = 'Verify your RentCart email address';
  const text = `Welcome to RentCart!\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not create a RentCart account, please ignore this email.`;

  const html = renderHtmlEmail(
    subject,
    `Your verification code is ${otp}`,
    `<h2 style="margin-top:0;font-size:20px;font-weight:700;color:#0f172a;">Verify Your Email Address</h2>
     <p class="muted">Welcome to RentCart! Please enter the 6-digit verification code below to activate your account and start sharing with your neighbours:</p>
     <div class="otp-box">
       <p class="otp-code">${otp}</p>
       <div class="otp-caption">⏱️ Valid for 10 minutes</div>
     </div>
     <p class="muted"><strong>Important:</strong> If you did not request this verification code or create a RentCart account, please ignore this email. Your email address remains secure.</p>`
  );

  await dispatchEmail({
    to,
    subject,
    text,
    html,
    otpForDev: otp,
    purposeForDev: 'EMAIL_VERIFICATION',
  });
}

/**
 * Send 6-digit OTP for password reset.
 */
export async function sendPasswordResetOtp(to: string, otp: string): Promise<void> {
  const subject = 'RentCart password reset request';
  const text = `Reset your RentCart password\n\nYour password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, please ignore this email.`;

  const html = renderHtmlEmail(
    subject,
    `Your password reset code is ${otp}`,
    `<h2 style="margin-top:0;font-size:20px;font-weight:700;color:#0f172a;">Password Reset Request</h2>
     <p class="muted">We received a request to reset the password for your RentCart account. Use the 6-digit code below to set a new password:</p>
     <div class="otp-box">
       <p class="otp-code">${otp}</p>
       <div class="otp-caption">⏱️ Valid for 10 minutes</div>
     </div>
     <p class="muted"><strong>Didn't request this?</strong> If you did not request a password reset, you can safely ignore this email. Your existing password will remain unchanged.</p>`
  );

  await dispatchEmail({
    to,
    subject,
    text,
    html,
    otpForDev: otp,
    purposeForDev: 'PASSWORD_RESET',
  });
}

/**
 * Send notification confirming password change.
 */
export async function sendPasswordChangedNotification(to: string): Promise<void> {
  const subject = 'Your RentCart password was changed';
  const text = `Your RentCart password was successfully updated.\n\nIf you did not perform this action, please reset your password immediately or contact our community support.`;

  const html = renderHtmlEmail(
    subject,
    'Your RentCart password was successfully updated',
    `<h2 style="margin-top:0;font-size:20px;font-weight:700;color:#0f172a;">Password Changed Successfully</h2>
     <p class="muted">The password for your RentCart account was recently updated.</p>
     <div style="background:#f8fafc;border-left:4px solid #0F9D8A;padding:16px;border-radius:4px;margin:20px 0;">
       <p style="margin:0;font-size:14px;color:#334155;"><strong>Date & Time:</strong> ${new Date().toUTCString()}</p>
     </div>
     <p class="muted"><strong>Did not make this change?</strong> If you did not change your password, please reset your password immediately using the "Forgot Password" link on the login page.</p>`
  );

  await dispatchEmail({
    to,
    subject,
    text,
    html,
  });
}
