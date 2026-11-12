import { dbStore } from '../data/dbStore.js';

export async function logAuditEvent(params: {
  entityType: string;
  entityId?: string;
  action: string;
  performedById?: string;
  details?: string;
  ipAddress?: string;
}) {
  return dbStore.logAudit(params);
}

export async function getAuditLogs(limit = 100) {
  const rawLogs = await dbStore.getAuditLogs(limit);
  const users = await dbStore.findUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rawLogs.map((l) => {
    const performer = l.performedById ? userMap.get(l.performedById) || null : null;
    return {
      ...l,
      performer: performer
        ? {
            id: performer.id,
            name: performer.name,
            firstName: performer.firstName,
            lastName: performer.lastName,
            email: performer.email,
            role: performer.role,
          }
        : null,
    };
  });
}
