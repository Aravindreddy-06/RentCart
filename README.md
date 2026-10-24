# 🤝 RentCart - Neighbourhood Sharing Platform

RentCart is a neighbourhood item-sharing platform where community members can borrow items from or lend items to their neighbours. It reduces waste, saves money, and connects local communities.

---

## 📁 Repository Structure

```text
RentCart/
├── backend/            # Node.js + Express + TypeScript REST API
│   ├── prisma/         # Prisma Schema & Seed Data
│   └── src/            # Controllers, Services, Routes, Middlewares, Auth
├── frontend/
│   ├── web/            # React 18 + Vite + TypeScript + Tailwind CSS
│   └── mobile/         # React Native + Expo + TypeScript
└── README.md           # Project Documentation & Setup Guide
```

---

## 🛠️ Tech Stack & Key Features

### Backend (`/backend`)
- **Runtime**: Node.js & Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Access Token + Refresh Token), bcrypt password hashing
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, Express Rate Limiter

### Web Application (`/frontend/web`)
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism design tokens
- **Routing**: React Router v6
- **Forms & Validation**: React Hook Form + Zod
- **Features**: Responsive UI, Search & Filters, Item Listing, Borrow Request Calculator & Management, Profile Dashboard

### Mobile Application (`/frontend/mobile`)
- **Framework**: React Native + Expo + TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **Token Security**: `expo-secure-store` for persistent auth token storage
- **Features**: Mobile-native design, Search & Filter chips, Item listing, Borrow request modal, Requests tab, Profile tab

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local or hosted database instance (e.g., Supabase, Neon, Docker)

---

