// src/controllers/authController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashToken,
  compareToken,
  buildJwtPayload,
} from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Called after Google OAuth success
export async function googleCallback(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.redirect(`${config.frontend.url}/auth/error`);
      return;
    }

    const jwtPayload = buildJwtPayload(user.id, user.email, user.role);
    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Store hashed refresh token
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    res.redirect(`${config.frontend.url}/auth/callback?token=${accessToken}`);
  } catch (err) {
    logger.error('Google callback error', { error: err });
    res.redirect(`${config.frontend.url}/auth/error`);
  }
}

export async function refreshAccessToken(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (!refreshToken) {
      sendError(res, 'No refresh token', 401);
      return;
    }

    const payload = verifyToken(refreshToken);

    // Find valid stored token
    const { data: tokens } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('user_id', payload.sub)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString());

    if (!tokens?.length) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    // Validate hash
    let validToken = null;
    for (const t of tokens) {
      const match = await compareToken(refreshToken, t.token_hash);
      if (match) { validToken = t; break; }
    }

    if (!validToken) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    // Fetch user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .eq('status', 'active')
      .single();

    if (!user) {
      sendError(res, 'User not found', 401);
      return;
    }

    // Rotate tokens
    await supabase.from('refresh_tokens').update({ revoked: true }).eq('id', validToken.id);

    const jwtPayload = buildJwtPayload(user.id, user.email, user.role);
    const newAccessToken = signAccessToken(jwtPayload);
    const newRefreshToken = signRefreshToken(jwtPayload);
    const newHash = await hashToken(newRefreshToken);

    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: newHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS);
    sendSuccess(res, { access_token: newAccessToken }, 'Token refreshed');
  } catch (err) {
    logger.error('Refresh token error', { error: err });
    sendError(res, 'Invalid or expired refresh token', 401);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (refreshToken && req.user) {
      await supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('user_id', req.user.id);
    }
    res.clearCookie(REFRESH_COOKIE);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    logger.error('Logout error', { error: err });
    sendError(res, 'Logout failed', 500);
  }
}

export function getMe(req: Request, res: Response): void {
  sendSuccess(res, req.user, 'Current user');
}
