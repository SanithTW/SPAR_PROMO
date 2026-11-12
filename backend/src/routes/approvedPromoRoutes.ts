import { Router } from 'express';
import * as approvedPromoController from '../controllers/approvedPromoController.js';
import * as exportController from '../controllers/exportController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

router.get('/', approvedPromoController.listApprovedPromos);
router.get('/:id', approvedPromoController.getApprovedPromo);

// Export endpoints
router.get('/:id/export/excel', exportController.exportPromoExcel);
router.get('/:id/export/pdf', exportController.exportPromoPdf);

// Explicitly lock down any modification attempts on approved promos
router.post('/', approvedPromoController.rejectModification);
router.put('/:id', approvedPromoController.rejectModification);
router.patch('/:id', approvedPromoController.rejectModification);
router.delete('/:id', approvedPromoController.rejectModification);

export default router;
