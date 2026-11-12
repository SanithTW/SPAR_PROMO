import { dbStore } from '../data/dbStore.js';
import { UserTokenPayload } from '../types/index.js';

export async function getDashboardSummary(user: UserTokenPayload) {
  return dbStore.getDashboardSummary({
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  });
}

export async function getRecentPromos(user: UserTokenPayload, limit = 8) {
  return dbStore.getRecentPromos(
    {
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
    },
    limit
  );
}
