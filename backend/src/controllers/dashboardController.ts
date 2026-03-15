// src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendSuccess, sendError } from '../utils/response';

export async function getSummary(_req: Request, res: Response): Promise<void> {
  try {
    const [driversRes, vehiclesRes, ordersRes] = await Promise.all([
      supabase.from('drivers').select('status', { count: 'exact' }).eq('is_deleted', false),
      supabase.from('vehicles').select('status', { count: 'exact' }).eq('is_deleted', false),
      supabase.from('orders').select('status', { count: 'exact' }).eq('is_deleted', false),
    ]);

    const drivers = driversRes.data ?? [];
    const vehicles = vehiclesRes.data ?? [];
    const orders = ordersRes.data ?? [];

    const summary = {
      drivers: {
        total: drivers.length,
        active: drivers.filter(d => d.status === 'active').length,
        on_trip: drivers.filter(d => d.status === 'on_trip').length,
        inactive: drivers.filter(d => d.status === 'inactive').length,
      },
      vehicles: {
        total: vehicles.length,
        available: vehicles.filter(v => v.status === 'available').length,
        in_use: vehicles.filter(v => v.status === 'in_use').length,
        maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      },
      orders: {
        total: orders.length,
        created: orders.filter(o => o.status === 'created').length,
        assigned: orders.filter(o => o.status === 'assigned').length,
        in_transit: orders.filter(o => o.status === 'in_transit').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      },
    };

    sendSuccess(res, summary, 'Summary fetched');
  } catch {
    sendError(res, 'Failed to fetch summary', 500);
  }
}

export async function getDriverUtilization(_req: Request, res: Response): Promise<void> {
  try {
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, name, status')
      .eq('is_deleted', false);

    if (!drivers) {
      sendSuccess(res, [], 'No drivers found');
      return;
    }

    const driverIds = drivers.map(d => d.id);

    // Count completed orders per driver in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('assigned_driver_id')
      .in('assigned_driver_id', driverIds)
      .eq('status', 'completed')
      .gte('updated_at', since);

    const countMap: Record<string, number> = {};
    (completedOrders ?? []).forEach(o => {
      if (o.assigned_driver_id) {
        countMap[o.assigned_driver_id] = (countMap[o.assigned_driver_id] ?? 0) + 1;
      }
    });

    const utilization = drivers.map(d => ({
      driver_id: d.id,
      name: d.name,
      current_status: d.status,
      completed_orders_30d: countMap[d.id] ?? 0,
    }));

    sendSuccess(res, utilization, 'Driver utilization fetched');
  } catch {
    sendError(res, 'Failed to fetch driver utilization', 500);
  }
}

export async function getOrderMetrics(_req: Request, res: Response): Promise<void> {
  try {
    // Last 7 days
    const days: { date: string; created: number; completed: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const start = `${dateStr}T00:00:00.000Z`;
      const end = `${dateStr}T23:59:59.999Z`;

      const [createdRes, completedRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact' })
          .gte('created_at', start).lte('created_at', end),
        supabase.from('orders').select('id', { count: 'exact' })
          .eq('status', 'completed')
          .gte('updated_at', start).lte('updated_at', end),
      ]);

      days.push({
        date: dateStr,
        created: createdRes.count ?? 0,
        completed: completedRes.count ?? 0,
      });
    }

    // Average estimated time for completed orders
    const { data: completedWithTime } = await supabase
      .from('orders')
      .select('estimated_time')
      .eq('status', 'completed')
      .not('estimated_time', 'is', null)
      .limit(100);

    const avgTime = completedWithTime?.length
      ? Math.round(
          completedWithTime.reduce((sum, o) => sum + (o.estimated_time ?? 0), 0) /
          completedWithTime.length
        )
      : 0;

    sendSuccess(res, { daily_metrics: days, avg_delivery_time_min: avgTime }, 'Order metrics fetched');
  } catch {
    sendError(res, 'Failed to fetch order metrics', 500);
  }
}
