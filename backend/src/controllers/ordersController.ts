// src/controllers/ordersController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import { calculateEta } from '../utils/jwt';
import { PaginationQuery, OrderStatus } from '../types';

export async function listOrders(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, search, status } = req.query as PaginationQuery;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('orders')
      .select(`
        *,
        driver:drivers(id, name, phone, status),
        creator:users!created_by(id, name)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    // Drivers only see their own orders
    if (req.user?.role === 'driver') {
      const { data: driverProfile } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      if (driverProfile) {
        query = query.eq('assigned_driver_id', driverProfile.id);
      }
    }

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`pickup_location.ilike.%${search}%,drop_location.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    sendSuccess(res, data, 'Orders fetched', 200, {
      page: Number(page),
      limit: Number(limit),
      total: count ?? 0,
    });
  } catch {
    sendError(res, 'Failed to fetch orders', 500);
  }
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        driver:drivers(id, name, phone, vehicle:vehicles(plate_number, type)),
        creator:users!created_by(id, name)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      sendError(res, 'Order not found', 404);
      return;
    }
    sendSuccess(res, data, 'Order fetched');
  } catch {
    sendError(res, 'Failed to fetch order', 500);
  }
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const {
      pickup_location, pickup_lat, pickup_lng,
      drop_location, drop_lat, drop_lng,
      distance,
    } = req.body;

    const estimated_time = distance ? calculateEta(distance) : undefined;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        pickup_location, pickup_lat, pickup_lng,
        drop_location, drop_lat, drop_lng,
        distance, estimated_time,
        status: 'created',
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log initial status
    await supabase.from('order_timeline').insert({
      order_id: data.id,
      status: 'created',
      changed_by: req.user!.id,
    });

    sendCreated(res, data, 'Order created');
  } catch {
    sendError(res, 'Failed to create order', 500);
  }
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { pickup_location, drop_location, distance } = req.body;

    const updates: Record<string, unknown> = { pickup_location, drop_location };
    if (distance) {
      updates.distance = distance;
      updates.estimated_time = calculateEta(distance);
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('is_deleted', false)
      .eq('status', 'created') // Only update un-assigned orders
      .select()
      .single();

    if (error || !data) {
      sendError(res, 'Order not found or cannot be updated after assignment', 400);
      return;
    }
    sendSuccess(res, data, 'Order updated');
  } catch {
    sendError(res, 'Failed to update order', 500);
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, note } = req.body as { status: OrderStatus; note?: string };

    // Fetch current order
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, assigned_driver_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!order) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Drivers can only update their own order
    if (req.user?.role === 'driver') {
      const { data: driverProfile } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!driverProfile || order.assigned_driver_id !== driverProfile.id) {
        sendError(res, 'Not authorized to update this order', 403);
        return;
      }

      // Drivers can only set in_transit or completed
      if (!['in_transit', 'completed'].includes(status)) {
        sendError(res, 'Drivers can only set status to in_transit or completed', 400);
        return;
      }
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      created: ['assigned', 'cancelled'],
      assigned: ['in_transit', 'cancelled'],
      in_transit: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[order.status as OrderStatus].includes(status)) {
      sendError(res, `Invalid status transition from ${order.status} to ${status}`, 400);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log timeline
    await supabase.from('order_timeline').insert({
      order_id: id,
      status,
      changed_by: req.user!.id,
      note,
    });

    // Free driver if completed/cancelled
    if (['completed', 'cancelled'].includes(status) && order.assigned_driver_id) {
      await supabase
        .from('drivers')
        .update({ status: 'active' })
        .eq('id', order.assigned_driver_id);
    }

    sendSuccess(res, data, 'Order status updated');
  } catch {
    sendError(res, 'Failed to update order status', 500);
  }
}

export async function assignDriverToOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    // Validate order
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, assigned_driver_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!order) {
      sendError(res, 'Order not found', 404);
      return;
    }
    if (order.status !== 'created') {
      sendError(res, 'Order is already assigned or in progress', 409);
      return;
    }

    // Validate driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, status, vehicle_id')
      .eq('id', driver_id)
      .eq('is_deleted', false)
      .single();

    if (!driver) {
      sendError(res, 'Driver not found', 404);
      return;
    }
    if (driver.status !== 'active') {
      sendError(res, 'Driver is not active', 400);
      return;
    }
    if (!driver.vehicle_id) {
      sendError(res, 'Driver must have a vehicle assigned before taking orders', 400);
      return;
    }

    // Check double assignment
    const { data: activeOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('assigned_driver_id', driver_id)
      .in('status', ['assigned', 'in_transit'])
      .limit(1)
      .single();

    if (activeOrder) {
      sendError(res, 'Driver already has an active order', 409);
      return;
    }

    // Assign
    const { data, error } = await supabase
      .from('orders')
      .update({ assigned_driver_id: driver_id, status: 'assigned' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', driver_id);

    await supabase.from('order_timeline').insert({
      order_id: id,
      status: 'assigned',
      changed_by: req.user!.id,
    });

    sendSuccess(res, data, 'Driver assigned to order');
  } catch {
    sendError(res, 'Failed to assign driver', 500);
  }
}

export async function getOrderTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*, changed_by_user:users!changed_by(id, name, role)')
      .eq('order_id', id)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    sendSuccess(res, data, 'Timeline fetched');
  } catch {
    sendError(res, 'Failed to fetch timeline', 500);
  }
}
