// src/controllers/usersController.ts
/**
 * Users Controller
 * Admin-only: full CRUD on user accounts
 * Dispatchers: read-only list
 */
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import { UserRole, UserStatus, PaginationQuery } from '../types';

// ─── List Users ────────────────────────────────────────────────────────────────
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, search } = req.query as PaginationQuery;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('users')
      .select('id, name, email, role, status, avatar_url, created_at, updated_at', { count: 'exact' })
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    sendSuccess(res, data, 'Users fetched', 200, {
      page: Number(page),
      limit: Number(limit),
      total: count ?? 0,
    });
  } catch (err) {
    sendError(res, 'Failed to fetch users', 500);
  }
}

// ─── Get Single User ───────────────────────────────────────────────────────────
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, status, avatar_url, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, data, 'User fetched');
  } catch {
    sendError(res, 'Failed to fetch user', 500);
  }
}

// ─── Create User (admin manually creates users) ────────────────────────────────
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, role } = req.body as { name: string; email: string; role: UserRole };

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .insert({ name, email, role, status: 'active' })
      .select('id, name, email, role, status, created_at')
      .single();

    if (error) throw error;

    sendCreated(res, data, 'User created');
  } catch {
    sendError(res, 'Failed to create user', 500);
  }
}

// ─── Update User ───────────────────────────────────────────────────────────────
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body as {
      name?: string;
      role?: UserRole;
      status?: UserStatus;
    };

    // Prevent demoting the last admin
    if (role && role !== 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('status', 'active');

      const currentUser = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();

      if (currentUser.data?.role === 'admin' && (count ?? 0) <= 1) {
        sendError(res, 'Cannot demote the only admin', 400);
        return;
      }
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, status, updated_at')
      .single();

    if (error || !data) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, data, 'User updated');
  } catch {
    sendError(res, 'Failed to update user', 500);
  }
}

// ─── Delete / Suspend User ─────────────────────────────────────────────────────
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (req.user?.id === id) {
      sendError(res, 'Cannot delete your own account', 400);
      return;
    }

    // Prevent deleting last admin
    const { data: target } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('status', 'active');

      if ((count ?? 0) <= 1) {
        sendError(res, 'Cannot delete the only admin', 400);
        return;
      }
    }

    // Soft suspend instead of hard delete — keeps audit trail
    await supabase
      .from('users')
      .update({ status: 'suspended' })
      .eq('id', id);

    // Revoke all refresh tokens
    await supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('user_id', id);

    sendSuccess(res, null, 'User suspended');
  } catch {
    sendError(res, 'Failed to suspend user', 500);
  }
}
