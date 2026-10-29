# RentCart Appium Mobile Automated Test Suite

End-to-End (E2E) automated mobile test suite for the **RentCart** Android Application using **WebdriverIO**, **Appium 2**, **UiAutomator2**, and **Mocha**.

---

## 📋 Overview

- **Target Package:** `com.rentcart.app` (Android APK)
- **Total Test Cases:** 345 automated test cases across 10 mobile modules (exceeds the 300+ requirement).
- **Automation Framework:** WebdriverIO v8 + Appium 2 + UiAutomator2 driver.
- **Reporting:** Outputs machine-readable raw JSON at `results/results.json` and a formatted, styled multi-sheet Excel workbook at `reports/appium-test-report.xlsx` via **ExcelJS**.
- **Failure Artifacts:** Automatic screenshot capture on assertion failure saved to `screenshots/<TC-ID>.png`.

---

## 🗂️ Test Modules Breakdown

| # | Spec File | Module Name | TC Range | Count | Scope |
|---|-----------|-------------|----------|-------|-------|
| 1 | `01-splash-auth.js` | Mobile Authentication & Splash | `MOB-AUTH-001` - `040` | 40 | Splash branding, pulse animation, auto-redirect timer, SecureStore token lookup, LoginScreen, masked password, visibility eye toggle, Zod validations, seeded users (Alice, Bob, Carol), RegisterScreen, +91 phone keypad, OTP verification hook (`NODE_ENV=test`), forgot/reset password, logout session teardown. |
| 2 | `02-permissions-themes.js` | Permissions & Appearance | `MOB-PERM-001` - `035` | 35 | Android runtime permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`), permission rationale dialogs, settings deep-linking (`Linking.openSettings()`), ThemeContext, dark mode background (#111827), contrast ratios, status bar icon style switching, theme persistence. |
| 3 | `03-home-search.js` | Home Feed & Search | `MOB-HOME-001` - `035` | 35 | Personalized greeting banner, location pill with LocationPicker modal, search input, 400ms debounce, clear button (X), horizontal category chips (All, Tools, Electronics, Kitchen, Sports, Books, Other), distance radius filters (1km, 5km, 10km, 25km), pull-to-refresh, item cards, INR price formatting (₹XXX / day), infinite scroll pagination, empty state recovery. |
| 4 | `04-items-add.js` | Items & Creation | `MOB-ITEM-001` - `035` | 35 | Add Item form (`AddItemScreen`), title/description constraints, category picker, INR daily price and security deposit inputs, image action sheet (Camera / Gallery), thumbnail preview with delete badge, loading spinner, ItemDetailScreen hero carousel, owner card, trust score, "Request to Borrow" modal. |
| 5 | `05-rentals-navigation.js` | Rentals & Navigation | `MOB-RENT-001` - `035` | 35 | Bottom tab navigation, "View My Rentals" shortcut, status filter tabs (All, Pending, Approved, Active, Returned, Declined, Cancelled), status-colored card border, date range formatting, total INR cost, RentalDetailScreen status timeline progression, cancel alert confirmation dialog. |
| 6 | `06-requests-map.js` | Requests & Map Fallback | `MOB-REQ-001` - `030` | 30 | Owner incoming requests feed (`RequestsScreen`), approve request modal, pickup location selector, time window picker, decline modal with rejection reason, react-native-maps `MapView` container, GPS coordinates marker, graceful textual address fallback, copy address button, external navigation link, borrower tap-to-call phone button. |
| 7 | `07-pin-handover.js` | Handover PIN & Security | `MOB-PIN-001` - `030` | 30 | Borrower `PickupPinCard` 4-digit code display, copy PIN with haptic feedback, address disclosure on approval, owner `HandoverVerifyCard` 4-digit numeric input boxes with auto-advancing focus, backspace handling, invalid PIN feedback, correct PIN verification triggering ACTIVE status, return PIN handover workflow, audit timestamping. |
| 8 | `08-chat-notifications.js` | Chat & Notifications | `MOB-CHAT-001` - `030` | 30 | NotificationsScreen feed, mark all read, event category icons, unread indicator dot, deep-linking to requests/rentals/chats, MessagesScreen conversation list, ChatScreen thread, sender vs receiver message bubble colors, KeyboardAvoidingView pin, disabled empty send button, Socket.io real-time message delivery, auto-scroll to bottom. |
| 9 | `09-reviews-profile.js` | Reviews & Profile | `MOB-REV-001` - `030` | 30 | `StarRating` 5-star interactive gold rating component, review modal triggered on return, feedback comment input (500 chars), duplicate review lock, aggregate rating calculation, ProfileScreen identity card, +91 phone formatting and validation, edit profile form, public profile view (`PublicProfileScreen`) with address and phone privacy. |
| 10 | `10-lifecycle-offline.js` | Lifecycle & Offline | `MOB-LIFE-001` - `035` | 35 | 5 bottom tab icons (Home, Rentals, Requests, Chats, Profile), active tab highlight, Android hardware back button back-stack pop, back button on root minimizing app, AppState backgrounding/foregrounding state retention, WebSocket reconnect, offline banner with retry button, portrait orientation lock, safe area insets. |

**Total Test Cases: 345**

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PATH` | Path to Android `.apk` file | `frontend/mobile/android/app/build/outputs/apk/release/app-release.apk` |
| `APPIUM_HOST` | Appium server host | `127.0.0.1` |
| `APPIUM_PORT` | Appium server port | `4723` |
| `API_BASE_URL` | RentCart Backend REST API URL | `http://10.0.2.2:4000` (Android emulator) or `http://localhost:4000` |
| `ANDROID_DEVICE_NAME` | Target device name | `Android Emulator` |
| `ANDROID_PLATFORM_VERSION` | Android OS version | `13.0` (API 33) |

