import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { notificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/notifications
 * Retrieves authenticated user's notifications with pagination, newest first.
 * Never returns notifications belonging to another user.
 */
export async function listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await notificationService.getUserNotifications(req.user.id, { page, limit });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns count of unread notifications for authenticated user.
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const count = await notificationService.getUnreadNotificationCount(req.user.id);
    return sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks single notification as read, enforcing user ownership.
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { id } = req.params;
    const updated = await notificationService.markAsRead(id, req.user.id);

    if (!updated) {
      return sendError(res, 'Notification not found.', 404);
    }

    return sendSuccess(res, updated, 'Notification marked as read.');
  } catch (err: any) {
    if (err.message && err.message.includes('Unauthorized')) {
      return sendError(res, err.message, 403);
    }
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for authenticated user as read.
 */
export async function markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const count = await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, { count }, 'All notifications marked as read.');
  } catch (err) {
    next(err);
  }
}
