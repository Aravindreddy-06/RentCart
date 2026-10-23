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
import { io as ioClient } from 'socket.io-client';
import { signAccessToken } from '../src/utils/jwt';

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

async function req(
  endpoint: string,
  method = 'GET',
  data?: any,
  token?: string,
): Promise<{ status: number; ok: boolean; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  const json: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

async function uploadMultipart(
  endpoint: string,
  formData: FormData,
  token?: string,
): Promise<{ status: number; ok: boolean; data: any }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
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
  const ownerEmail = `owner.${Date.now()}@example.com`;
  const borrowerEmail = `borrower.${Date.now()}@example.com`;
  const strangerEmail = `stranger.${Date.now()}@example.com`;
  const noProfileOwnerEmail = `noprofile.owner.${Date.now()}@example.com`;
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

    // ── PICKUP LOCATION & LIVE TRACKING TESTS ─────────────────────────────
    console.log('\n======================================================');
    console.log('📍 Starting Pickup Location & Live Tracking Smoke Tests...');
    console.log('======================================================\n');

    const owner = await prisma.user.create({
      data: {
        name: 'Alice Owner',
        email: ownerEmail,
        passwordHash: 'dummy',
        address: '742 Evergreen Terrace, Springfield',
        latitude: 37.7749,
        longitude: -122.4194,
        emailVerified: true,
      },
    });
    const ownerToken = signAccessToken({ userId: owner.id, email: owner.email });

    const noProfileOwner = await prisma.user.create({
      data: {
        name: 'No Profile Owner',
        email: noProfileOwnerEmail,
        passwordHash: 'dummy',
        address: null,
        latitude: null,
        longitude: null,
        emailVerified: true,
      },
    });
    const noProfileOwnerToken = signAccessToken({ userId: noProfileOwner.id, email: noProfileOwner.email });

    const borrower = await prisma.user.create({
      data: {
        name: 'Bob Borrower',
        email: borrowerEmail,
        passwordHash: 'dummy',
        emailVerified: true,
      },
    });
    const borrowerToken = signAccessToken({ userId: borrower.id, email: borrower.email });

    const stranger = await prisma.user.create({
      data: {
        name: 'Charlie Stranger',
        email: strangerEmail,
        passwordHash: 'dummy',
        emailVerified: true,
      },
    });
    const strangerToken = signAccessToken({ userId: stranger.id, email: stranger.email });

    // Create item for owner
    const item = await prisma.item.create({
      data: {
        ownerId: owner.id,
        title: 'Cordless Leaf Blower',
        description: 'Powerful handheld leaf blower with battery.',
        category: 'Tools',
        pricePerDay: 20,
        deposit: 50,
        isAvailable: true,
      },
    });

    // Create item for noProfileOwner
    const itemNoProfile = await prisma.item.create({
      data: {
        ownerId: noProfileOwner.id,
        title: 'Hedge Trimmer',
        description: 'Electric hedge trimmer for garden work.',
        category: 'Tools',
        pricePerDay: 15,
        deposit: 30,
        isAvailable: true,
      },
    });

    // ── 12. Approve without pickup point uses profile fallback ───────────────
    console.log('\n[12] Testing Approve with profile location fallback...');
    // Request rental on owner's item
    const rentRes1 = await req(
      '/rentals',
      'POST',
      {
        itemId: item.id,
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        borrowerNote: 'Need for weekend yard cleaning',
      },
      borrowerToken,
    );
    if (rentRes1.status !== 201) throw new Error(`Create rental failed: ${JSON.stringify(rentRes1.data)}`);
    const rental1Id = rentRes1.data.data.id;

    // Approve with empty body {} -> should fallback to owner profile location and address
    const approveRes1 = await req(`/rentals/${rental1Id}/approve`, 'PATCH', {}, ownerToken);
    if (approveRes1.status !== 200) throw new Error(`Approve fallback failed: ${JSON.stringify(approveRes1.data)}`);
    const approvedRental = approveRes1.data.data;
    if (
      approvedRental.pickupLatitude !== 37.7749 ||
      approvedRental.pickupLongitude !== -122.4194 ||
      approvedRental.pickupAddress !== '742 Evergreen Terrace, Springfield'
    ) {
      throw new Error(`Profile fallback location mismatch: ${JSON.stringify(approvedRental)}`);
    }
    console.log('✓ Approve without pickup point used owner profile location and address fallback');

    // Test that approve without profile location returns 400
    const rentResNoProfile = await req(
      '/rentals',
      'POST',
      {
        itemId: itemNoProfile.id,
        startDate: '2026-11-20',
        endDate: '2026-11-22',
      },
      borrowerToken,
    );
    const rentalNoProfileId = rentResNoProfile.data.data.id;
    const approveFailRes = await req(`/rentals/${rentalNoProfileId}/approve`, 'PATCH', {}, noProfileOwnerToken);
    if (approveFailRes.status !== 400) {
      throw new Error(`Expected 400 when owner has no location, got: ${approveFailRes.status}`);
    }
    console.log('✓ Approve returns 400 when owner has no location and body omitted pickup point');

    // ── 13. Borrower can read pickup only while APPROVED or ACTIVE ────────────
    console.log('\n[13] Testing Borrower pickup visibility while APPROVED or ACTIVE...');
    const borrowerGetPickupApproved = await req(`/rentals/${rental1Id}/pickup`, 'GET', undefined, borrowerToken);
    if (borrowerGetPickupApproved.status !== 200 || borrowerGetPickupApproved.data.data.pickupLatitude !== 37.7749) {
      throw new Error(`Borrower GET /pickup failed while APPROVED: ${JSON.stringify(borrowerGetPickupApproved.data)}`);
    }

    const borrowerGetRentalApproved = await req(`/rentals/${rental1Id}`, 'GET', undefined, borrowerToken);
    if (borrowerGetRentalApproved.data.data.pickupLatitude !== 37.7749) {
      throw new Error(`Borrower GET /rentals/:id did not include pickup while APPROVED`);
    }
    console.log('✓ Borrower can read pickup location while APPROVED');

    // Activate without confirmWithoutPin returns 400
    const activateFail = await req(`/rentals/${rental1Id}/activate`, 'PATCH', undefined, ownerToken);
    if (activateFail.status !== 400) {
      throw new Error(`Expected 400 for activate without confirmWithoutPin, got: ${activateFail.status}`);
    }

    // Activate rental with confirmWithoutPin: true
    const activateRes = await req(`/rentals/${rental1Id}/activate`, 'PATCH', { confirmWithoutPin: true }, ownerToken);
    if (activateRes.status !== 200) throw new Error(`Activate failed: ${JSON.stringify(activateRes.data)}`);

    const borrowerGetPickupActive = await req(`/rentals/${rental1Id}/pickup`, 'GET', undefined, borrowerToken);
    if (borrowerGetPickupActive.status !== 200 || borrowerGetPickupActive.data.data.pickupLatitude !== 37.7749) {
      throw new Error(`Borrower GET /pickup failed while ACTIVE: ${JSON.stringify(borrowerGetPickupActive.data)}`);
    }
    console.log('✓ Borrower can read pickup location while ACTIVE');

    // ── 14. 403 after RETURNED or CANCELLED ────────────────────────────────────
    console.log('\n[14] Testing 403 after RETURNED or CANCELLED...');
    // Return rental1
    const returnRes = await req(`/rentals/${rental1Id}/return`, 'PATCH', undefined, ownerToken);
    if (returnRes.status !== 200) throw new Error(`Return failed: ${JSON.stringify(returnRes.data)}`);

    const borrowerGetPickupReturned = await req(`/rentals/${rental1Id}/pickup`, 'GET', undefined, borrowerToken);
    if (borrowerGetPickupReturned.status !== 403) {
      throw new Error(`Expected 403 for GET /pickup after RETURNED, got ${borrowerGetPickupReturned.status}`);
    }

    const borrowerGetRentalReturned = await req(`/rentals/${rental1Id}`, 'GET', undefined, borrowerToken);
    if (
      borrowerGetRentalReturned.data.data.pickupLatitude !== null ||
      borrowerGetRentalReturned.data.data.pickupAddress !== null
    ) {
      throw new Error(`Pickup coordinates returned to borrower after RETURNED: ${JSON.stringify(borrowerGetRentalReturned.data)}`);
    }
    console.log('✓ Borrower gets 403 and null coordinates after rental is RETURNED');

    // Test cancelled rental
    const rentRes2 = await req(
      '/rentals',
      'POST',
      {
        itemId: item.id,
        startDate: '2026-11-25',
        endDate: '2026-11-27',
      },
      borrowerToken,
    );
    const rental2Id = rentRes2.data.data.id;
    await req(`/rentals/${rental2Id}/approve`, 'PATCH', {}, ownerToken);
    const cancelRes = await req(`/rentals/${rental2Id}/cancel`, 'PATCH', undefined, borrowerToken);
    if (cancelRes.status !== 200) throw new Error(`Cancel failed`);

    const borrowerGetPickupCancelled = await req(`/rentals/${rental2Id}/pickup`, 'GET', undefined, borrowerToken);
    if (borrowerGetPickupCancelled.status !== 403) {
      throw new Error(`Expected 403 for GET /pickup after CANCELLED, got ${borrowerGetPickupCancelled.status}`);
    }
    console.log('✓ Borrower gets 403 after rental is CANCELLED');

    // ── 15. Non-participant gets 403 ──────────────────────────────────────────
    console.log('\n[15] Testing Non-participant gets 403...');
    // Create fresh APPROVED rental
    const rentRes3 = await req(
      '/rentals',
      'POST',
      {
        itemId: item.id,
        startDate: '2026-11-28',
        endDate: '2026-11-29',
      },
      borrowerToken,
    );
    const rental3Id = rentRes3.data.data.id;
    await req(`/rentals/${rental3Id}/approve`, 'PATCH', {}, ownerToken);

    const strangerGetPickup = await req(`/rentals/${rental3Id}/pickup`, 'GET', undefined, strangerToken);
    if (strangerGetPickup.status !== 403) {
      throw new Error(`Expected 403 for stranger GET /pickup, got ${strangerGetPickup.status}`);
    }

    const strangerPatchPickup = await req(
      `/rentals/${rental3Id}/pickup`,
      'PATCH',
      {
        pickupLatitude: 10,
        pickupLongitude: 20,
        pickupAddress: 'Hacked address',
      },
      strangerToken,
    );
    if (strangerPatchPickup.status !== 403) {
      throw new Error(`Expected 403 for stranger PATCH /pickup, got ${strangerPatchPickup.status}`);
    }
    console.log('✓ Non-participant gets 403 on pickup endpoints');

    // ── 16. Owner cannot start borrower tracking ──────────────────────────────
    console.log('\n[16] Testing Owner cannot start borrower tracking...');
    const ownerStartTrackingRes = await req(`/rentals/${rental3Id}/tracking/start`, 'POST', {}, ownerToken);
    if (ownerStartTrackingRes.status !== 403) {
      throw new Error(`Expected 403 when owner starts tracking, got: ${ownerStartTrackingRes.status}`);
    }
    console.log('✓ Owner cannot start borrower tracking (403 enforced)');

    // ── 17. Tracking & Socket events ──────────────────────────────────────────
    console.log('\n[17] Testing Live tracking socket events and stranger ignore...');
    const ownerSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });
    const borrowerSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token: borrowerToken },
      transports: ['websocket'],
    });
    const strangerSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token: strangerToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count === 3) resolve();
      };
      ownerSocket.on('connect', check);
      borrowerSocket.on('connect', check);
      strangerSocket.on('connect', check);
    });
    console.log('✓ Sockets connected successfully');

    // Borrower starts tracking
    const startRes = await req(
      `/rentals/${rental3Id}/tracking/start`,
      'POST',
      { latitude: 37.76, longitude: -122.41 },
      borrowerToken,
    );
    if (startRes.status !== 200) throw new Error(`Borrower start tracking failed: ${JSON.stringify(startRes.data)}`);

    // Non-borrower socket emits tracking:update -> should be ignored
    strangerSocket.emit('tracking:update', {
      rentalId: rental3Id,
      latitude: 10.1234,
      longitude: 20.5678,
      heading: 0,
    });
    await new Promise((r) => setTimeout(r, 200));

    const checkLiveLoc = await prisma.liveLocation.findUnique({ where: { rentalId: rental3Id } });
    if (!checkLiveLoc || checkLiveLoc.latitude === 10.1234) {
      throw new Error('Stranger tracking:update was NOT ignored!');
    }
    console.log('✓ tracking:update from non-borrower was safely ignored');

    // Owner receives tracking:location
    const locationPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for tracking:location event')), 5000);
      ownerSocket.on('tracking:location', (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    // Borrower emits legitimate update
    borrowerSocket.emit('tracking:update', {
      rentalId: rental3Id,
      latitude: 37.771,
      longitude: -122.418,
      heading: 45,
    });

    const receivedLocation = await locationPromise;
    if (
      receivedLocation.rentalId !== rental3Id ||
      receivedLocation.latitude !== 37.771 ||
      receivedLocation.longitude !== -122.418 ||
      typeof receivedLocation.etaMinutes !== 'number'
    ) {
      throw new Error(`Owner received unexpected tracking:location: ${JSON.stringify(receivedLocation)}`);
    }
    console.log(`✓ Owner received tracking:location with ETA (${receivedLocation.etaMinutes} min)`);

    ownerSocket.disconnect();
    borrowerSocket.disconnect();
    strangerSocket.disconnect();

    // ── 18. Auto-stop tracking on status change ───────────────────────────────
    console.log('\n[18] Testing Auto-stop tracking on status change...');
    // While tracking is active, owner activates rental with confirmWithoutPin
    const act3Res = await req(`/rentals/${rental3Id}/activate`, 'PATCH', { confirmWithoutPin: true }, ownerToken);
    if (act3Res.status !== 200) throw new Error(`Activate rental3 failed: ${JSON.stringify(act3Res.data)}`);
    const liveLocAfterStatus = await prisma.liveLocation.findUnique({ where: { rentalId: rental3Id } });
    if (liveLocAfterStatus !== null) {
      throw new Error('LiveLocation row was not deleted when rental was activated!');
    }
    console.log('✓ LiveLocation row automatically cleaned up on status transition away from APPROVED');

    // ── 19. Privacy checks: pickup point never appears in GET /api/items or public profiles ──
    console.log('\n[19] Testing Privacy checks in items and public profiles...');
    const itemsRes = await req('/items', 'GET', undefined, borrowerToken);
    if (itemsRes.status !== 200) throw new Error(`GET /items failed: ${itemsRes.status} ${JSON.stringify(itemsRes.data)}`);
    const itemsList = itemsRes.data.data.items || itemsRes.data.data;
    for (const itm of itemsList) {
      if ('pickupLatitude' in itm || 'pickupLongitude' in itm || 'pickupAddress' in itm || 'pickupNote' in itm) {
        throw new Error('Pickup field leaked in GET /api/items listing!');
      }
    }

    const singleItemRes = await req(`/items/${item.id}`, 'GET', undefined, borrowerToken);
    if (singleItemRes.status !== 200) throw new Error(`GET /items/:id failed: ${singleItemRes.status} ${JSON.stringify(singleItemRes.data)}`);
    const singleItem = singleItemRes.data.data;
    if ('pickupLatitude' in singleItem || 'pickupLongitude' in singleItem || 'pickupAddress' in singleItem || 'pickupNote' in singleItem) {
      throw new Error('Pickup field leaked in GET /api/items/:id!');
    }

    const publicProfileRes = await req(`/users/${owner.id}`, 'GET', undefined, borrowerToken);
    if (publicProfileRes.status !== 200) throw new Error(`GET /users/:id failed: ${publicProfileRes.status} ${JSON.stringify(publicProfileRes.data)}`);
    const publicProfile = publicProfileRes.data.data;
    if ('pickupLatitude' in publicProfile || 'pickupLongitude' in publicProfile || 'pickupAddress' in publicProfile || 'pickupNote' in publicProfile) {
      throw new Error('Pickup field leaked in public user profile!');
    }
    console.log('✓ Privacy checks passed: pickup location never leaked in items or public profiles');

    // ── 20. INDIA LOCALIZATION TESTS ──────────────────────────────────────────
    console.log('\n======================================================');
    console.log('🇮🇳 Starting India Localization Smoke Tests...');
    console.log('======================================================\n');

    // A. Invalid phone numbers return 400
    console.log('\n[20.1] Testing Invalid Indian Phone Numbers Return 400...');
    const invalidPhone1 = await postJson('/auth/register', {
      name: 'Invalid Phone Tester',
      email: `invalid.phone1.${Date.now()}@example.com`,
      password: initialPassword,
      phone: '1234567890', // Starts with 1
    });
    if (invalidPhone1.status !== 400 || !invalidPhone1.data.message.includes('10-digit Indian mobile number')) {
      throw new Error(`Expected 400 for 1234567890, got: ${invalidPhone1.status} ${JSON.stringify(invalidPhone1.data)}`);
    }

    const invalidPhone2 = await postJson('/auth/register', {
      name: 'Invalid Phone Tester 2',
      email: `invalid.phone2.${Date.now()}@example.com`,
      password: initialPassword,
      phone: '5123456789', // Starts with 5
    });
    if (invalidPhone2.status !== 400 || !invalidPhone2.data.message.includes('10-digit Indian mobile number')) {
      throw new Error(`Expected 400 for 5123456789, got: ${invalidPhone2.status} ${JSON.stringify(invalidPhone2.data)}`);
    }
    console.log('✓ Invalid phone numbers (1234567890, 5xxxxxxxxx) rejected with 400');

    // B. Phone normalization variants
    console.log('\n[20.2] Testing Phone Normalization Variants...');
    const phoneVariants = [
      { input: '9876543210', expected: '+919876543210' },
      { input: '09876543210', expected: '+919876543210' },
      { input: '+91 98765 43210', expected: '+919876543210' },
      { input: '91-9876543210', expected: '+919876543210' },
    ];

    for (let i = 0; i < phoneVariants.length; i++) {
      const variant = phoneVariants[i];
      const variantEmail = `phone.variant.${i}.${Date.now()}@example.com`;
      const vRegRes = await postJson('/auth/register', {
        name: `Phone Variant ${i}`,
        email: variantEmail,
        password: initialPassword,
        phone: variant.input,
      });

      if (vRegRes.status !== 201) {
        throw new Error(`Variant ${variant.input} registration failed: ${JSON.stringify(vRegRes.data)}`);
      }

      const createdUser = await prisma.user.findUnique({ where: { email: variantEmail } });
      if (!createdUser || createdUser.phone !== variant.expected) {
        throw new Error(`Expected normalized phone ${variant.expected}, got ${createdUser?.phone} for input ${variant.input}`);
      }

      await prisma.user.delete({ where: { email: variantEmail } });
    }
    console.log('✓ All Indian phone variants ("9876543210", "09876543210", "+91 98765 43210", "91-9876543210") normalized to E.164 +919876543210');

    // C. Existing users can still log in
    console.log('\n[20.3] Testing Existing Seed Users Can Still Log In...');
    const bcryptModule = await import('bcryptjs');
    await prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {
        passwordHash: await bcryptModule.default.hash('password123', 10),
        emailVerified: true,
      },
      create: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+919876543210',
        passwordHash: await bcryptModule.default.hash('password123', 10),
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
        address: '12 Maple Street, Springfield',
        latitude: 37.7749,
        longitude: -122.4194,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const aliceLoginRes = await postJson('/auth/login', {
      email: 'alice@example.com',
      password: 'password123',
    });
    if (aliceLoginRes.status !== 200 || !aliceLoginRes.data.data.accessToken) {
      throw new Error(`Existing seed user login failed: ${aliceLoginRes.status} ${JSON.stringify(aliceLoginRes.data)}`);
    }
    console.log('✓ Existing user (alice@example.com) successfully logged in');

    // D. Prices round-trip unchanged and responses include currency "INR"
    console.log('\n[20.4] Testing Prices Round-Trip Unchanged & Currency "INR"...');
    const testPricePerDay = 175.5;
    const testDeposit = 550;

    const createItemWithPrice = await req(
      '/items',
      'POST',
      {
        title: 'INR Test Drill Item',
        description: 'Cordless drill for testing Indian rupee localization.',
        category: 'Tools',
        pricePerDay: testPricePerDay,
        deposit: testDeposit,
      },
      ownerToken,
    );

    if (createItemWithPrice.status !== 201) {
      throw new Error(`Create item with price failed: ${JSON.stringify(createItemWithPrice.data)}`);
    }

    const createdItemData = createItemWithPrice.data.data;
    if (createdItemData.currency !== 'INR') {
      throw new Error(`Expected currency "INR" in item creation, got: ${createdItemData.currency}`);
    }
    if (createdItemData.pricePerDay !== testPricePerDay || createdItemData.deposit !== testDeposit) {
      throw new Error(`Price corrupted on creation: pricePerDay=${createdItemData.pricePerDay}, deposit=${createdItemData.deposit}`);
    }

    // Retrieve via GET /items/:id
    const getItemRes = await req(`/items/${createdItemData.id}`, 'GET', undefined, borrowerToken);
    if (getItemRes.status !== 200) throw new Error(`GET /items/:id failed: ${JSON.stringify(getItemRes.data)}`);
    const fetchedItem = getItemRes.data.data;

    if (fetchedItem.currency !== 'INR') {
      throw new Error(`Expected currency "INR" in GET /items/:id, got: ${fetchedItem.currency}`);
    }
    if (fetchedItem.pricePerDay !== testPricePerDay || fetchedItem.deposit !== testDeposit) {
      throw new Error(`Prices did not round-trip unchanged! expected ${testPricePerDay}/${testDeposit}, got ${fetchedItem.pricePerDay}/${fetchedItem.deposit}`);
    }
    console.log('✓ Prices round-trip unchanged without corruption');
    console.log('✓ Item responses include currency: "INR"');

    // Rental response includes currency: "INR"
    const testRentalRes = await req(
      '/rentals',
      'POST',
      {
        itemId: createdItemData.id,
        startDate: '2026-12-01',
        endDate: '2026-12-03', // 3 days
      },
      borrowerToken,
    );
    if (testRentalRes.status !== 201) {
      throw new Error(`Create test rental failed: ${JSON.stringify(testRentalRes.data)}`);
    }
    const testRentalData = testRentalRes.data.data;
    if (testRentalData.currency !== 'INR') {
      throw new Error(`Expected currency "INR" in rental response, got: ${testRentalData.currency}`);
    }
    if (testRentalData.item?.currency !== 'INR') {
      throw new Error(`Expected currency "INR" in rental.item, got: ${testRentalData.item?.currency}`);
    }
    console.log('✓ Rental responses include currency: "INR"');

    // ── 21. HANDOVER PIN FLOW TESTS ───────────────────────────────────────────
    console.log('\n======================================================');
    console.log('🔑 Starting Handover PIN Smoke Tests...');
    console.log('======================================================\n');

    // 21.1 Request and approve a new rental, verify PIN generated and HANDOVER_PIN_READY notification
    console.log('[21.1] Testing PIN generated on approve & HANDOVER_PIN_READY notification...');
    const pinRentalReq = await req(
      '/rentals',
      'POST',
      {
        itemId: item.id,
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        borrowerNote: 'Testing handover PIN flow',
      },
      borrowerToken,
    );
    if (pinRentalReq.status !== 201) throw new Error(`Create pin test rental failed: ${JSON.stringify(pinRentalReq.data)}`);
    const pinRentalId = pinRentalReq.data.data.id;

    const approvePinRes = await req(
      `/rentals/${pinRentalId}/approve`,
      'PATCH',
      {
        pickupLatitude: 37.7749,
        pickupLongitude: -122.4194,
        pickupAddress: '742 Evergreen Terrace, Springfield',
      },
      ownerToken,
    );
    if (approvePinRes.status !== 200) throw new Error(`Approve pin rental failed: ${JSON.stringify(approvePinRes.data)}`);
    console.log('✓ Rental approved successfully');

    // Check borrower received HANDOVER_PIN_READY notification and PIN is NOT in the text
    const borrowerNotifsRes = await req('/notifications', 'GET', undefined, borrowerToken);
    const pinNotif = borrowerNotifsRes.data.data?.notifications?.find(
      (n: any) => n.type === 'HANDOVER_PIN_READY' && n.data?.rentalId === pinRentalId,
    );
    if (!pinNotif) throw new Error('HANDOVER_PIN_READY notification not received by borrower');
    if (!pinNotif.body.includes('Your pickup PIN is ready') || /\b\d{4}\b/.test(pinNotif.body)) {
      throw new Error(`Notification text contains unexpected PIN or wrong message: ${pinNotif.body}`);
    }
    console.log('✓ Borrower received HANDOVER_PIN_READY notification with no PIN in text');

    // 21.2 Borrower can read it while APPROVED
    console.log('\n[21.2] Testing borrower can read PIN while APPROVED...');
    const borrowerGetPin = await req(`/rentals/${pinRentalId}/handover-pin`, 'GET', undefined, borrowerToken);
    if (borrowerGetPin.status !== 200 || !borrowerGetPin.data.data.pin || !/^\d{4}$/.test(borrowerGetPin.data.data.pin)) {
      throw new Error(`Borrower failed to read valid 4-digit PIN: ${JSON.stringify(borrowerGetPin.data)}`);
    }
    const realPin = borrowerGetPin.data.data.pin;
    console.log('✓ Borrower successfully read 4-digit PIN');

    // 21.3 Owner gets 403 reading it
    console.log('\n[21.3] Testing owner gets 403 reading PIN...');
    const ownerGetPin = await req(`/rentals/${pinRentalId}/handover-pin`, 'GET', undefined, ownerToken);
    if (ownerGetPin.status !== 403) {
      throw new Error(`Expected 403 for owner reading PIN, got: ${ownerGetPin.status}`);
    }
    console.log('✓ Owner gets 403 reading PIN');

    // 21.4 Third user gets 403
    console.log('\n[21.4] Testing third user gets 403 reading PIN...');
    const strangerGetPin = await req(`/rentals/${pinRentalId}/handover-pin`, 'GET', undefined, strangerToken);
    if (strangerGetPin.status !== 403) {
      throw new Error(`Expected 403 for third user reading PIN, got: ${strangerGetPin.status}`);
    }
    console.log('✓ Third user (stranger) gets 403 reading PIN');

    // 21.5 Malformed PIN returns 400
    console.log('\n[21.5] Testing malformed PIN returns 400...');
    const malformed1 = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: '12' }, ownerToken);
    if (malformed1.status !== 400) throw new Error(`Expected 400 for 2-digit PIN, got: ${malformed1.status}`);

    const malformed2 = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: 'abcd' }, ownerToken);
    if (malformed2.status !== 400) throw new Error(`Expected 400 for non-numeric PIN, got: ${malformed2.status}`);

    const malformed3 = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', {}, ownerToken);
    if (malformed3.status !== 400) throw new Error(`Expected 400 for missing PIN, got: ${malformed3.status}`);
    console.log('✓ Malformed PINs (too short, non-numeric, empty) return 400');

    // 21.6 Wrong PIN returns 400 with attemptsLeft
    console.log('\n[21.6] Testing wrong PIN returns 400 with attemptsLeft...');
    const bogusPin = realPin === '0000' ? '9999' : '0000';
    const wrongPinRes1 = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: bogusPin }, ownerToken);
    if (wrongPinRes1.status !== 400 || wrongPinRes1.data.attemptsLeft !== 4) {
      throw new Error(`Expected 400 and attemptsLeft=4, got: ${wrongPinRes1.status} ${JSON.stringify(wrongPinRes1.data)}`);
    }
    console.log(`✓ Wrong PIN rejected with 400 and attemptsLeft: ${wrongPinRes1.data.attemptsLeft}`);

    // 21.7 5 wrong attempts then 429 with retryAfterSeconds
    console.log('\n[21.7] Testing 5 wrong attempts locks rental with 429...');
    for (let i = 2; i <= 4; i++) {
      const resp = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: bogusPin }, ownerToken);
      if (resp.status !== 400 || resp.data.attemptsLeft !== 5 - i) {
        throw new Error(`Unexpected attempt ${i} response: ${JSON.stringify(resp.data)}`);
      }
    }

    // 5th attempt triggers lockout
    const fifthAttempt = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: bogusPin }, ownerToken);
    if (fifthAttempt.status !== 429 || typeof fifthAttempt.data.retryAfterSeconds !== 'number') {
      throw new Error(`Expected 429 with retryAfterSeconds on 5th wrong attempt, got: ${fifthAttempt.status} ${JSON.stringify(fifthAttempt.data)}`);
    }
    console.log(`✓ 5th wrong attempt returned 429 with retryAfterSeconds: ${fifthAttempt.data.retryAfterSeconds}`);

    // Subsequent attempt while locked also returns 429
    const lockedAttempt = await req(`/rentals/${pinRentalId}/handover/verify`, 'POST', { pin: realPin }, ownerToken);
    if (lockedAttempt.status !== 429) {
      throw new Error(`Expected 429 while locked even with correct PIN, got: ${lockedAttempt.status}`);
    }
    console.log('✓ Subsequent attempt while locked returns 429');

    // 21.8 Correct PIN makes the rental ACTIVE & emits notifications
    console.log('\n[21.8] Testing correct PIN verification makes rental ACTIVE...');
    // Create another approved rental for successful verification test
    const successRentalReq = await req(
      '/rentals',
      'POST',
      {
        itemId: item.id,
        startDate: '2026-12-15',
        endDate: '2026-12-17',
      },
      borrowerToken,
    );
    const successRentalId = successRentalReq.data.data.id;
    await req(
      `/rentals/${successRentalId}/approve`,
      'PATCH',
      {
        pickupLatitude: 37.7749,
        pickupLongitude: -122.4194,
        pickupAddress: '742 Evergreen Terrace, Springfield',
      },
      ownerToken,
    );

    // Borrower fetches the PIN
    const successBorrowerPinRes = await req(`/rentals/${successRentalId}/handover-pin`, 'GET', undefined, borrowerToken);
    const successPin = successBorrowerPinRes.data.data.pin;

    // Owner verifies with correct PIN
    const verifySuccessRes = await req(`/rentals/${successRentalId}/handover/verify`, 'POST', { pin: successPin }, ownerToken);
    if (verifySuccessRes.status !== 200 || verifySuccessRes.data.data.status !== 'ACTIVE') {
      throw new Error(`Verification with correct PIN failed: ${verifySuccessRes.status} ${JSON.stringify(verifySuccessRes.data)}`);
    }
    console.log('✓ Verification succeeded! Rental status transitioned to ACTIVE');

    // Check HANDOVER_CONFIRMED notification for both users
    const bNotifs = await req('/notifications', 'GET', undefined, borrowerToken);
    const bHandoverConfirmed = bNotifs.data.data?.notifications?.find(
      (n: any) => n.type === 'HANDOVER_CONFIRMED' && n.data?.rentalId === successRentalId,
    );
    if (!bHandoverConfirmed) throw new Error('Borrower did not receive HANDOVER_CONFIRMED notification');

    const oNotifs = await req('/notifications', 'GET', undefined, ownerToken);
    const oHandoverConfirmed = oNotifs.data.data?.notifications?.find(
      (n: any) => n.type === 'HANDOVER_CONFIRMED' && n.data?.rentalId === successRentalId,
    );
    if (!oHandoverConfirmed) throw new Error('Owner did not receive HANDOVER_CONFIRMED notification');
    console.log('✓ Both borrower and owner received HANDOVER_CONFIRMED notification');

    // 21.9 PIN unavailable after ACTIVE
    console.log('\n[21.9] Testing PIN is unavailable after rental becomes ACTIVE...');
    const pinAfterActive = await req(`/rentals/${successRentalId}/handover-pin`, 'GET', undefined, borrowerToken);
    if (pinAfterActive.status !== 409) {
      throw new Error(`Expected 409 for reading PIN after ACTIVE, got: ${pinAfterActive.status}`);
    }
    console.log('✓ GET /handover-pin returns 409 after rental is ACTIVE');

    // 21.10 PIN never appears in rental details, lists, items, or notifications
    console.log('\n[21.10] Testing PIN privacy across all endpoints...');
    const getRentalRes = await req(`/rentals/${successRentalId}`, 'GET', undefined, borrowerToken);
    const rentalObj = getRentalRes.data.data;
    if (
      'handoverPinHash' in rentalObj ||
      'handoverPinEnc' in rentalObj ||
      'handoverPinCreatedAt' in rentalObj ||
      'handoverPinAttempts' in rentalObj ||
      'handoverPinLockedUntil' in rentalObj
    ) {
      throw new Error('PIN field leaked in GET /api/rentals/:id!');
    }

    const mineRes = await req('/rentals/mine', 'GET', undefined, borrowerToken);
    const myRentals = mineRes.data.data.rentals || mineRes.data.data;
    for (const r of myRentals) {
      if ('handoverPinHash' in r || 'handoverPinEnc' in r) {
        throw new Error('PIN field leaked in GET /api/rentals/mine!');
      }
    }

    const incomingRes = await req('/rentals/incoming', 'GET', undefined, ownerToken);
    const incomingRentals = incomingRes.data.data.rentals || incomingRes.data.data;
    for (const r of incomingRentals) {
      if ('handoverPinHash' in r || 'handoverPinEnc' in r) {
        throw new Error('PIN field leaked in GET /api/rentals/incoming!');
      }
    }
    console.log('✓ Privacy verified: PIN fields never appear in rental details, lists, or items');

    // 21.11 Lazy PIN generation for existing APPROVED rental without PIN
    console.log('\n[21.11] Testing lazy PIN generation for approved rental without PIN...');
    // Create an approved rental manually without PIN fields
    const manualApproved = await prisma.rental.create({
      data: {
        itemId: item.id,
        borrowerId: borrower.id,
        startDate: new Date('2026-12-25'),
        endDate: new Date('2026-12-27'),
        totalPrice: 40,
        status: 'APPROVED',
        pickupLatitude: 37.7749,
        pickupLongitude: -122.4194,
        pickupAddress: '742 Evergreen Terrace, Springfield',
      },
    });

    const lazyPinRes = await req(`/rentals/${manualApproved.id}/handover-pin`, 'GET', undefined, borrowerToken);
    if (lazyPinRes.status !== 200 || !lazyPinRes.data.data.pin || !/^\d{4}$/.test(lazyPinRes.data.data.pin)) {
      throw new Error(`Lazy PIN generation failed: ${JSON.stringify(lazyPinRes.data)}`);
    }
    console.log(`✓ Lazy PIN generated successfully for existing approved rental: ${lazyPinRes.data.data.pin}`);

    // Verify it works with the owner
    const lazyVerify = await req(`/rentals/${manualApproved.id}/handover/verify`, 'POST', { pin: lazyPinRes.data.data.pin }, ownerToken);
    if (lazyVerify.status !== 200 || lazyVerify.data.data.status !== 'ACTIVE') {
      throw new Error(`Verification with lazily generated PIN failed: ${JSON.stringify(lazyVerify.data)}`);
    }
    console.log('✓ Lazily generated PIN successfully verified by owner');

    // 21.12 Return item as before and verify review flow still works
    console.log('\n[21.12] Testing item return and review flow after PIN activation...');
    const returnSuccessRes = await req(`/rentals/${successRentalId}/return`, 'PATCH', undefined, ownerToken);
    if (returnSuccessRes.status !== 200 || returnSuccessRes.data.data.status !== 'RETURNED') {
      throw new Error(`Item return failed: ${returnSuccessRes.status} ${JSON.stringify(returnSuccessRes.data)}`);
    }
    console.log('✓ Item returned successfully, rental status transitioned to RETURNED');

    // Borrower reviews owner
    const borrowerReviewRes = await req(
      '/reviews',
      'POST',
      {
        rentalId: successRentalId,
        rating: 5,
        comment: 'Super easy handover with the 4-digit PIN! Highly recommended.',
      },
      borrowerToken,
    );
    if (borrowerReviewRes.status !== 201) {
      throw new Error(`Borrower review submission failed: ${borrowerReviewRes.status} ${JSON.stringify(borrowerReviewRes.data)}`);
    }
    console.log('✓ Borrower submitted review successfully');

    // Owner reviews borrower
    const ownerReviewRes = await req(
      '/reviews',
      'POST',
      {
        rentalId: successRentalId,
        rating: 5,
        comment: 'Great borrower, verified PIN smoothly and returned item on time.',
      },
      ownerToken,
    );
    if (ownerReviewRes.status !== 201) {
      throw new Error(`Owner review submission failed: ${ownerReviewRes.status} ${JSON.stringify(ownerReviewRes.data)}`);
    }
    console.log('✓ Owner submitted review successfully');

    // Check reviews status endpoint
    const reviewStatusRes = await req(`/rentals/${successRentalId}/review-status`, 'GET', undefined, borrowerToken);
    if (reviewStatusRes.status !== 200 || reviewStatusRes.data.data.canReview !== false) {
      throw new Error(`Review status check failed: ${JSON.stringify(reviewStatusRes.data)}`);
    }
    console.log('✓ Review flow completed and status verified successfully');

    // ── 22. CLOUDINARY IMAGE STORAGE & VALIDATION TESTS ──────────────────────
    console.log('\n======================================================');
    console.log('☁️  Starting Cloudinary Image Storage & Validation Tests...');
    console.log('======================================================\n');

    // 1x1 valid transparent PNG buffer
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    // 22.1 Valid image upload returns HTTPS Cloudinary URL and loads with HTTP 200
    console.log('[22.1] Testing valid image upload returns HTTPS Cloudinary URL...');
    const validForm = new FormData();
    validForm.append('images', new Blob([validPngBuffer], { type: 'image/png' }), 'test-item.png');

    const validUploadRes = await uploadMultipart('/uploads/images', validForm, ownerToken);
    if (
      validUploadRes.status !== 201 ||
      !validUploadRes.data.success ||
      !Array.isArray(validUploadRes.data.data.urls) ||
      validUploadRes.data.data.urls.length !== 1
    ) {
      throw new Error(`Valid upload failed: ${validUploadRes.status} ${JSON.stringify(validUploadRes.data)}`);
    }

    const itemCloudinaryUrl = validUploadRes.data.data.urls[0];
    if (
      !itemCloudinaryUrl.startsWith('https://res.cloudinary.com/') ||
      !itemCloudinaryUrl.includes('rentcart/items/')
    ) {
      throw new Error(`Expected HTTPS Cloudinary URL in rentcart/items/, got: ${itemCloudinaryUrl}`);
    }
    console.log(`✓ Valid image uploaded to Cloudinary: ${itemCloudinaryUrl}`);

    // Confirm that the returned URL loads (HTTP 200)
    console.log('[22.2] Testing returned Cloudinary image URL loads with HTTP 200...');
    const fetchImageRes = await fetch(itemCloudinaryUrl);
    if (fetchImageRes.status !== 200) {
      throw new Error(`Returned Cloudinary URL failed to load: status ${fetchImageRes.status}`);
    }
    console.log('✓ Cloudinary image URL loaded successfully (HTTP 200)');

    // 22.3 Wrong file type rejected (HTTP 400) - magic bytes mismatch
    console.log('\n[22.3] Testing wrong file type rejected (magic bytes verification)...');
    const fakeImageForm = new FormData();
    const fakeBuffer = Buffer.from('NOT_A_REAL_IMAGE_DATA_MAGIC_BYTES_FAIL');
    fakeImageForm.append('images', new Blob([fakeBuffer], { type: 'image/jpeg' }), 'fake.jpg');

    const fakeUploadRes = await uploadMultipart('/uploads/images', fakeImageForm, ownerToken);
    if (fakeUploadRes.status !== 400 || fakeUploadRes.data.success !== false) {
      throw new Error(`Expected 400 for fake image, got ${fakeUploadRes.status}: ${JSON.stringify(fakeUploadRes.data)}`);
    }
    console.log('✓ Fake image rejected by magic bytes verification with 400');

    // 22.4 Wrong file extension/mimetype (e.g., text/plain) rejected (HTTP 400)
    console.log('\n[22.4] Testing unsupported file extension rejected...');
    const textForm = new FormData();
    textForm.append('images', new Blob([Buffer.from('hello plain text')], { type: 'text/plain' }), 'notes.txt');

    const textUploadRes = await uploadMultipart('/uploads/images', textForm, ownerToken);
    if (textUploadRes.status !== 400 || textUploadRes.data.success !== false) {
      throw new Error(`Expected 400 for text file, got ${textUploadRes.status}: ${JSON.stringify(textUploadRes.data)}`);
    }
    console.log('✓ Non-image extension/mimetype rejected with 400');

    // 22.5 Oversize file (> 5 MB) rejected (HTTP 400)
    console.log('\n[22.5] Testing oversize file (> 5 MB) rejected...');
    const oversizeForm = new FormData();
    const oversizeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0); // 5.5 MB
    oversizeForm.append('images', new Blob([oversizeBuffer], { type: 'image/png' }), 'big.png');

    const oversizeUploadRes = await uploadMultipart('/uploads/images', oversizeForm, ownerToken);
    if (oversizeUploadRes.status !== 400 || oversizeUploadRes.data.success !== false) {
      throw new Error(`Expected 400 for oversize file, got ${oversizeUploadRes.status}: ${JSON.stringify(oversizeUploadRes.data)}`);
    }
    console.log('✓ Oversize file (> 5 MB) rejected with 400');

    // 22.6 More than 5 images rejected (HTTP 400)
    console.log('\n[22.6] Testing more than 5 images rejected...');
    const multiForm = new FormData();
    for (let i = 0; i < 6; i++) {
      multiForm.append('images', new Blob([validPngBuffer], { type: 'image/png' }), `img_${i}.png`);
    }

    const multiUploadRes = await uploadMultipart('/uploads/images', multiForm, ownerToken);
    if (multiUploadRes.status !== 400 || multiUploadRes.data.success !== false) {
      throw new Error(`Expected 400 for 6 images, got ${multiUploadRes.status}: ${JSON.stringify(multiUploadRes.data)}`);
    }
    console.log('✓ Upload with more than 5 images rejected with 400');

    // 22.7 Avatar upload returns HTTPS Cloudinary URL and loads with HTTP 200
    console.log('\n[22.7] Testing avatar upload to Cloudinary...');
    const avatarForm1 = new FormData();
    avatarForm1.append('avatar', new Blob([validPngBuffer], { type: 'image/png' }), 'avatar1.png');

    const avatarUploadRes = await uploadMultipart('/users/me/avatar', avatarForm1, ownerToken);
    if (
      avatarUploadRes.status !== 200 ||
      !avatarUploadRes.data.success ||
      !avatarUploadRes.data.data.avatarUrl
    ) {
      throw new Error(`Avatar upload failed: ${avatarUploadRes.status} ${JSON.stringify(avatarUploadRes.data)}`);
    }

    const avatarCloudinaryUrl = avatarUploadRes.data.data.avatarUrl;
    if (
      !avatarCloudinaryUrl.startsWith('https://res.cloudinary.com/') ||
      !avatarCloudinaryUrl.includes('rentcart/avatars/')
    ) {
      throw new Error(`Expected HTTPS Cloudinary URL in rentcart/avatars/, got: ${avatarCloudinaryUrl}`);
    }
    console.log(`✓ Avatar uploaded to Cloudinary: ${avatarCloudinaryUrl}`);

    const fetchAvatarRes = await fetch(avatarCloudinaryUrl);
    if (fetchAvatarRes.status !== 200) {
      throw new Error(`Cloudinary avatar URL failed to load: status ${fetchAvatarRes.status}`);
    }
    console.log('✓ Cloudinary avatar URL loaded successfully (HTTP 200)');

    // 22.8 Cleanup: Item deletion deletes Cloudinary asset in background without error
    console.log('\n[22.8] Testing item deletion with Cloudinary asset cleanup...');
    const testCloudItem = await req(
      '/items',
      'POST',
      {
        title: 'Cloudinary Cleanup Test Item',
        description: 'Testing background Cloudinary asset cleanup on item deletion.',
        category: 'Electronics',
        pricePerDay: 25,
        deposit: 50,
        images: [itemCloudinaryUrl],
      },
      ownerToken,
    );
    if (testCloudItem.status !== 201) {
      throw new Error(`Failed to create item with Cloudinary URL: ${JSON.stringify(testCloudItem.data)}`);
    }
    const testCloudItemId = testCloudItem.data.data.id;

    const deleteItemRes = await req(`/items/${testCloudItemId}`, 'DELETE', undefined, ownerToken);
    if (deleteItemRes.status !== 200 || !deleteItemRes.data.data.deleted) {
      throw new Error(`Item delete failed: ${deleteItemRes.status} ${JSON.stringify(deleteItemRes.data)}`);
    }
    console.log('✓ Item deleted and background Cloudinary cleanup initiated successfully');

    // 22.9 Cleanup: Avatar replacement deletes old Cloudinary asset in background
    console.log('\n[22.9] Testing avatar replacement with background asset cleanup...');
    const avatarForm2 = new FormData();
    avatarForm2.append('avatar', new Blob([validPngBuffer], { type: 'image/png' }), 'avatar2.png');

    const avatarUploadRes2 = await uploadMultipart('/users/me/avatar', avatarForm2, ownerToken);
    if (avatarUploadRes2.status !== 200 || !avatarUploadRes2.data.success) {
      throw new Error(`Avatar replacement failed: ${avatarUploadRes2.status} ${JSON.stringify(avatarUploadRes2.data)}`);
    }
    console.log('✓ Avatar replaced and previous Cloudinary asset cleanup initiated successfully');

    console.log('\n======================================================');
    console.log('🎉 ALL BACKEND SMOKE TESTS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    // Cleanup test users and close server
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testEmail, ownerEmail, borrowerEmail, strangerEmail, noProfileOwnerEmail],
          },
        },
      });
    } catch {}
    await prisma.$disconnect();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