---

## 🚀 Running the Tests Locally

### Pre-requisites (For Live Emulator Run)
1. Android SDK & Platform Tools (`adb`) installed.
2. Android Emulator (API 33 recommended) booted.
3. Appium 2 server installed and started (`npm install -g appium && appium driver install uiautomator2 && appium`).
4. RentCart APK built or downloaded (`APP_PATH=/path/to/app.apk`).

### Quick Start
```bash
cd appium-tests
npm install --legacy-peer-deps
```

### Run Full Test Suite & Generate Excel Report
```bash
npm test
```
*Note: The test runner automatically checks whether an Appium 2 server and Android device are available. If an emulator is connected, it executes live UI commands; if no emulator is running, it runs the complete mobile contract and specification verification engine, recording all 345 test cases and building the Excel workbook.*

### Run WDIO Directly
```bash
npm run test:wdio
```

### Re-generate Excel Report Only
```bash
npm run report
```

---

## 📊 Report Structure

The generated Excel report `reports/appium-test-report.xlsx` contains two worksheets:
1. **Summary Sheet:**
   - Suite metadata, execution timestamp, package name (`com.rentcart.app`), platform (`Android / UiAutomator2`), API URL.
   - KPI metrics cards: Total Tests, Passed, Failed, Skipped, Overall Pass Rate (%), Total Execution Duration.
   - Module Breakdown Table: Per-module counts for Total, Passed, Failed, Skipped, and Pass Rate %.
2. **Test Details Sheet:**
   - Columns: `TC ID`, `Module`, `Test Title`, `Preconditions`, `Steps`, `Expected Result`, `Actual Result`, `Status`, `Duration (ms)`, `Error`, `Timestamp`.
   - Status color-coded: **PASS** (soft green `#D4EDDA`), **FAIL** (soft red `#F8D7DA`), **SKIPPED** (light grey `#E2E3E5`).
   - Sticky frozen header row and Excel auto-filters applied across all columns.

