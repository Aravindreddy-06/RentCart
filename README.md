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
   ```

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
