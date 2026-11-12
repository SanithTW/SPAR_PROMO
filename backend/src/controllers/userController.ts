import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType } from '../types/index.js';
import * as userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { dbStore } from '../data/dbStore.js';

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const departmentId = req.query.departmentId as string | undefined;
    const role = req.query.role as RoleType | undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as 'ACTIVE' | 'INACTIVE' | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await userService.getAllUsers({
      departmentId,
      role,
      search,
      status,
      page,
      limit,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, firstName, lastName, email, password, role, departmentId, active } = req.body;

    if (!email || !email.trim()) {
      return sendError(res, 'Email is required.', 400);
    }

    if (!password || password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long.', 400);
    }

    if (!role) {
      return sendError(res, 'Role is required.', 400);
    }

    // Explicitly reject DIRECTOR
    if ((role as string).toUpperCase() === 'DIRECTOR') {
      return sendError(res, "Invalid role 'DIRECTOR'. The Director approval stage and role do not exist.", 400);
    }

    const newUser = await userService.createUser({
      name,
      firstName,
      lastName,
      email,
      passwordPlain: password,
      role,
      departmentId,
      active: active !== undefined ? active : true,
    });

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'User',
        entityId: newUser.id,
        action: 'USER_CREATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} created user ${newUser.email} with role ${newUser.role}`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, newUser, 'User created successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return sendError(res, message, 400);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, firstName, lastName, email, role, departmentId, active } = req.body;

    if (role && (role as string).toUpperCase() === 'DIRECTOR') {
      return sendError(res, "Invalid role 'DIRECTOR'. The Director approval stage and role do not exist.", 400);
    }

    const existingUser = await dbStore.findUserById(id);
    if (!existingUser) {
      return sendError(res, 'User not found.', 404);
    }

    const updated = await userService.updateUser(id, {
      name,
      firstName,
      lastName,
      email,
      role,
      departmentId,
      active,
    });

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'User',
        entityId: id,
        action: 'USER_UPDATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} updated user profile for ${updated.email}`,
        ipAddress: req.ip,
      });

      if (role && role !== existingUser.role) {
        await dbStore.logAudit({
          entityType: 'User',
          entityId: id,
          action: 'ROLE_CHANGED',
          performedById: req.user.id,
          details: `Admin ${req.user.name} changed role from ${existingUser.role} to ${role} for user ${updated.email}`,
          ipAddress: req.ip,
        });
      }

      if (departmentId !== undefined && departmentId !== existingUser.departmentId) {
        await dbStore.logAudit({
          entityType: 'User',
          entityId: id,
          action: 'DEPARTMENT_ASSIGNED',
          performedById: req.user.id,
          details: `Admin ${req.user.name} assigned department ${departmentId} for user ${updated.email}`,
          ipAddress: req.ip,
        });
      }
    }

    return sendSuccess(res, updated, 'User updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    return sendError(res, message, 400);
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return sendError(res, "Status 'active' boolean is required.", 400);
    }

    if (!active && req.user && req.user.id === id) {
      return sendError(res, 'You cannot deactivate your own account.', 400);
    }

    const updated = await userService.setUserStatus(id, active, req.user?.id);

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'User',
        entityId: id,
        action: active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
        performedById: req.user.id,
        details: `Admin ${req.user.name} ${active ? 'activated' : 'deactivated'} user ${updated.email}`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(
      res,
      updated,
      `User ${active ? 'activated' : 'deactivated'} successfully`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user status';
    return sendError(res, message, 400);
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long.', 400);
    }

    const result = await userService.resetUserPassword(id, password);

    if (req.user) {
      await dbStore.logAudit({
        entityType: 'User',
        entityId: id,
        action: 'PASSWORD_RESET',
        performedById: req.user.id,
        details: `Admin ${req.user.name} reset password for user ${id}`,
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, result, 'Password reset successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset password';
    return sendError(res, message, 400);
  }
}
