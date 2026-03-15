// src/controllers/vehiclesController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import { PaginationQuery } from '../types';

export async function listVehicles(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, search, status } = req.query as PaginationQuery;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('vehicles')
      .select('*, driver:drivers!driver_id(id, name, phone)', { count: 'exact' })
      .eq('is_deleted', false)
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('plate_number', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    sendSuccess(res, data, 'Vehicles fetched', 200, {
      page: Number(page),
      limit: Number(limit),
      total: count ?? 0,
    });
  } catch {
    sendError(res, 'Failed to fetch vehicles', 500);
  }
}

export async function getVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, driver:drivers(id, name, phone, status)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      sendError(res, 'Vehicle not found', 404);
      return;
    }
    sendSuccess(res, data, 'Vehicle fetched');
  } catch {
    sendError(res, 'Failed to fetch vehicle', 500);
  }
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { plate_number, capacity, type } = req.body;

    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate_number', plate_number)
      .eq('is_deleted', false)
      .single();

    if (existing) {
      sendError(res, 'Plate number already registered', 409);
      return;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({ plate_number, capacity, type, status: 'available' })
      .select()
      .single();

    if (error) throw error;
    sendCreated(res, data, 'Vehicle created');
  } catch {
    sendError(res, 'Failed to create vehicle', 500);
  }
}

export async function updateVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { plate_number, capacity, type, status } = req.body;

    const { data, error } = await supabase
      .from('vehicles')
      .update({ plate_number, capacity, type, status })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      sendError(res, 'Vehicle not found', 404);
      return;
    }
    sendSuccess(res, data, 'Vehicle updated');
  } catch {
    sendError(res, 'Failed to update vehicle', 500);
  }
}

export async function deleteVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Unassign from driver
    await supabase.from('drivers').update({ vehicle_id: null }).eq('vehicle_id', id);
    await supabase.from('vehicles').update({ is_deleted: true, driver_id: null, status: 'inactive' }).eq('id', id);

    sendSuccess(res, null, 'Vehicle deactivated');
  } catch {
    sendError(res, 'Failed to deactivate vehicle', 500);
  }
}

export async function assignDriverToVehicle(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, status, driver_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!vehicle) {
      sendError(res, 'Vehicle not found', 404);
      return;
    }

    if (vehicle.driver_id && vehicle.driver_id !== driver_id) {
      sendError(res, 'Vehicle already has a driver', 409);
      return;
    }

    await supabase.from('vehicles').update({ driver_id, status: 'in_use' }).eq('id', id);
    await supabase.from('drivers').update({ vehicle_id: id }).eq('id', driver_id);

    sendSuccess(res, { vehicle_id: id, driver_id }, 'Driver assigned to vehicle');
  } catch {
    sendError(res, 'Failed to assign driver to vehicle', 500);
  }
}
