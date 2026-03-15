# T2 – Real-Time Order & Driver Management System

> Logistics management platform with live tracking, RBAC, analytics, and real-time order workflows.

---

## 📋 Project Overview

A full-stack logistics platform that manages drivers, vehicles, orders, and live tracking with role-based access control. Built with React + TypeScript on the frontend and Node.js + Express on the backend, backed by Supabase (PostgreSQL).

---

## 🛠 Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React 18, TypeScript, Vite, Tailwind CSS |
| State        | Zustand + React Query                   |
| Backend      | Node.js, Express, TypeScript            |
| Database     | Supabase (PostgreSQL)                   |
| Auth         | Google OAuth 2.0 + Supabase Auth        |
| Real-time    | Supabase Realtime (WebSockets)          |
| Deployment   | Vercel (frontend), Railway (backend)    |
| Infra        | Docker (local dev)                      |

---

## 🏗 Project Structure

```
T2-App/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service layer
│   │   ├── store/          # Zustand global state
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Helpers & formatters
├── backend/                # Express API server
│   ├── src/
│   │   ├── routes/         # API route definitions
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, RBAC, validation
│   │   ├── services/       # Business logic layer
│   │   ├── models/         # DB query models
│   │   └── config/         # App configuration
├── database/
│   ├── migrations/         # SQL migration files
│   └── seeds/              # Seed data
├── screens/                # UI screenshots & wireframes
└── docker-compose.yml      # Local dev environment
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Node.js >= 18
- pnpm or npm
- Docker (optional, for local Supabase)
- Supabase account (or local instance)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/T2-FirstName-LastName.git
cd T2-FirstName-LastName
```

### 2. Environment Configuration

#### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=4000

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Database Setup (Supabase)

Run migrations in order:
```bash
# Using Supabase CLI
supabase db push

# Or manually run each file in database/migrations/ in order
```

### 4. Install dependencies & run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 5. Docker (local dev – all-in-one)
```bash
docker-compose up --build
```

App will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/health

---

## 👥 Roles & Permissions

| Feature                  | Admin | Dispatcher | Driver |
|--------------------------|-------|------------|--------|
| View dashboard analytics | ✅    | ✅         | ❌     |
| Manage drivers           | ✅    | ✅         | ❌     |
| Manage vehicles          | ✅    | ✅         | ❌     |
| Create / assign orders   | ✅    | ✅         | ❌     |
| View own orders          | ✅    | ✅         | ✅     |
| Update location          | ✅    | ❌         | ✅     |
| Update order status      | ✅    | ✅         | ✅*    |
| Manage users             | ✅    | ❌         | ❌     |

*Drivers can only update status of orders assigned to them.

---

## 🖥 UI Screens

All screens are HTML wireframes in the `/screens` folder:

| File | Screen |
|------|--------|
| `screens/01-login.html` | Login Page — Google OAuth |
| `screens/02-dashboard.html` | Analytics Dashboard |
| `screens/03-drivers.html` | Driver Management |
| `screens/04-orders.html` | Orders List |
| `screens/05-order-detail.html` | Order Detail + Timeline |
| `screens/06-live-tracking.html` | Live Driver Tracking Map |
| `screens/07-driver-portal.html` | Driver Portal (mobile-friendly) |
| `screens/08-users.html` | User Management (admin only) |
| `screens/09-vehicles.html` | Vehicle Management |

Open any `.html` file directly in a browser to preview.

---

## 🗺 Application Flow

