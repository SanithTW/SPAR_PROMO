import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as departmentService from '../services/departmentService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { dbStore } from '../data/dbStore.js';

export async function listDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const departments = await departmentService.getAllDepartments();
    return sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
}

export async function getDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    if (!department) {
      return sendError(res, 'Department not found', 404);
    }
    return sendSuccess(res, department);
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { code, name, description, headId } = req.body;

    if (!code || !code.trim()) {
      return sendError(res, 'Department code is required.', 400);
    }

    if (!name || !name.trim()) {
      return sendError(res, 'Department name is required.', 400);
    }

    const created = await departmentService.createDepartment({
      code,
      name,
      description,
      headId,
    });

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'Department',
        entityId: created.id,
        action: 'DEPARTMENT_CREATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} created department ${created.name} (${created.code})`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, created, 'Department created successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create department';
    return sendError(res, message, 400);
  }
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { code, name, description, headId, active } = req.body;

    const updated = await departmentService.updateDepartment(id, {
      code,
      name,
      description,
      headId,
      active,
    });

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'Department',
        entityId: id,
        action: 'DEPARTMENT_UPDATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} updated department ${updated.name}`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, updated, 'Department updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update department';
    return sendError(res, message, 400);
  }
}

export async function updateDepartmentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return sendError(res, "Status 'active' boolean is required.", 400);
    }

    const updated = await departmentService.setDepartmentStatus(id, active);

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'Department',
        entityId: id,
        action: active ? 'DEPARTMENT_REACTIVATED' : 'DEPARTMENT_DEACTIVATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} ${active ? 'activated' : 'deactivated'} department ${updated.name}`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(
      res,
      updated,
      `Department ${active ? 'activated' : 'deactivated'} successfully`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update department status';
    return sendError(res, message, 400);
  }
}
