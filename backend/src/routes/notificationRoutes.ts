import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticateUser } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticateUser);

// Explicit routes before parameterized paths
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/', notificationController.listNotifications);

router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
