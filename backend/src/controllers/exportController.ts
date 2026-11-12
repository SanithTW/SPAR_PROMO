import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType, PromoStatus } from '../types/index.js';
import * as promoService from '../services/promoService.js';
import { exportService } from '../services/exportService.js';
import { sendError } from '../utils/response.js';

/**
 * Validates user permissions against a specific promo to prevent IDOR vulnerabilities.
 */
function validateExportPermission(req: AuthenticatedRequest, promo: any): { allowed: boolean; reason?: string; status?: number } {
  if (!req.user) {
    return { allowed: false, reason: 'Authentication required to export promotional data.', status: 401 };
  }

  // ADMIN can export any promo
  if (req.user.role === RoleType.ADMIN) {
    return { allowed: true };
  }

  // MARKETING can only export APPROVED promos
  if (req.user.role === RoleType.MARKETING) {
    if (promo.status !== PromoStatus.APPROVED) {
      return { allowed: false, reason: 'Marketing role can only export approved promotions.', status: 403 };
    }
    return { allowed: true };
  }

  // STAFF and HEAD can only export promos from their own department
  if (req.user.departmentId && promo.departmentId !== req.user.departmentId) {
    return {
      allowed: false,
      reason: 'Unauthorized: You cannot export promotions from another department.',
      status: 403,
    };
  }

  // STAFF can only export their own draft/submitted promos, or approved promos
  if (req.user.role === RoleType.STAFF) {
    if (promo.status !== PromoStatus.APPROVED && promo.createdById !== req.user.id) {
      return {
        allowed: false,
        reason: 'Unauthorized: You can only export your own drafts or approved promotions.',
        status: 403,
      };
    }
  }

  return { allowed: true };
}

export async function exportPromoExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const promo = await promoService.getPromoById(req.params.id);
    if (!promo) {
      return sendError(res, 'Promotion not found.', 404);
    }

    const authCheck = validateExportPermission(req, promo);
    if (!authCheck.allowed) {
      return sendError(res, authCheck.reason || 'Forbidden', authCheck.status || 403);
    }

    const excelBuffer = await exportService.generateExcel(promo);

    const safeFilename = `${promo.promoCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.status(200).send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

export async function exportPromoPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const promo = await promoService.getPromoById(req.params.id);
    if (!promo) {
      return sendError(res, 'Promotion not found.', 404);
    }

    const authCheck = validateExportPermission(req, promo);
    if (!authCheck.allowed) {
      return sendError(res, authCheck.reason || 'Forbidden', authCheck.status || 403);
    }

    const pdfBuffer = await exportService.generatePdf(promo);

    const safeFilename = `${promo.promoCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Export specific promotional list into the official 51-column Special Promo Excel spreadsheet.
 */
export async function exportSpecialPromoExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const promo = await promoService.getPromoById(req.params.id);
    if (!promo) {
      return sendError(res, 'Promotion not found.', 404);
    }

    const authCheck = validateExportPermission(req, promo);
    if (!authCheck.allowed) {
      return sendError(res, authCheck.reason || 'Forbidden', authCheck.status || 403);
    }

    const excelBuffer = await exportService.fillSpecialPromoExcel(promo);

    const safeFilename = `Special_Promo_${promo.promoCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.status(200).send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Direct endpoint to fill the official Special Promo Excel file from live promotional lines
 * and download the populated workbook immediately.
 */
export async function fillSpecialPromoExcelDirect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { lines, promoType, fromDate, toDate, title } = req.body || {};
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return sendError(res, 'At least one promotional line is required to fill Special Promo Excel.', 400);
    }

    const excelBuffer = await exportService.fillSpecialPromoExcel({
      lines,
      promoType: promoType || 'Special Promo',
      startDate: fromDate || '2026-10-01',
      endDate: toDate || '2026-10-30',
      title: title || 'Special Promo',
    });

    const safeFilename = `Special_Promo_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.status(200).send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

