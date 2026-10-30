/**
 * tests/login-tests.js
 * Selenium WebDriver + Mocha Spec Suite: Login, Registration, OTP, Forgot/Reset Password,
 * Logout, Validation, Session, Protected Routes, Responsive & Dark Mode.
 *
 * Test IDs: WEB-LOGIN-001 through WEB-LOGIN-045 (45 Automated Test Cases)
 */

const { runLoginAuthTests } = require('./01-login-auth');
const { collector } = require('./test-client');
const { generateReport } = require('../scripts/generate-report');

// Mocha BDD Suite Integration
if (typeof describe === 'function') {
  describe('RentCart Web Selenium E2E - Login & Authentication Suite (WEB-LOGIN)', function () {
    this.timeout(240000);

    it('WEB-LOGIN-001 through WEB-LOGIN-045: executes full login, registration, OTP, session and navigation suite', async function () {
      await runLoginAuthTests();

      // Verify all tests in module recorded
      const loginTests = collector.tests.filter((t) => t.module === 'Authentication & Navigation');
      if (loginTests.length === 0) {
        throw new Error('No login test results were recorded by the collector');
      }

      const failedTests = loginTests.filter((t) => t.status === 'FAIL');
      if (failedTests.length > 0) {
        const failureDetails = failedTests.map((t) => `${t.id}: ${t.error || t.actualResult}`).join('; ');
        throw new Error(`${failedTests.length} tests failed in Authentication suite: ${failureDetails}`);
      }
    });
  });
}

// Standalone execution support: node tests/login-tests.js
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Running Selenium Login & Authentication Module standalone...');
      await runLoginAuthTests();
      collector.saveResults();
      await generateReport();
      console.log('✅ Login tests finished successfully.');
    } catch (err) {
      console.error('❌ Login tests execution failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  runLoginAuthTests,
};

