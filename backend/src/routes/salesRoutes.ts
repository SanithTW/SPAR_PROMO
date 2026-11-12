import { Router } from 'express';
import * as salesController from '../controllers/salesController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

router.get('/product/:code', salesController.getProductSales);
router.get('/lines', salesController.listSales);
router.get('/', salesController.listSales);

export default router;
