import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { RoleType } from '../types/index.js';

const router = Router();

router.use(authenticateUser);

// All user management endpoints require ADMIN role
router.get('/', requireRole(RoleType.ADMIN), userController.listUsers);
router.get('/:id', requireRole(RoleType.ADMIN), userController.getUser);
router.post('/', requireRole(RoleType.ADMIN), userController.createUser);
router.put('/:id', requireRole(RoleType.ADMIN), userController.updateUser);
router.patch('/:id', requireRole(RoleType.ADMIN), userController.updateUser);
router.patch('/:id/status', requireRole(RoleType.ADMIN), userController.updateUserStatus);
router.patch('/:id/password', requireRole(RoleType.ADMIN), userController.resetPassword);

export default router;
