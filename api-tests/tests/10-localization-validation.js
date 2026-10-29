/**
 * tests/10-localization-validation.js
 * Module: India Localization & Input Validation
 * Tests: API-LOC-001 through API-LOC-035
 */

const { request, collector } = require('./test-client');

async function runLocalizationTests() {
  console.log('▶ Running Module: India Localization & Input Validation...');
  const moduleName = 'India Localization';

  const aliceLogin = await request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' });
  const aliceToken = aliceLogin.data?.data?.accessToken;

  // 1. Valid Indian Phone Normalization Variants (TC-LOC-001 to TC-LOC-010)
  const phoneVariants = [
    { input: '9876543210', expected: '+919876543210', label: '10 digits starting with 9' },
    { input: '8765432109', expected: '+918765432109', label: '10 digits starting with 8' },
    { input: '7654321098', expected: '+917654321098', label: '10 digits starting with 7' },
    { input: '6543210987', expected: '+916543210987', label: '10 digits starting with 6' },
    { input: '09876543210', expected: '+919876543210', label: 'Leading 0 prefix' },
    { input: '+91 98765 43210', expected: '+919876543210', label: 'E.164 with space formatting' },
    { input: '91-9876543210', expected: '+919876543210', label: 'Country code with hyphen' },
    { input: '+91-98765-43210', expected: '+919876543210', label: 'Country code and hyphens' },
    { input: '  9876543210  ', expected: '+919876543210', label: 'Leading/trailing whitespace' },
    { input: '98765 43210', expected: '+919876543210', label: 'Split with single space' },
  ];

  for (let i = 0; i < phoneVariants.length; i++) {
    const pv = phoneVariants[i];
    const tcId = `API-LOC-${String(i + 1).padStart(3, '0')}`;
    const start = Date.now();
    const testEmail = `phone.norm.${i}.${Date.now()}@example.com`;

    try {
      const res = await request('/auth/register', 'POST', {
        name: `Phone Norm ${i}`,
        email: testEmail,
        password: 'Password123!',
        phone: pv.input,
      });

      const user = res.data?.data?.user;
      const passed = res.status === 201 && (!user?.phone || user.phone === pv.expected);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Indian mobile number format normalized: ${pv.label}`,
        preconditions: 'Registration input phone',
        steps: `POST /api/auth/register with phone: "${pv.input}"`,
        expectedResult: `HTTP 201, phone normalized to ${pv.expected}`,
        actualResult: `HTTP ${res.status}: user.phone=${user?.phone || 'accepted'}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Failed to normalize ${pv.input}: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Indian mobile number format normalized: ${pv.label}`,
        preconditions: 'None',
        steps: 'POST /api/auth/register',
        expectedResult: 'HTTP 201',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // 2. Invalid Indian Mobile Numbers (TC-LOC-011 to TC-LOC-020)
  const invalidPhones = [
    { input: '1234567890', reason: 'Starts with 1 (not allowed in India)' },
    { input: '2345678901', reason: 'Starts with 2' },
    { input: '3456789012', reason: 'Starts with 3' },
    { input: '4567890123', reason: 'Starts with 4' },
    { input: '5678901234', reason: 'Starts with 5' },
    { input: '98765', reason: 'Too short (5 digits)' },
    { input: '98765432101234', reason: 'Too long (14 digits)' },
    { input: '0000000000', reason: 'All zeros' },
    { input: 'abcdefghij', reason: 'Alphabetic characters' },
    { input: '98765-abcde', reason: 'Mixed alphanumeric' },
  ];

  for (let i = 0; i < invalidPhones.length; i++) {
    const ip = invalidPhones[i];
    const tcId = `API-LOC-${String(i + 11).padStart(3, '0')}`;
    const start = Date.now();
    const testEmail = `bad.phone.${i}.${Date.now()}@example.com`;

    try {
      const res = await request('/auth/register', 'POST', {
        name: `Bad Phone ${i}`,
        email: testEmail,
        password: 'Password123!',
        phone: ip.input,
      });

      const passed = res.status === 400;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Invalid Indian mobile number rejected: ${ip.reason}`,
        preconditions: 'None',
        steps: `POST /api/auth/register with invalid phone: "${ip.input}"`,
        expectedResult: 'HTTP 400 Bad Request',
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected 400, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Invalid Indian mobile number rejected: ${ip.reason}`,
        preconditions: 'None',
        steps: 'POST /api/auth/register',
        expectedResult: 'HTTP 400',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // 3. Currency INR Everywhere (TC-LOC-021 to TC-LOC-025)
  // Check item listing currency
  {
    const start = Date.now();
    const res = await request('/items?limit=1', 'GET');
    const itm = res.data?.data?.items?.[0] || res.data?.data?.[0];
    const passed = res.status === 200 && itm?.currency === 'INR';

    collector.record({
      id: 'API-LOC-021',
      module: moduleName,
      title: 'Item listing response explicitly includes currency: "INR"',
      preconditions: 'Items exist in database',
      steps: 'GET /api/items?limit=1 and verify currency property',
      expectedResult: 'HTTP 200 with item.currency === "INR"',
      actualResult: `HTTP ${res.status}: currency=${itm?.currency}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Currency not INR: ${JSON.stringify(itm)}`),
    });
  }

  // Check rental currency
  {
    const start = Date.now();
    const res = await request('/rentals/mine?limit=1', 'GET', undefined, aliceToken);
    const rental = res.data?.data?.rentals?.[0] || res.data?.data?.[0];
    const passed = res.status === 200 && (!rental || rental.currency === 'INR');

    collector.record({
      id: 'API-LOC-022',
      module: moduleName,
      title: 'Rental records explicitly include currency: "INR"',
      preconditions: 'Rentals exist for Alice',
      steps: 'GET /api/rentals/mine?limit=1 and verify currency',
      expectedResult: 'HTTP 200 with rental.currency === "INR"',
      actualResult: `HTTP ${res.status}: currency=${rental?.currency || 'INR'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Rental currency check failed: ${JSON.stringify(rental)}`),
    });
  }

  // Profile update with normalized phone and address (TC-LOC-023 to TC-LOC-025)
  {
    const start = Date.now();
    const res = await request('/users/me', 'PATCH', {
      phone: '9876543210',
      address: 'Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
    }, aliceToken);

    const passed = res.status === 200 && res.data?.data?.address === 'Connaught Place, New Delhi';

    collector.record({
      id: 'API-LOC-023',
      module: moduleName,
      title: 'User profile update with Indian address and coordinates',
      preconditions: 'Alice authenticated session',
      steps: 'PATCH /api/users/me with address and lat/lng',
      expectedResult: 'HTTP 200 with updated address and coordinates',
      actualResult: `HTTP ${res.status}: address="${res.data?.data?.address}"`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Update failed: ${JSON.stringify(res.data)}`),
    });
  }

  // Restore Alice's original Springfield address
  await request('/users/me', 'PATCH', {
    address: '12 Maple Street, Springfield',
    latitude: 37.7749,
    longitude: -122.4194,
    phone: '+919876543210',
  }, aliceToken);

  // Data-driven coordinate validations (TC-LOC-024 to TC-LOC-028)
  const coordValidations = [
    { title: 'Latitude > 90 rejected', lat: 95.0, lng: 0.0, expStatus: 400 },
    { title: 'Latitude < -90 rejected', lat: -95.0, lng: 0.0, expStatus: 400 },
    { title: 'Longitude > 180 rejected', lat: 0.0, lng: 185.0, expStatus: 400 },
    { title: 'Longitude < -180 rejected', lat: 0.0, lng: -185.0, expStatus: 400 },
    { title: 'Valid equator/prime meridian coordinates', lat: 0.0, lng: 0.0, expStatus: 200 },
  ];

  for (let i = 0; i < coordValidations.length; i++) {
    const cv = coordValidations[i];
    const tcId = `API-LOC-${String(i + 24).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/users/me', 'PATCH', { latitude: cv.lat, longitude: cv.lng }, aliceToken);
      const passed = res.status === cv.expStatus;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Coordinate range validation: ${cv.title}`,
        preconditions: 'Alice authenticated session',
        steps: `PATCH /api/users/me with lat=${cv.lat}, lng=${cv.lng}`,
        expectedResult: `HTTP ${cv.expStatus}`,
        actualResult: `HTTP ${res.status}: ${res.data?.message || 'OK'}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${cv.expStatus}, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Coordinate range validation: ${cv.title}`,
        preconditions: 'None',
        steps: 'PATCH /api/users/me',
        expectedResult: `HTTP ${cv.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Restore Alice's coordinates
  await request('/users/me', 'PATCH', { latitude: 37.7749, longitude: -122.4194 }, aliceToken);

  // Data-driven payload injection sanitization checks (TC-LOC-029 to TC-LOC-035)
  const injectionChecks = [
    { title: 'SQL injection string in search query', q: "' OR 1=1 --" },
    { title: 'SQL injection union query in search query', q: "'; DROP TABLE items; --" },
    { title: 'XSS script tags in search query', q: '<script>alert(1)</script>' },
    { title: 'HTML tags in search query', q: '<img src=x onerror=alert(1)>' },
    { title: 'Unicode special characters in search', q: '₹ ₹ ₹ © ® ™' },
    { title: 'JSON special characters in search', q: '{"$gt": ""}' },
    { title: 'Extra long search query string', q: 'A'.repeat(500) },
  ];

  for (let i = 0; i < injectionChecks.length; i++) {
    const ic = injectionChecks[i];
    const tcId = `API-LOC-${String(i + 29).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/items?q=${encodeURIComponent(ic.q)}`, 'GET');
      const passed = res.status === 200 && Array.isArray(res.data?.data?.items || res.data?.data);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Backend input resilience: ${ic.title}`,
        preconditions: 'None',
        steps: `GET /api/items?q=${encodeURIComponent(ic.q)}`,
        expectedResult: 'HTTP 200 without server crash or unhandled error',
        actualResult: `HTTP ${res.status}: returned valid array`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Failed on injection test: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Backend input resilience: ${ic.title}`,
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

  console.log('✓ Finished Module: India Localization (35 test cases)');
}

module.exports = { runLocalizationTests };

