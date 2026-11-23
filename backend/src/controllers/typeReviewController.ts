import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { reviewLinesOfType, TypeReviewDecision } from '../services/typeReviewService.js';

/** Parse { lineId: comment } (strings up to 1000 chars). Returns null when malformed. */
function parseLineComments(raw: unknown): Record<string, string> | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string' || v.length > 1000) return null;
    out[k] = v;
  }
  return out;
}

/**
 * POST /api/head-review/by-type/review
 * Body: { type: string, comments?: string, decisions: [{ promoId, approvedLineIds: string[], lineComments?: {} }] }
 * Approves / returns the lines of one promotion type; lines of other types stay waiting.
 */
export async function reviewByType(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  const { type, comments, decisions } = req.body || {};
  if (typeof type !== 'string' || !type.trim() || type.length > 100) {
    return sendError(res, 'type must be the promotion type name.', 400);
  }
  if (!Array.isArray(decisions) || decisions.length === 0 || decisions.length > 200) {
    return sendError(res, 'decisions must be a non-empty array.', 400);
  }

  const parsed: TypeReviewDecision[] = [];
  for (const d of decisions) {
    if (
      !d ||
      typeof d.promoId !== 'string' ||
      !Array.isArray(d.approvedLineIds) ||
      !d.approvedLineIds.every((x: unknown) => typeof x === 'string')
    ) {
      return sendError(res, 'Each decision needs promoId and approvedLineIds (array of line ids).', 400);
    }
    const lineComments = parseLineComments(d.lineComments);
    if (lineComments === null) return sendError(res, 'lineComments must be an object of { lineId: comment }.', 400);
    parsed.push({ promoId: d.promoId, approvedLineIds: d.approvedLineIds, lineComments });
  }

  try {
    const results = await reviewLinesOfType(
      req.user,
      type.trim(),
      parsed,
      typeof comments === 'string' ? comments : undefined
    );
    const approved = results.reduce((s, r) => s + r.approvedCount, 0);
    const returned = results.reduce((s, r) => s + r.returnedCount, 0);
    return sendSuccess(
      res,
      results,
      `${type}: approved ${approved} line(s)${returned ? `, returned ${returned} line(s) to Staff` : ''}.`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Review by promotion type failed.';
    if (msg.includes('Unauthorized')) return sendError(res, msg, 403);
    if (msg.includes('not found')) return sendError(res, msg, 404);
    return sendError(res, msg, 400);
  }
}
