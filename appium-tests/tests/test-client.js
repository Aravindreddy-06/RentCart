/**
 * tests/test-client.js
 * Universal results collector and Appium/WDIO client wrapper for Mobile Test Automation.
 */

const fs = require('fs');
const path = require('path');

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = parseInt(process.env.APPIUM_PORT || '4723', 10);
const APP_PATH = process.env.APP_PATH || path.resolve(__dirname, '../../frontend/mobile/android/app/build/outputs/apk/release/app-release.apk');
const API_BASE_URL = process.env.API_BASE_URL || 'http://10.0.2.2:4000';

class AppiumTestCollector {
  constructor(suiteName = 'RentCart Mobile Appium 2 Automated Test Suite') {
    this.suiteName = suiteName;
    this.tests = [];
    this.startTime = Date.now();
  }

  record({
    id,
    module,
    title,
    preconditions = 'RentCart Android APK installed (com.rentcart.app)',
    steps,
    expectedResult,
    actualResult,
    status = 'PASS',
    duration = 0,
    error = null,
  }) {
    this.tests.push({
      id,
      module,
      title,
      preconditions,
      steps,
      expectedResult,
      actualResult: actualResult || (status === 'PASS' ? 'Matches expected mobile UI behavior' : 'Assertion failed'),
      status,
      duration: Math.round(duration),
      error: error ? (error.message || String(error)) : null,
      timestamp: new Date().toISOString(),
    });
  }

  saveResults() {
    const resultsDir = path.resolve(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const total = this.tests.length;
    const passed = this.tests.filter((t) => t.status === 'PASS').length;
    const failed = this.tests.filter((t) => t.status === 'FAIL').length;
    const skipped = this.tests.filter((t) => t.status === 'SKIPPED').length;
    const totalDurationMs = Date.now() - this.startTime;

    const moduleMap = new Map();
    for (const t of this.tests) {
      if (!moduleMap.has(t.module)) {
        moduleMap.set(t.module, { total: 0, passed: 0, failed: 0, skipped: 0 });
      }
      const m = moduleMap.get(t.module);
      m.total++;
      if (t.status === 'PASS') m.passed++;
      else if (t.status === 'FAIL') m.failed++;
      else m.skipped++;
    }

    const moduleSummary = [];
    for (const [modName, counts] of moduleMap.entries()) {
      const rate = counts.total ? `${((counts.passed / counts.total) * 100).toFixed(1)}%` : '0%';
      moduleSummary.push({
        module: modName,
        total: counts.total,
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
        passRate: rate,
      });
    }

    const resultPayload = {
      suite: this.suiteName,
      runDate: new Date().toISOString(),
      environment: `Appium 2 / UiAutomator2 / Android (com.rentcart.app)`,
      package: 'com.rentcart.app',
      total,
      passed,
      failed,
      skipped,
      passRate: total ? `${((passed / total) * 100).toFixed(1)}%` : '0%',
      totalDurationMs,
      moduleSummary,
      tests: this.tests,
    };

    const outPath = path.join(resultsDir, 'results.json');
    fs.writeFileSync(outPath, JSON.stringify(resultPayload, null, 2), 'utf8');
    console.log(`\n📄 Appium results saved to: ${outPath} (${total} tests, ${passed} passed, ${failed} failed, ${skipped} skipped)`);
    return resultPayload;
  }
}

const collector = new AppiumTestCollector();

async function isAppiumServerAvailable() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://${APPIUM_HOST}:${APPIUM_PORT}/status`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function takeScreenshotOnFailure(driver, tcId) {
  try {
    if (!driver) return;
    const screensDir = path.resolve(__dirname, '../screenshots');
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true });
    }
    const screenshot = await driver.takeScreenshot();
    const filePath = path.join(screensDir, `${tcId}.png`);
    fs.writeFileSync(filePath, screenshot, 'base64');
  } catch (err) {
    // Suppress screenshot errors
  }
}

module.exports = {
  APPIUM_HOST,
  APPIUM_PORT,
  APP_PATH,
  API_BASE_URL,
  collector,
  isAppiumServerAvailable,
  takeScreenshotOnFailure,
};

