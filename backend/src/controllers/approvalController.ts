import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType } from '../types/index.js';
import { workflowService } from '../services/workflowService.js';
import { sendSuccess, sendError } from '../utils/response.js';

/** Validates an optional { lineId: comment } map. Returns null when malformed. */
function parseLineComments(raw: unknown): Record<string, string> | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string') return null;
    if (v.length > 1000) return null;
    out[k] = v;
  }
  return out;
}

/**
 * Head reviews and approves a promo list.
 * HEAD IS THE FINAL APPROVER. NO DIRECTOR APPROVAL STAGE EXISTS.
 */
export async function approvePromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { comments, approvedLineIds, lineComments } = req.body || {};

    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can approve promotional lists.', 403);
    }

    // Line-level review: approve only the selected lines.
    if (approvedLineIds !== undefined) {
      if (!Array.isArray(approvedLineIds) || !approvedLineIds.every((x) => typeof x === 'string')) {
        return sendError(res, 'approvedLineIds must be an array of line ids.', 400);
      }
      const parsedComments = parseLineComments(lineComments);
      if (parsedComments === null) {
        return sendError(res, 'lineComments must be an object of { lineId: comment }.', 400);
      }
      const { approved, returned } = await workflowService.reviewLinesByHead(req.user, id, {
        approvedLineIds,
        lineComments: parsedComments,
        comments: typeof comments === 'string' ? comments : undefined,
      });
      return sendSuccess(
        res,
        { ...approved, returnedPromo: returned },
        returned
          ? `Approved ${approved.promoLines?.length ?? 0} line(s). ${returned.promoLines?.length ?? 0} line(s) returned to Staff as ${returned.promoCode}.`
          : 'Promo approved successfully by Department Head. Now available for Marketing.'
      );
    }

    const updated = await workflowService.approveByHead(req.user, id, comments);
    return sendSuccess(res, updated, 'Promo approved successfully by Department Head. Now available for Marketing.');
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

/**
 * Head rejects a promo list with mandatory comments.
 */
export async function rejectPromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { comments, lineComments } = req.body || {};

    const parsedComments = parseLineComments(lineComments);
    if (parsedComments === null) {
      return sendError(res, 'lineComments must be an object of { lineId: comment }.', 400);
    }
    const hasOverall = typeof comments === 'string' && comments.trim().length > 0;
    const hasLineComment = Object.values(parsedComments).some((c) => c.trim().length > 0);
    if (!hasOverall && !hasLineComment) {
      return sendError(res, 'A rejection reason/comment is required when rejecting a promotional submission.', 400);
    }

    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (req.user.role !== RoleType.HEAD && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only Department Heads and Administrators can reject promotional lists.', 403);
    }

    const updated = await workflowService.rejectByHead(req.user, id, hasOverall ? comments : '', parsedComments);
    return sendSuccess(res, updated, 'Promo rejected and returned to Staff for correction.');
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
