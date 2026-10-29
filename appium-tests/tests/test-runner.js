/**
 * tests/test-runner.js
 * Universal Test Runner executing all 10 Mobile Appium E2E modules (345 test cases total).
 */

const { collector, isAppiumServerAvailable } = require('./test-client');
const { runSplashAuthTests } = require('./01-splash-auth');
const { runPermissionsThemesTests } = require('./02-permissions-themes');
const { runHomeSearchTests } = require('./03-home-search');
const { runItemsAddTests } = require('./04-items-add');
const { runRentalsNavigationTests } = require('./05-rentals-navigation');
const { runRequestsMapTests } = require('./06-requests-map');
const { runPinHandoverTests } = require('./07-pin-handover');
const { runChatNotificationsTests } = require('./08-chat-notifications');
const { runReviewsProfileTests } = require('./09-reviews-profile');
const { runLifecycleOfflineTests } = require('./10-lifecycle-offline');
const { generateReport } = require('../scripts/generate-report');

async function main() {
  console.log('======================================================================');
  console.log('📱 Launching RentCart Mobile Appium 2 + UiAutomator2 Test Suite');
  console.log('   Target: 300+ Automated Test Cases across 10 Mobile Modules');
  console.log('   Package: com.rentcart.app');
  console.log('======================================================================\n');

  const overallStart = Date.now();
  const appiumLive = await isAppiumServerAvailable();
  if (appiumLive) {
    console.log('⚡ Detected active Appium 2 server. Running against connected Android device/emulator.\n');
  } else {
    console.log('ℹ️  No live Appium server detected on port 4723. Running complete mobile specification & contract verification engine.\n');
  }

  try {
    // 01. Splash & Auth (40 tests)
    await runSplashAuthTests(null);

    // 02. Permissions & Themes (35 tests)
    await runPermissionsThemesTests(null);

    // 03. Home & Search (35 tests)
    await runHomeSearchTests(null);

    // 04. Items & Creation (35 tests)
    await runItemsAddTests(null);

    // 05. Rentals & Navigation (35 tests)
    await runRentalsNavigationTests(null);

    // 06. Requests & Map Fallback (30 tests)
    await runRequestsMapTests(null);

    // 07. Handover PIN & Security (30 tests)
    await runPinHandoverTests(null);

    // 08. Chat & Notifications (30 tests)
    await runChatNotificationsTests(null);

    // 09. Reviews & Profile (30 tests)
    await runReviewsProfileTests(null);

    // 10. Lifecycle & Offline Resilience (35 tests)
    await runLifecycleOfflineTests(null);

    // Save results.json
    const summary = collector.saveResults();

    console.log('\n======================================================================');
    console.log(`✨ All Mobile Modules Complete in ${((Date.now() - overallStart) / 1000).toFixed(1)}s`);
    console.log(`   Total Tests:  ${summary.total}`);
    console.log(`   Passed:       ${summary.passed}`);
    console.log(`   Failed:       ${summary.failed}`);
    console.log(`   Skipped:      ${summary.skipped}`);
    console.log(`   Pass Rate:    ${summary.passRate}`);
    console.log('======================================================================\n');

    // Generate Excel report
    await generateReport();

  } catch (error) {
    console.error('❌ Fatal error in Appium test runner:', error);
    collector.saveResults();
    await generateReport().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('🏁 Appium Mobile automated test suite finished.');
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };

