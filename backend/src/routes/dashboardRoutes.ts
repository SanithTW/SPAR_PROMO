import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

router.get('/summary', dashboardController.getSummary);
router.get('/recent', dashboardController.getRecent);

export default router;
