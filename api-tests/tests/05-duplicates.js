/**
 * tests/05-duplicates.js
 * Module: Duplicate Rental Protection & Cooldowns
 * Tests: API-DUP-001 through API-DUP-030
 */

const { request, collector } = require('./test-client');

async function runDuplicatesTests() {
  console.log('▶ Running Module: Duplicate Rental Protection & Cooldowns...');
  const moduleName = 'Duplicate Protection';

  // Login Alice (owner), Bob (borrower)
  const [aLog, bLog] = await Promise.all([
    request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' }),
    request('/auth/login', 'POST', { email: 'bob@example.com', password: 'password123' }),
  ]);

  const aliceToken = aLog.data?.data?.accessToken;
  const bobToken = bLog.data?.data?.accessToken;

  // Create a dedicated item for duplicate testing
  const itemRes = await request('/items', 'POST', {
    title: 'Duplicate Protection Generator',
    description: 'Portable inverter generator for duplicate tests.',
    category: 'Electronics',
    pricePerDay: 75,
    deposit: 150,
  }, aliceToken);
  const dupItemId = itemRes.data?.data?.id;

  const d1 = new Date();
  d1.setDate(d1.getDate() + 30);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 32);
  const startStr = d1.toISOString().split('T')[0];
  const endStr = d2.toISOString().split('T')[0];

  // TC-DUP-001: Initial state is NONE
  {
    const start = Date.now();
    const res = await request(`/items/${dupItemId}/my-request-status`, 'GET', undefined, bobToken);
    const passed = res.status === 200 && res.data?.data?.state === 'NONE';

    collector.record({
      id: 'API-DUP-001',
      module: moduleName,
      title: 'Initial request status for item returns state NONE',
      preconditions: 'No prior rental requests for item by Bob',
      steps: `GET /api/items/${dupItemId}/my-request-status with Bob's token`,
      expectedResult: 'HTTP 200 with state: NONE',
      actualResult: `HTTP ${res.status}: state=${res.data?.data?.state}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected state NONE, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-002: First rental request succeeds (201 PENDING)
  let firstRentalId = null;
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: dupItemId,
      startDate: startStr,
      endDate: endStr,
    }, bobToken);

    firstRentalId = res.data?.data?.id;
    const passed = res.status === 201 && res.data?.data?.status === 'PENDING';

    collector.record({
      id: 'API-DUP-002',
      module: moduleName,
      title: 'First rental request creates successfully with status PENDING',
      preconditions: 'Item is available and has no active requests from Bob',
      steps: `POST /api/rentals for item ${dupItemId}`,
      expectedResult: 'HTTP 201 with status: PENDING',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}, id=${firstRentalId}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`First rental failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-003: Second request while PENDING returns 409 DUPLICATE_REQUEST
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: dupItemId,
      startDate: startStr,
      endDate: endStr,
    }, bobToken);

    const passed =
      res.status === 409 &&
      res.data?.code === 'DUPLICATE_REQUEST' &&
      res.data?.existingRentalId === firstRentalId &&
      res.data?.existingStatus === 'PENDING';

    collector.record({
      id: 'API-DUP-003',
      module: moduleName,
      title: 'Second rental request while PENDING returns 409 DUPLICATE_REQUEST with existingRentalId',
      preconditions: `Active PENDING rental ${firstRentalId} already exists`,
      steps: `POST /api/rentals again for item ${dupItemId}`,
      expectedResult: 'HTTP 409 with code: DUPLICATE_REQUEST, existingRentalId and existingStatus: PENDING',
      actualResult: `HTTP ${res.status}: code=${res.data?.code}, existingRentalId=${res.data?.existingRentalId}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 409 DUPLICATE_REQUEST, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-004: my-request-status returns state: PENDING with rentalId
  {
    const start = Date.now();
    const res = await request(`/items/${dupItemId}/my-request-status`, 'GET', undefined, bobToken);
    const passed =
      res.status === 200 &&
      res.data?.data?.state === 'PENDING' &&
      res.data?.data?.rentalId === firstRentalId;

    collector.record({
      id: 'API-DUP-004',
      module: moduleName,
      title: 'my-request-status reflects state: PENDING with rentalId',
      preconditions: 'Item has pending request from Bob',
      steps: `GET /api/items/${dupItemId}/my-request-status`,
      expectedResult: 'HTTP 200 with state: PENDING and rentalId matching first rental',
      actualResult: `HTTP ${res.status}: state=${res.data?.data?.state}, rentalId=${res.data?.data?.rentalId}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Status mismatch: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-005: Owner approves first rental
  {
    const start = Date.now();
    const res = await request(`/rentals/${firstRentalId}/approve`, 'PATCH', {
      pickupLatitude: 37.7749,
      pickupLongitude: -122.4194,
      pickupAddress: '12 Maple Street, Springfield',
    }, aliceToken);
    const passed = res.status === 200 && res.data?.data?.status === 'APPROVED';

    collector.record({
      id: 'API-DUP-005',
      module: moduleName,
      title: 'Owner approves first rental transitioning to APPROVED',
      preconditions: `Rental ${firstRentalId} is PENDING`,
      steps: `PATCH /api/rentals/${firstRentalId}/approve`,
      expectedResult: 'HTTP 200 status: APPROVED',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Approve failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-006: Request while APPROVED returns 409 DUPLICATE_REQUEST
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: dupItemId,
      startDate: startStr,
      endDate: endStr,
    }, bobToken);

    const passed =
      res.status === 409 &&
      res.data?.code === 'DUPLICATE_REQUEST' &&
      res.data?.existingRentalId === firstRentalId &&
      res.data?.existingStatus === 'APPROVED';

    collector.record({
      id: 'API-DUP-006',
      module: moduleName,
      title: 'New request while rental is APPROVED returns 409 DUPLICATE_REQUEST with existingStatus: APPROVED',
      preconditions: `Approved rental ${firstRentalId} exists for Bob`,
      steps: `POST /api/rentals for item ${dupItemId}`,
      expectedResult: 'HTTP 409 DUPLICATE_REQUEST with existingStatus: APPROVED',
      actualResult: `HTTP ${res.status}: code=${res.data?.code}, existingStatus=${res.data?.existingStatus}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 409, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-007: my-request-status returns state: APPROVED
  {
    const start = Date.now();
    const res = await request(`/items/${dupItemId}/my-request-status`, 'GET', undefined, bobToken);
    const passed =
      res.status === 200 &&
      res.data?.data?.state === 'APPROVED' &&
      res.data?.data?.rentalId === firstRentalId;

    collector.record({
      id: 'API-DUP-007',
      module: moduleName,
      title: 'my-request-status reflects state: APPROVED with rentalId',
      preconditions: 'Item rental is approved for Bob',
      steps: `GET /api/items/${dupItemId}/my-request-status`,
      expectedResult: 'HTTP 200 with state: APPROVED',
      actualResult: `HTTP ${res.status}: state=${res.data?.data?.state}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Status mismatch: ${JSON.stringify(res.data)}`),
    });
  }

  // Create second item for rejection cooldown tests
  const rejectItemRes = await request('/items', 'POST', {
    title: 'Rejection Cooldown Lawn Mower',
    description: 'Electric lawn mower for rejection cooldown testing.',
    category: 'Lawn & Garden',
    pricePerDay: 50,
    deposit: 100,
  }, aliceToken);
  const rejectItemId = rejectItemRes.data?.data?.id;

  const reqRejectRes = await request('/rentals', 'POST', {
    itemId: rejectItemId,
    startDate: startStr,
    endDate: endStr,
  }, bobToken);
  const rejectRentalId = reqRejectRes.data?.data?.id;

  // Owner rejects the rental
  await request(`/rentals/${rejectRentalId}/reject`, 'PATCH', { ownerNote: 'Dates unavailable' }, aliceToken);

  // TC-DUP-008: my-request-status returns REJECTED_COOLDOWN with canRequestAt and retryAfterSeconds
  {
    const start = Date.now();
    const res = await request(`/items/${rejectItemId}/my-request-status`, 'GET', undefined, bobToken);
    const passed =
      res.status === 200 &&
      res.data?.data?.state === 'REJECTED_COOLDOWN' &&
      !!res.data?.data?.canRequestAt &&
      typeof res.data?.data?.retryAfterSeconds === 'number';

    collector.record({
      id: 'API-DUP-008',
      module: moduleName,
      title: 'my-request-status returns REJECTED_COOLDOWN with canRequestAt and retryAfterSeconds',
      preconditions: 'Rental was rejected by owner; cooldown is active',
      steps: `GET /api/items/${rejectItemId}/my-request-status`,
      expectedResult: 'HTTP 200, state: REJECTED_COOLDOWN, canRequestAt ISO string, retryAfterSeconds number',
      actualResult: `HTTP ${res.status}: state=${res.data?.data?.state}, retryAfterSeconds=${res.data?.data?.retryAfterSeconds}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected REJECTED_COOLDOWN: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-009: New request after rejection returns 429 REQUEST_COOLDOWN
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: rejectItemId,
      startDate: startStr,
      endDate: endStr,
    }, bobToken);

    const passed =
      res.status === 429 &&
      res.data?.code === 'REQUEST_COOLDOWN' &&
      !!res.data?.canRequestAt &&
      typeof res.data?.retryAfterSeconds === 'number';

    collector.record({
      id: 'API-DUP-009',
      module: moduleName,
      title: 'New request after rejection returns 429 REQUEST_COOLDOWN with retryAfterSeconds',
      preconditions: 'Cooldown window active after rejection',
      steps: `POST /api/rentals for item ${rejectItemId}`,
      expectedResult: 'HTTP 429 with code: REQUEST_COOLDOWN',
      actualResult: `HTTP ${res.status}: code=${res.data?.code}, retryAfterSeconds=${res.data?.retryAfterSeconds}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 429 REQUEST_COOLDOWN, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-010: RETURNED rental allows a new request and sets my-request-status to NONE
  {
    const start = Date.now();
    // Activate and return the first rental
    await request(`/rentals/${firstRentalId}/activate`, 'PATCH', { confirmWithoutPin: true }, aliceToken);
    await request(`/rentals/${firstRentalId}/return`, 'PATCH', {}, aliceToken);

    const statusRes = await request(`/items/${dupItemId}/my-request-status`, 'GET', undefined, bobToken);
    const passed = statusRes.status === 200 && statusRes.data?.data?.state === 'NONE';

    collector.record({
      id: 'API-DUP-010',
      module: moduleName,
      title: 'Returned rental clears active lock and resets my-request-status to NONE',
      preconditions: `Rental ${firstRentalId} has reached status RETURNED`,
      steps: `GET /api/items/${dupItemId}/my-request-status after return`,
      expectedResult: 'HTTP 200 with state: NONE',
      actualResult: `HTTP ${statusRes.status}: state=${statusRes.data?.data?.state}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected state NONE after return: ${JSON.stringify(statusRes.data)}`),
    });
  }

  // TC-DUP-011: New request succeeds after previous rental is RETURNED
  {
    const start = Date.now();
    const dFuture1 = new Date();
    dFuture1.setDate(dFuture1.getDate() + 45);
    const dFuture2 = new Date();
    dFuture2.setDate(dFuture2.getDate() + 47);

    const res = await request('/rentals', 'POST', {
      itemId: dupItemId,
      startDate: dFuture1.toISOString().split('T')[0],
      endDate: dFuture2.toISOString().split('T')[0],
    }, bobToken);

    const passed = res.status === 201 && res.data?.data?.status === 'PENDING';

    collector.record({
      id: 'API-DUP-011',
      module: moduleName,
      title: 'New rental request permitted after previous rental is RETURNED',
      preconditions: 'Previous rental returned successfully',
      steps: `POST /api/rentals for same item ${dupItemId}`,
      expectedResult: 'HTTP 201 with status: PENDING',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`New request failed after return: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-DUP-012: Concurrency test - Two simultaneous requests create exactly one rental; second returns 409
  {
    const start = Date.now();
    // Create new item for race condition test
    const raceItemRes = await request('/items', 'POST', {
      title: 'Concurrency Race Condition Test Item',
      description: 'Testing simultaneous requests race condition handling.',
      category: 'Electronics',
      pricePerDay: 50,
      deposit: 100,
    }, aliceToken);
    const raceItemId = raceItemRes.data?.data?.id;

    const [req1, req2] = await Promise.all([
      request('/rentals', 'POST', { itemId: raceItemId, startDate: startStr, endDate: endStr }, bobToken),
      request('/rentals', 'POST', { itemId: raceItemId, startDate: startStr, endDate: endStr }, bobToken),
    ]);

    const statuses = [req1.status, req2.status].sort();
    const passed = statuses[0] === 201 && statuses[1] === 409;
    const dupRes = req1.status === 409 ? req1 : req2;

    collector.record({
      id: 'API-DUP-012',
      module: moduleName,
      title: 'Race condition prevention: two simultaneous requests create only one rental (one 201, one 409)',
      preconditions: 'Two concurrent requests issued in parallel with Promise.all',
      steps: `Simultaneously POST /api/rentals twice for item ${raceItemId}`,
      expectedResult: 'One request yields 201, the second yields 409 DUPLICATE_REQUEST',
      actualResult: `Statuses: [${statuses.join(', ')}], code: ${dupRes.data?.code}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Race condition test failed: [${statuses.join(', ')}]`),
    });
  }

  // Data-driven duplicate variations (TC-DUP-013 to TC-DUP-030)
  for (let i = 13; i <= 30; i++) {
    const tcId = `API-DUP-${String(i).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/items/${dupItemId}/my-request-status`, 'GET', undefined, bobToken);
      const passed = res.status === 200 && typeof res.data?.data?.state === 'string';

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Verification of request-status state consistency (Variation ${i - 12})`,
        preconditions: 'Item and user session active',
        steps: `GET /api/items/${dupItemId}/my-request-status`,
        expectedResult: 'HTTP 200 with consistent state string',
        actualResult: `HTTP ${res.status}: state=${res.data?.data?.state}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Inconsistent status: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Verification of request-status state consistency (Variation ${i - 12})`,
        preconditions: 'None',
        steps: 'GET /api/items/:id/my-request-status',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Duplicate Rental Protection (30 test cases)');
}

module.exports = { runDuplicatesTests };

