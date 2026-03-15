# DEPLOYMENT.md — T2 Real-Time Order & Driver Management System

## Overview

This document describes how to deploy all components of the application to production.

---

## 1. Database (Supabase)

1. Create a Supabase project at https://supabase.com
2. Navigate to **SQL Editor**
3. Run migrations in order:
   ```
   database/migrations/001_initial_schema.sql
   database/migrations/002_rls_policies.sql
   database/seeds/003_seed_data.sql    ← (optional, dev only)
   ```
4. Under **Authentication > Providers**, enable **Google**
5. Set the Google OAuth Client ID and Secret (from Google Cloud Console)
6. Set the **redirect URL** to: `https://your-backend.railway.app/api/v1/auth/google/callback`

---

## 2. Backend (Railway)

1. Connect your GitHub repo to Railway: https://railway.app
2. Create a new service and select the `backend/` folder (or root with Dockerfile)
3. Set environment variables in Railway dashboard:

```
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxx
SUPABASE_ANON_KEY=xxxx
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/api/v1/auth/google/callback
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.vercel.app
```

4. Railway will auto-deploy on push to `main`
5. Note your Railway service URL

---

## 3. Frontend (Vercel)

1. Import your GitHub repo at https://vercel.com
2. Set **Root Directory** to `frontend/`
3. Set **Framework Preset** to `Vite`
4. Add environment variables:

```
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
VITE_GOOGLE_CLIENT_ID=xxxx
```

5. Vercel will auto-deploy on push to `main`

---

## 4. Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Navigate to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application type)
5. Add **Authorized Redirect URIs**:
   - `http://localhost:4000/api/v1/auth/google/callback` (dev)
   - `https://your-backend.railway.app/api/v1/auth/google/callback` (prod)
6. Add **Authorized JavaScript Origins**:
   - `http://localhost:5173` (dev)
   - `https://your-frontend.vercel.app` (prod)

---

## 5. Verify Deployment

```bash
# Health check
curl https://your-backend.railway.app/health

# Should return: {"status":"ok","timestamp":"...","env":"production"}
```

---

## Docker (Self-hosted)

```bash
# Copy and configure env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both files with your values

# Build and run
docker-compose up --build -d

# View logs
docker-compose logs -f backend
```
