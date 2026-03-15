// src/types/index.ts

export type UserRole = 'admin' | 'dispatcher' | 'driver'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type DriverStatus = 'active' | 'inactive' | 'on_trip'
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive'
export type VehicleType = 'bike' | 'van' | 'truck' | 'car'
export type OrderStatus = 'created' | 'assigned' | 'in_transit' | 'completed' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  google_id?: string
  avatar_url?: string
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  user_id?: string
  name: string
  phone: string
  license_number: string
  status: DriverStatus
  vehicle_id?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  plate_number: string
  capacity: number
  type: VehicleType
  status: VehicleStatus
  driver_id?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  pickup_location: string
  pickup_lat?: number
  pickup_lng?: number
  drop_location: string
  drop_lat?: number
  drop_lng?: number
  distance?: number
  status: OrderStatus
  assigned_driver_id?: string
  estimated_time?: number
  created_by?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface OrderTimeline {
  id: string
  order_id: string
  status: OrderStatus
  changed_by?: string
  note?: string
  timestamp: string
}

export interface DriverLocation {
  id: string
  driver_id: string
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string
}

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
}

/* Global Express Extension */
declare global {
  namespace Express {
    interface User {
      id: string
      name: string
      email: string
      role: UserRole
      google_id?: string
      avatar_url?: string
      status: UserStatus
      created_at: string
      updated_at: string
    }
    interface Request {
      user?: User
      requestId?: string
    }
  }
}


export {}