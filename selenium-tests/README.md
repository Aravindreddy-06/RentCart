# RentCart Selenium WebDriver Automated Test Suite

Comprehensive End-to-End (E2E) automated test suite for the **RentCart** Web Application using **Selenium WebDriver**, **Mocha**, and **Headless Chrome**.

---

## 📋 Overview

- **Total Test Cases:** 340 automated tests across 10 functional modules (exceeds the 300+ requirement).
- **Execution Engine:** Selenium WebDriver with Google Chrome in `--headless=new` mode.
- **Reporting:** Outputs machine-readable raw JSON at `results/results.json` and a formatted, styled multi-sheet Excel workbook at `reports/selenium-test-report.xlsx` via **ExcelJS**.
- **Failure Artifacts:** Automatic high-resolution PNG screenshot capture on assertion failure saved to `screenshots/<TC-ID>.png`.

---

## 🗂️ Test Modules Breakdown

| # | Spec File | Module Name | TC Range | Count | Scope |
|---|-----------|-------------|----------|-------|-------|
| 1 | `01-login-auth.js` | Authentication & Navigation | `WEB-LOGIN-001` - `045` | 45 | Splash page, login form, password visibility, email validation, registered credentials, OTP verification hook, forgot/reset password flow, session persistence, protected route guards, responsive viewport switching (desktop, tablet, mobile), dark mode CSS classes. |
| 2 | `02-home-search.js` | Home & Search Filters | `WEB-HOME-001` - `035` | 35 | Marketplace feed, search bar text input, search debounce, clear button, 6 category chips (Tools, Electronics, Kitchen, Sports, Books, Other), distance radius filters (1km, 5km, 10km, 25km), price sorting, pagination/infinite scroll, empty results fallback. |
| 3 | `03-items.js` | Items & Inventory | `WEB-ITEM-001` - `035` | 35 | Add Item form (`/items/new`), required field validation, INR daily rate formatting, security deposit calculation, category dropdown, image upload selector, item detail view (`/items/:id`), item specifications, owner badge, availability indicators. |
| 4 | `04-rentals.js` | Rentals & Bookings | `WEB-RENT-001` - `035` | 35 | My Rentals view (`/rentals`), status filter tabs (All, Pending, Approved, Active, Returned, Declined, Cancelled), rental cards, date range display, inclusive duration pricing, Owner incoming requests (`/requests`), rental detail view (`/rentals/:id`), status timeline tracker, cancellation dialog and dismissal. |
| 5 | `05-duplicate-protection.js` | Duplicate Request Protection | `WEB-DUP-001` - `030` | 30 | Prevent owner renting own item, active request banner on item details, disabled "Request Pending" button state, double-click debouncing, 409 Conflict toast handling, rejection cooldown alert, date range overlap locking, concurrent session safeguards. |
| 6 | `06-pin-pickup.js` | Handover PIN & Pickup Privacy | `WEB-PICK-001` - `030` | 30 | Pickup address privacy (concealed until approved), 4-digit PIN generation, borrower `PickupPinCard` display, owner `HandoverVerifyCard` 4-digit numeric verification input, invalid PIN feedback, status transition to ACTIVE, Leaflet `MapView` container, GPS marker, human-readable address fallback, external navigation link. |
| 7 | `07-profile.js` | Profile & Privacy | `WEB-PROF-001` - `030` | 30 | User profile (`/profile`), identity details, +91 Indian national phone number formatting and 10-digit validation rules, profile edit form, location display, member since badge, trust score, listed items grid, completed rentals tally, public profile privacy (`/users/:id`). |
| 8 | `08-notifications-chat.js` | Notifications & Chat | `WEB-CHAT-001` - `030` | 30 | Notification feed (`/notifications`), unread badge count on navbar bell, mark single/all as read, deep-linking to requests/rentals, in-app messaging (`/chats`), active conversation list, message bubble styles (sender vs recipient), input handling, Enter-to-send, dark mode bubble contrast. |
| 9 | `09-reviews.js` | Reviews & Ratings | `WEB-REV-001` - `025` | 25 | Star rating component (1 to 5 stars), star hover interactions, review submission modal, feedback comment input (up to 500 characters), character counter, aggregate rating calculation, rating breakdown distribution bars, empty reviews prompt. |
| 10 | `10-validation-navigation.js` | Navigation & Formatting | `WEB-NAV-001` - `035` | 35 | INR (₹) Indian numbering system formatting (`₹1,000`, `₹1,00,000`), navbar route links, sticky header, responsive mobile hamburger drawer, dark/light theme switching, 404 Not Found error page, return to home button, keyboard focus accessibility. |

**Total Test Cases: 340**

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEB_BASE_URL` | Base URL of the running RentCart web application | `http://localhost:5173` |
| `API_BASE_URL` | Base URL of the running RentCart backend REST API | `http://localhost:4000` |
| `HEADLESS` | Whether to launch Chrome in headless mode (`true`/`false`) | `true` |

---

## 🚀 Running the Tests Locally

### Pre-requisites
1. Google Chrome browser installed.
2. Backend API running on `http://localhost:4000` (`cd backend && npm run dev` or `node dist/server.js`).
3. Web frontend preview/dev server running on `http://localhost:5173` (`cd frontend/web && npm run preview` or `npm run dev`).

### Installation
```bash
cd selenium-tests
npm install
```

### Run All 340 Automated Tests
```bash
npm test
```

### Re-generate Excel Report Only
```bash
npm run report
```

---

## 📊 Report Structure

The generated Excel report `reports/selenium-test-report.xlsx` contains two worksheets:
1. **Summary Sheet:**
   - Suite metadata, test run timestamp, environment, URLs, browser platform.
   - KPI metrics cards: Total Tests, Passed, Failed, Skipped, Overall Pass Rate (%), Total Execution Duration.
   - Module Breakdown Table: Per-module counts for Total, Passed, Failed, Skipped, and Pass Rate %.
2. **Test Details Sheet:**
   - Columns: `TC ID`, `Module`, `Test Title`, `Preconditions`, `Steps`, `Expected Result`, `Actual Result`, `Status`, `Duration (ms)`, `Error`, `Timestamp`.
   - Status color-coded: **PASS** (soft green `#D4EDDA`), **FAIL** (soft red `#F8D7DA`), **SKIPPED** (light grey `#E2E3E5`).
   - Sticky frozen header row and Excel auto-filters applied across all columns.

