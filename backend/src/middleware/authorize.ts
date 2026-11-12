import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType } from '../types/index.js';
import { sendError } from '../utils/response.js';

type RoleArgument = RoleType | RoleType[];

/**
 * Restricts endpoint access to users having one of the specified roles.
 * Supports both requireRole('ADMIN') and requireRole('STAFF', 'HEAD') or array.
 * Strictly forbids DIRECTOR (which does not exist in RoleType).
 */
export function requireRole(...roles: RoleArgument[]) {
  const flattenedRoles: RoleType[] = roles.flat();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required. User context not found.', 401);
    }

    if (!flattenedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required roles: ${flattenedRoles.join(', ')}`,
        403
      );
    }

    return next();
  };
}

/**
 * Ensures user has access to a specific department.
 * - ADMIN, MARKETING, and MASTER_DATA can access across departments.
 * - STAFF and HEAD can ONLY access resources belonging to their assigned department.
 */
export function requireDepartmentAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 'Authentication required. User context not found.', 401);
  }

  // Cross-department roles
  if (
    req.user.role === RoleType.ADMIN ||
    req.user.role === RoleType.MARKETING ||
    req.user.role === RoleType.MASTER_DATA
  ) {
    return next();
  }

  // Determine requested department ID from params, body, or query
  const targetDepartmentId =
    req.params.departmentId ||
    req.body?.departmentId ||
    (req.query.departmentId as string | undefined);

  // If a specific department is being requested, verify it matches the user's department
  if (targetDepartmentId) {
    if (!req.user.departmentId || req.user.departmentId !== targetDepartmentId) {
      return sendError(
        res,
        'Forbidden: You do not have permission to access promotional data outside your assigned department.',
        403
      );
    }
  }

  return next();
}
