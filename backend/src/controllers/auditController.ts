import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as auditService from '../services/auditService.js';
import { sendSuccess } from '../utils/response.js';

export async function listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = await auditService.getAuditLogs(limit);
    return sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
}