### 1️⃣ Setting Up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   Copy `.env.example` to `.env` and fill in your PostgreSQL database URI and JWT secret:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://user:password@localhost:5432/rentcart?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key"
   CLIENT_ORIGINS="http://localhost:5173,http://localhost:19006"
   PUBLIC_BASE_URL="http://10.221.161.232:4000"

   # Handover & Return PIN Security
   HANDOVER_PIN_SECRET="your-32-byte-hex-hmac-secret-here-min-32-chars"
   HANDOVER_PIN_ENC_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
   REQUIRE_RETURN_PIN=false

   # Cloudinary Media Storage
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Email Provider Configuration
   # Choose "brevo" (HTTPS API, recommended on Render) or "smtp" (Nodemailer)
   # Defaults to "smtp" in development; must be set explicitly when NODE_ENV=production.
   MAIL_PROVIDER=brevo

   # --- Option A: Brevo HTTPS API (Recommended for Render & Production) ---
   BREVO_API_KEY=xkeysib-your-brevo-api-key
   MAIL_FROM_EMAIL=your-verified-sender@example.com
   MAIL_FROM_NAME=RentCart

   # --- Option B: Nodemailer SMTP (Traditional SMTP) ---
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your16characterapppassword
   MAIL_FROM="RentCart <your_email@gmail.com>"
   ```

   > **Why Brevo? (SMTP is Blocked on Render & Cloud Hosts):**
   > - Cloud hosting platforms such as **Render**, **Vercel**, and **AWS Lambda** block outbound connections on standard SMTP ports (25, 465, and 587) to prevent spam abuse. As a result, standard SMTP clients (like Nodemailer) will hang or timeout when deployed on Render.
   > - RentCart includes a built-in **Brevo HTTPS API provider** (`MAIL_PROVIDER=brevo`) that transmits transactional emails via `POST https://api.brevo.com/v3/smtp/email` over standard HTTPS (port 443) using Node's built-in `fetch`, bypassing all SMTP firewall restrictions with zero extra dependencies.

   > **Brevo Setup & Sender Verification:**
   > 1. Sign up for a free account at [Brevo (formerly Sendinblue)](https://www.brevo.com).
   > 2. **Verify Sender Email:** Navigate to **Senders, Domains & Dedicated IPs** &rarr; **Senders** and add/verify your sender email address (e.g., `rentcart.app@gmail.com`). Brevo will only dispatch emails from verified senders.
   > 3. **Generate API Key:** Navigate to **SMTP & API** &rarr; **API Keys**, click **Generate a new API key**, and set it as `BREVO_API_KEY`.
   > 4. Set `MAIL_FROM_EMAIL` to your verified sender address and `MAIL_FROM_NAME` to `RentCart`.
   > 5. On server startup, RentCart verifies the key via `GET https://api.brevo.com/v3/account` and logs `✅  Email provider (Brevo) ready`.

   > **Note on SMTP / Gmail App Password:**
   > - If using `MAIL_PROVIDER=smtp` with Gmail, enable 2-Step Verification on your Google Account, generate a 16-character **App Password** under Security, and set `SMTP_USER` and `SMTP_PASS`.

   > **Development Fallback:**
   > - When running in `NODE_ENV=development` with no email provider configured, RentCart safely prints OTP codes directly to the terminal console so that registration and password-reset flows work seamlessly during local development without email credentials.

   > **Note on `PUBLIC_BASE_URL`:**
   > `PUBLIC_BASE_URL` is used to build absolute URLs for uploaded static images served at `/uploads`. When running on a local network for mobile device access, replace the IP with your machine's LAN IP so phones can load images.

4. Run Prisma database migrations & seed sample data:
   ```bash
   # Generate Prisma client
   npm run generate

   # Run database migrations
   npm run migrate

   # Seed initial categories & demo data (all seed accounts pre-verified)
   npm run seed
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:4000`.

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account as unverified. Generates a 6-digit OTP, dispatches a verification email, and returns `{ email, requiresVerification: true }` without tokens.
- `POST /api/auth/login` — Sign in. Returns HTTP 403 with code `EMAIL_NOT_VERIFIED` if unverified (and sends a fresh OTP if cooldown permits). Verified users receive access + refresh tokens.
- `POST /api/auth/verify-email` — Verify email address with 6-digit OTP (`{ email, otp }`). Marks user verified and returns user + access + refresh tokens.
- `POST /api/auth/resend-otp` — Resend verification or password reset OTP (`{ email, purpose }`). Enforces 60-second cooldown and 5 OTPs/hour limit.
- `POST /api/auth/forgot-password` — Request password reset code (`{ email }`). Always returns a generic 200 response to prevent account enumeration.
- `POST /api/auth/reset-password` — Reset password using OTP (`{ email, otp, newPassword }`). Enforces password strength rules (8+ chars, 1 letter, 1 number) and sends password changed notification email.
- `POST /api/auth/refresh` — Refresh access token using refresh token.
- `GET /api/auth/me` *(Protected)* — Get authenticated user details.

### Image Uploads (`/api/uploads`)
- `POST /api/uploads/images` *(Protected)* — Upload up to 5 images (`multipart/form-data`, max 5 MB each, JPG/PNG/WebP). Returns `{ urls: string[] }` containing absolute URLs constructed with `PUBLIC_BASE_URL`.

### User Profile (`/api/users`)
All endpoints are protected by JWT authentication and validate payloads with Zod.

- `GET /api/users/me` *(Protected)* — Current user's full profile (`id`, `name`, `email`, `phone`, `address`, `latitude`, `longitude`, `avatarUrl`, `createdAt`, `updatedAt`).
- `PATCH /api/users/me` *(Protected)* — Update profile details (`name`, `phone`, `address`, `latitude`, `longitude`, `avatarUrl`).
- `POST /api/users/me/avatar` *(Protected)* — Upload profile avatar (single image, max 5 MB, JPG/PNG/WebP). Returns `{ avatarUrl: string, user: User }`.
- `PATCH /api/users/me/password` *(Protected)* — Change password (`currentPassword`, `newPassword` min 8 chars). Returns HTTP 400 if current password is incorrect.
- `GET /api/users/:id` *(Protected)* — Public profile of a community member (`name`, `avatarUrl`, `addressArea`, `memberSince`, `itemCount`, `items`). **Never exposes email, phone, or exact coordinates.**

### Items & Nearby Search (`/api/items`)
- `GET /api/items` *(Protected)* — List items with query parameters:
  - `search` — Full-text keyword search across title and description
  - `category` — Filter by category (`Tools`, `Electronics`, `Kitchen`, `Sports`, `Books`, `Other`)
  - `page`, `limit` — Pagination
  - `lat`, `lng` *(Optional)* — User's latitude and longitude for nearby search
  - `radiusKm` *(Optional, default 5, max 50)* — Distance radius in kilometers
  - *Nearby search implementation:* When `lat` and `lng` are provided, items are pre-filtered via a bounding box on the `(latitude, longitude)` composite index, calculated with the Haversine formula in PostgreSQL via Prisma `$queryRaw`, return `distanceKm` on each item, and sort nearest first.
  - *Location privacy:* Returned item coordinates are rounded to ~3 decimals (~110 m resolution) for non-owners to protect homeowners' exact locations.
- `GET /api/items/mine` *(Protected)* — Fetch items owned by the authenticated user
- `GET /api/items/:id` *(Protected)* — Get full details of an item (including owner info)
- `GET /api/items/:id/booked-dates` *(Protected)* — List date ranges of `APPROVED` or `ACTIVE` rentals to block on calendars
- `POST /api/items` *(Protected)* — Create a new item (`title`, `description`, `category`, `images[]`, `pricePerDay`, `deposit`, `latitude`, `longitude`)
- `PATCH /api/items/:id` *(Protected, Owner only)* — Update item details
- `DELETE /api/items/:id` *(Protected, Owner only)* — Delete an item
- `PATCH /api/items/:id/availability` *(Protected, Owner only)* — Toggle `isAvailable` boolean

### Rentals & Requests (`/api/rentals`)
All endpoints require authentication, validate with Zod, and return consistent JSON (`{ success, data }` or `{ success, message }`).

- `POST /api/rentals` *(Protected)* — Create a rental request (`itemId`, `startDate`, `endDate`, optional `borrowerNote`). Item must be available, user cannot rent their own item, dates cannot be in past, `endDate >= startDate`. Calculates `totalPrice = days * pricePerDay`. Status starts at `PENDING`.
- `GET /api/rentals/mine` *(Protected)* — Rentals where the authenticated user is the borrower (`?status=` filter, `page`, `limit`).
- `GET /api/rentals/incoming` *(Protected)* — Rental requests on items owned by the authenticated user (`?status=` filter, `page`, `limit`).
- `GET /api/rentals/:id` *(Protected)* — Rental details (accessible only by borrower or owner).
- `PATCH /api/rentals/:id/approve` *(Protected, Owner only)* — Owner approves a `PENDING` request. Accepts optional pickup fields (`pickupLatitude`, `pickupLongitude`, `pickupAddress`, `pickupNote`, `pickupTimeFrom`, `pickupTimeTo`). If omitted, automatically falls back to owner's profile location and address; returns 400 if owner has neither. Re-checks booking conflicts and sends `RENTAL_APPROVED` and `PICKUP_LOCATION_SHARED` notifications.
- `PATCH /api/rentals/:id/pickup` *(Protected, Owner only)* — Update designated pickup point while rental is `APPROVED` or `ACTIVE`.
- `GET /api/rentals/:id/pickup` *(Protected)* — Retrieve pickup point coordinates and address. Accessible by owner always; accessible by borrower **ONLY** while `APPROVED` or `ACTIVE` (returns 403 Forbidden otherwise). Non-participants receive 403.
- `POST /api/rentals/:id/tracking/start` *(Protected, Borrower only)* — Starts live tracking (allowed only when `APPROVED`). Upserts LiveLocation, notifies the owner with `BORROWER_ON_THE_WAY` (at most once per session), and emits `tracking:started` via socket.
- `POST /api/rentals/:id/tracking/stop` *(Protected, Borrower only)* — Stops location sharing and emits `tracking:stopped` to the owner.
- `POST /api/rentals/:id/tracking/arrived` *(Protected, Borrower only)* — Marks borrower as arrived at pickup point, cleans up live location session, notifies owner with `BORROWER_ARRIVED`, and emits `tracking:arrived`.
- `GET /api/rentals/:id/tracking` *(Protected, Owner only)* — Fetches latest borrower live coordinates, timestamp, and estimated arrival time (`etaMinutes`). Returns `null` if borrower is not sharing.
- `PATCH /api/rentals/:id/reject` *(Protected, Owner only)* — Owner rejects a `PENDING` request with optional `ownerNote`. Status becomes `REJECTED`.
- `PATCH /api/rentals/:id/cancel` *(Protected, Borrower only)* — Borrower cancels a `PENDING` or `APPROVED` rental. Status becomes `CANCELLED`.
- `GET /api/rentals/:id/handover-pin` *(Protected, Borrower only, APPROVED only)* — Retrieves the 4-digit pickup PIN for an approved rental (`{ pin, createdAt }`). Returns 403 Forbidden for owners or other users, 409 Conflict if rental status is not `APPROVED`. Lazily generates a PIN for legacy approved rentals if one does not exist.
- `POST /api/rentals/:id/handover/verify` *(Protected, Owner only, APPROVED only)* — Owner verifies borrower's 4-digit PIN (`{ pin: string }` matching `/^\d{4}$/`). Constant-time comparison prevents timing attacks. On success, transitions rental to `ACTIVE`, resets failed attempts, invalidates the PIN, auto-stops tracking, and sends `HANDOVER_CONFIRMED` notifications to both parties. Enforces a 5-attempt limit per rental with a 15-minute lock (429 with `retryAfterSeconds`). Rate-limited per user and per rental.
- `PATCH /api/rentals/:id/activate` *(Protected, Owner only)* — Fallback activation ("Skip PIN"). Requires `{ confirmWithoutPin: true }` in the request body (returns 400 Bad Request otherwise). Both web and mobile UIs present a warning confirmation: *"Only skip if the borrower cannot show the PIN."* Auto-stops any active tracking session.
- `PATCH /api/rentals/:id/return` *(Protected, Owner only)* — Owner marks an `ACTIVE` rental as `RETURNED` (item returned). Auto-stops any active tracking session. Enables mutual review flow.

### Realtime Socket.IO Events & Live Tracking
- **JWT Handshake Auth**: Socket connections authenticate using Bearer JWT tokens.
- **Client Update**: Borrower emits `tracking:update` with `{ rentalId, latitude, longitude, heading }`.
  - Server verifies sender is the confirmed borrower of the rental and rental is `APPROVED`.
  - Rate limited / throttled on server to at most 1 update per 3 seconds.
  - Server computes ETA in minutes using the Haversine distance formula to the confirmed pickup point at an assumed average transit speed of 25 km/h.
  - Emits `tracking:location` `{ rentalId, latitude, longitude, heading, etaMinutes, updatedAt }` directly to the owner's private room `user:<ownerId>`.
- **Lifecycle Events**: Server emits `tracking:started`, `tracking:stopped`, and `tracking:arrived` to `user:<ownerId>`.
- **Auto-Stop & Cleanup**: Tracking automatically terminates when:
  1. The borrower manually stops it or marks arrival.
  2. The rental status departs from `APPROVED` (`ACTIVE`, `CANCELLED`, `REJECTED`, `RETURNED`).
  3. No location update is received for 5 minutes (inactivity timeout).
  4. 2 hours elapse from session start (maximum duration).
  A periodic background job running every 30 seconds purges expired `LiveLocation` records.

### Notifications & Push Tokens (`/api/notifications`, `/api/push-tokens`)
All endpoints require authentication and return consistent JSON format.

- `GET /api/notifications` *(Protected)* — List notifications for the authenticated user (newest first). Supports query params `unread=true`, `page`, and `limit`.
- `GET /api/notifications/unread-count` *(Protected)* — Returns `{ unreadCount: number }`.
- `PATCH /api/notifications/:id/read` *(Protected)* — Mark single notification as read (returns 403/404 if touching someone else's notification).
- `PATCH /api/notifications/read-all` *(Protected)* — Mark all notifications for the authenticated user as read.
- `DELETE /api/notifications/:id` *(Protected)* — Delete a notification (owner of notification only, returns 403/404 otherwise).
- `POST /api/push-tokens` *(Protected)* — Register or upsert an Expo push token (`{ token: string, platform: string }`).
- `DELETE /api/push-tokens` *(Protected)* — Remove push token on logout (`{ token?: string }`).

#### Notification Lifecycle Events
| Event | Recipient | Type | Title | Description |
|---|---|---|---|---|
| **Rental requested** | Item owner | `RENTAL_REQUESTED` | `Rental Requested` | Borrower requested to rent item |
| **Rental approved** | Borrower | `RENTAL_APPROVED` | `Rental Approved` | Owner approved the request |
| **Pickup point shared** | Borrower | `PICKUP_LOCATION_SHARED` | `Pickup Location Shared` | Owner confirmed pickup location |
| **Borrower on the way** | Item owner | `BORROWER_ON_THE_WAY` | `Borrower On The Way` | Borrower started sharing live location |
| **Borrower arrived** | Item owner | `BORROWER_ARRIVED` | `Borrower Arrived` | Borrower arrived at the pickup location |
| **Rental rejected** | Borrower | `RENTAL_REJECTED` | `Rental Rejected` | Owner declined (includes owner's note) |
| **Rental cancelled** | Item owner | `RENTAL_CANCELLED` | `Rental Cancelled` | Borrower cancelled request |
| **Rental marked ACTIVE** | Borrower | `RENTAL_ACTIVATED` | `Rental Active` | Item handed over and active |
| **Pickup PIN ready** | Borrower | `HANDOVER_PIN_READY` | `Pickup PIN Ready` | "Your pickup PIN is ready. Open the rental to view it." *(Never contains plaintext PIN)* |
| **Handover confirmed** | Borrower & Owner | `HANDOVER_CONFIRMED` | `Handover Confirmed` | Handover confirmed via PIN verification; rental is now Active |
| **Rental marked RETURNED** | Borrower | `RENTAL_RETURNED` | `Rental Returned` | Item returned to owner |

Each notification includes `{ rentalId, itemId }` in `data` so clients navigate directly to `RentalDetail`. Notifications fail-safe: failures never roll back or abort rental lifecycle operations. Users are never notified of their own actions.

> [!IMPORTANT]
> **Privacy & Coordinate Protection:**
> - Pickup location coordinates and address are **NEVER** exposed on public endpoints (`GET /api/items`, public profiles `/users/:id`), notification bodies, or server logs.
> - The borrower receives `null` for pickup fields on `GET /api/rentals/:id` and HTTP 403 on `GET /api/rentals/:id/pickup` when the rental is in `PENDING`, `CANCELLED`, `REJECTED`, or `RETURNED` status.
> - Raw geographical coordinates are never written to application logs.

> [!NOTE]
> **Live Tracking in Expo Go:**
> Expo Go does not support background location execution. Live tracking runs strictly in the foreground with `watchPositionAsync` while the RentCart app remains active on screen. If the app goes to the background, screen is exited, or user logs out, location tracking automatically stops and a friendly prompt asks the user to keep the app open while sharing live arrival.

---

## 🔄 Rental Lifecycle & Business Rules

```text
                  ┌───────────────┐
                  │    PENDING    │
                  └──────┬──┬─────┘
          Owner Approves │  │ Owner Rejects
                         │  └───────────────► [ REJECTED ]
                         ▼
                  ┌───────────────┐
                  │   APPROVED    │ ◄─── Generates 4-digit Handover PIN
                  └──────┬────────┘      (Stored as HMAC-SHA256 & AES-256-GCM)
   Owner verifies PIN or │
   confirms Skip PIN     ▼
                  ┌───────────────┐
                  │    ACTIVE     │ ◄─── Handover PIN invalidated & deleted
                  └──────┬────────┘
     Owner Item Return   │
     (Marks Returned)    ▼
                  ┌───────────────┐
                  │   RETURNED    │ ◄─── Mutual reviews enabled
                  └───────────────┘

  * Borrower can cancel anytime during PENDING or APPROVED ──► [ CANCELLED ]
```

### 🔑 Handover PIN Security Rules & Architecture
1. **Cryptographic Generation**: When a rental is approved (`PENDING` -> `APPROVED`), a cryptographically secure 4-digit PIN is generated via `crypto.randomInt(0, 10000)` (formatted as `0000`–`9999` with zero-padding).
2. **Dual-Layer Database Storage**:
   - `handoverPinHash`: Computed using HMAC-SHA256 with server secret `HANDOVER_PIN_SECRET` for fast constant-time verification.
   - `handoverPinEnc`: Stored encrypted using AES-256-GCM with a 32-byte hex key `HANDOVER_PIN_ENC_KEY` (format: `iv:authTag:encryptedPayload`) allowing the borrower to securely retrieve and view the PIN.
   - **Zero Plaintext**: Plaintext PIN is **never** stored in the database, never logged, and never included in emails, chat, sockets, or push notifications.
3. **Role-Gated Retrieval**:
   - The PIN is returned **ONLY** to the borrower, **ONLY** while the rental is in `APPROVED` status, via `GET /api/rentals/:id/handover-pin`.
   - The owner, third-party users, or unauthenticated requests receive HTTP 403 Forbidden.
   - Once the status transitions to `ACTIVE`, `RETURNED`, or `CANCELLED`, requests receive HTTP 409 Conflict.
4. **Owner Verification & Constant-Time Protection**:
   - The owner verifies the PIN at `POST /api/rentals/:id/handover/verify`.
   - Constant-time HMAC comparison via `crypto.timingSafeEqual` prevents timing side-channel attacks.
   - On successful verification, the rental transitions to `ACTIVE`, PIN fields are permanently invalidated, and `HANDOVER_CONFIRMED` notifications are dispatched to both users.
5. **Lockout & Rate Limiting**:
   - Max 5 failed attempts per rental. The 5th incorrect attempt locks verification for 15 minutes (HTTP 429 with `retryAfterSeconds`).
   - Failed attempts return HTTP 400 with `attemptsLeft`. Successful verification resets the attempt counter.
   - Additional middleware rate limiters throttle attempts per authenticated user and per rental ID.
6. **Graceful Fallback ("Skip PIN")**:
   - `PATCH /api/rentals/:id/activate` requires `{ confirmWithoutPin: true }` in the request body (returns 400 if omitted).
   - Web and mobile UIs present a warning modal: *"Only skip if the borrower cannot show the PIN."*
7. **Lazy PIN Generation**:
   - Existing approved rentals lacking a PIN automatically generate one on first access by the borrower via `GET /api/rentals/:id/handover-pin`.
8. **Privacy Guarantee Across All Endpoints**:
   - `handoverPinHash`, `handoverPinEnc`, `handoverPinCreatedAt`, `handoverPinAttempts`, and `handoverPinLockedUntil` are explicitly stripped from rental details, rental lists, items, and public user profiles.
9. **Return PIN Configuration**:
   - Environment and config support `requireReturnPin` (`REQUIRE_RETURN_PIN=false` by default) ready for future return PIN enablement without modifying the core domain model.


### Double-Booking Prevention
1. **Concurrent Requests:** Multiple borrowers can request overlapping dates for the same item while requests are `PENDING` (giving the owner freedom of choice).
2. **Exclusion Enforcement:** Once an owner approves a request (`APPROVED`), or while it is `ACTIVE`, no other rental for the same item may overlap in date range.
3. **Database Transaction & PostgreSQL Exclusion Constraint:**
   - On approval, the system locks the item record (`FOR UPDATE`) inside a database transaction and verifies no conflicting `APPROVED` or `ACTIVE` rentals exist before updating.
   - Enforced at the database level via a PostgreSQL exclusion constraint:
     ```sql
     CREATE EXTENSION IF NOT EXISTS btree_gist;
     ALTER TABLE "Rental"
       ADD CONSTRAINT "no_overlapping_approved_active_rentals"
       EXCLUDE USING gist (
         "itemId" WITH =,
         daterange("startDate", "endDate", '[]') WITH &&
       )
       WHERE ("status" = 'APPROVED' OR "status" = 'ACTIVE');
     ```
   - Conflicting approvals return HTTP **409 Conflict**.

### Privacy Gating
- The owner's phone number is visible to the borrower **ONLY** when the rental status is `APPROVED` or `ACTIVE`.
- The borrower's phone number is visible to the owner **ONLY** when the rental status is `APPROVED` or `ACTIVE`.
- In `PENDING`, `REJECTED`, or `CANCELLED` states, phone numbers are stripped from API responses (`null`).

---

## ⭐ Reviews and Ratings System

### Rules & Integrity Constraints
1. **Rental Status Check**: A review can only be written for a rental with status `RETURNED`. Any attempt to review non-`RETURNED` rentals returns HTTP **400 Bad Request**.
2. **Participants Only**: Only the borrower and the owner of that rental can review (borrower reviews the owner, owner reviews the borrower). Non-participants receive HTTP **403 Forbidden**.
3. **One Review Per Participant**: Exactly ONE review is allowed per user per rental. A duplicate attempt returns HTTP **409 Conflict**.
4. **No Self-Reviews**: A user cannot review themselves (enforced at the service layer).
5. **Rating Range**: Rating is an integer between 1 and 5 stars (enforced by Zod and a PostgreSQL `CHECK ("rating" >= 1 AND "rating" <= 5)` database constraint).
6. **Comments**: Optional, maximum 500 characters.
7. **Time Window**: Reviews cannot be edited after 7 days from creation. The author can delete their own review at any time.
8. **Asynchronous Notifications**: Submitting a review triggers a `REVIEW_RECEIVED` notification to the reviewed party. Notification delivery failure never fails the review creation.
9. **Rating Aggregates**:
   - Item details and item list cards include `averageRating` (rounded to 1 decimal) and `reviewCount`.
   - Public user profiles include `averageRating` and `reviewCount` computed from reviews received.

### Review Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reviews` | Yes | Create review (`rentalId`, `rating`, `comment`). Returns 400 for non-RETURNED, 403 for non-participants, 409 for duplicate. |
| `PATCH` | `/api/reviews/:id` | Yes | Edit rating/comment within 7 days (author only). |
| `DELETE` | `/api/reviews/:id` | Yes | Delete review (author only). Updates aggregates immediately. |
| `GET` | `/api/items/:id/reviews` | Yes | Get paginated reviews for an item (supports `page` and `limit`). |
| `GET` | `/api/users/:id/reviews` | Yes | Get paginated reviews received by a user. |
| `GET` | `/api/rentals/:id/review-status` | Yes | Get review eligibility (`canReview`, `hasReviewed`, `myReview`, `otherReview`). |
| `GET` | `/api/items` | Yes | Includes `averageRating` and `reviewCount` on each item. |
| `GET` | `/api/items/:id` | Yes | Includes `averageRating` and `reviewCount` for the item. |
| `GET` | `/api/users/:id` | Yes | Public user profile includes `averageRating` and `reviewCount`. |

---

## 💬 In-App Chat System

RentCart features direct, real-time messaging between borrowers and item owners to coordinate rental logistics, questions, and handovers.

### Rules & Integrity Constraints
1. **One Conversation Per Rental**: Exactly one private conversation exists per rental agreement, accessible exclusively by its borrower and owner. Third parties receive HTTP **403 Forbidden** or **404 Not Found**.
2. **Read-Only Statuses**:
   - Active chatting is supported for rentals with status `PENDING`, `APPROVED`, `ACTIVE`, and `RETURNED` (within 30 days).
   - Chat becomes **read-only** (message history visible, but sending returns HTTP **403 Forbidden**) when:
     - The rental is `REJECTED` or `CANCELLED`.
     - More than 30 days have elapsed since the rental was marked `RETURNED`.
3. **Content Constraints**: Plain text only, between 1 and 1,000 characters (trimmed). Empty or whitespace-only messages are rejected with HTTP **400 Bad Request**. Images, attachments, voice messages, and group chats are strictly disbarred.
4. **Rate Limiting**: Sending is throttled to a maximum of 30 messages per minute per user. Exceeding this rate returns HTTP **429 Too Many Requests**.
5. **Realtime Socket.IO**:
   - Connected on the same HTTP server (`/socket.io`).
   - Authenticated during the handshake using the user's JWT access token (`auth: { token }`). Invalid or expired tokens are rejected immediately.
   - Each user joins their private room `user:<userId>`.
   - All messages are validated and persisted through the backend database before realtime emission.
   - Web clients connect with CORS support (`CLIENT_ORIGINS`), while mobile clients connect natively with AppState lifecycle handling (pausing/disconnecting when backgrounded).
6. **Smart Notifications**:
   - Sending a message dispatches a `NEW_MESSAGE` notification to the other party only if they do not already have an unread `NEW_MESSAGE` notification for that specific rental (preventing notification spam).
   - Notification delivery is asynchronous; notification errors never prevent a message from being sent.

### Chat REST Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/chats` | Yes | List current user's conversations (one per rental), including other user info, item title, rental status, last message, and unread count; sorted by latest message. |
| `GET` | `/api/rentals/:id/messages` | Yes | Fetch messages for a rental, oldest to newest, with cursor pagination (`?before=<isoDate>&limit=30`). Returns `isReadOnly` and `readOnlyReason`. |
| `POST` | `/api/rentals/:id/messages` | Yes | Send a message (`{ body: string }`). Returns HTTP 403 if read-only or non-participant, 429 if rate limited. |
| `PATCH` | `/api/rentals/:id/messages/read` | Yes | Mark all unread messages from the other participant as read. Emits `message:read` event to the sender. |
| `GET` | `/api/chats/unread-count` | Yes | Get total number of unread messages across all active conversations. |

### Socket.IO Realtime Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `message:new` | Server ➔ Client (Recipient Room) | `ChatMessage` object | Emitted in real-time to the recipient's room `user:<id>` when a new message is saved. |
| `message:read` | Server ➔ Client (Sender Room) | `{ rentalId: string, readAt: string }` | Emitted to the sender's room `user:<id>` when their messages are marked as read ("Seen"). |

---

## 🔐 Email Verification & Password Reset System

RentCart enforces email ownership verification on signup and provides a secure, enumeration-safe forgot/reset password flow using cryptographically generated One-Time Passwords (OTPs).

### OTP Rules & Security Architecture
1. **Cryptographic Generation**: 6-digit numeric OTPs generated with `crypto.randomInt(100000, 1000000)`.
2. **Hash-Only Storage & Constant-Time Validation**: OTP plain text is never stored in the database. Only SHA-256 hashes are persisted (`codeHash`). Comparisons are executed with `crypto.timingSafeEqual` in constant time to prevent timing attacks.
3. **Single Use & Expiration**: OTPs are valid for 10 minutes and strictly single use (`consumedAt` timestamp). Consumed or expired OTPs cannot be re-used.
4. **Attempt Lockout**: Maximum of 5 failed attempts per OTP. On the 5th failed attempt, the code is permanently invalidated, returning `attemptsLeft: 0`. A fresh code must then be requested.
5. **Rate Limiting & Cooldown**:
   - **Resend Cooldown**: 60 seconds between resend requests per purpose (`retryAfterSeconds` returned on HTTP 429).
   - **Hourly Throttling**: Maximum of 5 OTP emails per email address per hour.
   - **IP Rate Limiting**: All OTP endpoints are rate-limited per IP using `express-rate-limit`.
6. **No Account Enumeration**: The `POST /api/auth/forgot-password` endpoint always returns a generic HTTP 200 success response whether or not the email exists in the database. Reset emails are dispatched only for verified accounts.
7. **Password Complexity Rules**: Minimum 8 characters, at least one letter and at least one number. Enforced across registration, password change, and password reset.
8. **Automated Cleanup**: A recurring background job automatically cleans up expired and consumed OTP codes.

---

### 2️⃣ Setting Up the Web Application

1. Navigate to the web frontend directory:
   ```bash
   cd frontend/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   Create `.env` with backend URL:
   ```env
   VITE_API_URL=http://localhost:4000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. To test production build:
   ```bash
   npm run build
   ```

---

### 3️⃣ Setting Up the Mobile Application

1. Navigate to the mobile frontend directory:
   ```bash
   cd frontend/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   Create `.env` with your backend URL (use local IP address for physical devices, e.g., `192.168.1.X:4000`):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:4000
   ```

4. Start Expo development server:
   ```bash
   npm start
   ```
   - Press `a` to open in Android Emulator
   - Press `i` to open in iOS Simulator
   - Scan the QR code with Expo Go app on iOS/Android

5. Type check:
   ```bash
   npx tsc --noEmit
   ```

---

## 🇮🇳 India Localization

RentCart is fully localized for India across backend, web, and mobile:

### 1. Currency (INR / ₹)
- **Shared Formatter**: `formatINR(amount, options?)` in `frontend/web/src/utils/currency.ts` and `frontend/mobile/src/utils/currency.ts`.
- **Indian Digit Grouping**: Uses `Intl.NumberFormat('en-IN')` with fallback to Indian numbering system (`12,34,567`) and `₹` symbol (compatible with Hermes engine on Android).
- **Decimals**: Shows paise only when an amount has a non-zero decimal part (e.g. `₹150`, `₹1,250.50`).
- **Validation**: Enforces non-negative prices and deposits with a maximum cap of ₹10,00,000 (`MAX_PRICE_OR_DEPOSIT = 1_000_000`).
- **API Responses**: Always include `currency: "INR"` alongside item and rental payloads without altering stored raw database values.

### 2. Indian Phone Numbers
- **Normalization**: Backend uses `libphonenumber-js` with default region `IN`. Accepts `9876543210`, `09876543210`, `+91 98765 43210`, `91-9876543210` and normalizes to E.164 `+919876543210`.
- **Validation**: Rejects invalid Indian numbers with 400: *"Enter a valid 10-digit Indian mobile number"* (`^[6-9]\d{9}$`). Valid international numbers starting with `+` are preserved.
- **Form Inputs**: Fixed `+91` prefix badge with 10-digit numeric input, `98765 43210` placeholder, paste sanitization (strips spaces, dashes, leading 0 or 91), and *"Indian mobile number"* helper text.
- **Display**: Formatted as `+91 98765 43210` with tap-to-call link (`tel:`) and a one-click Copy button.
- **Privacy Rules**: Phone numbers are strictly visible only when a rental is `APPROVED` or `ACTIVE`, and are never displayed on public profile cards.

### 3. Data Migration Script
Safely normalizes all existing phone numbers in PostgreSQL to E.164 format while leaving unparseable rows intact:
```bash
cd backend && npm run migrate:phones
```

### 4. Dates & Times
- **Date Format**: `dd/MM/yyyy` format across listings, reviews, rental terms, and conflict warnings (`src/utils/date.ts`).
- **Time Format**: 12-hour format with AM/PM according to local device or browser timezone.
- **Placeholders**: Default Indian region placeholders (e.g., *"Anna Nagar, Chennai"*).

---

## 🔒 Demo Accounts (from Seed Data)

After running `npm run seed` in backend:

| Role | Email | Password | Phone (E.164) | Display Phone |
|---|---|---|---|---|
| **User 1 (Alice)** | `alice@example.com` | `password123` | `+919876543210` | `+91 98765 43210` |
| **User 2 (Bob)** | `bob@example.com` | `password123` | `+919876543211` | `+91 98765 43211` |
| **User 3 (Carol)** | `carol@example.com` | `password123` | `+919876543212` | `+91 98765 43212` |

---

## 🧪 Build & Verification Commands Summary

```bash
# Verify Backend Build
cd backend && npm run build

# Verify Web Frontend Build
cd frontend/web && npm run build

# Verify Mobile Type Safety
cd frontend/mobile && npx tsc --noEmit
```

---

## 📄 License
ISC License. Built for community sharing.
