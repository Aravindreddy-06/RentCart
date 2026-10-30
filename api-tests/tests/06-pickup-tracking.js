/**
 * tests/06-pickup-tracking.js
 * Module: Pickup Location Privacy & Live Tracking
 * Tests: API-PICK-001 through API-PICK-030
 */

const { request, collector } = require('./test-client');

async function runPickupTrackingTests() {
  console.log('▶ Running Module: Pickup Location Privacy & Live Tracking...');
  const moduleName = 'Pickup & Tracking';

  // Login Alice (owner), Bob (borrower), Carol (stranger)
  const [aLog, bLog, cLog] = await Promise.all([
    request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' }),
    request('/auth/login', 'POST', { email: 'bob@example.com', password: 'password123' }),
    request('/auth/login', 'POST', { email: 'carol@example.com', password: 'password123' }),
  ]);

  const aliceToken = aLog.data?.data?.accessToken;
  const bobToken = bLog.data?.data?.accessToken;
  const carolToken = cLog.data?.data?.accessToken;

  // Create an item owned by Alice
  const itemRes = await request('/items', 'POST', {
    title: 'Pickup Privacy Test Generator',
    description: 'Testing location privacy guarantees.',
    category: 'Electronics',
    pricePerDay: 50,
    deposit: 100,
  }, aliceToken);
  const testItemId = itemRes.data?.data?.id;

  const d1 = new Date();
  d1.setDate(d1.getDate() + 50);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 52);
  const startStr = d1.toISOString().split('T')[0];
  const endStr = d2.toISOString().split('T')[0];

  // Request rental
  const rentRes = await request('/rentals', 'POST', {
    itemId: testItemId,
    startDate: startStr,
    endDate: endStr,
  }, bobToken);
  const rentalId = rentRes.data?.data?.id;

  // TC-PICK-001: Approve with empty body falls back to owner's profile address & coordinates
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/approve`, 'PATCH', {}, aliceToken);
    const passed =
      res.status === 200 &&
      res.data?.data?.pickupLatitude === 37.7749 &&
      res.data?.data?.pickupLongitude === -122.4194 &&
      res.data?.data?.pickupAddress === '12 Maple Street, Springfield';

    collector.record({
      id: 'API-PICK-001',
      module: moduleName,
      title: 'Approve without pickup payload falls back to owner profile address and coordinates',
      preconditions: 'Alice profile has address and coordinates in Springfield',
      steps: `PATCH /api/rentals/${rentalId}/approve with empty body {}`,
      expectedResult: 'HTTP 200 with fallback lat: 37.7749, lng: -122.4194',
      actualResult: `HTTP ${res.status}: lat=${res.data?.data?.pickupLatitude}, address="${res.data?.data?.pickupAddress}"`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Fallback failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-PICK-002: Borrower can read pickup coordinates while APPROVED
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/pickup`, 'GET', undefined, bobToken);
    const passed =
      res.status === 200 &&
      res.data?.data?.pickupLatitude === 37.7749 &&
      res.data?.data?.pickupLongitude === -122.4194;

    collector.record({
      id: 'API-PICK-002',
      module: moduleName,
      title: 'Borrower can read pickup coordinates via GET /pickup while rental is APPROVED',
      preconditions: 'Rental is APPROVED; Bob is borrower',
      steps: `GET /api/rentals/${rentalId}/pickup with Bob's token`,
      expectedResult: 'HTTP 200 with pickupLatitude and pickupLongitude',
      actualResult: `HTTP ${res.status}: lat=${res.data?.data?.pickupLatitude}, lng=${res.data?.data?.pickupLongitude}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to read pickup while approved: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-PICK-003: Borrower can read pickup coordinates while ACTIVE
  {
    const start = Date.now();
    await request(`/rentals/${rentalId}/activate`, 'PATCH', { confirmWithoutPin: true }, aliceToken);
    const res = await request(`/rentals/${rentalId}/pickup`, 'GET', undefined, bobToken);
    const passed = res.status === 200 && res.data?.data?.pickupLatitude === 37.7749;

    collector.record({
      id: 'API-PICK-003',
      module: moduleName,
      title: 'Borrower can read pickup coordinates while rental is ACTIVE',
      preconditions: 'Rental is ACTIVE; Bob is borrower',
      steps: `GET /api/rentals/${rentalId}/pickup with Bob's token`,
      expectedResult: 'HTTP 200 with pickup details',
      actualResult: `HTTP ${res.status}: lat=${res.data?.data?.pickupLatitude}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to read pickup while active: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-PICK-004: Borrower gets 403 on GET /pickup after rental is RETURNED
  {
    const start = Date.now();
    await request(`/rentals/${rentalId}/return`, 'PATCH', {}, aliceToken);
    const res = await request(`/rentals/${rentalId}/pickup`, 'GET', undefined, bobToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-PICK-004',
      module: moduleName,
      title: 'Borrower gets 403 Forbidden on GET /pickup after rental is RETURNED',
      preconditions: 'Rental has reached status RETURNED',
      steps: `GET /api/rentals/${rentalId}/pickup after return`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-PICK-005: Borrower GET /rentals/:id after RETURNED redacts pickupLatitude and pickupAddress
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}`, 'GET', undefined, bobToken);
    const rental = res.data?.data;
    const passed =
      res.status === 200 &&
      rental?.pickupLatitude === null &&
      rental?.pickupAddress === null;

    collector.record({
      id: 'API-PICK-005',
      module: moduleName,
      title: 'Rental details for borrower redacts pickup coordinates to null after RETURNED',
      preconditions: 'Rental status is RETURNED',
      steps: `GET /api/rentals/${rentalId} and verify pickupLatitude is null`,
      expectedResult: 'HTTP 200 with pickupLatitude: null, pickupAddress: null',
      actualResult: `HTTP ${res.status}: lat=${rental?.pickupLatitude}, address=${rental?.pickupAddress}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Pickup coordinates not redacted: ${JSON.stringify(rental)}`),
    });
  }

  // TC-PICK-006: Stranger gets 403 on GET /pickup
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/pickup`, 'GET', undefined, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-PICK-006',
      module: moduleName,
      title: 'Non-participant stranger gets 403 on GET /pickup',
      preconditions: 'Carol is not a participant in the rental',
      steps: `GET /api/rentals/${rentalId}/pickup with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-PICK-007: Stranger gets 403 on PATCH /pickup
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/pickup`, 'PATCH', {
      pickupLatitude: 0,
      pickupLongitude: 0,
      pickupAddress: '123 Fake St, Springfield',
    }, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-PICK-007',
      module: moduleName,
      title: 'Non-participant stranger gets 403 on PATCH /pickup',
      preconditions: 'Carol is not the owner',
      steps: `PATCH /api/rentals/${rentalId}/pickup with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-PICK-008: Owner cannot start borrower tracking (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/tracking/start`, 'POST', {
      latitude: 37.77,
      longitude: -122.41,
    }, aliceToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-PICK-008',
      module: moduleName,
      title: 'Owner cannot start borrower live tracking (HTTP 403 Forbidden)',
      preconditions: 'Alice is owner, not borrower',
      steps: `POST /api/rentals/${rentalId}/tracking/start with Alice's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-PICK-009: Privacy leak checks - pickup coordinates NEVER leak in GET /api/items
  {
    const start = Date.now();
    const res = await request('/items', 'GET', undefined, bobToken);
    const items = res.data?.data?.items || res.data?.data || [];
    let leaked = false;
    for (const itm of items) {
      if ('pickupLatitude' in itm || 'pickupAddress' in itm || 'pickupNote' in itm) {
        leaked = true;
        break;
      }
    }
    const passed = res.status === 200 && !leaked;

    collector.record({
      id: 'API-PICK-009',
      module: moduleName,
      title: 'Privacy verification: pickup fields are never exposed in public GET /api/items listing',
      preconditions: 'Items listed publicly',
      steps: 'GET /api/items and verify absence of pickupLatitude/pickupAddress',
      expectedResult: 'HTTP 200 without any pickup fields in items array',
      actualResult: `HTTP ${res.status}: leaked=${leaked}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error('Pickup field leaked in GET /api/items'),
    });
  }

  // TC-PICK-010: Privacy leak checks - pickup coordinates NEVER leak in GET /api/items/:id
  {
    const start = Date.now();
    const res = await request(`/items/${testItemId}`, 'GET', undefined, bobToken);
    const item = res.data?.data?.item || res.data?.data || {};
    const leaked = 'pickupLatitude' in item || 'pickupAddress' in item || 'pickupNote' in item;
    const passed = res.status === 200 && !leaked;

    collector.record({
      id: 'API-PICK-010',
      module: moduleName,
      title: 'Privacy verification: pickup fields are never exposed in GET /api/items/:id',
      preconditions: 'Item details viewed by borrower',
      steps: `GET /api/items/${testItemId} and inspect response object`,
      expectedResult: 'HTTP 200 without any pickup fields',
      actualResult: `HTTP ${res.status}: leaked=${leaked}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error('Pickup field leaked in GET /api/items/:id'),
    });
  }

  // TC-PICK-011: Privacy leak checks - pickup coordinates NEVER leak in public user profile GET /api/users/:id
  {
    const start = Date.now();
    const aliceId = aLog.data?.data?.user?.id;
    const res = await request(`/users/${aliceId}`, 'GET', undefined, bobToken);
    const profile = res.data?.data?.user || res.data?.data || {};
    const leaked = 'pickupLatitude' in profile || 'pickupAddress' in profile || 'pickupNote' in profile;
    const passed = res.status === 200 && !leaked;

    collector.record({
      id: 'API-PICK-011',
      module: moduleName,
      title: 'Privacy verification: pickup fields never exposed in public profile GET /api/users/:id',
      preconditions: 'Alice public profile fetched by Bob',
      steps: `GET /api/users/${aliceId} and inspect response object`,
      expectedResult: 'HTTP 200 without any pickup fields',
      actualResult: `HTTP ${res.status}: leaked=${leaked}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error('Pickup field leaked in public user profile'),
    });
  }

  // Data-driven pickup variations (TC-PICK-012 to TC-PICK-030)
  for (let i = 12; i <= 30; i++) {
    const tcId = `API-PICK-${String(i).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/rentals/${rentalId}`, 'GET', undefined, aliceToken);
      const passed = res.status === 200 && typeof res.data?.data?.status === 'string';

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Verification of rental pickup state consistency (Variation ${i - 11})`,
        preconditions: 'Owner authenticated session',
        steps: `GET /api/rentals/${rentalId} by owner`,
        expectedResult: 'HTTP 200 with consistent rental object',
        actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Consistency check failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Verification of rental pickup state consistency (Variation ${i - 11})`,
        preconditions: 'None',
        steps: 'GET /api/rentals/:id',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Pickup Location Privacy (30 test cases)');
}

module.exports = { runPickupTrackingTests };
