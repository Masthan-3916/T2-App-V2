-- Migration: 002_rls_policies.sql
-- Row-Level Security Policies for all tables

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: get current user role from JWT
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role'),
    'anonymous'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::UUID,
    NULL
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- USERS POLICIES
-- ============================================================

-- Admins can do anything
CREATE POLICY users_admin_all ON users
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin');

-- Dispatchers can view all users
CREATE POLICY users_dispatcher_read ON users
  FOR SELECT TO authenticated
  USING (current_user_role() = 'dispatcher');

-- Drivers can only view their own record
CREATE POLICY users_driver_own ON users
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND id = current_user_id()
  );

-- Any authenticated user can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = current_user_id());

-- ============================================================
-- DRIVERS POLICIES
-- ============================================================

-- Admins and dispatchers can manage drivers
CREATE POLICY drivers_admin_dispatcher_all ON drivers
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'dispatcher'));

-- Drivers can view their own record
CREATE POLICY drivers_own_read ON drivers
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND user_id = current_user_id()
  );

-- ============================================================
-- VEHICLES POLICIES
-- ============================================================

-- Admins and dispatchers can manage vehicles
CREATE POLICY vehicles_admin_dispatcher_all ON vehicles
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'dispatcher'));

-- Drivers can view vehicles (read-only)
CREATE POLICY vehicles_driver_read ON vehicles
  FOR SELECT TO authenticated
  USING (current_user_role() = 'driver');

-- ============================================================
-- ORDERS POLICIES
-- ============================================================

-- Admins and dispatchers can do anything
CREATE POLICY orders_admin_dispatcher_all ON orders
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'dispatcher'));

-- Drivers can read orders assigned to them
CREATE POLICY orders_driver_assigned ON orders
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND assigned_driver_id IN (
      SELECT id FROM drivers WHERE user_id = current_user_id() AND is_deleted = FALSE
    )
  );

-- Drivers can update status of their assigned orders only
CREATE POLICY orders_driver_update_status ON orders
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'driver'
    AND assigned_driver_id IN (
      SELECT id FROM drivers WHERE user_id = current_user_id() AND is_deleted = FALSE
    )
  )
  WITH CHECK (
    -- Drivers can only change to in_transit or completed
    status IN ('in_transit', 'completed')
  );

-- ============================================================
-- ORDER TIMELINE POLICIES
-- ============================================================

-- Admins and dispatchers can see all timelines
CREATE POLICY timeline_admin_dispatcher_all ON order_timeline
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'dispatcher'));

-- Drivers can see timeline for their orders
CREATE POLICY timeline_driver_own ON order_timeline
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND order_id IN (
      SELECT o.id FROM orders o
      JOIN drivers d ON d.id = o.assigned_driver_id
      WHERE d.user_id = current_user_id() AND d.is_deleted = FALSE
    )
  );

-- ============================================================
-- DRIVER LOCATIONS POLICIES
-- ============================================================

-- Admins and dispatchers can read all locations
CREATE POLICY locations_admin_dispatcher_read ON driver_locations
  FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'dispatcher'));

-- Drivers can insert their own location
CREATE POLICY locations_driver_insert ON driver_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = current_user_id() AND is_deleted = FALSE
    )
  );

-- Drivers can read their own location history
CREATE POLICY locations_driver_own_read ON driver_locations
  FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = current_user_id() AND is_deleted = FALSE
    )
  );

-- ============================================================
-- REFRESH TOKENS POLICIES
-- ============================================================

-- Users can only manage their own tokens
CREATE POLICY tokens_own ON refresh_tokens
  FOR ALL TO authenticated
  USING (user_id = current_user_id());
