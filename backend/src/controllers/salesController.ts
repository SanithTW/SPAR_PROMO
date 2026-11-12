import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { salesService } from '../integrations/sales/sales.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getProductSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    if (!code) {
      return sendError(res, 'Product code is required.', 400);
    }

    const summary = await salesService.getProductSalesSummary(code);
    if (!summary) {
      return sendSuccess(res, null, 'No sales records found for this product.');
    }

    return sendSuccess(res, summary, 'Product sales performance retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

export async function listSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { product_code, date_from, date_to, location_code, limit, offset } = req.query;

    const result = await salesService.querySales({
      product_code: product_code as string | undefined,
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      location_code: location_code as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return sendSuccess(res, result, 'Sales lines retrieved successfully.');
  } catch (err) {
    next(err);
  }
}
