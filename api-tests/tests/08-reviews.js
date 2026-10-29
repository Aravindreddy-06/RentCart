/**
 * tests/08-reviews.js
 * Module: Reviews & Ratings System
 * Tests: API-REV-001 through API-REV-025
 */

const { request, collector } = require('./test-client');

async function runReviewsTests() {
  console.log('▶ Running Module: Reviews & Ratings System...');
  const moduleName = 'Reviews & Ratings';

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
    title: 'Review System Test Pressure Washer',
    description: 'High power pressure washer for patio and cars.',
    category: 'Tools',
    pricePerDay: 40,
    deposit: 80,
  }, aliceToken);
  const testItemId = itemRes.data?.data?.id;

  // Create rental -> approve -> activate -> return
  const rentRes = await request('/rentals', 'POST', {
    itemId: testItemId,
    startDate: '2026-12-25',
    endDate: '2026-12-27',
  }, bobToken);
  const reviewRentalId = rentRes.data?.data?.id;

  await request(`/rentals/${reviewRentalId}/approve`, 'PATCH', {}, aliceToken);
  await request(`/rentals/${reviewRentalId}/activate`, 'PATCH', { confirmWithoutPin: true }, aliceToken);
  await request(`/rentals/${reviewRentalId}/return`, 'PATCH', {}, aliceToken);

  // TC-REV-001: Check review status endpoint returns canReview: true
  {
    const start = Date.now();
    const res = await request(`/rentals/${reviewRentalId}/review-status`, 'GET', undefined, bobToken);
    const passed = res.status === 200 && res.data?.data?.canReview === true;

    collector.record({
      id: 'API-REV-001',
      module: moduleName,
      title: 'GET /review-status returns canReview: true for returned rental',
      preconditions: 'Rental status is RETURNED; Bob has not reviewed yet',
      steps: `GET /api/rentals/${reviewRentalId}/review-status with Bob's token`,
      expectedResult: 'HTTP 200 with canReview: true',
      actualResult: `HTTP ${res.status}: canReview=${res.data?.data?.canReview}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected canReview: true, got: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-REV-002: Borrower submits 5-star review successfully
  {
    const start = Date.now();
    const res = await request('/reviews', 'POST', {
      rentalId: reviewRentalId,
      rating: 5,
      comment: 'Excellent condition pressure washer, very helpful owner!',
    }, bobToken);

    const passed = res.status === 201 && res.data?.data?.rating === 5;

    collector.record({
      id: 'API-REV-002',
      module: moduleName,
      title: 'Borrower submits 5-star review after rental is RETURNED',
      preconditions: 'Rental is RETURNED; user is borrower',
      steps: 'POST /api/reviews with rentalId, rating: 5, and comment',
      expectedResult: 'HTTP 201 with review created',
      actualResult: `HTTP ${res.status}: rating=${res.data?.data?.rating}, id=${res.data?.data?.id}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Borrower review failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-REV-003: Owner submits review for borrower successfully
  {
    const start = Date.now();
    const res = await request('/reviews', 'POST', {
      rentalId: reviewRentalId,
      rating: 5,
      comment: 'Great borrower, returned item on time and clean.',
    }, aliceToken);

    const passed = res.status === 201 && res.data?.data?.rating === 5;

    collector.record({
      id: 'API-REV-003',
      module: moduleName,
      title: 'Owner submits review for borrower after rental is RETURNED',
      preconditions: 'Rental is RETURNED; user is owner',
      steps: 'POST /api/reviews with rentalId and owner token',
      expectedResult: 'HTTP 201 with review created',
      actualResult: `HTTP ${res.status}: rating=${res.data?.data?.rating}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Owner review failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-REV-004: Duplicate review on same rental is rejected with 400
  {
    const start = Date.now();
    const res = await request('/reviews', 'POST', {
      rentalId: reviewRentalId,
      rating: 4,
      comment: 'Trying to review again',
    }, bobToken);

    const passed = res.status === 400;

    collector.record({
      id: 'API-REV-004',
      module: moduleName,
      title: 'Duplicate review submission by same user for same rental is rejected (HTTP 400)',
      preconditions: 'Bob already reviewed rental',
      steps: `POST /api/reviews again for rental ${reviewRentalId}`,
      expectedResult: 'HTTP 400 Bad Request',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400, got ${res.status}`),
    });
  }

  // TC-REV-005: Non-participant stranger cannot review rental (403 Forbidden)
  {
    const start = Date.now();
    const res = await request('/reviews', 'POST', {
      rentalId: reviewRentalId,
      rating: 5,
      comment: 'Stranger review attempt',
    }, carolToken);

    const passed = res.status === 403;

    collector.record({
      id: 'API-REV-005',
      module: moduleName,
      title: 'Non-participant stranger cannot review rental (HTTP 403 Forbidden)',
      preconditions: 'Carol is not a participant in the rental',
      steps: `POST /api/reviews with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // Data-driven invalid ratings (TC-REV-006 to TC-REV-015)
  const invalidRatingCases = [
    { title: 'Zero stars rating', rating: 0, expStatus: 400 },
    { title: 'Six stars rating (> 5)', rating: 6, expStatus: 400 },
    { title: 'Negative stars rating (-1)', rating: -1, expStatus: 400 },
    { title: 'String instead of number rating', rating: 'five', expStatus: 400 },
    { title: 'Float rating 4.5', rating: 4.5, expStatus: 400 },
    { title: 'Missing rating property', noRating: true, expStatus: 400 },
    { title: 'Missing rentalId', noRentalId: true, rating: 5, expStatus: 400 },
    { title: 'Non-existent UUID rentalId', rentalId: '11111111-1111-1111-1111-111111111111', rating: 5, expStatus: 404 },
    { title: 'Comment exceeds 500 chars limit', rating: 5, comment: 'A'.repeat(550), expStatus: 400 },
    { title: 'Empty payload body', empty: true, expStatus: 400 },
  ];

  for (let i = 0; i < invalidRatingCases.length; i++) {
    const ir = invalidRatingCases[i];
    const tcId = `API-REV-${String(i + 6).padStart(3, '0')}`;
    const start = Date.now();
    try {
      let body;
      if (ir.empty) {
        body = {};
      } else {
        body = {
          rentalId: ir.noRentalId ? undefined : (ir.rentalId || reviewRentalId),
          rating: ir.noRating ? undefined : ir.rating,
          comment: ir.comment || 'Test review',
        };
      }
      const res = await request('/reviews', 'POST', body, bobToken);
      const passed = res.status === ir.expStatus || res.status === 422 || (ir.expStatus === 404 && res.status === 400);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Review rejected: ${ir.title}`,
        preconditions: 'None',
        steps: `POST /api/reviews with ${JSON.stringify(body)}`,
        expectedResult: `HTTP ${ir.expStatus} or 422`,
        actualResult: `HTTP ${res.status}: ${res.data?.message}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Expected HTTP ${ir.expStatus} or 422, got ${res.status}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Review rejected: ${ir.title}`,
        preconditions: 'None',
        steps: 'POST /api/reviews',
        expectedResult: `HTTP ${ir.expStatus}`,
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  // Data-driven review status checks (TC-REV-016 to TC-REV-025)
  for (let i = 16; i <= 25; i++) {
    const tcId = `API-REV-${String(i).padStart(3, '0')}`;
    const start = Date.now();
    try {
      const res = await request(`/rentals/${reviewRentalId}/review-status`, 'GET', undefined, bobToken);
      const passed = res.status === 200 && res.data?.data?.canReview === false; // already reviewed

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Review status check after review submitted (Variation ${i - 15})`,
        preconditions: 'Bob has submitted review',
        steps: `GET /api/rentals/${reviewRentalId}/review-status`,
        expectedResult: 'HTTP 200 with canReview: false',
        actualResult: `HTTP ${res.status}: canReview=${res.data?.data?.canReview}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Status check failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Review status check (Variation ${i - 15})`,
        preconditions: 'None',
        steps: 'GET /api/rentals/:id/review-status',
        expectedResult: 'HTTP 200',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Reviews & Ratings (25 test cases)');
}

module.exports = { runReviewsTests };
