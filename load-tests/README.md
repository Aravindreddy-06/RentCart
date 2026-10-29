# RentCart API Performance & Load Test Suite (k6)

Automated performance and read-traffic load test suite for the RentCart REST API using [k6](https://k6.io/) and [ExcelJS](https://github.com/exceljs/exceljs).

## Overview & Workload Profile

- **Virtual Users (VUs):** 100 concurrent virtual users
- **Duration:** 75 seconds total
  - **10s:** Ramp-up from 0 to 100 VUs
  - **60s:** Steady state at 100 concurrent VUs
  - **5s:** Graceful ramp-down to 0 VUs
- **Traffic Pattern:** Read-only operations looping through:
  - `GET /api/health` — System uptime and health probe
  - `GET /api/items?search={query}` — Search query keyword filtration
  - `GET /api/items?category={category}` — Category listing
  - `GET /api/items?page={page}&limit=5` — Paginated catalog retrieval
  - `GET /api/items?lat={lat}&lng={lng}&radiusKm=5` — Geolocation distance filtering
  - `GET /api/items/:id` — Specific item details view
  - `GET /api/notifications` — In-app notification feed
  - `GET /api/rentals/mine` — Borrower active and historical rentals
  - `GET /api/users/me` — Current user profile and session verification
- **Think Time:** Random 0.5 to 1.5 seconds per user iteration simulating natural user pacing
- **Cleanliness:** No registration, forgot-password, or data creation during load test

## Service Level Objectives (SLOs) & Thresholds

| Metric | Target Threshold | Description |
| :--- | :--- | :--- |
| **Error Rate** (`http_req_failed`) | `< 1.0%` | Less than 1% of total requests may fail |
| **p95 Latency** (`http_req_duration`) | `< 800 ms` | 95% of all requests complete in under 800 ms |
| **Average Latency** (`http_req_duration`) | `< 400 ms` | Mean response time remains under 400 ms |

## Prerequisites

1. RentCart Backend running on `http://localhost:4000` (or target specified via `API_BASE_URL`).
2. PostgreSQL database seeded with default users (`alice@example.com`, `bob@example.com`, `carol@example.com`).
3. k6 executable installed on PATH or placed in `load-tests/bin/`.

## Running the Load Test

```bash
cd load-tests

# Install npm dependencies (exceljs)
npm install

# Run load test and automatically build Excel report
npm test

# Generate Excel report manually from existing summary.json
npm run report
```

## Generated Reports

- **Raw k6 JSON Summary:** `load-tests/reports/summary.json`
- **Executive Excel Report:** `load-tests/reports/load-test-report.xlsx`
  - **Sheet 1 — "Summary":** Total requests, RPS, error rate %, avg/min/median/p90/p95/max latency, and SLO compliance results.
  - **Sheet 2 — "Per Endpoint":** Method, route name, total calls, RPS, error %, and latency percentiles.
  - **Sheet 3 — "Timeline":** 5-second interval breakdown of active VUs, requests in window, RPS, avg, and p95 latency.

