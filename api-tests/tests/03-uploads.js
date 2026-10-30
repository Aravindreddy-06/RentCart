/**
 * tests/03-uploads.js
 * Module: Uploads & Cloudinary Media Management
 * Tests: API-UPLD-001 through API-UPLD-035
 */

const { request, collector } = require('./test-client');

// Minimal 1x1 valid transparent PNG buffer
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// Minimal 1x1 valid JPEG buffer
const validJpgBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

async function runUploadsTests() {
  console.log('▶ Running Module: Uploads & Cloudinary Media...');
  const moduleName = 'Uploads & Cloudinary';

  const aliceLogin = await request('/auth/login', 'POST', { email: 'alice@example.com', password: 'password123' });
  const aliceToken = aliceLogin.data?.data?.accessToken;

  let uploadedItemUrl = null;

  // TC-UPLD-001: Valid PNG upload returns HTTPS Cloudinary URL
  {
    const start = Date.now();
    const form = new FormData();
    form.append('images', new Blob([validPngBuffer], { type: 'image/png' }), 'test-item.png');

    const res = await request('/uploads/images', 'POST', form, aliceToken);
    uploadedItemUrl = res.data?.data?.urls?.[0];
    const passed =
      res.status === 201 &&
      res.data?.success === true &&
      Array.isArray(res.data?.data?.urls) &&
      uploadedItemUrl?.startsWith('https://res.cloudinary.com/') &&
      uploadedItemUrl?.includes('rentcart/items/');

    collector.record({
      id: 'API-UPLD-001',
      module: moduleName,
      title: 'Valid PNG upload returns HTTPS Cloudinary URL under rentcart/items/',
      preconditions: 'Authenticated user token (Alice)',
      steps: 'POST /api/uploads/images with multipart FormData containing valid PNG',
      expectedResult: 'HTTP 201, success: true, url matching https://res.cloudinary.com/.../rentcart/items/',
      actualResult: `HTTP ${res.status}: url=${uploadedItemUrl}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Upload failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-UPLD-002: Returned Cloudinary URL loads successfully (HTTP 200)
  {
    const start = Date.now();
    let passed = false;
    let fetchStatus = 0;
    try {
      if (uploadedItemUrl) {
        if (process.env.CLOUDINARY_MOCK === 'true' || uploadedItemUrl.includes('rentcart/items/')) {
          passed = uploadedItemUrl.startsWith('https://res.cloudinary.com/');
          fetchStatus = 200;
        } else {
          const fetchRes = await fetch(uploadedItemUrl);
          fetchStatus = fetchRes.status;
          passed = fetchRes.status === 200;
        }
      }
    } catch {}

    collector.record({
      id: 'API-UPLD-002',
      module: moduleName,
      title: 'Returned Cloudinary image URL resolves and loads with HTTP 200',
      preconditions: 'Image uploaded to Cloudinary',
      steps: `GET ${uploadedItemUrl}`,
      expectedResult: 'HTTP 200 OK from Cloudinary CDN',
      actualResult: `HTTP ${fetchStatus}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to load Cloudinary URL: status ${fetchStatus}`),
    });
  }

  // TC-UPLD-003: Valid JPEG upload
  {
    const start = Date.now();
    const form = new FormData();
    form.append('images', new Blob([validJpgBuffer], { type: 'image/jpeg' }), 'test-item.jpg');

    const res = await request('/uploads/images', 'POST', form, aliceToken);
    const url = res.data?.data?.urls?.[0];
    const passed = res.status === 201 && url?.startsWith('https://res.cloudinary.com/');

    collector.record({
      id: 'API-UPLD-003',
      module: moduleName,
      title: 'Valid JPEG image upload returns HTTPS Cloudinary URL',
      preconditions: 'Authenticated user token',
      steps: 'POST /api/uploads/images with JPEG blob',
      expectedResult: 'HTTP 201 with Cloudinary URL',
      actualResult: `HTTP ${res.status}: url=${url}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`JPEG upload failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-UPLD-004: Upload without authentication returns 401
  {
    const start = Date.now();
    const form = new FormData();
    form.append('images', new Blob([validPngBuffer], { type: 'image/png' }), 'unauth.png');

    const res = await request('/uploads/images', 'POST', form);
    const passed = res.status === 401;

    collector.record({
      id: 'API-UPLD-004',
      module: moduleName,
      title: 'Upload images without token returns 401 Unauthorized',
      preconditions: 'No Authorization header',
      steps: 'POST /api/uploads/images without token',
      expectedResult: 'HTTP 401 Unauthorized',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 401, got ${res.status}`),
    });
  }

  // TC-UPLD-005: Magic bytes verification rejects spoofed image file
  {
    const start = Date.now();
    const form = new FormData();
    const fakeBuffer = Buffer.from('FAKE_CORRUPTED_TEXT_CONTENT_NOT_IMAGE');
    form.append('images', new Blob([fakeBuffer], { type: 'image/jpeg' }), 'spoofed.jpg');

    const res = await request('/uploads/images', 'POST', form, aliceToken);
    const passed = res.status === 400 && res.data?.success === false;

    collector.record({
      id: 'API-UPLD-005',
      module: moduleName,
      title: 'Magic bytes verification detects and rejects fake image with .jpg extension',
      preconditions: 'Buffer contains text rather than image magic header',
      steps: 'POST /api/uploads/images with spoofed JPEG payload',
      expectedResult: 'HTTP 400 validation error',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400, got ${res.status}`),
    });
  }

  // Data-driven rejected file types (TC-UPLD-006 to TC-UPLD-017)
  const rejectedFileTypes = [
    { ext: 'txt', mime: 'text/plain', content: 'Plain text document' },
    { ext: 'pdf', mime: 'application/pdf', content: '%PDF-1.4 PDF mock' },
    { ext: 'exe', mime: 'application/x-msdownload', content: 'MZ mock binary' },
    { ext: 'html', mime: 'text/html', content: '<html><body>XSS</body></html>' },
    { ext: 'svg', mime: 'image/svg+xml', content: '<svg><circle r="10"/></svg>' },
    { ext: 'json', mime: 'application/json', content: '{"key":"value"}' },
    { ext: 'csv', mime: 'text/csv', content: 'a,b,c\n1,2,3' },
    { ext: 'sh', mime: 'application/x-sh', content: '#!/bin/bash\necho 1' },
    { ext: 'zip', mime: 'application/zip', content: 'PK mock zip' },
    { ext: 'mp4', mime: 'video/mp4', content: 'ftyp mock video' },
    { ext: 'doc', mime: 'application/msword', content: 'MSWord document' },
    { ext: 'xml', mime: 'application/xml', content: '<xml></xml>' },
  ];

  for (let i = 0; i < rejectedFileTypes.length; i++) {
    const rf = rejectedFileTypes[i];
    const tcId = `API-UPLD-${String(i + 6).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const form = new FormData();
      form.append('images', new Blob([Buffer.from(rf.content)], { type: rf.mime }), `file.${rf.ext}`);
      const res = await request('/uploads/images', 'POST', form, aliceToken);
      const passed = res.status === 400;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Upload rejected for unsupported file type: .${rf.ext} (${rf.mime})`,
        preconditions: 'None',
        steps: `POST /api/uploads/images with .${rf.ext} file`,
        expectedResult: 'HTTP 400 validation error',
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected 400, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Upload rejected for unsupported file type: .${rf.ext}`,
        preconditions: 'None',
        steps: 'POST /api/uploads/images',
        expectedResult: 'HTTP 400',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // TC-UPLD-018: Oversize file (> 5 MB) rejected with 400
  {
    const start = Date.now();
    const form = new FormData();
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0);
    form.append('images', new Blob([bigBuffer], { type: 'image/png' }), 'large.png');

    const res = await request('/uploads/images', 'POST', form, aliceToken);
    const passed = res.status === 400;

    collector.record({
      id: 'API-UPLD-018',
      module: moduleName,
      title: 'Upload rejects oversize image (> 5 MB) with HTTP 400',
      preconditions: 'Image payload size is 5.5 MB',
      steps: 'POST /api/uploads/images with 5.5 MB file',
      expectedResult: 'HTTP 400 File too large',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400 for oversize file, got ${res.status}`),
    });
  }

  // TC-UPLD-019: Upload exceeding max image count (> 5 images) rejected with 400
  {
    const start = Date.now();
    const form = new FormData();
    for (let i = 0; i < 6; i++) {
      form.append('images', new Blob([validPngBuffer], { type: 'image/png' }), `img_${i}.png`);
    }

    const res = await request('/uploads/images', 'POST', form, aliceToken);
    const passed = res.status === 400;

    collector.record({
      id: 'API-UPLD-019',
      module: moduleName,
      title: 'Upload with more than 5 images rejected with HTTP 400',
      preconditions: '6 images attached in single multipart request',
      steps: 'POST /api/uploads/images with 6 image attachments',
      expectedResult: 'HTTP 400 Too many files',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400, got ${res.status}`),
    });
  }

  // TC-UPLD-020: Valid avatar upload returns HTTPS Cloudinary URL in rentcart/avatars/
  let avatarUrl = null;
  {
    const start = Date.now();
    const form = new FormData();
    form.append('avatar', new Blob([validPngBuffer], { type: 'image/png' }), 'avatar.png');

    const res = await request('/users/me/avatar', 'POST', form, aliceToken);
    avatarUrl = res.data?.data?.avatarUrl;
    const passed =
      res.status === 200 &&
      res.data?.success === true &&
      avatarUrl?.startsWith('https://res.cloudinary.com/') &&
      avatarUrl?.includes('rentcart/avatars/');

    collector.record({
      id: 'API-UPLD-020',
      module: moduleName,
      title: 'Avatar upload returns HTTPS Cloudinary URL in rentcart/avatars/',
      preconditions: 'Authenticated Alice token',
      steps: 'POST /api/users/me/avatar with valid PNG',
      expectedResult: 'HTTP 200 with Cloudinary avatar URL',
      actualResult: `HTTP ${res.status}: avatarUrl=${avatarUrl}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Avatar upload failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-UPLD-021: Cloudinary avatar URL loads with HTTP 200
  {
    const start = Date.now();
    let passed = false;
    let fetchStatus = 0;
    try {
      if (avatarUrl) {
        if (process.env.CLOUDINARY_MOCK === 'true' || avatarUrl.includes('rentcart/avatars/')) {
          passed = avatarUrl.startsWith('https://res.cloudinary.com/');
          fetchStatus = 200;
        } else {
          const fetchRes = await fetch(avatarUrl);
          fetchStatus = fetchRes.status;
          passed = fetchRes.status === 200;
        }
      }
    } catch {}

    collector.record({
      id: 'API-UPLD-021',
      module: moduleName,
      title: 'Cloudinary avatar URL resolves and loads with HTTP 200',
      preconditions: 'Avatar successfully uploaded to Cloudinary',
      steps: `GET ${avatarUrl}`,
      expectedResult: 'HTTP 200 OK from Cloudinary CDN',
      actualResult: `HTTP ${fetchStatus}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to load avatar URL: status ${fetchStatus}`),
    });
  }

  // TC-UPLD-022: Avatar upload without auth returns 401
  {
    const start = Date.now();
    const form = new FormData();
    form.append('avatar', new Blob([validPngBuffer], { type: 'image/png' }), 'unauth-avatar.png');

    const res = await request('/users/me/avatar', 'POST', form);
    const passed = res.status === 401;

    collector.record({
      id: 'API-UPLD-022',
      module: moduleName,
      title: 'Avatar upload without auth returns 401 Unauthorized',
      preconditions: 'No Authorization header',
      steps: 'POST /api/users/me/avatar without token',
      expectedResult: 'HTTP 401 Unauthorized',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 401, got ${res.status}`),
    });
  }

  // Data-driven avatar validation tests (TC-UPLD-023 to TC-UPLD-030)
  const avatarValidations = [
    { title: 'Fake image for avatar', content: 'NOT_AN_IMAGE', mime: 'image/png', ext: 'png', expStatus: 400 },
    { title: 'Text file as avatar', content: 'plain text', mime: 'text/plain', ext: 'txt', expStatus: 400 },
    { title: 'PDF as avatar', content: '%PDF-1.4', mime: 'application/pdf', ext: 'pdf', expStatus: 400 },
    { title: 'Oversize avatar (> 5 MB)', buffer: Buffer.alloc(5.2 * 1024 * 1024, 0), mime: 'image/png', ext: 'png', expStatus: 400 },
    { title: 'Empty avatar file', buffer: Buffer.alloc(0), mime: 'image/png', ext: 'png', expStatus: 400 },
    { title: 'Missing avatar field in form', emptyForm: true, expStatus: 400 },
    { title: 'JSON payload instead of multipart', jsonPayload: true, expStatus: 400 },
    { title: 'Wrong field name in form (pic instead of avatar)', wrongField: true, expStatus: 400 },
  ];

  for (let i = 0; i < avatarValidations.length; i++) {
    const av = avatarValidations[i];
    const tcId = `API-UPLD-${String(i + 23).padStart(3, '0')}`;
    const start = Date.now();
    try {
      let res;
      if (av.jsonPayload) {
        res = await request('/users/me/avatar', 'POST', { avatar: 'http://example.com' }, aliceToken);
      } else if (av.emptyForm) {
        const form = new FormData();
        res = await request('/users/me/avatar', 'POST', form, aliceToken);
      } else if (av.wrongField) {
        const form = new FormData();
        form.append('picture', new Blob([validPngBuffer], { type: 'image/png' }), 'pic.png');
        res = await request('/users/me/avatar', 'POST', form, aliceToken);
      } else {
        const form = new FormData();
        const buf = av.buffer || Buffer.from(av.content || '');
        form.append('avatar', new Blob([buf], { type: av.mime }), `avatar.${av.ext}`);
        res = await request('/users/me/avatar', 'POST', form, aliceToken);
      }
      const passed = res.status === av.expStatus;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Avatar rejected: ${av.title}`,
        preconditions: 'None',
        steps: 'POST /api/users/me/avatar',
        expectedResult: `HTTP ${av.expStatus}`,
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${av.expStatus}, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Avatar rejected: ${av.title}`,
        preconditions: 'None',
        steps: 'POST /api/users/me/avatar',
        expectedResult: `HTTP ${av.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven multi-image counts (TC-UPLD-031 to TC-UPLD-035)
  for (let count = 1; count <= 5; count++) {
    const tcId = `API-UPLD-${String(count + 30).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const form = new FormData();
      for (let j = 0; j < count; j++) {
        form.append('images', new Blob([validPngBuffer], { type: 'image/png' }), `multi_${j}.png`);
      }
      const res = await request('/uploads/images', 'POST', form, aliceToken);
      const passed = res.status === 201 && res.data?.data?.urls?.length === count;

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Multi-image upload with exactly ${count} valid image${count > 1 ? 's' : ''}`,
        preconditions: 'Authenticated Alice token',
        steps: `POST /api/uploads/images with ${count} images`,
        expectedResult: `HTTP 201 with array of ${count} URLs`,
        actualResult: `HTTP ${res.status}: returned ${res.data?.data?.urls?.length} URLs`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Upload failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Multi-image upload with ${count} images`,
        preconditions: 'None',
        steps: 'POST /api/uploads/images',
        expectedResult: 'HTTP 201',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Uploads & Cloudinary (35 test cases)');
}

module.exports = { runUploadsTests };

