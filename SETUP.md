# SETUP.md — Local Development Setup

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18.x | Use `nvm install 18` |
| npm | >= 9.x | Comes with Node |
| Docker Desktop | >= 4.x | Optional but recommended |
| Supabase CLI | >= 1.x | `npm i -g supabase` |

---

## Option A — Fully Local with Docker (Recommended)

This approach runs everything locally without needing a Supabase cloud account.

### 1. Clone and configure

```bash
git clone https://github.com/<you>/T2-FirstName-LastName.git
cd T2-FirstName-LastName

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Edit `backend/.env`

```env
NODE_ENV=development
PORT=4000

# Supabase (local)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
SUPABASE_ANON_KEY=<from supabase start output>

# Google OAuth
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# JWT
JWT_SECRET=your-super-secret-min-32-chars-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
```

### 3. Edit `frontend/.env`

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
VITE_GOOGLE_CLIENT_ID=<your_google_client_id>
```

### 4. Start local Supabase

```bash
# Start local Supabase (PostgreSQL + Auth + Realtime + Studio)
supabase start

# Apply migrations
supabase db push

# (Optional) Seed sample data
psql "postgresql://postgres:postgres@localhost:54321/postgres" \
  -f database/seeds/003_seed_data.sql
```

Supabase Studio will be available at http://localhost:54323

### 5. Start with Docker Compose

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Health check: http://localhost:4000/health

---

## Option B — Cloud Supabase

### 1. Create project at supabase.com

### 2. Run migrations

Go to **SQL Editor** and run in order:
1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_rls_policies.sql`
3. `database/seeds/003_seed_data.sql` (optional)

### 3. Enable Google Auth

- Supabase Dashboard → Authentication → Providers → Google
- Add your Google Client ID + Secret
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 4. Configure env files with Supabase cloud values

Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from:
- Supabase Dashboard → Settings → API

### 5. Run locally without Docker

```bash
# Backend
cd backend
npm install
npm run dev   # runs on port 4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # runs on port 5173
```

---

## Google OAuth Setup

1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials → Create OAuth 2.0 Client (Web application)
3. Authorized JavaScript Origins: `http://localhost:5173`
4. Authorized Redirect URIs: `http://localhost:4000/api/v1/auth/google/callback`
5. Copy Client ID and Secret to your `.env` files

---

## Database Structure

| Table | Description |
|-------|-------------|
| `users` | Platform accounts linked to Google OAuth |
| `drivers` | Driver profiles (can link to a user) |
| `vehicles` | Fleet vehicle records |
| `orders` | Delivery orders with lifecycle status |
| `order_timeline` | Auto-logged status change history |
| `driver_locations` | Timestamped GPS location stream |
| `refresh_tokens` | Hashed refresh tokens for session rotation |

All DDL, triggers, indexes, and RLS policies are in `database/migrations/`.

---

## Verify Everything Works

```bash
# Health check
curl http://localhost:4000/health
# → {"status":"ok","timestamp":"...","env":"development"}

# Test CORS from browser: navigate to http://localhost:5173
# → Login page loads, Google button visible
```