```mermaid
flowchart TD
    A([User visits app]) --> B{Authenticated?}
    B -- No --> C[Google OAuth Login Page]
    C --> D[/api/v1/auth/google/callback]
    D --> E[JWT Access Token issued\n+ Role embedded in payload]
    B -- Yes --> F{Check JWT + Role}
    E --> F

    F -- admin / dispatcher --> G[[Dashboard Page]]
    F -- driver --> H[[Driver Portal]]
    F -- invalid/expired --> C

    G --> G1[Analytics: metrics, charts, utilization]
    G --> G2[[Drivers Page]]
    G --> G3[[Vehicles Page]]
    G --> G4[[Orders Page]]
    G --> G5[[Live Tracking Page]]
    G --> G6[[Users Page - admin only]]

    G2 --> G2A[Create / Edit Driver]
    G2 --> G2B[Assign Vehicle to Driver]
    G2 --> G2C[Deactivate Driver soft-delete]

    G3 --> G3A[Create / Edit Vehicle]
    G3 --> G3B[Assign Driver to Vehicle]
    G3 --> G3C[Deactivate Vehicle]

    G4 --> G4A[Create Order]
    G4 --> G4B[Assign Driver to Order\nvalidates: active + has vehicle + no double-assign]
    G4 --> G4C[Update Status: created→assigned→in_transit→completed]
    G4 --> G4D[[Order Detail Page]]
    G4D --> G4E[View Status Timeline\nautomatically logged via DB trigger]

    G5 --> G5A[Fetch latest driver locations\nevery 10s]
    G5 --> G5B[Visual map with status dots]
    G5 --> G5C[Click driver → see coords + status]

    G6 --> G6A[List all users]
    G6 --> G6B[Create / Edit user]
    G6 --> G6C[Change role inline]
    G6 --> G6D[Suspend user + revoke tokens]

    H --> H1[View assigned orders]
    H --> H2[Start Trip: assigned → in_transit]
    H --> H3[Mark Delivered: in_transit → completed]
    H --> H4[Toggle GPS Location Sharing]
    H4 --> H5[POST /api/v1/drivers/:id/location\nevery ~10s via watchPosition]
    H5 --> H6[(Supabase driver_locations table)]
    H6 --> G5A
```

---

## 🔒 RBAC Matrix

| Action | Admin | Dispatcher | Driver |
|--------|-------|------------|--------|
| View dashboard / analytics | ✅ | ✅ | ❌ |
| Manage drivers (CRUD) | ✅ | ✅ | ❌ |
| Manage vehicles (CRUD) | ✅ | ✅ | ❌ |
| Create orders | ✅ | ✅ | ❌ |
| Assign driver to order | ✅ | ✅ | ❌ |
| View own orders | ✅ | ✅ | ✅ |
| Update order status | ✅ | ✅ | ✅* |
| Send location update | ✅ | ❌ | ✅ |
| View live tracking map | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

*Drivers can only update status of their own assigned orders (in_transit / completed)

---

## 🌐 API Reference

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user info |

### Drivers, Vehicles, Orders, Locations — see full API docs in `backend/src/routes/`

---

## 🧪 Assumptions & Trade-offs

- **Supabase Realtime** is used for live location streaming instead of a custom WebSocket server — simplifies infra while being scalable.
- **Soft deletes** are implemented via `is_deleted` flag, not physical row removal.
- **JWT + refresh token** pattern is used with short-lived access tokens (15m) and 7-day refresh tokens stored in httpOnly cookies.
- **ETA estimation** uses `distance / average_speed` as a heuristic — integrating Google Maps Directions API would improve accuracy.
- **Row-Level Security (RLS)** enforced at the Supabase layer as a second line of defense alongside API-layer RBAC.
- Driver location updates are **batched every 10 seconds** on the client to reduce write pressure.

---

## 🚢 Deployment

- Frontend → Vercel (auto-deploy on `main` push)
- Backend → Railway
- Database → Supabase (managed PostgreSQL)

See `DEPLOYMENT.md` for detailed deployment steps.

---

## 📸 Screens

All UI screens are in the `/screens` folder. See also the flow chart above.

---

## 🏆 Bonus Features Implemented

- [x] Clean architecture: Routes → Controllers → Services → Models
- [x] Docker Compose for reproducible local dev
- [x] Background-ready location update design
- [x] Intelligent ETA logic
- [x] Structured logging with Morgan + Winston
- [x] Observability: request ID tracing, error codes
- [x] RLS policies on all Supabase tables
