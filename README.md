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
   ```

   > **Note on `PUBLIC_BASE_URL`:**
   > `PUBLIC_BASE_URL` is used to build absolute URLs for uploaded static images served at `/uploads`. When running on a local network for mobile device access, replace the IP with your machine's LAN IP so phones can load images.

4. Run Prisma database migrations & seed sample data:
   ```bash
   # Generate Prisma client
   npm run generate

   # Run database migrations
   npm run migrate

   # Seed initial categories & demo data
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
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Sign in and receive access + refresh tokens
- `POST /api/auth/refresh` — Refresh access token using refresh token

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
