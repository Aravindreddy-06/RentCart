/**
 * k6-read-traffic.js
 * k6 Read-Traffic Load Test for RentCart API.
 *
 * Rules:
 * - 100 virtual users for 1 minute (plus 10s ramp-up)
 * - Users log in as seeded accounts (alice/bob/carol)
 * - Read traffic only: /api/health, /api/items (search, category, pagination, nearby),
 *   item details, notifications, rentals/mine, users/me
 * - 0.5 - 1.5s think time
 * - No register, forgot-password or data creation
 * - Thresholds: failed < 1%, p95 < 800ms, average < 400ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics for each read endpoint
const epHealth = new Trend('ep_health');
const epItemsSearch = new Trend('ep_items_search');
const epItemsCategory = new Trend('ep_items_category');
const epItemsPagination = new Trend('ep_items_pagination');
const epItemsNearby = new Trend('ep_items_nearby');
const epItemDetails = new Trend('ep_item_details');
const epNotifications = new Trend('ep_notifications');
const epRentalsMine = new Trend('ep_rentals_mine');
const epUsersMe = new Trend('ep_users_me');

const totalRequestsCounter = new Counter('total_read_requests');
const failureRate = new Rate('read_failure_rate');

export const options = {
  scenarios: {
    read_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // 10s ramp-up
        { duration: '1m', target: 100 },  // 100 VUs steady for 1 minute
        { duration: '5s', target: 0 },    // 5s ramp-down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],               // failed < 1%
    http_req_duration: ['p(95)<800', 'avg<400'], // p95 < 800ms, average < 400ms
  },
};

const BASE_URL = (__ENV.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

export function setup() {
  console.log(`Setting up k6 load test targeting: ${BASE_URL}...`);

  // Pre-authenticate seeded users once during setup to avoid hitting auth rate-limits during test
  const seededUsers = [
    { email: 'alice@example.com', password: 'password123' },
    { email: 'bob@example.com', password: 'password123' },
    { email: 'carol@example.com', password: 'password123' },
  ];

  const authData = [];
  for (const user of seededUsers) {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(user),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 200) {
      try {
        const json = res.json();
        const token = json.data && json.data.accessToken;
        if (token) {
          authData.push({ email: user.email, token });
        }
      } catch (e) {}
    }
  }

  if (authData.length === 0) {
    console.error('⚠️ Could not authenticate any seeded accounts during setup!');
  } else {
    console.log(`✅ Authenticated ${authData.length} seeded users for load test.`);
  }

  // Pre-fetch available item IDs for details query
  let sampleItemIds = [];
  const aliceToken = authData[0] ? authData[0].token : '';
  if (aliceToken) {
    const itemsRes = http.get(`${BASE_URL}/api/items?limit=10`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    if (itemsRes.status === 200) {
      try {
        const itemsJson = itemsRes.json();
        const items = (itemsJson.data && itemsJson.data.items) || itemsJson.data || [];
        sampleItemIds = items.map((it) => it.id).filter(Boolean);
      } catch (e) {}
    }
  }

  return {
    authData,
    sampleItemIds: sampleItemIds.length > 0 ? sampleItemIds : ['seeded-item-placeholder'],
  };
}

export default function (data) {
  const auths = data.authData || [];
  const activeUser = auths.length > 0 ? auths[__VU % auths.length] : null;
  const token = activeUser ? activeUser.token : '';

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 1. GET /api/health (read only, unauthenticated)
  {
    const res = http.get(`${BASE_URL}/api/health`);
    epHealth.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'health status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 2. GET /api/items (search)
  {
    const keywords = ['drill', 'saw', 'tent', 'camera', 'kit'];
    const kw = keywords[__VU % keywords.length];
    const res = http.get(`${BASE_URL}/api/items?search=${encodeURIComponent(kw)}`, authHeaders);
    epItemsSearch.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'search status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 3. GET /api/items (category)
  {
    const categories = ['Tools', 'Electronics', 'Kitchen', 'Sports', 'Books'];
    const cat = categories[__VU % categories.length];
    const res = http.get(`${BASE_URL}/api/items?category=${encodeURIComponent(cat)}`, authHeaders);
    epItemsCategory.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'category status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 4. GET /api/items (pagination)
  {
    const page = (__VU % 3) + 1;
    const res = http.get(`${BASE_URL}/api/items?page=${page}&limit=5`, authHeaders);
    epItemsPagination.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'pagination status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 5. GET /api/items (nearby)
  {
    const res = http.get(`${BASE_URL}/api/items?lat=37.7749&lng=-122.4194&radiusKm=5`, authHeaders);
    epItemsNearby.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'nearby status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 6. GET /api/items/:id (details)
  {
    const itemIds = data.sampleItemIds || [];
    const itemId = itemIds[__VU % itemIds.length];
    const res = http.get(`${BASE_URL}/api/items/${itemId}`, authHeaders);
    epItemDetails.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'item details status 200 or 404': (r) => r.status === 200 || r.status === 404 });
    failureRate.add(!passed);
  }

  // 7. GET /api/notifications
  {
    const res = http.get(`${BASE_URL}/api/notifications`, authHeaders);
    epNotifications.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'notifications status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 8. GET /api/rentals/mine
  {
    const res = http.get(`${BASE_URL}/api/rentals/mine`, authHeaders);
    epRentalsMine.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'rentals mine status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // 9. GET /api/users/me
  {
    const res = http.get(`${BASE_URL}/api/users/me`, authHeaders);
    epUsersMe.add(res.timings.duration);
    totalRequestsCounter.add(1);
    const passed = check(res, { 'users me status is 200': (r) => r.status === 200 });
    failureRate.add(!passed);
  }

  // Think time: 0.5 - 1.5 seconds
  sleep(Math.random() * 1.0 + 0.5);
}

export function handleSummary(data) {
  return {
    'reports/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const reqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const dur = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const rate = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;

  return `
================================================================
k6 LOAD TEST EXECUTION SUMMARY
================================================================
Total Requests:     ${reqs}
Average Duration:   ${dur.avg ? dur.avg.toFixed(2) : 0} ms
Median Duration:    ${dur.med ? dur.med.toFixed(2) : 0} ms
p90 Duration:       ${dur['p(90)'] ? dur['p(90)'].toFixed(2) : 0} ms
p95 Duration:       ${dur['p(95)'] ? dur['p(95)'].toFixed(2) : 0} ms
Max Duration:       ${dur.max ? dur.max.toFixed(2) : 0} ms
Failed Requests:    ${rate}%
================================================================
`;
}

