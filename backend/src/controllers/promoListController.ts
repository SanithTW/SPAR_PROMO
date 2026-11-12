import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, RoleType, PromoStatus, PromoType } from '../types/index.js';
import * as promoService from '../services/promoService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const promoLineInputSchema = z.object({
  productId: z.string().min(1, 'Product is required.'),
  promoPrice: z.number().positive('Promo price must be greater than 0.'),
  dealCost: z.number().min(0, 'Deal cost cannot be negative.').nullable().optional(),
  scanDiscount: z.number().min(0, 'Scan discount cannot be negative.').nullable().optional(),
  fundingMechanism: z.string().optional(),
  rebateAmount: z.number().min(0, 'Rebate amount cannot be negative.').nullable().optional(),
  estimatedVolume: z.number().int().min(0, 'Estimated volume cannot be negative.').nullable().optional(),
  mechanic: z.string().optional(),
  displayType: z.string().optional(),
  featurePosition: z.string().optional(),
  coopSupport: z.number().min(0, 'Co-op support cannot be negative.').nullable().optional(),
  notes: z.string().optional().nullable(),
});

const createPromoSchema = z.object({
  title: z.string().min(3, 'Promo campaign name must be at least 3 characters.'),
  promoType: z.nativeEnum(PromoType).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start date is required.'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid end date is required.'),
  notes: z.string().optional().nullable(),
  departmentId: z.string().optional(),
  lines: z.array(promoLineInputSchema).optional(),
});

const updatePromoSchema = z.object({
  title: z.string().min(3, 'Promo campaign name must be at least 3 characters.').optional(),
  promoType: z.nativeEnum(PromoType).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start date is required.').optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid end date is required.').optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(promoLineInputSchema).optional(),
});

export async function listPromos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as PromoStatus | undefined;
    const departmentId =
      req.user?.role === RoleType.ADMIN || req.user?.role === RoleType.MARKETING
        ? (req.query.departmentId as string) || undefined
        : req.user?.departmentId || undefined;

    const promos = await promoService.getPromoLists({
      status,
      departmentId,
      userId: req.user?.id,
      userRole: req.user?.role,
    });

    return sendSuccess(res, promos);
  } catch (err) {
    next(err);
  }
}

export async function getPromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const promo = await promoService.getPromoById(req.params.id);
    if (!promo) {
      return sendError(res, 'Promo list not found', 404);
    }

    // Role check:
    // If STAFF or HEAD, verify department matches
    if (
      (req.user?.role === RoleType.STAFF || req.user?.role === RoleType.HEAD) &&
      req.user.departmentId &&
      promo.departmentId !== req.user.departmentId
    ) {
      return sendError(res, 'You do not have permission to view promos outside your department', 403);
    }

    // MARKETING can only view APPROVED promos
    if (req.user?.role === RoleType.MARKETING && promo.status !== PromoStatus.APPROVED) {
      return sendError(res, 'Marketing role can only view Approved promotional lists', 403);
    }

    return sendSuccess(res, promo);
  } catch (err) {
    next(err);
  }
}

export async function createPromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Role guard: Only STAFF and ADMIN can create promo lists
    if (req.user.role !== RoleType.STAFF && req.user.role !== RoleType.ADMIN) {
      return sendError(res, 'Only commercial Staff or Administrators can create promotional lists.', 403);
    }

    const parseResult = createPromoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join('; ');
      return sendError(res, `Validation error: ${msg}`, 400);
    }

    const promo = await promoService.createPromoList(parseResult.data, req.user);
    return sendSuccess(res, promo, 'Promo list created successfully.', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create promo list';
    if (message.includes('Unauthorized') || message.includes('outside your department')) {
      return sendError(res, message, 403);
    }
    return sendError(res, message, 400);
  }
}

export async function updatePromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const parseResult = updatePromoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join('; ');
      return sendError(res, `Validation error: ${msg}`, 400);
    }

    const promo = await promoService.updatePromoList(req.params.id, parseResult.data, req.user);
    return sendSuccess(res, promo);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update promo list';
    if (message.includes('Unauthorized') || message.includes('outside your department')) {
      return sendError(res, message, 403);
    }
    if (message.includes('not found')) {
      return sendError(res, message, 404);
    }
    return sendError(res, message, 400);
  }
}

export async function submitPromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const promo = await promoService.submitPromoList(req.params.id, req.user);
    return sendSuccess(res, promo);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit promo list';
    if (message.includes('Unauthorized') || message.includes('outside your department')) {
      return sendError(res, message, 403);
    }
    if (message.includes('not found')) {
      return sendError(res, message, 404);
    }
    return sendError(res, message, 400);
  }
}

export async function deletePromo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    await promoService.deletePromoList(req.params.id, req.user);
    return sendSuccess(res, { message: 'Promo list deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete promo list';
    if (message.includes('Unauthorized') || message.includes('outside your department')) {
      return sendError(res, message, 403);
    }
    if (message.includes('not found')) {
      return sendError(res, message, 404);
    }
    return sendError(res, message, 400);
  }
}
