-- ============================================================
-- T2-FleetOps FULL DATABASE SETUP
-- ============================================================
-- This script consolidates schema, policies, and seed data.
-- Run this in your Supabase SQL Editor.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'on_trip');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_type AS ENUM ('bike', 'van', 'truck', 'car');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('created', 'assigned', 'in_transit', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          user_role NOT NULL DEFAULT 'dispatcher',
  google_id     TEXT UNIQUE,
  avatar_url    TEXT,
  status        user_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  license_number  TEXT NOT NULL UNIQUE,
  status          driver_status NOT NULL DEFAULT 'active',
  vehicle_id      UUID,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number  TEXT NOT NULL UNIQUE,
  capacity      NUMERIC(10,2) NOT NULL DEFAULT 0,
  type          vehicle_type NOT NULL DEFAULT 'van',
  status        vehicle_status NOT NULL DEFAULT 'available',
  driver_id     UUID REFERENCES drivers(id) ON DELETE SET NULL,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK
DO $$ BEGIN
    ALTER TABLE drivers ADD CONSTRAINT fk_driver_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_location     TEXT NOT NULL,
  pickup_lat          NUMERIC(10,7),
  pickup_lng          NUMERIC(10,7),
  drop_location       TEXT NOT NULL,
  drop_lat            NUMERIC(10,7),
  drop_lng            NUMERIC(10,7),
  distance            NUMERIC(10,2),
  status              order_status NOT NULL DEFAULT 'created',
  assigned_driver_id  UUID REFERENCES drivers(id) ON DELETE SET NULL,
  estimated_time      INTEGER,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  note        TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  accuracy    NUMERIC(6,2),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$ BEGIN IF OLD.status IS DISTINCT FROM NEW.status THEN INSERT INTO order_timeline (order_id, status, changed_by) VALUES (NEW.id, NEW.status, NEW.created_by); END IF; RETURN NEW; END; $$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER order_status_change_log AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. RLS POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$ SELECT COALESCE((current_setting('request.jwt.claims', true)::json->>'role'), 'anonymous'); $$ LANGUAGE sql STABLE;
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$ SELECT COALESCE((current_setting('request.jwt.claims', true)::json->>'sub')::UUID, NULL); $$ LANGUAGE sql STABLE;

-- Consolidated Policies (Simplified for setup)
DO $$ BEGIN
    CREATE POLICY users_all_admin ON users FOR ALL TO authenticated USING (current_user_role() = 'admin');
    CREATE POLICY drivers_all_staff ON drivers FOR ALL TO authenticated USING (current_user_role() IN ('admin', 'dispatcher'));
    CREATE POLICY vehicles_all_staff ON vehicles FOR ALL TO authenticated USING (current_user_role() IN ('admin', 'dispatcher'));
    CREATE POLICY orders_all_staff ON orders FOR ALL TO authenticated USING (current_user_role() IN ('admin', 'dispatcher'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. SEED DATA
INSERT INTO users (id, name, email, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Admin',       'admin@example.com',      'admin',      'active'),
  ('00000000-0000-0000-0000-000000000002', 'Dave Dispatcher',   'dispatch@example.com',   'dispatcher', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, user_id, name, phone, license_number, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Dan Driver', '+1-555-0101', 'LIC-001-2024', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, plate_number, capacity, type, status) VALUES
  ('20000000-0000-0000-0000-000000000001', 'TRK-001', 1000.00, 'truck', 'available'),
  ('20000000-0000-0000-0000-000000000002', 'VAN-002', 500.00,  'van',   'available'),
  ('20000000-0000-0000-0000-000000000003', 'CAR-003', 200.00,  'car',   'available')
ON CONFLICT (id) DO NOTHING;

-- Orders
INSERT INTO orders (id, pickup_location, pickup_lat, pickup_lng, drop_location, drop_lat, drop_lng, distance, status, created_by) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Warehouse A', 37.7749, -122.4194, 'Client Office', 37.7899, -122.4000, 5.2, 'created', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Depot B', 37.7600, -122.4300, 'Retail Store', 37.7750, -122.4150, 3.8, 'assigned', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Order Timeline
INSERT INTO order_timeline (order_id, status, changed_by) VALUES
  ('30000000-0000-0000-0000-000000000001', 'created', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'created', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Driver Locations
INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES
  ('10000000-0000-0000-0000-000000000001', 37.7820, -122.4100)
ON CONFLICT DO NOTHING;

-- Ensure mani@gmail.com is Admin
UPDATE users SET role = 'admin' WHERE email = 'mani@gmail.com';
