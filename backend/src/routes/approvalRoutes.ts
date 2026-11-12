import { Router } from 'express';
import * as approvalController from '../controllers/approvalController.js';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { RoleType } from '../types/index.js';

const router = Router();

router.use(authenticateUser);

/**
 * Head Approval / Rejection routes.
 * Head is the FINAL APPROVER.
 * No Director approval routes exist.
 */
router.post(
  '/:id/approve',
  requireRole([RoleType.HEAD, RoleType.ADMIN]),
  approvalController.approvePromo
);

router.post(
  '/:id/reject',
  requireRole([RoleType.HEAD, RoleType.ADMIN]),
  approvalController.rejectPromo
);

export default router;
