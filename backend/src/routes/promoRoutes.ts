import { Router } from 'express';
import * as promoListController from '../controllers/promoListController.js';
import * as headReviewController from '../controllers/headReviewController.js';
import * as exportController from '../controllers/exportController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

// Direct fill without persisting ID
router.post('/fill-special-excel', exportController.fillSpecialPromoExcelDirect);

router.get('/', promoListController.listPromos);
router.get('/:id', promoListController.getPromo);
router.post('/', promoListController.createPromo);
router.put('/:id', promoListController.updatePromo);
router.delete('/:id', promoListController.deletePromo);
router.post('/:id/submit', promoListController.submitPromo);

// Export endpoints
router.get('/:id/export/excel', exportController.exportPromoExcel);
router.get('/:id/export/special-excel', exportController.exportSpecialPromoExcel);
router.get('/:id/export/pdf', exportController.exportPromoPdf);

// Direct promo-list approval endpoints (Phase 5 requirement)
router.post('/:id/approve', headReviewController.approvePromo);
router.post('/:id/reject', headReviewController.rejectPromo);

export default router;
