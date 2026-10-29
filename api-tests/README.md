# RentCart API Automated Test Suite

Comprehensive automated API test suite for RentCart REST API backend, extending `backend/scripts/smoke-test.ts` with 340+ real automated test cases.

## Test Coverage (340+ Automated Cases)

| Module | Test ID Range | Description |
|---|---|---|
| **Authentication & Session** | `API-AUTH-001` - `API-AUTH-045` | Login, seeded accounts (alice/bob/carol), register, dev OTP hook, 5-attempt lockout, resend cooldown, reset password, token verification & tampering, refresh tokens. |
| **Items & Inventory** | `API-ITEM-001` - `API-ITEM-040` | Item creation, price & deposit accuracy, currency "INR", categories, CRUD operations, pagination, search keywords, nearby radius filters. |
| **Uploads & Cloudinary** | `API-UPLD-001` - `API-UPLD-035` | Valid image uploads, Cloudinary HTTPS URL validation, CDN image fetch verification (200), magic bytes verification, invalid file types rejection, oversize rejection (>5MB), multi-image limits, avatar uploads. |
| **Rentals Lifecycle** | `API-RENT-001` - `API-RENT-040` | Rental requests, totalPrice calculation, date validations, approve, reject, cancel, return, list my rentals, incoming rentals, status filters. |
| **Duplicate Protection & Cooldowns** | `API-DUP-001` - `API-DUP-030` | `my-request-status` states (NONE, PENDING, APPROVED, REJECTED_COOLDOWN), 409 `DUPLICATE_REQUEST`, 429 `REQUEST_COOLDOWN` with `retryAfterSeconds`, race condition concurrency tests. |
| **Pickup Location & Tracking** | `API-PICK-001` - `API-PICK-030` | Address fallback to profile, borrower pickup visibility (APPROVED/ACTIVE), 403 on RETURNED/CANCELLED, coordinate redaction, non-participant protection, privacy leakage checks in items and profiles. |
| **Handover PIN Security** | `API-PIN-001` - `API-PIN-035` | 4-digit PIN generation, notification without PIN leak, borrower access, owner 403, stranger 403, wrong PIN countdown, 5-attempt lockout (429), PIN consumption upon activation, privacy leakage checks. |
| **Reviews & Ratings** | `API-REV-001` - `API-REV-025` | Borrower & owner reviews after return, review status endpoint, 1-5 star validation, duplicate review prevention, comments limits, aggregate profile ratings. |
| **Chat & Notifications** | `API-CHAT-001` - `API-CHAT-025` | List notifications, mark single/all as read, unread counts, send message, conversation retrieval, non-participant access restrictions. |
| **India Localization & Validation** | `API-LOC-001` - `API-LOC-035` | Mobile number validation (+91 standard, 10-digit formats), invalid mobile number rejection (400), currency INR enforcement, coordinate bounds, input injection resilience. |

## Environment Variables

- `API_BASE_URL`: Base URL of the backend API (default: `http://localhost:4000`).
- `NODE_ENV`: Should be `test` or `development` to enable dev OTP hook (`/api/auth/dev-otp`).

## Running Tests

```bash
# Install dependencies
npm install

# Run the test suite and automatically generate the Excel report
npm test

# Run tests with Mocha test runner
npm run test:mocha

# Generate Excel report from existing results/results.json
npm run report
```

## Generated Reports

- **Raw Test Results**: `results/results.json`
- **Excel Report**: `reports/api-test-report.xlsx`
  - Sheet **Summary**: Overall execution metrics, pass rate, environment details, module breakdown table.
  - Sheet **Test Details**: TC ID, Module, Title, Preconditions, Steps, Expected Result, Actual Result, Status (PASS green, FAIL red, SKIPPED grey), Duration (ms), Error, Timestamp. Auto-filter enabled, frozen header row.

