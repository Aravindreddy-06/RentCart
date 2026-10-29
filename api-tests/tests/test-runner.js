/**
 * tests/test-runner.js
 * Master test runner for RentCart API Automated Test Suite (340+ test cases).
 */

const http = require('http');
const path = require('path');
const { collector, request, BASE_URL, API_BASE_URL } = require('./test-client');

const { runAuthTests } = require('./01-auth');
const { runItemsTests } = require('./02-items');
const { runUploadsTests } = require('./03-uploads');
const { runRentalsTests } = require('./04-rentals');
const { runDuplicatesTests } = require('./05-duplicates');
const { runPickupTrackingTests } = require('./06-pickup-tracking');
const { runPinSecurityTests } = require('./07-pin-security');
const { runReviewsTests } = require('./08-reviews');
const { runChatNotificationsTests } = require('./09-chat-notifications');
const { runLocalizationTests } = require('./10-localization-validation');

let spawnedServer = null;

async function ensureBackendRunning() {
  console.log(`🔍 Checking RentCart API availability at: ${API_BASE_URL}...`);
  try {
    const health = await request('/health', 'GET');
    if (health.status === 200) {
      console.log('✅ Connected to running RentCart backend server.');
      return;
    }
  } catch {}

  console.log('ℹ️  No running server detected at API_BASE_URL. Starting test server in-process...');
  try {
    // Dynamically load backend dist/app.js
    const backendAppPath = path.resolve(__dirname, '../../backend/dist/app.js');
    const backendPrismaPath = path.resolve(__dirname, '../../backend/dist/prisma/client.js');
    const backendSocketPath = path.resolve(__dirname, '../../backend/dist/socket.js');

    const { createApp } = require(backendAppPath);
    const prisma = require(backendPrismaPath).default;
    const { initSocketIO } = require(backendSocketPath);

    await prisma.$connect();
    const app = createApp();
    spawnedServer = http.createServer(app);
    initSocketIO(spawnedServer);

    const portMatch = API_BASE_URL.match(/:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1], 10) : 4000;

    await new Promise((resolve, reject) => {
      spawnedServer.listen(port, () => {
        console.log(`🚀 In-process test server running on ${API_BASE_URL}`);
        resolve();
      });
      spawnedServer.on('error', reject);
    });
  } catch (err) {
    console.warn('⚠️ Could not start in-process server (fallback to direct HTTP requests):', err.message);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RentCart API Automated Test Suite (340+ Test Cases)');
  console.log('================================================================\n');

  await ensureBackendRunning();

  try {
    await runAuthTests();
    await runItemsTests();
    await runUploadsTests();
    await runRentalsTests();
    await runDuplicatesTests();
    await runPickupTrackingTests();
    await runPinSecurityTests();
    await runReviewsTests();
    await runChatNotificationsTests();
    await runLocalizationTests();
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
  } finally {
    const summary = collector.saveResults();
    if (spawnedServer) {
      spawnedServer.close();
    }

    console.log('\n================================================================');
    console.log(`🎉 TEST EXECUTION FINISHED: ${summary.passed}/${summary.total} PASSED (${summary.passRate})`);
    console.log('================================================================\n');

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

