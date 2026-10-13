/**
 * backend/scripts/smoke-test.ts
 * End-to-end smoke test covering email verification and forgot/reset password flows:
 * - Register returns no tokens (requiresVerification: true)
 * - Login blocked before verification (403 EMAIL_NOT_VERIFIED)
 * - Wrong OTP rejected with attemptsLeft
 * - Expired OTP rejected
 * - 5-attempt lockout invalidates OTP
 * - Resend cooldown returns 429 with retryAfterSeconds
 * - Successful verification logs in and returns tokens
 * - Forgot password generic response for unknown emails
 * - Reset password with valid OTP
 * - Old password no longer works, new password works
 * - OTP reuse is rejected
 */

import http from 'http';
import prisma from '../src/prisma/client';
import { createApp } from '../src/app';
import { initSocketIO } from '../src/socket';
import { getDevOtp } from '../src/services/mail.service';
import { OtpPurpose } from '@prisma/client';

const TEST_PORT = 4123;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function postJson(endpoint: string, data: any): Promise<{ status: number; ok: boolean; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

async function runSmokeTests() {
  console.log('🧪 Starting Smoke Tests for Email Verification and Password Reset...\n');

  // Start dedicated test server
  await prisma.$connect();
  const app = createApp();
  const server = http.createServer(app);
  initSocketIO(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => resolve());
  });
  console.log(`✓ Test server running on port ${TEST_PORT}`);

  const testEmail = `test.user.${Date.now()}@example.com`;
  const initialPassword = 'Password123';
  const newPassword = 'NewPassword456';

  try {
    // ── 1. Register returns no tokens ──────────────────────────────────────────
    console.log('\n[1] Testing Register...');
    const regRes = await postJson('/auth/register', {
      name: 'Smoke Tester',
      email: testEmail,
      password: initialPassword,
    });

    if (regRes.status !== 201 || !regRes.data.data.requiresVerification || regRes.data.data.accessToken) {
      throw new Error(`Register failed: ${JSON.stringify(regRes.data)}`);
    }
    console.log('✓ Register returned 201 with requiresVerification: true and NO tokens');

    // ── 2. Login blocked before verification ───────────────────────────────────
    console.log('\n[2] Testing Login before verification...');
    const loginUnverified = await postJson('/auth/login', {
      email: testEmail,
      password: initialPassword,
    });

    if (loginUnverified.status !== 403 || loginUnverified.data.code !== 'EMAIL_NOT_VERIFIED') {
      throw new Error(`Login was not blocked: ${JSON.stringify(loginUnverified.data)}`);
    }
    console.log('✓ Login blocked with 403 and code: EMAIL_NOT_VERIFIED');

    // Fetch the OTP from dev storage
    const otp1 = getDevOtp(testEmail);
    if (!otp1) throw new Error('Dev OTP was not generated/stored');
    console.log(`✓ Generated OTP code: ${otp1}`);

    // ── 3. Wrong OTP returns attemptsLeft ──────────────────────────────────────
    console.log('\n[3] Testing Wrong OTP...');
    const wrongOtpRes = await postJson('/auth/verify-email', {
      email: testEmail,
      otp: '000000',
    });

    if (wrongOtpRes.status !== 400 || wrongOtpRes.data.attemptsLeft !== 4) {
      throw new Error(`Wrong OTP response unexpected: ${JSON.stringify(wrongOtpRes.data)}`);
    }
    console.log(`✓ Wrong OTP rejected with 400 and attemptsLeft: ${wrongOtpRes.data.attemptsLeft}`);

    // ── 4. 5-attempt lockout ───────────────────────────────────────────────────
    console.log('\n[4] Testing 5-attempt lockout...');
    for (let i = 0; i < 4; i++) {
      await postJson('/auth/verify-email', {
        email: testEmail,
        otp: '000000',
      });
    }

    const lockedRes = await postJson('/auth/verify-email', {
      email: testEmail,
      otp: otp1, // Even the correct code is now rejected because attempts reached 5
    });

    if (lockedRes.status !== 400 || lockedRes.data.attemptsLeft !== 0) {
      throw new Error(`Lockout test failed: ${JSON.stringify(lockedRes.data)}`);
    }
    console.log('✓ Code invalidated after 5 wrong attempts (lockout enforced)');

    // ── 5. Resend cooldown ─────────────────────────────────────────────────────
    console.log('\n[5] Testing Resend Cooldown (60s)...');
    const cooldownRes = await postJson('/auth/resend-otp', {
      email: testEmail,
      purpose: 'EMAIL_VERIFICATION',
    });

    if (cooldownRes.status !== 429 || typeof cooldownRes.data.retryAfterSeconds !== 'number') {
      throw new Error(`Resend cooldown not enforced: ${JSON.stringify(cooldownRes.data)}`);
    }
    console.log(`✓ Resend rejected with 429 and retryAfterSeconds: ${cooldownRes.data.retryAfterSeconds}`);

    // ── 6. Expired OTP handling ───────────────────────────────────────────────
    console.log('\n[6] Testing Expired OTP...');
    // Manually backdate the OTP created time and expiresAt in DB to simulate expired state
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!user) throw new Error('User not found in DB');

    await prisma.otpCode.deleteMany({ where: { userId: user.id } }); // Clear previous OTPs
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        codeHash: 'fake_hash',
        expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
        attempts: 0,
      },
    });

    const expiredRes = await postJson('/auth/verify-email', {
      email: testEmail,
      otp: '123456',
    });

    if (expiredRes.status !== 400) {
      throw new Error(`Expired OTP not rejected with 400: ${JSON.stringify(expiredRes.data)}`);
    }
    console.log('✓ Expired OTP rejected with 400');

    // ── 7. Successful verification ────────────────────────────────────────────
    console.log('\n[7] Testing Successful Email Verification...');
    // Clear backdated code and request a fresh one
    await prisma.otpCode.deleteMany({ where: { userId: user.id } });
    const freshResend = await postJson('/auth/resend-otp', {
      email: testEmail,
      purpose: 'EMAIL_VERIFICATION',
    });
    if (freshResend.status !== 200) throw new Error('Fresh resend failed');

    const validOtp = getDevOtp(testEmail);
    if (!validOtp) throw new Error('No valid OTP found');

    const verifyRes = await postJson('/auth/verify-email', {
      email: testEmail,
      otp: validOtp,
    });

    if (verifyRes.status !== 200 || !verifyRes.data.data.accessToken || !verifyRes.data.data.user.emailVerified) {
      throw new Error(`Verification failed: ${JSON.stringify(verifyRes.data)}`);
    }
    console.log('✓ Email verified successfully, tokens returned, emailVerified = true');

    // ── 8. OTP reuse is rejected ───────────────────────────────────────────────
    console.log('\n[8] Testing OTP reuse prevention...');
    const reuseRes = await postJson('/auth/verify-email', {
      email: testEmail,
      otp: validOtp,
    });

    if (reuseRes.status !== 400) {
      throw new Error('Consumed OTP was reused!');
    }
    console.log('✓ Re-using consumed OTP is rejected with 400');

    // ── 9. Forgot password generic response for unknown email ─────────────────
    console.log('\n[9] Testing Forgot Password generic response for unknown email...');
    const forgotUnknownRes = await postJson('/auth/forgot-password', {
      email: 'nonexistent.user.12345@example.com',
    });

    if (forgotUnknownRes.status !== 200 || !forgotUnknownRes.data.data.message) {
      throw new Error(`Forgot password unknown email failed: ${JSON.stringify(forgotUnknownRes.data)}`);
    }
    console.log('✓ Unknown email received generic 200 response (no enumeration)');

    // ── 10. Reset password with valid OTP ─────────────────────────────────────
    console.log('\n[10] Testing Reset Password flow...');
    // Request reset OTP for our verified test user
    await prisma.otpCode.deleteMany({ where: { userId: user.id } }); // Clear previous OTPs to bypass 60s cooldown
    const forgotRes = await postJson('/auth/forgot-password', {
      email: testEmail,
    });
    if (forgotRes.status !== 200) throw new Error('Forgot password request failed');

    const resetOtp = getDevOtp(testEmail);
    if (!resetOtp) throw new Error('Reset OTP not generated');
    console.log(`✓ Password reset OTP generated: ${resetOtp}`);

    const resetRes = await postJson('/auth/reset-password', {
      email: testEmail,
      otp: resetOtp,
      newPassword: newPassword,
    });

    if (resetRes.status !== 200) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetRes.data)}`);
    }
    console.log('✓ Password reset successfully with valid OTP');

    // ── 11. Old password no longer works, new password does ────────────────────
    console.log('\n[11] Verifying Old vs New Password...');
    const oldLoginRes = await postJson('/auth/login', {
      email: testEmail,
      password: initialPassword,
    });

    if (oldLoginRes.status !== 401) {
      throw new Error('Old password was still accepted!');
    }
    console.log('✓ Old password rejected with 401');

    const newLoginRes = await postJson('/auth/login', {
      email: testEmail,
      password: newPassword,
    });

    if (newLoginRes.status !== 200 || !newLoginRes.data.data.accessToken) {
      throw new Error(`New password failed to login: ${JSON.stringify(newLoginRes.data)}`);
    }
    console.log('✓ New password logged in successfully!');

    console.log('\n======================================================');
    console.log('🎉 ALL BACKEND SMOKE TESTS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    // Cleanup test user and close server
    try {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    } catch {}
    await prisma.$disconnect();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
