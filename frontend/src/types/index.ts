// src/types/index.ts

export type UserRole = 'admin' | 'dispatcher' | 'driver';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type DriverStatus = 'active' | 'inactive' | 'on_trip';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive';
export type VehicleType = 'bike' | 'van' | 'truck' | 'car';
export type OrderStatus = 'created' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  status: UserStatus;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  license_number: string;
  status: DriverStatus;
  vehicle_id?: string;
  vehicle?: Vehicle;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  capacity: number;
  type: VehicleType;
  status: VehicleStatus;
  driver_id?: string;
  driver?: Driver;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  pickup_location: string;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_location: string;
  drop_lat?: number;
  drop_lng?: number;
  distance?: number;
  status: OrderStatus;
  assigned_driver_id?: string;
  driver?: Driver;
  estimated_time?: number;
  created_by?: string;
  creator?: User;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderTimeline {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by?: string;
  changed_by_user?: User;
  note?: string;
  timestamp: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface DashboardSummary {
  drivers: {
    total: number;
    active: number;
    on_trip: number;
    inactive: number;
  };
  vehicles: {
    total: number;
    available: number;
    in_use: number;
    maintenance: number;
  };
  orders: {
    total: number;
    created: number;
    assigned: number;
    in_transit: number;
    completed: number;
    cancelled: number;
  };
}

export interface DriverUtilization {
  driver_id: string;
  name: string;
  current_status: DriverStatus;
  completed_orders_30d: number;
}

export interface DailyMetric {
  date: string;
  created: number;
  completed: number;
}

export interface OrderMetrics {
  daily_metrics: DailyMetric[];
  avg_delivery_time_min: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
