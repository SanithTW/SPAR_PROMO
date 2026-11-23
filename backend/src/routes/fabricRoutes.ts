import { Router, Response, NextFunction } from 'express';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/index.js';
import { sendSuccess } from '../utils/response.js';
import { fabricClient } from '../integrations/fabric/fabric.client.js';

/**
 * Microsoft Fabric explorer: lets Admin / Master Data see which tables Fabric
 * exposes so we can decide what to pull into the promo screens.
 * Read-only; no free-text SQL is accepted.
 */
const router = Router();

router.use(authenticateUser);
router.use(requireRole('ADMIN', 'MASTER_DATA'));

router.get('/status', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await fabricClient.checkHealth());
  } catch (err) {
    next(err);
  }
});

router.get('/tables', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await fabricClient.listTables());
  } catch (err) {
    next(err);
  }
});

router.get('/tables/:schema/:table/columns', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await fabricClient.listColumns(req.params.schema, req.params.table));
  } catch (err) {
    next(err);
  }
});

router.get('/tables/:schema/:table/preview', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    return sendSuccess(res, await fabricClient.previewTable(req.params.schema, req.params.table, limit));
  } catch (err) {
    next(err);
  }
});

export default router;
