-- Migration: 001_initial_schema.sql
-- Run this first in your Supabase SQL editor or via CLI

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'on_trip');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'inactive');
CREATE TYPE vehicle_type AS ENUM ('bike', 'van', 'truck', 'car');
CREATE TYPE order_status AS ENUM ('created', 'assigned', 'in_transit', 'completed', 'cancelled');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
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

-- ============================================================
-- DRIVERS TABLE
-- ============================================================
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  license_number  TEXT NOT NULL UNIQUE,
  status          driver_status NOT NULL DEFAULT 'active',
  vehicle_id      UUID,  -- FK added after vehicles table
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VEHICLES TABLE
-- ============================================================
CREATE TABLE vehicles (
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

-- Add FK from drivers to vehicles now that vehicles exists
ALTER TABLE drivers
  ADD CONSTRAINT fk_driver_vehicle
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_location     TEXT NOT NULL,
  pickup_lat          NUMERIC(10,7),
  pickup_lng          NUMERIC(10,7),
  drop_location       TEXT NOT NULL,
  drop_lat            NUMERIC(10,7),
  drop_lng            NUMERIC(10,7),
  distance            NUMERIC(10,2),           -- in km
  status              order_status NOT NULL DEFAULT 'created',
  assigned_driver_id  UUID REFERENCES drivers(id) ON DELETE SET NULL,
  estimated_time      INTEGER,                  -- in minutes
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER TIMELINE TABLE
-- ============================================================
CREATE TABLE order_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  note        TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DRIVER LOCATIONS TABLE
-- ============================================================
CREATE TABLE driver_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  accuracy    NUMERIC(6,2),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_drivers_status ON drivers(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX idx_vehicles_status ON vehicles(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_timeline_order ON order_timeline(order_id);
CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO ORDER TIMELINE INSERT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER order_status_change_log AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();
