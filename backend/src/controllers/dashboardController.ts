import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required to access dashboard.', 401);
    }

    const summary = await dashboardService.getDashboardSummary(req.user);
    return sendSuccess(res, summary, 'Dashboard summary retrieved successfully');
  } catch (err) {
    next(err);
  }
}

export async function getRecent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required to access recent promotional lists.', 401);
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const limit = isNaN(limitParam) ? 8 : Math.min(Math.max(limitParam, 1), 50);

    const recent = await dashboardService.getRecentPromos(req.user, limit);
    return sendSuccess(res, recent, 'Recent promo lists retrieved successfully');
  } catch (err) {
    next(err);
  }
}
