/**
 * tests/test-runner.js
 * Universal Test Runner executing all 10 Selenium E2E modules (340 test cases total).
 */

const { collector } = require('./test-client');
const { runLoginAuthTests } = require('./01-login-auth');
const { runHomeSearchTests } = require('./02-home-search');
const { runItemsTests } = require('./03-items');
const { runRentalsTests } = require('./04-rentals');
const { runDuplicateProtectionTests } = require('./05-duplicate-protection');
const { runPinPickupTests } = require('./06-pin-pickup');
const { runProfileTests } = require('./07-profile');
const { runNotificationsChatTests } = require('./08-notifications-chat');
const { runReviewsTests } = require('./09-reviews');
const { runValidationNavigationTests } = require('./10-validation-navigation');
const { generateReport } = require('../scripts/generate-report');

async function main() {
  console.log('======================================================================');
  console.log('🚀 Launching RentCart Web Selenium WebDriver E2E Automated Test Suite');
  console.log('   Target: 300+ Automated Test Cases across 10 Web Modules');
  console.log('======================================================================\n');

  const overallStart = Date.now();

  try {
    // 01. Login & Auth (45 tests)
    await runLoginAuthTests().catch((e) => console.error('Module 01 error:', e.message));

    // 02. Home & Search (35 tests)
    await runHomeSearchTests().catch((e) => console.error('Module 02 error:', e.message));

    // 03. Items & Inventory (35 tests)
    await runItemsTests().catch((e) => console.error('Module 03 error:', e.message));

    // 04. Rentals & Bookings (35 tests)
    await runRentalsTests().catch((e) => console.error('Module 04 error:', e.message));

    // 05. Duplicate Protection (30 tests)
    await runDuplicateProtectionTests().catch((e) => console.error('Module 05 error:', e.message));

    // 06. PIN & Pickup Privacy (30 tests)
    await runPinPickupTests().catch((e) => console.error('Module 06 error:', e.message));

    // 07. Profile & Privacy (30 tests)
    await runProfileTests().catch((e) => console.error('Module 07 error:', e.message));

    // 08. Notifications & Chat (30 tests)
    await runNotificationsChatTests().catch((e) => console.error('Module 08 error:', e.message));

    // 09. Reviews & Ratings (25 tests)
    await runReviewsTests().catch((e) => console.error('Module 09 error:', e.message));

    // 10. Navigation & Formatting (35 tests)
    await runValidationNavigationTests().catch((e) => console.error('Module 10 error:', e.message));

    // Save results.json
    const summary = collector.saveResults();

    console.log('\n======================================================================');
    console.log(`✨ All Modules Complete in ${((Date.now() - overallStart) / 1000).toFixed(1)}s`);
    console.log(`   Total Tests:  ${summary.total}`);
    console.log(`   Passed:       ${summary.passed}`);
    console.log(`   Failed:       ${summary.failed}`);
    console.log(`   Skipped:      ${summary.skipped}`);
    console.log(`   Pass Rate:    ${summary.passRate}`);
    console.log('======================================================================\n');

    // Generate Excel report
    await generateReport();

  } catch (error) {
    console.error('❌ Fatal error in test runner:', error);
    collector.saveResults();
    await generateReport().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('🏁 Selenium WebDriver test suite finished.');
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
