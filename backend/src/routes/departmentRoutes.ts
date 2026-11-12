import { Router } from 'express';
import * as departmentController from '../controllers/departmentController.js';
import { authenticateUser } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { RoleType } from '../types/index.js';

const router = Router();

router.use(authenticateUser);

router.get('/', departmentController.listDepartments);
router.get('/:id', departmentController.getDepartment);

// Admin-only department modifications
router.post('/', requireRole(RoleType.ADMIN), departmentController.createDepartment);
router.put('/:id', requireRole(RoleType.ADMIN), departmentController.updateDepartment);
router.patch('/:id', requireRole(RoleType.ADMIN), departmentController.updateDepartment);
router.patch('/:id/status', requireRole(RoleType.ADMIN), departmentController.updateDepartmentStatus);

export default router;
