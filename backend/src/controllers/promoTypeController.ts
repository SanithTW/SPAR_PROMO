import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { dbStore } from '../data/dbStore.js';
import { sendSuccess } from '../utils/response.js';

export async function listPromoTypes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const promoTypes = await dbStore.findPromoTypes();
    return sendSuccess(res, promoTypes);
  } catch (err) {
    next(err);
  }
}
