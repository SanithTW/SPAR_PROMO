import { Router } from 'express';
import { listPromoTypes } from '../controllers/promoTypeController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);
router.get('/', listPromoTypes);

export default router;
