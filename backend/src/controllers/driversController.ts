// src/controllers/driversController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import { PaginationQuery } from '../types';

export async function listDrivers(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, search, status } = req.query as PaginationQuery;
    const offset = (Number(page) - 1) * Number(limit);

    // Base query with LEFT JOIN to vehicles
    let query = supabase
      .from('drivers')
      .select(`
        *,
        vehicle:vehicles!fk_driver_vehicle(id, plate_number, type, status)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    sendSuccess(res, data, 'Drivers fetched', 200, {
      page: Number(page),
      limit: Number(limit),
      total: count ?? 0,
    });
  } catch (err) {
    sendError(res, 'Failed to fetch drivers', 500);
  }
}

export async function getDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('drivers')
      .select('*, vehicle:vehicles!left(id, plate_number, type, status)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      sendError(res, 'Driver not found', 404);
      return;
    }
    sendSuccess(res, data, 'Driver fetched');
  } catch (err) {
    console.error('Get driver error:', err);
    sendError(res, 'Failed to fetch driver', 500);
  }
}

export async function createDriver(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, license_number, user_id } = req.body;

    // Check for duplicate license
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('license_number', license_number)
      .eq('is_deleted', false)
      .single();

    if (existing) {
      sendError(res, 'License number already registered', 409);
      return;
    }

    const { data, error } = await supabase
      .from('drivers')
      .insert({ name, phone, license_number, user_id, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    sendCreated(res, data, 'Driver created');
  } catch (err) {
    console.error('Create driver error:', err);
    sendError(res, 'Failed to create driver', 500);
  }
}

export async function updateDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phone, license_number } = req.body;

    const { data, error } = await supabase
      .from('drivers')
      .update({ name, phone, license_number })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      sendError(res, 'Driver not found', 404);
      return;
    }
    sendSuccess(res, data, 'Driver updated');
  } catch (err) {
    console.error('Update driver error:', err);
    sendError(res, 'Failed to update driver', 500);
  }
}

export async function deleteDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check for active orders
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('assigned_driver_id', id)
      .in('status', ['assigned', 'in_transit'])
      .limit(1);

    if (activeOrders?.length) {
      sendError(res, 'Cannot deactivate driver with active orders', 409);
      return;
    }

    await supabase
      .from('drivers')
      .update({ is_deleted: true, status: 'inactive', vehicle_id: null })
      .eq('id', id);

    sendSuccess(res, null, 'Driver deactivated');
  } catch (err) {
    console.error('Delete driver error:', err);
    sendError(res, 'Failed to deactivate driver', 500);
  }
}

export async function assignVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { vehicle_id } = req.body;

    const { data: driver } = await supabase
      .from('drivers')
      .select('id, status, vehicle_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!driver) {
      sendError(res, 'Driver not found', 404);
      return;
    }
    if (driver.status === 'inactive') {
      sendError(res, 'Cannot assign vehicle to inactive driver', 400);
      return;
    }

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, status, driver_id')
      .eq('id', vehicle_id)
      .eq('is_deleted', false)
      .single();

    if (!vehicle) {
      sendError(res, 'Vehicle not found', 404);
      return;
    }
    if (vehicle.driver_id && vehicle.driver_id !== id) {
      sendError(res, 'Vehicle is already assigned to another driver', 409);
      return;
    }

    // Unassign previous vehicle
    if (driver.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ driver_id: null, status: 'available' })
        .eq('id', driver.vehicle_id);
    }

    // Assign new vehicle
    await supabase.from('drivers').update({ vehicle_id }).eq('id', id);
    await supabase.from('vehicles').update({ driver_id: id, status: 'in_use' }).eq('id', vehicle_id);

    sendSuccess(res, { driver_id: id, vehicle_id }, 'Vehicle assigned');
  } catch (err) {
    console.error('Assign vehicle error:', err);
    sendError(res, 'Failed to assign vehicle', 500);
  }
}

export async function updateDriverStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      sendError(res, 'Driver not found', 404);
      return;
    }
    sendSuccess(res, data, 'Driver status updated');
  } catch (err) {
    console.error('Update driver status error:', err);
    sendError(res, 'Failed to update driver status', 500);
  }
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    const { data, error } = await supabase
      .from('driver_locations')
      .insert({ driver_id: id, latitude, longitude, accuracy })
      .select()
      .single();

    if (error) throw error;
    sendCreated(res, data, 'Location updated');
  } catch (err) {
    console.error('Update location error:', err);
    sendError(res, 'Failed to update location', 500);
  }
}

export async function getDriverLocation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      sendError(res, 'Location not found', 404);
      return;
    }
    sendSuccess(res, data, 'Location fetched');
  } catch (err) {
    console.error('Get driver location error:', err);
    sendError(res, 'Failed to fetch location', 500);
  }
}

export async function listAllDriversLocations(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(300);

    if (error) throw error;

    const latest = new Map();
    data.forEach(loc => {
      if (!latest.has(loc.driver_id)) {
        latest.set(loc.driver_id, loc);
      }
    });

    sendSuccess(res, Array.from(latest.values()), 'All driver locations fetched');
  } catch (err) {
    console.error('List all locations error:', err);
    sendError(res, 'Failed to fetch locations', 500);
  }
}