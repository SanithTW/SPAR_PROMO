import { Router } from 'express';
import * as headReviewController from '../controllers/headReviewController.js';
import { reviewByType } from '../controllers/typeReviewController.js';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { RoleType } from '../types/index.js';

const router = Router();

router.use(authenticateUser);
router.use(requireRole([RoleType.HEAD, RoleType.ADMIN]));

router.get('/', headReviewController.listHeadReviews);
// Approve / return the lines of one promotion type across promo lists (other types stay waiting)
router.post('/by-type/review', reviewByType);
router.get('/:id', headReviewController.getHeadReview);
router.post('/:id/approve', headReviewController.approvePromo);
router.post('/:id/reject', headReviewController.rejectPromo);

export default router;
