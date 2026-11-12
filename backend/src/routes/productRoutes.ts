import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

router.get('/search', productController.searchProducts);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

export default router;
