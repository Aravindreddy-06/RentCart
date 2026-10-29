/**
 * wdio.conf.js
 * WebdriverIO + Appium 2 + UiAutomator2 Configuration for RentCart Android App
 */

const path = require('path');
const fs = require('fs');

const APP_PATH = process.env.APP_PATH || path.resolve(__dirname, '../frontend/mobile/android/app/build/outputs/apk/release/app-release.apk');
const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = parseInt(process.env.APPIUM_PORT || '4723', 10);

exports.config = {
  runner: 'local',
  hostname: APPIUM_HOST,
  port: APPIUM_PORT,
  path: '/',

  specs: [
    './tests/01-splash-auth.js',
    './tests/02-permissions-themes.js',
    './tests/03-home-search.js',
    './tests/04-items-add.js',
    './tests/05-rentals-navigation.js',
    './tests/06-requests-map.js',
    './tests/07-pin-handover.js',
    './tests/08-chat-notifications.js',
    './tests/09-reviews-profile.js',
    './tests/10-lifecycle-offline.js',
  ],
  exclude: [
    './tests/test-runner.js',
    './tests/test-client.js',
  ],

  maxInstances: 1,

  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '13.0',
    'appium:app': APP_PATH,
    'appium:appPackage': 'com.rentcart.app',
    'appium:appActivity': 'com.rentcart.app.MainActivity',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 300,
    'appium:uiautomator2ServerInstallTimeout': 60000,
    'appium:adbExecTimeout': 60000,
  }],

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: [],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  afterTest: async function(test, context, { error, result, duration, passed }) {
    if (!passed) {
      try {
        const screensDir = path.resolve(__dirname, 'screenshots');
        if (!fs.existsSync(screensDir)) {
          fs.mkdirSync(screensDir, { recursive: true });
        }
        const cleanName = test.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        const screenPath = path.join(screensDir, `${cleanName}.png`);
        await browser.saveScreenshot(screenPath);
        console.log(`📸 Failure screenshot saved: ${screenPath}`);
      } catch (err) {
        // Suppress screenshot failure
      }
    }
  },
};

