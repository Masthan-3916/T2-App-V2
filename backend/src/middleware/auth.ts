// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { supabase } from '../config/supabase';
import { sendError } from '../utils/response';
import { UserRole } from '../types';
import logger from '../utils/logger';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'No authorization token provided', 401);
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    // Fetch fresh user from DB to ensure not suspended/deleted
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .eq('status', 'active')
      .single();

    if (error || !user) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('Auth middleware error', { error: err });
    sendError(res, 'Invalid or expired token', 401);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, `Access denied. Required roles: ${roles.join(', ')}`, 403);
      return;
    }
    next();
  };
}

// Request ID middleware for observability
export function requestId(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  next();
}
