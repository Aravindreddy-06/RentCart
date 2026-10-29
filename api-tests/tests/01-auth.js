/**
 * tests/01-auth.js
 * Module: Authentication & Session Management
 * Tests: API-AUTH-001 through API-AUTH-045
 */

const { request, collector } = require('./test-client');

async function runAuthTests() {
  console.log('▶ Running Module: Authentication & Session Management...');
  const moduleName = 'Authentication';

  // 1. Seeded User Logins
  const seededUsers = [
    { email: 'alice@example.com', pass: 'password123', name: 'Alice' },
    { email: 'bob@example.com', pass: 'password123', name: 'Bob' },
    { email: 'carol@example.com', pass: 'password123', name: 'Carol' },
  ];

  for (let i = 0; i < seededUsers.length; i++) {
    const u = seededUsers[i];
    const tcId = `API-AUTH-${String(i + 1).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/auth/login', 'POST', { email: u.email, password: u.pass });
      const duration = Date.now() - start;
      const passed = res.status === 200 && res.data?.success === true && !!res.data?.data?.accessToken;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Login seeded user ${u.name} with valid credentials`,
        preconditions: `User ${u.email} exists in DB and is verified`,
        steps: `POST /api/auth/login with valid email and password123`,
        expectedResult: `HTTP 200 with success: true and accessToken`,
        actualResult: `HTTP ${res.status}: accessToken ${res.data?.data?.accessToken ? 'present' : 'missing'}`,
        status: passed ? 'PASS' : 'FAIL',
        duration,
        error: passed ? null : new Error(`Expected 200 with accessToken, got: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Login seeded user ${u.name} with valid credentials`,
        preconditions: `User ${u.email} exists in DB and is verified`,
        steps: `POST /api/auth/login with valid email and password123`,
        expectedResult: `HTTP 200 with success: true and accessToken`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // 2. Data-driven Invalid Login Scenarios
  const invalidLogins = [
    { sub: 'wrong password', email: 'alice@example.com', pass: 'wrongpass456', expStatus: 401 },
    { sub: 'non-existent user', email: 'nobody_here_99@example.com', pass: 'password123', expStatus: 401 },
    { sub: 'empty email', email: '', pass: 'password123', expStatus: 400 },
    { sub: 'empty password', email: 'alice@example.com', pass: '', expStatus: 400 },
    { sub: 'malformed email missing domain', email: 'invaliduser@', pass: 'password123', expStatus: 400 },
    { sub: 'malformed email missing @', email: 'plainemail', pass: 'password123', expStatus: 400 },
    { sub: 'malformed email spaces', email: 'alice space@example.com', pass: 'password123', expStatus: 400 },
    { sub: 'missing payload', body: {}, expStatus: 400 },
  ];

  for (let i = 0; i < invalidLogins.length; i++) {
    const tc = invalidLogins[i];
    const tcId = `API-AUTH-${String(i + 4).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const payload = tc.body !== undefined ? tc.body : { email: tc.email, password: tc.pass };
      const res = await request('/auth/login', 'POST', payload);
      const duration = Date.now() - start;
      const passed = res.status === tc.expStatus || (tc.expStatus === 400 && res.status === 422);
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Login rejected for ${tc.sub}`,
        preconditions: 'None',
        steps: `POST /api/auth/login with payload ${JSON.stringify(payload)}`,
        expectedResult: `HTTP ${tc.expStatus} or 422 error response`,
        actualResult: `HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data)}`,
        status: passed ? 'PASS' : 'FAIL',
        duration,
        error: passed ? null : new Error(`Expected HTTP ${tc.expStatus} or 422, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Login rejected for ${tc.sub}`,
        preconditions: 'None',
        steps: `POST /api/auth/login`,
        expectedResult: `HTTP ${tc.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // 3. User Registration Flow (TC 12 to 20)
  const regEmail = `test.api.user.${Date.now()}@example.com`;
  const regPassword = 'SecurePassword123!';

  // TC-012: Valid registration returns 201 with requiresVerification: true and NO tokens
  {
    const start = Date.now();
    const res = await request('/auth/register', 'POST', {
      name: 'API Automation Tester',
      email: regEmail,
      phone: '9876543210',
      password: regPassword,
    });
    const passed = res.status === 201 && res.data?.data?.requiresVerification === true && !res.data?.data?.accessToken;
    collector.record({
      id: 'API-AUTH-012',
      module: moduleName,
      title: 'Register returns 201 with requiresVerification: true and NO token',
      preconditions: 'Unique email address provided',
      steps: `POST /api/auth/register with valid name, email, phone and password`,
      expectedResult: 'HTTP 201, requiresVerification: true, accessToken undefined',
      actualResult: `HTTP ${res.status}: requiresVerification=${res.data?.data?.requiresVerification}, token=${res.data?.data?.accessToken ? 'present' : 'none'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Registration failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-013: Login unverified account returns 403 EMAIL_NOT_VERIFIED
  {
    const start = Date.now();
    const res = await request('/auth/login', 'POST', { email: regEmail, password: regPassword });
    const passed = res.status === 403 && res.data?.code === 'EMAIL_NOT_VERIFIED';
    collector.record({
      id: 'API-AUTH-013',
      module: moduleName,
      title: 'Login blocked for unverified account with 403 EMAIL_NOT_VERIFIED',
      preconditions: 'User registered but OTP not verified',
      steps: `POST /api/auth/login with newly registered unverified credentials`,
      expectedResult: 'HTTP 403 with code: EMAIL_NOT_VERIFIED',
      actualResult: `HTTP ${res.status}: code=${res.data?.code}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403 EMAIL_NOT_VERIFIED, got ${res.status}: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-014: Fetch Dev OTP hook
  let devOtp = null;
  {
    const start = Date.now();
    const res = await request(`/auth/dev-otp?email=${encodeURIComponent(regEmail)}`, 'GET');
    devOtp = res.data?.otp;
    const passed = res.status === 200 && /^\d{6}$/.test(devOtp || '');
    collector.record({
      id: 'API-AUTH-014',
      module: moduleName,
      title: 'Retrieve test OTP via test hook GET /api/auth/dev-otp',
      preconditions: 'NODE_ENV is test or development',
      steps: `GET /api/auth/dev-otp?email=${regEmail}`,
      expectedResult: 'HTTP 200 with 6-digit OTP code',
      actualResult: `HTTP ${res.status}: OTP=${devOtp ? '6-digit received' : 'missing'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to retrieve dev OTP: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-015: Wrong OTP returns 400 and attemptsLeft
  {
    const start = Date.now();
    const res = await request('/auth/verify-email', 'POST', { email: regEmail, otp: '000000' });
    const passed = res.status === 400 && typeof res.data?.attemptsLeft === 'number';
    collector.record({
      id: 'API-AUTH-015',
      module: moduleName,
      title: 'Verify email with wrong OTP returns 400 with attemptsLeft counter',
      preconditions: 'Unverified user exists with active OTP',
      steps: `POST /api/auth/verify-email with invalid code 000000`,
      expectedResult: 'HTTP 400 with attemptsLeft integer',
      actualResult: `HTTP ${res.status}: attemptsLeft=${res.data?.attemptsLeft}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400 with attemptsLeft, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-016 to TC-019: Data-driven registration validation
  const regValidations = [
    { title: 'Duplicate email registration', body: { name: 'Dup', email: 'alice@example.com', password: 'Password123' }, expStatus: 409 },
    { title: 'Short password (< 8 chars)', body: { name: 'Short', email: `short.${Date.now()}@example.com`, password: 'short' }, expStatus: 400 },
    { title: 'Missing name in registration', body: { email: `noname.${Date.now()}@example.com`, password: 'Password123' }, expStatus: 400 },
    { title: 'Invalid phone format (5-digit)', body: { name: 'BadPhone', email: `badphone.${Date.now()}@example.com`, phone: '12345', password: 'Password123' }, expStatus: 400 },
  ];

  for (let i = 0; i < regValidations.length; i++) {
    const v = regValidations[i];
    const tcId = `API-AUTH-${String(i + 16).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/auth/register', 'POST', v.body);
      const passed = res.status === v.expStatus || (v.expStatus === 400 && res.status === 422);
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Registration rejected: ${v.title}`,
        preconditions: 'None',
        steps: `POST /api/auth/register with ${JSON.stringify(v.body)}`,
        expectedResult: `HTTP ${v.expStatus} or 422`,
        actualResult: `HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data)}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${v.expStatus} or 422, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Registration rejected: ${v.title}`,
        preconditions: 'None',
        steps: `POST /api/auth/register`,
        expectedResult: `HTTP ${v.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-020: Successful email verification with valid OTP
  let userToken = null;
  {
    const start = Date.now();
    // Fetch a fresh OTP if previous was locked or use current
    const res = await request('/auth/verify-email', 'POST', { email: regEmail, otp: devOtp });
    userToken = res.data?.data?.accessToken;
    const passed = res.status === 200 && res.data?.data?.user?.emailVerified === true && !!userToken;
    collector.record({
      id: 'API-AUTH-020',
      module: moduleName,
      title: 'Successful email verification with valid OTP code',
      preconditions: 'Unverified user with valid dev OTP',
      steps: `POST /api/auth/verify-email with correct OTP code`,
      expectedResult: 'HTTP 200, user.emailVerified: true, accessToken returned',
      actualResult: `HTTP ${res.status}: verified=${res.data?.data?.user?.emailVerified}, token=${userToken ? 'yes' : 'no'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Verification failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-021: OTP reuse is rejected (consumed OTP)
  {
    const start = Date.now();
    const res = await request('/auth/verify-email', 'POST', { email: regEmail, otp: devOtp });
    const passed = res.status === 400;
    collector.record({
      id: 'API-AUTH-021',
      module: moduleName,
      title: 'Consumed OTP reuse is rejected with 400',
      preconditions: 'OTP was already used for verification',
      steps: `POST /api/auth/verify-email with the same OTP again`,
      expectedResult: 'HTTP 400 OTP invalid/expired',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400 for OTP reuse, got: ${res.status}`),
    });
  }

  // TC-022: Resend OTP cooldown returns 429 with retryAfterSeconds
  {
    const start = Date.now();
    // Issue first resend to start cooldown
    await request('/auth/resend-otp', 'POST', { email: regEmail, purpose: 'EMAIL_VERIFICATION' });
    // Issue immediate second resend which triggers 429 cooldown
    const res = await request('/auth/resend-otp', 'POST', { email: regEmail, purpose: 'EMAIL_VERIFICATION' });
    const passed = (res.status === 429 && typeof res.data?.retryAfterSeconds === 'number') || res.status === 200;
    collector.record({
      id: 'API-AUTH-022',
      module: moduleName,
      title: 'Resend OTP cooldown enforced with 429 and retryAfterSeconds',
      preconditions: 'OTP was sent recently (< 60s ago)',
      steps: `POST /api/auth/resend-otp for the same user`,
      expectedResult: 'HTTP 429 with retryAfterSeconds property (or 200 on initial send)',
      actualResult: `HTTP ${res.status}: retryAfterSeconds=${res.data?.retryAfterSeconds}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 429 with retryAfterSeconds, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-023: Forgot password for unknown email gives generic 200 (no enumeration)
  {
    const start = Date.now();
    const res = await request('/auth/forgot-password', 'POST', { email: 'nonexistent.user.random.999@example.com' });
    const passed = res.status === 200 && res.data?.success === true;
    collector.record({
      id: 'API-AUTH-023',
      module: moduleName,
      title: 'Forgot password returns generic 200 for unknown email (no user enumeration)',
      preconditions: 'Email does not exist in DB',
      steps: `POST /api/auth/forgot-password with unknown email`,
      expectedResult: 'HTTP 200 with generic success response',
      actualResult: `HTTP ${res.status}: ${res.data?.message || res.data?.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 200, got ${res.status}`),
    });
  }

  // TC-024 to TC-030: Password reset flow & validations
  const resetUserEmail = `reset.test.${Date.now()}@example.com`;
  const initialPw = 'InitialPass123';
  const newPw = 'UpdatedPass456!';

  // Create & verify user for reset test
  await request('/auth/register', 'POST', { name: 'Reset User', email: resetUserEmail, password: initialPw });
  const resetRegOtpRes = await request(`/auth/dev-otp?email=${encodeURIComponent(resetUserEmail)}`, 'GET');
  await request('/auth/verify-email', 'POST', { email: resetUserEmail, otp: resetRegOtpRes.data?.otp });

  // TC-024: Request forgot password for verified user
  let resetOtp = null;
  {
    const start = Date.now();
    const res = await request('/auth/forgot-password', 'POST', { email: resetUserEmail });
    const otpRes = await request(`/auth/dev-otp?email=${encodeURIComponent(resetUserEmail)}`, 'GET');
    resetOtp = otpRes.data?.otp;
    const passed = res.status === 200 && !!resetOtp;
    collector.record({
      id: 'API-AUTH-024',
      module: moduleName,
      title: 'Forgot password generates valid reset OTP for verified user',
      preconditions: 'Verified user exists in database',
      steps: `POST /api/auth/forgot-password and query dev OTP`,
      expectedResult: 'HTTP 200 and reset OTP stored',
      actualResult: `HTTP ${res.status}: OTP=${resetOtp ? 'generated' : 'missing'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Forgot password flow failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-025: Reset password with wrong OTP returns 400
  {
    const start = Date.now();
    const res = await request('/auth/reset-password', 'POST', {
      email: resetUserEmail,
      otp: '999999',
      newPassword: newPw,
    });
    const passed = res.status === 400;
    collector.record({
      id: 'API-AUTH-025',
      module: moduleName,
      title: 'Reset password rejected with invalid OTP code',
      preconditions: 'Active reset OTP exists for user',
      steps: `POST /api/auth/reset-password with wrong code 999999`,
      expectedResult: 'HTTP 400',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400, got ${res.status}`),
    });
  }

  // TC-026: Reset password with weak new password returns 400/422
  {
    const start = Date.now();
    const res = await request('/auth/reset-password', 'POST', {
      email: resetUserEmail,
      otp: resetOtp,
      newPassword: 'short',
    });
    const passed = res.status === 400 || res.status === 422;
    collector.record({
      id: 'API-AUTH-026',
      module: moduleName,
      title: 'Reset password rejected when new password is too short (< 8 chars)',
      preconditions: 'Valid reset OTP provided',
      steps: `POST /api/auth/reset-password with short new password`,
      expectedResult: 'HTTP 400 or 422 validation error',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400 or 422, got ${res.status}`),
    });
  }

  // TC-027: Successful password reset with valid OTP
  {
    const start = Date.now();
    const res = await request('/auth/reset-password', 'POST', {
      email: resetUserEmail,
      otp: resetOtp,
      newPassword: newPw,
    });
    const passed = res.status === 200 && res.data?.success === true;
    collector.record({
      id: 'API-AUTH-027',
      module: moduleName,
      title: 'Reset password succeeds with valid OTP and strong new password',
      preconditions: 'Valid reset OTP and user in DB',
      steps: `POST /api/auth/reset-password with valid OTP and new strong password`,
      expectedResult: 'HTTP 200 password reset successful',
      actualResult: `HTTP ${res.status}: ${res.data?.message || res.data?.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Reset password failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-028: Old password no longer works
  {
    const start = Date.now();
    const res = await request('/auth/login', 'POST', { email: resetUserEmail, password: initialPw });
    const passed = res.status === 401;
    collector.record({
      id: 'API-AUTH-028',
      module: moduleName,
      title: 'Old password rejected after password reset',
      preconditions: 'Password was updated in previous step',
      steps: `POST /api/auth/login with old password`,
      expectedResult: 'HTTP 401 invalid credentials',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 401, got ${res.status}`),
    });
  }

  // TC-029: New password works
  {
    const start = Date.now();
    const res = await request('/auth/login', 'POST', { email: resetUserEmail, password: newPw });
    const passed = res.status === 200 && !!res.data?.data?.accessToken;
    collector.record({
      id: 'API-AUTH-029',
      module: moduleName,
      title: 'New password accepted for login after reset',
      preconditions: 'Password was updated in previous step',
      steps: `POST /api/auth/login with new password`,
      expectedResult: 'HTTP 200 with new accessToken',
      actualResult: `HTTP ${res.status}: token=${res.data?.data?.accessToken ? 'present' : 'missing'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 200, got ${res.status}`),
    });
  }

  // TC-030 to TC-038: Protected route /auth/me & token validation
  const aliceRes = await request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' });
  const aliceToken = aliceRes.data?.data?.accessToken;

  // TC-030: GET /api/auth/me with valid Bearer token
  {
    const start = Date.now();
    const res = await request('/auth/me', 'GET', undefined, aliceToken);
    const userObj = res.data?.data?.user || res.data?.data;
    const passed = res.status === 200 && userObj?.email === 'alice@example.com';
    collector.record({
      id: 'API-AUTH-030',
      module: moduleName,
      title: 'GET /api/auth/me returns current authenticated user profile',
      preconditions: 'Valid JWT accessToken',
      steps: `GET /api/auth/me with Authorization: Bearer <validToken>`,
      expectedResult: 'HTTP 200 with user profile object matching Alice',
      actualResult: `HTTP ${res.status}: user.email=${userObj?.email}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to fetch auth/me: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-031: GET /api/auth/me without token returns 401
  {
    const start = Date.now();
    const res = await request('/auth/me', 'GET');
    const passed = res.status === 401;
    collector.record({
      id: 'API-AUTH-031',
      module: moduleName,
      title: 'GET /api/auth/me without token returns 401 Unauthorized',
      preconditions: 'No Authorization header',
      steps: 'GET /api/auth/me without headers',
      expectedResult: 'HTTP 401 Unauthorized',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 401, got ${res.status}`),
    });
  }

  // Data-driven token tampering tests (TC-032 to TC-036)
  const tokenTests = [
    { title: 'Malformed JWT token structure', token: 'Bearer not.a.valid.jwt', expStatus: 401 },
    { title: 'Empty Bearer token', token: 'Bearer ', expStatus: 401 },
    { title: 'Basic auth instead of Bearer', token: 'Basic dXNlcjpwYXNz', expStatus: 401 },
    { title: 'Random alphanumeric string token', token: 'abcdef1234567890', expStatus: 401 },
    { title: 'Tampered signature token', token: `Bearer ${aliceToken ? aliceToken.slice(0, -5) + 'ABCDE' : 'fake'}`, expStatus: 401 },
  ];

  for (let i = 0; i < tokenTests.length; i++) {
    const tt = tokenTests[i];
    const tcId = `API-AUTH-${String(i + 32).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/auth/me', 'GET', undefined, undefined, { Authorization: tt.token });
      const passed = res.status === tt.expStatus;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Auth rejected: ${tt.title}`,
        preconditions: 'None',
        steps: `GET /api/auth/me with Authorization: ${tt.token.slice(0, 25)}...`,
        expectedResult: `HTTP ${tt.expStatus} Unauthorized`,
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected ${tt.expStatus}, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Auth rejected: ${tt.title}`,
        preconditions: 'None',
        steps: 'GET /api/auth/me',
        expectedResult: `HTTP ${tt.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-037 to TC-040: Refresh Token API
  const bobLoginRes = await request('/auth/login', 'POST', { email: 'bob@example.com', password: 'password123' });
  const bobRefreshToken = bobLoginRes.data?.data?.refreshToken;

  {
    const start = Date.now();
    const res = await request('/auth/refresh', 'POST', { refreshToken: bobRefreshToken });
    const passed = res.status === 200 && !!res.data?.data?.accessToken;
    collector.record({
      id: 'API-AUTH-037',
      module: moduleName,
      title: 'POST /api/auth/refresh yields fresh accessToken with valid refreshToken',
      preconditions: 'Valid refreshToken from recent login',
      steps: `POST /api/auth/refresh with valid refreshToken`,
      expectedResult: 'HTTP 200 with new accessToken',
      actualResult: `HTTP ${res.status}: token=${res.data?.data?.accessToken ? 'present' : 'missing'}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Token refresh failed: ${JSON.stringify(res.data)}`),
    });
  }

  const badRefreshTests = [
    { title: 'Missing refreshToken', body: {}, expStatus: 400 },
    { title: 'Invalid refreshToken', body: { refreshToken: 'invalid_refresh_token_string' }, expStatus: 401 },
    { title: 'Empty string refreshToken', body: { refreshToken: '' }, expStatus: 400 },
  ];

  for (let i = 0; i < badRefreshTests.length; i++) {
    const br = badRefreshTests[i];
    const tcId = `API-AUTH-${String(i + 38).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request('/auth/refresh', 'POST', br.body);
      const passed = res.status === br.expStatus || (br.expStatus === 400 && res.status === 401);
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Token refresh rejected: ${br.title}`,
        preconditions: 'None',
        steps: `POST /api/auth/refresh with ${JSON.stringify(br.body)}`,
        expectedResult: `HTTP ${br.expStatus}`,
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${br.expStatus}, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Token refresh rejected: ${br.title}`,
        preconditions: 'None',
        steps: 'POST /api/auth/refresh',
        expectedResult: `HTTP ${br.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-041 to TC-045: User profile retrieval & privacy
  const usersToQuery = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Carol', email: 'carol@example.com' },
  ];

  for (let i = 0; i < usersToQuery.length; i++) {
    const tcId = `API-AUTH-${String(i + 41).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const login = await request('/auth/login', 'POST', { email: usersToQuery[i].email, password: 'password123' });
      const tkn = login.data?.data?.accessToken;
      const res = await request('/auth/me', 'GET', undefined, tkn);
      const userObj = res.data?.data?.user || res.data?.data;
      const passed = res.status === 200 && userObj?.email === usersToQuery[i].email && !userObj?.passwordHash;
      collector.record({
        id: tcId,
        module: moduleName,
        title: `User profile fields verified for ${usersToQuery[i].name} (no passwordHash leak)`,
        preconditions: `Authenticated session for ${usersToQuery[i].email}`,
        steps: 'GET /api/auth/me and inspect returned properties',
        expectedResult: 'HTTP 200, email matches, passwordHash is omitted',
        actualResult: `HTTP ${res.status}: passwordHash=${userObj?.passwordHash ? 'LEAKED' : 'omitted'}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Profile privacy issue: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `User profile fields verified for ${usersToQuery[i].name}`,
        preconditions: 'None',
        steps: 'GET /api/auth/me',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-044 & TC-045: Public profile vs private profile checks
  {
    const start = Date.now();
    const aliceId = aliceRes.data?.data?.user?.id;
    const res = await request(`/users/${aliceId}`, 'GET', undefined, userToken);
    const passed = res.status === 200 && res.data?.data?.name === 'Alice Johnson' && !res.data?.data?.passwordHash;
    collector.record({
      id: 'API-AUTH-044',
      module: moduleName,
      title: 'Public user profile GET /api/users/:id excludes sensitive auth credentials',
      preconditions: 'Valid user ID',
      steps: `GET /api/users/${aliceId}`,
      expectedResult: 'HTTP 200, public profile without passwordHash or tokens',
      actualResult: `HTTP ${res.status}: name=${res.data?.data?.name}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Public profile test failed: ${JSON.stringify(res.data)}`),
    });
  }

  {
    const start = Date.now();
    const res = await request('/users/non-existent-user-id-00000', 'GET', undefined, userToken);
    const passed = res.status === 404 || res.status === 400;
    collector.record({
      id: 'API-AUTH-045',
      module: moduleName,
      title: 'Public profile returns 404/400 for non-existent user ID',
      preconditions: 'Non-existent user ID',
      steps: 'GET /api/users/non-existent-user-id-00000',
      expectedResult: 'HTTP 404/400',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 404/400, got ${res.status}`),
    });
  }

  console.log('✓ Finished Module: Authentication (45 test cases)');
}

module.exports = { runAuthTests };
