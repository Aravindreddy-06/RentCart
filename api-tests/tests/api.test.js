/**
 * tests/api.test.js
 * Mocha test harness wrapping all API test suites.
 */

const { main } = require('./test-runner');

describe('RentCart API Automated Test Suite (340+ Test Cases)', function () {
  this.timeout(120000);

  it('executes full suite across all modules and verifies pass criteria', async function () {
    await main();
  });
});

