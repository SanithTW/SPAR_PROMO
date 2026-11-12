import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { RoleType } from '../types/index.js';

const router = Router();

router.use(authenticateUser);

router.get('/', requireRole([RoleType.ADMIN, RoleType.HEAD]), auditController.listAuditLogs);

export default router;
