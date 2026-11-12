import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as approvedPromoService from '../services/approvedPromoService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function listApprovedPromos(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required to access approved promos.', 401);
    }

    const { search, departmentId, promoType, startDate, endDate, page, pageSize } = req.query;

    const result = await approvedPromoService.getApprovedPromos(req.user, {
      search: search as string | undefined,
      departmentId: departmentId as string | undefined,
      promoType: promoType as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Approved promotional lists retrieved successfully.',
      data: {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve approved promo lists.';
    if (msg.includes('Unauthorized') || msg.includes('outside your department')) {
      return sendError(res, msg, 403);
    }
    next(err);
  }
}

export async function getApprovedPromo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required to access approved promos.', 401);
    }

    const promo = await approvedPromoService.getApprovedPromoById(req.user, req.params.id);
    return sendSuccess(res, promo, 'Approved promotional list retrieved successfully.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve approved promo list.';
    if (msg.includes('Unauthorized') || msg.includes('outside your department')) {
      return sendError(res, msg, 403);
    }
    if (msg.includes('not found') || msg.includes('not approved')) {
      return sendError(res, msg, 404);
    }
    return sendError(res, msg, 400);
  }
}

export function rejectModification(
  _req: AuthenticatedRequest,
  res: Response
) {
  return sendError(
    res,
    'Approved promotional lists are permanently locked and read-only. No modifications or deletions are permitted.',
    403
  );
}
