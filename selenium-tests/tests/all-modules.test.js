/**
 * tests/all-modules.test.js
 * Mocha E2E Test Suite orchestrating all 10 Selenium modules (330 test cases).
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

describe('RentCart Web Selenium E2E Master Test Suite (300+ Automated Tests)', function () {
  this.timeout(600000); // 10 minutes overall suite timeout

  describe('Module 01: Authentication, Navigation & Responsive (45 tests)', function () {
    it('executes WEB-LOGIN-001 through WEB-LOGIN-045', async function () {
      await runLoginAuthTests();
    });
  });

  describe('Module 02: Home Page & Search Filters (35 tests)', function () {
    it('executes WEB-HOME-001 through WEB-HOME-035', async function () {
      await runHomeSearchTests();
    });
  });

  describe('Module 03: Items & Inventory Management (35 tests)', function () {
    it('executes WEB-ITEM-001 through WEB-ITEM-035', async function () {
      await runItemsTests();
    });
  });

  describe('Module 04: Rentals Lifecycle & Bookings (35 tests)', function () {
    it('executes WEB-RENT-001 through WEB-RENT-035', async function () {
      await runRentalsTests();
    });
  });

  describe('Module 05: Duplicate Request Protection (30 tests)', function () {
    it('executes WEB-DUP-001 through WEB-DUP-030', async function () {
      await runDuplicateProtectionTests();
    });
  });

  describe('Module 06: Handover PIN & Pickup Privacy (30 tests)', function () {
    it('executes WEB-PICK-001 through WEB-PICK-030', async function () {
      await runPinPickupTests();
    });
  });

  describe('Module 07: Profile & Privacy (30 tests)', function () {
    it('executes WEB-PROF-001 through WEB-PROF-030', async function () {
      await runProfileTests();
    });
  });

  describe('Module 08: Notifications & Chat (30 tests)', function () {
    it('executes WEB-CHAT-001 through WEB-CHAT-030', async function () {
      await runNotificationsChatTests();
    });
  });

  describe('Module 09: Star Rating System & Reviews (25 tests)', function () {
    it('executes WEB-REV-001 through WEB-REV-025', async function () {
      await runReviewsTests();
    });
  });

  describe('Module 10: Currency, Navigation & 404 Pages (35 tests)', function () {
    it('executes WEB-NAV-001 through WEB-NAV-035', async function () {
      await runValidationNavigationTests();
    });
  });

  after(async function () {
    console.log('\n📄 Saving Selenium test results and generating Excel report...');
    collector.saveResults();
    await generateReport();
  });
});

