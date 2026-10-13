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
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CLIENT_ORIGINS="http://localhost:5173,http://localhost:19006"
   PUBLIC_BASE_URL="http://10.221.161.232:4000"
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your16characterapppassword
   MAIL_FROM="RentCart <your_email@gmail.com>"
   ```

   > **Note on SMTP / Gmail App Password:**
   > - To send real emails via Gmail, enable 2-Step Verification on your Google Account, generate a 16-character **App Password** under Security, and set `SMTP_USER` and `SMTP_PASS`.
   > - **Development Fallback:** If SMTP is unconfigured or fails in `NODE_ENV=development`, RentCart prints OTP codes directly to the backend terminal so development and local testing work seamlessly without active SMTP credentials.

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
- `PATCH /api/rentals/:id/approve` *(Protected, Owner only)* — Owner approves a `PENDING` request. Re-checks conflicts inside transaction and returns 409 if overlapping with an existing approved/active rental.
- `PATCH /api/rentals/:id/reject` *(Protected, Owner only)* — Owner rejects a `PENDING` request with optional `ownerNote`. Status becomes `REJECTED`.
- `PATCH /api/rentals/:id/cancel` *(Protected, Borrower only)* — Borrower cancels a `PENDING` or `APPROVED` rental. Status becomes `CANCELLED`.
- `PATCH /api/rentals/:id/activate` *(Protected, Owner only)* — Owner marks an `APPROVED` rental as `ACTIVE` (item handed over).
- `PATCH /api/rentals/:id/return` *(Protected, Owner only)* — Owner marks an `ACTIVE` rental as `RETURNED` (item returned).

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
| **Rental rejected** | Borrower | `RENTAL_REJECTED` | `Rental Rejected` | Owner declined (includes owner's note) |
| **Rental cancelled** | Item owner | `RENTAL_CANCELLED` | `Rental Cancelled` | Borrower cancelled request |
| **Rental marked ACTIVE** | Borrower | `RENTAL_ACTIVATED` | `Rental Active` | Item handed over and active |
| **Rental marked RETURNED** | Borrower | `RENTAL_RETURNED` | `Rental Returned` | Item returned to owner |

Each notification includes `{ rentalId, itemId }` in `data` so the client can navigate directly to the rental detail view. Notifications fail-safe: failures never roll back or abort rental lifecycle operations. Users are never notified of their own actions.

> [!NOTE]
> **Push Notifications & Expo Go:**
> Remote push notifications require an Expo development build (`npx expo run:android` / `npx expo run:ios` or EAS build) with native credentials. In **Expo Go** (`Constants.executionEnvironment === 'storeClient'`), the mobile app automatically detects the environment and skips push token registration gracefully without throwing errors or warnings to the user. In-app notifications continue to work seamlessly via polling and API synchronization.

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
                  │   APPROVED    │
                  └──────┬────────┘
     Owner Hands Over    │
     (Marks Active)      ▼
                  ┌───────────────┐
                  │    ACTIVE     │
                  └──────┬────────┘
     Owner Item Return   │
     (Marks Returned)    ▼
                  ┌───────────────┐
                  │   RETURNED    │
                  └───────────────┘

  * Borrower can cancel anytime during PENDING or APPROVED ──► [ CANCELLED ]
```

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

## 🔒 Demo Accounts (from Seed Data)

After running `npm run seed` in backend:

| Role | Email | Password |
|---|---|---|
| **User 1 (Alice)** | `alice@example.com` | `password123` |
| **User 2 (Bob)** | `bob@example.com` | `password123` |
| **User 3 (Carol)** | `carol@example.com` | `password123` |

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
