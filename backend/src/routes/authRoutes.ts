import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticateUser, authController.getMe);
router.get('/session', authenticateUser, authController.getMe); // backward compatibility
router.post('/logout', authenticateUser, authController.logout);

export default router;
