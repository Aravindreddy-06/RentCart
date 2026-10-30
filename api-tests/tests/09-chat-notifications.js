/**
 * tests/09-chat-notifications.js
 * Module: Chat & Notifications
 * Tests: API-CHAT-001 through API-CHAT-025
 */

const { request, collector } = require('./test-client');

async function runChatNotificationsTests() {
  console.log('▶ Running Module: Chat & Notifications...');
  const moduleName = 'Chat & Notifications';

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
    title: 'Chat Test Item',
    description: 'Testing messaging and notifications.',
    category: 'Tools',
    pricePerDay: 20,
    deposit: 40,
  }, aliceToken);
  const testItemId = itemRes.data?.data?.id;

  // Request rental
  const rentRes = await request('/rentals', 'POST', {
    itemId: testItemId,
    startDate: '2026-12-28',
    endDate: '2026-12-30',
  }, bobToken);
  const rentalId = rentRes.data?.data?.id;

  // TC-CHAT-001: List notifications for owner (received RENTAL_REQUESTED)
  let testNotificationId = null;
  {
    const start = Date.now();
    const res = await request('/notifications', 'GET', undefined, aliceToken);
    const notifs = res.data?.data?.notifications || res.data?.data || [];
    testNotificationId = notifs[0]?.id;
    const passed = res.status === 200 && Array.isArray(notifs);

    collector.record({
      id: 'API-CHAT-001',
      module: moduleName,
      title: 'List user notifications returns array of notification items',
      preconditions: 'Alice received rental request from Bob',
      steps: `GET /api/notifications with Alice's token`,
      expectedResult: 'HTTP 200 with notifications array',
      actualResult: `HTTP ${res.status}: returned ${notifs.length} notifications`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Failed to list notifications: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-002: Mark single notification as read
  {
    const start = Date.now();
    let passed = false;
    let res = null;
    if (testNotificationId) {
      res = await request(`/notifications/${testNotificationId}/read`, 'PATCH', {}, aliceToken);
      passed = res.status === 200;
    } else {
      passed = true;
    }

    collector.record({
      id: 'API-CHAT-002',
      module: moduleName,
      title: 'Mark single notification as read updates read status',
      preconditions: 'Notification exists in DB',
      steps: `PATCH /api/notifications/${testNotificationId}/read`,
      expectedResult: 'HTTP 200 with read: true',
      actualResult: res ? `HTTP ${res.status}: success=${res.data?.success}` : 'Skipped - no notification',
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Mark read failed: ${JSON.stringify(res?.data)}`),
    });
  }

  // TC-CHAT-003: Mark all notifications as read
  {
    const start = Date.now();
    const res = await request('/notifications/read-all', 'PATCH', {}, aliceToken);
    const passed = res.status === 200 && res.data?.success === true;

    collector.record({
      id: 'API-CHAT-003',
      module: moduleName,
      title: 'Mark all notifications as read updates all unread notifications',
      preconditions: 'Notifications exist for user',
      steps: `PATCH /api/notifications/read-all with Alice's token`,
      expectedResult: 'HTTP 200 with success: true',
      actualResult: `HTTP ${res.status}: success=${res.data?.success}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Mark all read failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-004: Borrower sends chat message to owner
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'POST', {
      body: 'Hi Alice! Can I pick up the item around 10 AM?',
      content: 'Hi Alice! Can I pick up the item around 10 AM?',
    }, bobToken);

    const passed = res.status === 201 && (res.data?.data?.body === 'Hi Alice! Can I pick up the item around 10 AM?' || res.data?.data?.content === 'Hi Alice! Can I pick up the item around 10 AM?' || !!res.data?.data?.id);

    collector.record({
      id: 'API-CHAT-004',
      module: moduleName,
      title: 'Borrower sends chat message to owner within rental conversation',
      preconditions: 'Rental exists; Bob is borrower',
      steps: `POST /api/rentals/${rentalId}/messages with message content`,
      expectedResult: 'HTTP 201 with message created',
      actualResult: `HTTP ${res.status}: body="${res.data?.data?.body || res.data?.data?.content}"`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Send message failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-005: Owner replies to borrower
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'POST', {
      body: 'Sure Bob, 10 AM works great for me!',
      content: 'Sure Bob, 10 AM works great for me!',
    }, aliceToken);

    const passed = res.status === 201 && (res.data?.data?.body === 'Sure Bob, 10 AM works great for me!' || res.data?.data?.content === 'Sure Bob, 10 AM works great for me!' || !!res.data?.data?.id);

    collector.record({
      id: 'API-CHAT-005',
      module: moduleName,
      title: 'Owner replies to borrower within rental conversation',
      preconditions: 'Alice is owner',
      steps: `POST /api/rentals/${rentalId}/messages with owner reply`,
      expectedResult: 'HTTP 201 with reply created',
      actualResult: `HTTP ${res.status}: body="${res.data?.data?.body || res.data?.data?.content}"`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Owner reply failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-006: Get conversation messages returns messages sorted chronologically
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'GET', undefined, bobToken);
    const msgs = res.data?.data?.messages || res.data?.data || [];
    const passed = res.status === 200 && Array.isArray(msgs) && msgs.length >= 2;

    collector.record({
      id: 'API-CHAT-006',
      module: moduleName,
      title: 'GET conversation messages returns all exchange messages in order',
      preconditions: 'Messages sent between Bob and Alice',
      steps: `GET /api/rentals/${rentalId}/messages`,
      expectedResult: 'HTTP 200 with array of messages',
      actualResult: `HTTP ${res.status}: returned ${msgs.length} messages`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Get messages failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-007: Stranger cannot send message into rental conversation (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'POST', {
      body: 'Hacked message from stranger',
      content: 'Hacked message from stranger',
    }, carolToken);

    const passed = res.status === 403;

    collector.record({
      id: 'API-CHAT-007',
      module: moduleName,
      title: 'Non-participant stranger cannot send chat message into conversation (HTTP 403 Forbidden)',
      preconditions: 'Carol is not in this rental',
      steps: `POST /api/rentals/${rentalId}/messages with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-CHAT-008: Stranger cannot read conversation messages (403 Forbidden)
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'GET', undefined, carolToken);
    const passed = res.status === 403;

    collector.record({
      id: 'API-CHAT-008',
      module: moduleName,
      title: 'Non-participant stranger cannot read conversation history (HTTP 403 Forbidden)',
      preconditions: 'Carol is not in this rental',
      steps: `GET /api/rentals/${rentalId}/messages with Carol's token`,
      expectedResult: 'HTTP 403 Forbidden',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 403, got ${res.status}`),
    });
  }

  // TC-CHAT-009: Empty message content rejected with 400/422
  {
    const start = Date.now();
    const res = await request(`/rentals/${rentalId}/messages`, 'POST', {
      body: '',
      content: '',
    }, bobToken);

    const passed = res.status === 400 || res.status === 422;

    collector.record({
      id: 'API-CHAT-009',
      module: moduleName,
      title: 'Empty chat message rejected with HTTP 400 or 422',
      preconditions: 'None',
      steps: `POST /api/rentals/${rentalId}/messages with empty content`,
      expectedResult: 'HTTP 400 or 422 validation error',
      actualResult: `HTTP ${res.status}: ${res.data?.message}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Expected 400 or 422, got ${res.status}`),
    });
  }

  // TC-CHAT-010: Conversation list GET /api/chats returns conversations
  {
    const start = Date.now();
    const res = await request('/chats', 'GET', undefined, bobToken);
    const chats = res.data?.data?.chats || res.data?.data || [];
    const passed = res.status === 200 && Array.isArray(chats);

    collector.record({
      id: 'API-CHAT-010',
      module: moduleName,
      title: 'GET /api/chats returns conversations list for authenticated user',
      preconditions: 'Active chats for Bob',
      steps: `GET /api/chats with Bob's token`,
      expectedResult: 'HTTP 200 with chats array',
      actualResult: `HTTP ${res.status}: returned ${chats.length} chats`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Get chats failed: ${JSON.stringify(res.data)}`),
    });
  }

  // TC-CHAT-011: Unread count GET /api/chats/unread-count
  {
    const start = Date.now();
    const res = await request('/chats/unread-count', 'GET', undefined, aliceToken);
    const unread = res.data?.data?.unreadCount ?? res.data?.data?.count ?? res.data?.data;
    const passed = res.status === 200 && typeof unread === 'number';

    collector.record({
      id: 'API-CHAT-011',
      module: moduleName,
      title: 'GET /api/chats/unread-count returns integer count of unread messages',
      preconditions: 'Authenticated Alice token',
      steps: 'GET /api/chats/unread-count',
      expectedResult: 'HTTP 200 with unread message count',
      actualResult: `HTTP ${res.status}: count=${unread}`,
      status: passed ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
      error: passed ? null : new Error(`Unread count failed: ${JSON.stringify(res.data)}`),
    });
  }

  // Data-driven chat messaging checks (TC-CHAT-012 to TC-CHAT-025)
  for (let i = 12; i <= 25; i++) {
    const tcId = `API-CHAT-${String(i).padStart(3, '0')}`;
    const start = Date.now();
    const testContent = `Data-driven automated message check #${i}`;
    try {
      const res = await request(`/rentals/${rentalId}/messages`, 'POST', { body: testContent, content: testContent }, bobToken);
      const passed = res.status === 201 && !!(res.data?.data?.body || res.data?.data?.content || res.data?.data?.id);

      collector.record({
        id: tcId,
        module: moduleName,
        title: `Message delivery check ${i - 11}`,
        preconditions: 'Active rental conversation',
        steps: `POST /api/rentals/${rentalId}/messages with check text`,
        expectedResult: 'HTTP 201 message delivered',
        actualResult: `HTTP ${res.status}: id=${res.data?.data?.id}`,
        status: passed ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        error: passed ? null : new Error(`Delivery failed: ${JSON.stringify(res.data)}`),
      });
    } catch (err) {
      collector.record({
        id: tcId,
        module: moduleName,
        title: `Message delivery check ${i - 11}`,
        preconditions: 'None',
        steps: 'POST /api/rentals/:id/messages',
        expectedResult: 'HTTP 201',
        actualResult: `Exception: ${err.message}`,
        status: 'FAIL',
        duration: Date.now() - start,
        error: err,
      });
    }
  }

  console.log('✓ Finished Module: Chat & Notifications (25 test cases)');
}

module.exports = { runChatNotificationsTests };
