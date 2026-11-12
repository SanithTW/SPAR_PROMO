import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { dbStore } from '../data/dbStore.js';

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required. Missing or malformed Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1 & 2 & 3: Validate token & decode user identity
    const decoded = verifyToken(token);

    // 4 & 5: Verify user still exists in database and is active
    const user = await dbStore.findUserById(decoded.id);
    if (!user) {
      return sendError(res, 'Authentication failed: User no longer exists.', 401);
    }

    if (!user.active) {
      return sendError(res, 'Authentication failed: User account has been deactivated.', 401);
    }

    // 6: Attach verified and up-to-date user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || null,
      name: user.name || `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return next();
  } catch {
    return sendError(res, 'Invalid or expired authentication session. Please log in again.', 401);
  }
}
