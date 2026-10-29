/**
 * tests/02-items.js
 * Module: Items & Inventory Management
 * Tests: API-ITEM-001 through API-ITEM-040
 */

const { request, collector } = require('./test-client');

async function runItemsTests() {
  console.log('▶ Running Module: Items & Inventory Management...');
  const moduleName = 'Items & Inventory';

  // Obtain auth tokens for Alice (owner) and Bob (borrower)
  const aliceLogin = await request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' });
  const bobLogin = await request('/auth/login', 'POST', { email: 'bob@example.com', password: 'password123' });
  const aliceToken = aliceLogin.data?.data?.accessToken;
  const bobToken = bobLogin.data?.data?.accessToken;

  let createdItemId = null;

  // TC-ITEM-001: Create item with valid fields and verify currency: INR
  {
    const start = Date.now();
    const res = await request('/items', 'POST', {
      title: 'Bosch Cordless Rotary Hammer',
      description: 'Heavy duty rotary hammer drill with 2 batteries and chisel set.',
      category: 'Tools',
      pricePerDay: 250,
      deposit: 1000,
      images: ['https://res.cloudinary.com/rentcart/image/upload/v1/rentcart/items/sample-drill.png'],
    }, aliceToken);
    createdItemId = res.data?.data?.id;
    const passed = res.status === 201 && res.data?.data?.currency === 'INR' && res.data?.data?.pricePerDay === 250;
    collector.record({
      id: 'API-ITEM-001',
      module: moduleName,
      title: 'Create item returns 201 and sets currency to INR',
      preconditions: 'Authenticated user token (Alice)',
      steps: 'POST /api/items with valid payload including pricePerDay and deposit',
      expectedResult: 'HTTP 201, currency: INR, pricePerDay: 250',
      actualResult: `HTTP ${res.status}: currency=${res.data?.data?.currency}, id=${createdItemId}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Create item failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-ITEM-002: Prices round-trip unchanged without floating-point distortion
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'GET', undefined, bobToken);
    const item = res.data?.data?.item || res.data?.data;
    const passed = res.status === 200 && item?.pricePerDay === 250 && item?.deposit === 1000 && item?.currency === 'INR';
    collector.record({
      id: 'API-ITEM-002',
      module: moduleName,
      title: 'Prices round-trip accurately from GET /api/items/:id',
      preconditions: `Item ${createdItemId} exists in DB`,
      steps: `GET /api/items/${createdItemId} with auth token`,
      expectedResult: 'HTTP 200 with pricePerDay 250, deposit 1000, currency INR',
      actualResult: `HTTP ${res.status}: price=${item?.pricePerDay}, deposit=${item?.deposit}, currency=${item?.currency}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Price verification failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-ITEM-003: Create item without authentication returns 401
  {
    const start = Date.now();
    const res = await request('/items', 'POST', {
      title: 'Unauthenticated Tent',
      description: 'Camping tent for 4 persons with waterproof cover.',
      category: 'Tools',
      pricePerDay: 300,
    });
    const passed = res.status === 401;
    collector.record({
      id: 'API-ITEM-003',
      module: moduleName,
      title: 'Create item without auth token returns 401 Unauthorized',
      preconditions: 'No token header',
      steps: 'POST /api/items without Authorization header',
      expectedResult: 'HTTP 401 Unauthorized',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 401, got ${res.status}`),
    });
  }

  // Data-driven payload validation tests (TC-ITEM-004 to TC-ITEM-015)
  const invalidItemPayloads = [
    { title: 'Missing title', body: { description: 'No title provided here', category: 'Tools', pricePerDay: 100 }, expStatus: 400 },
    { title: 'Title too short (< 2 chars)', body: { title: 'a', description: 'Short title provided here', category: 'Tools', pricePerDay: 100 }, expStatus: 400 },
    { title: 'Description too short (< 10 chars)', body: { title: 'Valid Title', description: 'Short', category: 'Tools', pricePerDay: 100 }, expStatus: 400 },
    { title: 'Missing description', body: { title: 'No description provided', category: 'Tools', pricePerDay: 100 }, expStatus: 400 },
    { title: 'Negative pricePerDay', body: { title: 'Negative Price', description: 'Valid description provided', category: 'Tools', pricePerDay: -50 }, expStatus: 400 },
    { title: 'Price exceeds maximum (10,00,000)', body: { title: 'Too Expensive', description: 'Valid description provided', category: 'Tools', pricePerDay: 2000000 }, expStatus: 400 },
    { title: 'Negative deposit', body: { title: 'Negative Deposit', description: 'Valid description provided', category: 'Tools', pricePerDay: 100, deposit: -200 }, expStatus: 400 },
    { title: 'Deposit exceeds maximum', body: { title: 'Huge Deposit', description: 'Valid description provided', category: 'Tools', pricePerDay: 100, deposit: 2000000 }, expStatus: 400 },
    { title: 'Invalid category name', body: { title: 'Invalid Category Item', description: 'Valid description provided', category: 'SpaceShips', pricePerDay: 100 }, expStatus: 400 },
    { title: 'Empty payload body', body: {}, expStatus: 400 },
    { title: 'String instead of number pricePerDay', body: { title: 'String Price', description: 'Valid description provided', category: 'Tools', pricePerDay: 'free' }, expStatus: 400 },
    { title: 'Non-array images field', body: { title: 'Bad images', description: 'Valid description provided', category: 'Tools', pricePerDay: 100, images: 'not-an-array' }, expStatus: 400 },
  ];

  for (let i = 0; i < invalidItemPayloads.length; i++) {
    const inv = invalidItemPayloads[i];
    const tcId = `API-ITEM-${String(i + 4).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/items', 'POST', inv.body, aliceToken);
      const passed = res.status === inv.expStatus || res.status === 422;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Item creation rejected: ${inv.title}`,
        preconditions: 'Authenticated Alice token',
        steps: `POST /api/items with ${JSON.stringify(inv.body)}`,
        expectedResult: `HTTP ${inv.expStatus} or 422`,
        actualResult: `HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data)}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${inv.expStatus} or 422, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Item creation rejected: ${inv.title}`,
        preconditions: 'None',
        steps: 'POST /api/items',
        expectedResult: `HTTP ${inv.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven Valid Categories: Tools, Electronics, Kitchen, Sports, Books
  const validCategories = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books'];
  for (let i = 0; i < validCategories.length; i++) {
    const cat = validCategories[i];
    const tcId = `API-ITEM-${String(i + 16).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/items', 'POST', {
        title: `Category Test ${cat} Item`,
        description: `Automated test item description for category ${cat}`,
        category: cat,
        pricePerDay: 150 + i * 10,
        deposit: 300,
      }, aliceToken);
      const passed = res.status === 201 && res.data?.data?.category === cat;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Item created successfully under category '${cat}'`,
        preconditions: 'Valid category string',
        steps: `POST /api/items with category: '${cat}'`,
        expectedResult: `HTTP 201 with category: '${cat}'`,
        actualResult: `HTTP ${res.status}: category=${res.data?.data?.category}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Failed for category ${cat}: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Item created successfully under category '${cat}'`,
        preconditions: 'None',
        steps: 'POST /api/items',
        expectedResult: 'HTTP 201',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-ITEM-021: GET /api/items/:id for existing item
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'GET', undefined, bobToken);
    const item = res.data?.data?.item || res.data?.data;
    const passed = res.status === 200 && (item?.id === createdItemId || !!item?.title);
    collector.record({
      id: 'API-ITEM-021',
      module: moduleName,
      title: 'GET /api/items/:id returns complete item details',
      preconditions: `Item ${createdItemId} exists`,
      steps: `GET /api/items/${createdItemId} with auth token`,
      expectedResult: 'HTTP 200 with item details and owner info',
      actualResult: `HTTP ${res.status}: title="${item?.title}"`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 200, got ${res.status}`),
    });
  }

  // TC-ITEM-022: GET /api/items/:id for non-existent item returns 404
  {
    const start = Date.now();
    const res = await request('/items/non-existent-item-id-12345', 'GET', undefined, bobToken);
    const passed = res.status === 404 || res.status === 400 || res.status === 422;
    collector.record({
      id: 'API-ITEM-022',
      module: moduleName,
      title: 'GET /api/items/:id returns 404/400 for unknown item ID',
      preconditions: 'Item ID does not exist',
      steps: 'GET /api/items/non-existent-item-id-12345',
      expectedResult: 'HTTP 404 or 400 not found',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 404/400, got ${res.status}`),
    });
  }

  // TC-ITEM-023: Update item by owner succeeds (200)
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'PATCH', {
      title: 'Bosch Rotary Hammer (Updated)',
      pricePerDay: 280,
    }, aliceToken);
    const passed = res.status === 200 && res.data?.data?.title === 'Bosch Rotary Hammer (Updated)' && res.data?.data?.pricePerDay === 280;
    collector.record({
      id: 'API-ITEM-023',
      module: moduleName,
      title: 'Owner can update item title and price',
      preconditions: 'Authenticated owner token (Alice)',
      steps: `PATCH /api/items/${createdItemId} with updated fields`,
      expectedResult: 'HTTP 200 with updated fields reflected',
      actualResult: `HTTP ${res.status}: title="${res.data?.data?.title}", price=${res.data?.data?.pricePerDay}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Update failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-ITEM-024: Update item by non-owner returns 403 Forbidden
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'PATCH', {
      title: 'Hacked by Bob',
    }, bobToken);
    const passed = res.status === 403;
    collector.record({
      id: 'API-ITEM-024',
      module: moduleName,
      title: 'Non-owner cannot update item (403 Forbidden)',
      preconditions: 'Authenticated non-owner token (Bob)',
      steps: `PATCH /api/items/${createdItemId} using Bob's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-ITEM-025: Delete item by non-owner returns 403 Forbidden
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'DELETE', undefined, bobToken);
    const passed = res.status === 403;
    collector.record({
      id: 'API-ITEM-025',
      module: moduleName,
      title: 'Non-owner cannot delete item (403 Forbidden)',
      preconditions: 'Authenticated non-owner token (Bob)',
      steps: `DELETE /api/items/${createdItemId} using Bob's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // Data-driven list & pagination tests (TC-ITEM-026 to TC-ITEM-030)
  const paginationCases = [
    { page: 1, limit: 3 },
    { page: 2, limit: 2 },
    { page: 1, limit: 10 },
    { page: 1, limit: 1 },
    { page: 99, limit: 10 },
  ];

  for (let i = 0; i < paginationCases.length; i++) {
    const pc = paginationCases[i];
    const tcId = `API-ITEM-${String(i + 26).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/items?page=${pc.page}&limit=${pc.limit}`, 'GET', undefined, bobToken);
      const items = res.data?.data?.items || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(items) && items.length <= pc.limit;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `List items pagination: page ${pc.page}, limit ${pc.limit}`,
        preconditions: 'Items exist in database',
        steps: `GET /api/items?page=${pc.page}&limit=${pc.limit} with auth`,
        expectedResult: `HTTP 200 with at most ${pc.limit} items`,
        actualResult: `HTTP ${res.status}: returned ${items.length} items`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Pagination check failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `List items pagination: page ${pc.page}, limit ${pc.limit}`,
        preconditions: 'None',
        steps: 'GET /api/items',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven Search queries (TC-ITEM-031 to TC-ITEM-035)
  const searchCases = [
    { query: 'Drill', minResults: 1 },
    { query: 'Hammer', minResults: 1 },
    { query: 'Bosch', minResults: 1 },
    { query: 'nonexistent_keyword_xyz_9999', minResults: 0 },
    { query: 'Tools', minResults: 1 },
  ];

  for (let i = 0; i < searchCases.length; i++) {
    const sc = searchCases[i];
    const tcId = `API-ITEM-${String(i + 31).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/items?q=${encodeURIComponent(sc.query)}`, 'GET', undefined, bobToken);
      const items = res.data?.data?.items || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(items) && (sc.minResults === 0 ? items.length === 0 : items.length >= sc.minResults);
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Search items by keyword '${sc.query}'`,
        preconditions: 'Items indexed in DB',
        steps: `GET /api/items?q=${encodeURIComponent(sc.query)} with auth`,
        expectedResult: `HTTP 200 with ${sc.minResults === 0 ? 'empty list' : '>= ' + sc.minResults + ' results'}`,
        actualResult: `HTTP ${res.status}: returned ${items.length} items`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Search failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Search items by keyword '${sc.query}'`,
        preconditions: 'None',
        steps: 'GET /api/items',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven Nearby radius queries (Springfield coords) (TC-ITEM-036 to TC-ITEM-039)
  const nearbyCases = [
    { lat: 37.7749, lng: -122.4194, radius: 2, label: 'Radius 2 km (Downtown)' },
    { lat: 37.7749, lng: -122.4194, radius: 5, label: 'Radius 5 km' },
    { lat: 37.7749, lng: -122.4194, radius: 15, label: 'Radius 15 km (All Springfield)' },
    { lat: 10.0, lng: 10.0, radius: 1, label: 'Radius 1 km (Empty remote location)' },
  ];

  for (let i = 0; i < nearbyCases.length; i++) {
    const nc = nearbyCases[i];
    const tcId = `API-ITEM-${String(i + 36).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/items?lat=${nc.lat}&lng=${nc.lng}&radius=${nc.radius}`, 'GET', undefined, bobToken);
      const items = res.data?.data?.items || res.data?.data || [];
      const passed = res.status === 200 && Array.isArray(items);
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Nearby items search: ${nc.label}`,
        preconditions: 'Seeded items clustered around Springfield',
        steps: `GET /api/items?lat=${nc.lat}&lng=${nc.lng}&radius=${nc.radius} with auth`,
        expectedResult: 'HTTP 200 with distance-filtered items',
        actualResult: `HTTP ${res.status}: returned ${items.length} items`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Nearby query failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Nearby items search: ${nc.label}`,
        preconditions: 'None',
        steps: 'GET /api/items',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-ITEM-040: Delete item by owner succeeds
  {
    const start = Date.now();
    const res = await request(`/items/${createdItemId}`, 'DELETE', undefined, aliceToken);
    const passed = res.status === 200 && res.data?.data?.deleted === true;
    collector.record({
      id: 'API-ITEM-040',
      module: moduleName,
      title: 'Owner can delete their listed item',
      preconditions: `Item ${createdItemId} belongs to Alice`,
      steps: `DELETE /api/items/${createdItemId} with Alice's token`,
      expectedResult: 'HTTP 200 with deleted: true',
      actualResult: `HTTP ${res.status}: deleted=${res.data?.data?.deleted}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Delete item failed: ${JSON.stringify(res.data)}`),
    });
  }

  console.log('✓ Finished Module: Items & Inventory (40 test cases)');
}

module.exports = { runItemsTests };
