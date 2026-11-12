import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PromoStatus, RoleType } from '../types/index.js';
import { workflowService } from '../services/workflowService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function listHeadReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can access Head Review.', 403);
    }

    const status = req.query.status as PromoStatus | undefined;
    const search = req.query.search as string | undefined;

    const items = await workflowService.getHeadReviewList(req.user, { status, search });
    return sendSuccess(res, items);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve Head Review list.';
    if (msg.includes('Unauthorized') || msg.includes('cannot access')) {
      return sendError(res, msg, 403);
    }
    next(err);
  }
}

export async function getHeadReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can access Head Review.', 403);
    }

    const promo = await workflowService.getHeadReviewDetail(req.user, req.params.id);
    return sendSuccess(res, promo);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve promo review detail.';
    if (msg.includes('Unauthorized') || msg.includes('belonging to another department')) {
      return sendError(res, msg, 403);
    }
    if (msg.includes('not found')) {
      return sendError(res, msg, 404);
    }
    next(err);
  }
}

export async function approvePromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can approve promotional lists.', 403);
    }

    const { comments } = req.body || {};
    const updated = await workflowService.approveByHead(req.user, req.params.id, comments);
    return sendSuccess(res, updated, 'Promo list approved successfully. Final approval complete; available for Marketing.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Head approval failed.';
    if (msg.includes('Unauthorized') || msg.includes('assigned department')) {
      return sendError(res, msg, 403);
    }
    if (msg.includes('not found')) {
      return sendError(res, msg, 404);
    }
    return sendError(res, msg, 400);
  }
}

export async function rejectPromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can reject promotional lists.', 403);
    }

    const { comments } = req.body || {};
    if (!comments || typeof comments !== 'string' || comments.trim().length === 0) {
      return sendError(res, 'A rejection reason/comment is required when rejecting a promotional submission.', 400);
    }

    const updated = await workflowService.rejectByHead(req.user, req.params.id, comments);
    return sendSuccess(res, updated, 'Promo list rejected and returned to Staff for correction.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Head rejection failed.';
    if (msg.includes('Unauthorized') || msg.includes('assigned department')) {
      return sendError(res, msg, 403);
    }
    if (msg.includes('not found')) {
      return sendError(res, msg, 404);
    }
    return sendError(res, msg, 400);
  }
}
