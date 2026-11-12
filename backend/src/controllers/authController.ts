import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../types/index.js';
import { dbStore } from '../data/dbStore.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return sendError(res, 'Email is required.', 400);
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return sendError(res, 'Password is required.', 400);
    }

    const result = await authService.loginUser(email, password);

    // Audit login
    await dbStore.logAudit({
      entityType: 'Auth',
      entityId: result.user.id,
      action: 'USER_LOGIN',
      performedById: result.user.id,
      details: `User ${result.user.email} (${result.user.role}) logged in successfully`,
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, 'Login successful');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid email or password.';
    return sendError(res, message, 401);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const profile = await authService.getProfile(req.user.id);
    return sendSuccess(res, profile, 'Authenticated user profile');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    await dbStore.logAudit({
      entityType: 'Auth',
      entityId: req.user.id,
      action: 'USER_LOGOUT',
      performedById: req.user.id,
      details: `User ${req.user.email} logged out`,
      ipAddress: req.ip,
    });
  }
  return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
}
