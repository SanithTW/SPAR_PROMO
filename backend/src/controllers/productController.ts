import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType } from '../types/index.js';
import * as productService from '../services/productService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function searchProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) || (req.query.search as string) || '';
    
    // Scoping: For STAFF, default to their assigned department unless searching catalog
    let departmentId = req.query.departmentId as string | undefined;
    if (req.user?.role === RoleType.STAFF && req.user.departmentId) {
      departmentId = req.user.departmentId;
    }

    const products = await productService.searchProducts(q, departmentId);
    return sendSuccess(res, products);
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let departmentId = req.query.departmentId as string | undefined;
    if (req.user?.role === RoleType.STAFF && req.user.departmentId) {
      departmentId = req.user.departmentId;
    }
    const search = req.query.search as string | undefined;
    const products = await productService.getAllProducts(departmentId, search);
    return sendSuccess(res, products);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
}
