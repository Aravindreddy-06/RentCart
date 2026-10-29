/**
 * tests/04-rentals.js
 * Module: Rentals Lifecycle & State Machine
 * Tests: API-RENT-001 through API-RENT-040
 */

const { request, collector } = require('./test-client');

async function runRentalsTests() {
  console.log('▶ Running Module: Rentals Lifecycle & State Machine...');
  const moduleName = 'Rentals Lifecycle';

  // Login Alice (owner), Bob (borrower), Carol (stranger)
  const [aLog, bLog, cLog] = await Promise.all([
    request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' }),
    request('/auth/login', 'POST', { email: 'bob@example.com', password: 'password123' }),
    request('/auth/login', 'POST', { email: 'carol@example.com', password: 'password123' }),
  ]);

  const aliceToken = aLog.data?.data?.accessToken;
  const bobToken = bLog.data?.data?.accessToken;
  const carolToken = cLog.data?.data?.accessToken;

  // Create an item owned by Alice for rental tests
  const itemRes = await request('/items', 'POST', {
    title: 'DeWalt Circular Saw',
    description: 'Cordless 7-1/4 inch circular saw for woodwork.',
    category: 'Tools',
    pricePerDay: 40,
    deposit: 80,
  }, aliceToken);
  const testItemId = itemRes.data?.data?.id;

  let testRentalId = null;

  // Future dates helper (e.g. 10 days ahead to 13 days ahead = 3 days)
  const d1 = new Date();
  d1.setDate(d1.getDate() + 10);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 13);
  const startStr = d1.toISOString().split('T')[0];
  const endStr = d2.toISOString().split('T')[0];

  // TC-RENT-001: Borrower creates rental request -> 201 PENDING
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: testItemId,
      startDate: startStr,
      endDate: endStr,
      borrowerNote: 'Need for a deck project',
    }, bobToken);

    testRentalId = res.data?.data?.id;
    const passed =
      res.status === 201 &&
      res.data?.data?.status === 'PENDING' &&
      res.data?.data?.currency === 'INR';

    collector.record({
      id: 'API-RENT-001',
      module: moduleName,
      title: 'Create rental request returns 201 with status PENDING and currency INR',
      preconditions: 'Item exists and is owned by Alice; borrower is Bob',
      steps: `POST /api/rentals with itemId, valid dates, and borrowerNote`,
      expectedResult: 'HTTP 201, status: PENDING, currency: INR',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}, currency=${res.data?.data?.currency}, id=${testRentalId}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Create rental failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-002: Accurate price calculation: 3 days * 40/day = 120
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}`, 'GET', undefined, bobToken);
    const rental = res.data?.data;
    const passed = res.status === 200 && rental?.totalPrice === 120;

    collector.record({
      id: 'API-RENT-002',
      module: moduleName,
      title: 'Rental totalPrice accurately calculates daily rate * rental duration in days',
      preconditions: `Rental ${testRentalId} created for 3 days @ 40/day`,
      steps: `GET /api/rentals/${testRentalId} and check totalPrice`,
      expectedResult: 'HTTP 200 with totalPrice: 120',
      actualResult: `HTTP ${res.status}: totalPrice=${rental?.totalPrice}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Price calculation failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-003: Renting own item rejected with 400
  {
    const start = Date.now();
    const res = await request('/rentals', 'POST', {
      itemId: testItemId,
      startDate: startStr,
      endDate: endStr,
    }, aliceToken);
    const passed = res.status === 400;

    collector.record({
      id: 'API-RENT-003',
      module: moduleName,
      title: 'Owner cannot borrow their own listed item (HTTP 400)',
      preconditions: 'Item is owned by Alice; request sent with Alice token',
      steps: `POST /api/rentals for own item`,
      expectedResult: 'HTTP 400 cannot rent own item',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400, got ${res.status}`),
    });
  }

  // Data-driven date validations (TC-RENT-004 to TC-RENT-012)
  const invalidDateScenarios = [
    { title: 'Past start date', start: '2020-01-01', end: '2020-01-05', expStatus: 400 },
    { title: 'End date before start date', start: '2026-12-10', end: '2026-12-05', expStatus: 400 },
    { title: 'Same day start and end (0 days)', start: '2026-12-10', end: '2026-12-10', expStatus: 400 },
    { title: 'Malformed start date string', start: 'invalid-date', end: '2026-12-15', expStatus: 400 },
    { title: 'Malformed end date string', start: '2026-12-10', end: 'invalid-date', expStatus: 400 },
    { title: 'Missing start date', end: '2026-12-15', expStatus: 400 },
    { title: 'Missing end date', start: '2026-12-10', expStatus: 400 },
    { title: 'Rental period > 365 days', start: '2026-12-01', end: '2028-01-01', expStatus: 400 },
    { title: 'Non-existent item ID', itemId: 'nonexistent-item-id-9999', start: '2026-12-10', end: '2026-12-12', expStatus: 404 },
  ];

  for (let i = 0; i < invalidDateScenarios.length; i++) {
    const ids = invalidDateScenarios[i];
    const tcId = `API-RENT-${String(i + 4).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const payload = {
        itemId: ids.itemId || testItemId,
        startDate: ids.start,
        endDate: ids.end,
      };
      const res = await request('/rentals', 'POST', payload, carolToken);
      const passed = res.status === ids.expStatus;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Rental creation rejected: ${ids.title}`,
        preconditions: 'None',
        steps: `POST /api/rentals with ${JSON.stringify(payload)}`,
        expectedResult: `HTTP ${ids.expStatus}`,
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${ids.expStatus}, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Rental creation rejected: ${ids.title}`,
        preconditions: 'None',
        steps: 'POST /api/rentals',
        expectedResult: `HTTP ${ids.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-RENT-013: Non-owner cannot approve rental (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}/approve`, 'PATCH', {}, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-RENT-013',
      module: moduleName,
      title: 'Non-owner cannot approve rental (HTTP 403 Forbidden)',
      preconditions: 'Carol is a stranger / third party',
      steps: `PATCH /api/rentals/${testRentalId}/approve with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-RENT-014: Owner approves rental -> 200 APPROVED
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}/approve`, 'PATCH', {
      pickupLatitude: 37.7749,
      pickupLongitude: -122.4194,
      pickupAddress: '12 Maple Street, Springfield',
      pickupNote: 'Ring bell #2',
    }, aliceToken);

    const passed = res.status === 200 && res.data?.data?.status === 'APPROVED';

    collector.record({
      id: 'API-RENT-014',
      module: moduleName,
      title: 'Owner approves rental with pickup coordinates and address',
      preconditions: 'Alice is item owner; rental is PENDING',
      steps: `PATCH /api/rentals/${testRentalId}/approve with pickup details`,
      expectedResult: 'HTTP 200 with status: APPROVED',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Approve failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-015: Owner activates rental with confirmWithoutPin
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}/activate`, 'PATCH', { confirmWithoutPin: true }, aliceToken);
    const passed = res.status === 200 && res.data?.data?.status === 'ACTIVE';

    collector.record({
      id: 'API-RENT-015',
      module: moduleName,
      title: 'Owner activates rental transitioning status from APPROVED to ACTIVE',
      preconditions: 'Rental is APPROVED; Alice is owner',
      steps: `PATCH /api/rentals/${testRentalId}/activate with confirmWithoutPin: true`,
      expectedResult: 'HTTP 200 with status: ACTIVE',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Activate failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-016: Non-owner cannot return rental (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}/return`, 'PATCH', {}, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-RENT-016',
      module: moduleName,
      title: 'Non-owner cannot mark rental as RETURNED (HTTP 403 Forbidden)',
      preconditions: 'Carol is not the owner',
      steps: `PATCH /api/rentals/${testRentalId}/return with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-RENT-017: Owner marks item as RETURNED
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}/return`, 'PATCH', {}, aliceToken);
    const passed = res.status === 200 && res.data?.data?.status === 'RETURNED';

    collector.record({
      id: 'API-RENT-017',
      module: moduleName,
      title: 'Owner returns item transitioning status to RETURNED',
      preconditions: 'Rental is ACTIVE; Alice is owner',
      steps: `PATCH /api/rentals/${testRentalId}/return with Alice's token`,
      expectedResult: 'HTTP 200 with status: RETURNED',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Return failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-018: Reject flow on fresh rental
  const rejectItemRes = await request('/items', 'POST', {
    title: 'Reject Flow Test Item',
    description: 'Item dedicated to rejection flow testing.',
    category: 'Tools',
    pricePerDay: 35,
    deposit: 70,
  }, aliceToken);
  const rejectItemId = rejectItemRes.data?.data?.id;

  const d3 = new Date();
  d3.setDate(d3.getDate() + 20);
  const d4 = new Date();
  d4.setDate(d4.getDate() + 22);
  const rejectReq = await request('/rentals', 'POST', {
    itemId: rejectItemId,
    startDate: d3.toISOString().split('T')[0],
    endDate: d4.toISOString().split('T')[0],
  }, bobToken);
  const rejectRentalId = rejectReq.data?.data?.id;

  {
    const start = Date.now();
    const res = await request(`/rentals/${rejectRentalId}/reject`, 'PATCH', {
      ownerNote: 'Item under maintenance',
    }, aliceToken);
    const passed = res.status === 200 && res.data?.data?.status === 'REJECTED';

    collector.record({
      id: 'API-RENT-018',
      module: moduleName,
      title: 'Owner rejects pending rental request with reason note',
      preconditions: 'Rental is PENDING; Alice is owner',
      steps: `PATCH /api/rentals/${rejectRentalId}/reject with ownerNote`,
      expectedResult: 'HTTP 200 with status: REJECTED',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Reject failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-019: Cancel flow: Borrower cancels their pending rental
  const cancelItemRes = await request('/items', 'POST', {
    title: 'Cancel Flow Test Item',
    description: 'Item dedicated to cancellation flow testing.',
    category: 'Tools',
    pricePerDay: 35,
    deposit: 70,
  }, aliceToken);
  const cancelItemId = cancelItemRes.data?.data?.id;

  const d5 = new Date();
  d5.setDate(d5.getDate() + 25);
  const d6 = new Date();
  d6.setDate(d6.getDate() + 27);
  const cancelReq = await request('/rentals', 'POST', {
    itemId: cancelItemId,
    startDate: d5.toISOString().split('T')[0],
    endDate: d6.toISOString().split('T')[0],
  }, bobToken);
  const cancelRentalId = cancelReq.data?.data?.id;

  {
    const start = Date.now();
    const res = await request(`/rentals/${cancelRentalId}/cancel`, 'PATCH', undefined, bobToken);
    const passed = res.status === 200 && res.data?.data?.status === 'CANCELLED';

    collector.record({
      id: 'API-RENT-019',
      module: moduleName,
      title: 'Borrower cancels their pending rental request',
      preconditions: 'Rental is PENDING; Bob is borrower',
      steps: `PATCH /api/rentals/${cancelRentalId}/cancel with Bob's token`,
      expectedResult: 'HTTP 200 with status: CANCELLED',
      actualResult: `HTTP ${res.status}: status=${res.data?.data?.status}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Cancel failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-RENT-020: Stranger cannot view private rental details (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${testRentalId}`, 'GET', undefined, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-RENT-020',
      module: moduleName,
      title: 'Non-participant stranger receives 403 Forbidden when accessing rental details',
      preconditions: 'Carol is neither owner nor borrower',
      steps: `GET /api/rentals/${testRentalId} with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // Data-driven List My Rentals & Incoming Filters (TC-RENT-021 to TC-RENT-035)
  const statusFilters = ['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'RETURNED', 'REJECTED', 'CANCELLED'];

  for (let i = 0; i < statusFilters.length; i++) {
    const s = statusFilters[i];
    const tcId = `API-RENT-${String(i + 21).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const q = s === 'ALL' ? '' : `?status=${s}`;
      const res = await request(`/rentals/mine${q}`, 'GET', undefined, bobToken);
      const rentals = res.data?.data?.rentals || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(rentals);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `GET /api/rentals/mine filter by status: ${s}`,
        preconditions: 'Authenticated borrower token (Bob)',
        steps: `GET /api/rentals/mine${q}`,
        expectedResult: `HTTP 200 with list of rentals`,
        actualResult: `HTTP ${res.status}: returned ${rentals.length} rentals`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Failed to list mine for status ${s}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `GET /api/rentals/mine filter by status: ${s}`,
        preconditions: 'None',
        steps: 'GET /api/rentals/mine',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  for (let i = 0; i < statusFilters.length; i++) {
    const s = statusFilters[i];
    const tcId = `API-RENT-${String(i + 28).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const q = s === 'ALL' ? '' : `?status=${s}`;
      const res = await request(`/rentals/incoming${q}`, 'GET', undefined, aliceToken);
      const rentals = res.data?.data?.rentals || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(rentals);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `GET /api/rentals/incoming filter by status: ${s}`,
        preconditions: 'Authenticated owner token (Alice)',
        steps: `GET /api/rentals/incoming${q}`,
        expectedResult: `HTTP 200 with incoming rentals list`,
        actualResult: `HTTP ${res.status}: returned ${rentals.length} rentals`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Failed to list incoming for status ${s}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `GET /api/rentals/incoming filter by status: ${s}`,
        preconditions: 'None',
        steps: 'GET /api/rentals/incoming',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven pagination on rentals (TC-RENT-036 to TC-RENT-040)
  const rentalPaging = [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
    { page: 1, limit: 10 },
    { page: 1, limit: 50 },
    { page: 99, limit: 5 },
  ];

  for (let i = 0; i < rentalPaging.length; i++) {
    const rp = rentalPaging[i];
    const tcId = `API-RENT-${String(i + 36).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/rentals/mine?page=${rp.page}&limit=${rp.limit}`, 'GET', undefined, bobToken);
      const list = res.data?.data?.rentals || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(list) && list.length <= rp.limit;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Rentals pagination: page ${rp.page}, limit ${rp.limit}`,
        preconditions: 'Authenticated borrower token',
        steps: `GET /api/rentals/mine?page=${rp.page}&limit=${rp.limit}`,
        expectedResult: `HTTP 200 with <= ${rp.limit} records`,
        actualResult: `HTTP ${res.status}: returned ${list.length} records`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Pagination failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Rentals pagination: page ${rp.page}, limit ${rp.limit}`,
        preconditions: 'None',
        steps: 'GET /api/rentals/mine',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Rentals Lifecycle (40 test cases)');
}

module.exports = { runRentalsTests };
