-- Seeds: 003_seed_data.sql
-- Sample data for development and testing

-- ============================================================
-- SEED USERS
-- ============================================================
INSERT INTO users (id, name, email, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Admin',       'admin@example.com',      'admin',      'active'),
  ('00000000-0000-0000-0000-000000000002', 'Dave Dispatcher',   'dispatch@example.com',   'dispatcher', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Dan Driver',        'driver1@example.com',    'driver',     'active'),
  ('00000000-0000-0000-0000-000000000004', 'Sam Smith',         'driver2@example.com',    'driver',     'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DRIVERS
-- ============================================================
INSERT INTO drivers (id, user_id, name, phone, license_number, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Dan Driver', '+1-555-0101', 'LIC-001-2024', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Sam Smith',  '+1-555-0102', 'LIC-002-2024', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED VEHICLES
-- ============================================================
INSERT INTO vehicles (id, plate_number, capacity, type, status, driver_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'TRK-001', 1000.00, 'truck', 'in_use',    '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'VAN-002', 500.00,  'van',   'available', NULL),
  ('20000000-0000-0000-0000-000000000003', 'CAR-003', 200.00,  'car',   'in_use',    '10000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Link drivers to vehicles
UPDATE drivers SET vehicle_id = '20000000-0000-0000-0000-000000000001'
  WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE drivers SET vehicle_id = '20000000-0000-0000-0000-000000000003'
  WHERE id = '10000000-0000-0000-0000-000000000002';

-- ============================================================
-- SEED ORDERS
-- ============================================================
INSERT INTO orders (id, pickup_location, pickup_lat, pickup_lng, drop_location, drop_lat, drop_lng, distance, status, assigned_driver_id, estimated_time, created_by) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'Warehouse A, 123 Industrial Blvd', 37.7749, -122.4194,
    'Client Office, 456 Market St',     37.7899, -122.4000,
    5.2, 'in_transit',
    '10000000-0000-0000-0000-000000000001',
    18,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Depot B, 789 Commerce Ave',        37.7600, -122.4300,
    'Retail Store, 101 Shopping Lane',  37.7750, -122.4150,
    3.8, 'assigned',
    '10000000-0000-0000-0000-000000000002',
    12,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Distribution Center, 500 Logistics Dr', 37.7500, -122.4500,
    'Factory, 900 Industrial Pkwy',          37.7650, -122.4600,
    6.1, 'created',
    NULL,
    NULL,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED ORDER TIMELINE
-- ============================================================
INSERT INTO order_timeline (order_id, status, changed_by, timestamp) VALUES
  ('30000000-0000-0000-0000-000000000001', 'created',    '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 hours'),
  ('30000000-0000-0000-0000-000000000001', 'assigned',   '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 hours 30 minutes'),
  ('30000000-0000-0000-0000-000000000001', 'in_transit',  '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 hour'),
  ('30000000-0000-0000-0000-000000000002', 'created',    '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 hours'),
  ('30000000-0000-0000-0000-000000000002', 'assigned',   '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 hour 30 minutes'),
  ('30000000-0000-0000-0000-000000000003', 'created',    '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DRIVER LOCATIONS
-- ============================================================
INSERT INTO driver_locations (driver_id, latitude, longitude, timestamp) VALUES
  ('10000000-0000-0000-0000-000000000001', 37.7820, -122.4100, NOW() - INTERVAL '5 minutes'),
  ('10000000-0000-0000-0000-000000000001', 37.7830, -122.4090, NOW() - INTERVAL '4 minutes'),
  ('10000000-0000-0000-0000-000000000001', 37.7840, -122.4080, NOW() - INTERVAL '3 minutes'),
  ('10000000-0000-0000-0000-000000000001', 37.7855, -122.4060, NOW() - INTERVAL '2 minutes'),
  ('10000000-0000-0000-0000-000000000001', 37.7870, -122.4040, NOW() - INTERVAL '1 minute'),
  ('10000000-0000-0000-0000-000000000002', 37.7620, -122.4280, NOW() - INTERVAL '8 minutes'),
  ('10000000-0000-0000-0000-000000000002', 37.7640, -122.4250, NOW() - INTERVAL '4 minutes'),
  ('10000000-0000-0000-0000-000000000002', 37.7660, -122.4220, NOW() - INTERVAL '1 minute')
ON CONFLICT DO NOTHING;
