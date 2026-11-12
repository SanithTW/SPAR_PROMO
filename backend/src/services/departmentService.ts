import { dbStore } from '../data/dbStore.js';

export async function getAllDepartments() {
  const departments = await dbStore.findDepartments();
  const users = await dbStore.findUsers();

  return departments.map((d) => {
    const headUser = d.headId ? users.find((u) => u.id === d.headId) || null : null;
    const memberCount = users.filter((u) => u.departmentId === d.id && u.active).length;

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      active: d.active,
      headId: d.headId,
      head: headUser
        ? {
            id: headUser.id,
            name: headUser.name,
            email: headUser.email,
            role: headUser.role,
          }
        : null,
      memberCount,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  });
}

export async function getDepartmentById(id: string) {
  const department = await dbStore.findDepartmentById(id);
  if (!department) return null;

  const users = await dbStore.findUsers(id);
  const headUser = department.headId ? await dbStore.findUserById(department.headId) : null;

  return {
    ...department,
    head: headUser
      ? {
          id: headUser.id,
          name: headUser.name,
          email: headUser.email,
          role: headUser.role,
        }
      : null,
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
    })),
  };
}

export async function createDepartment(data: {
  code: string;
  name: string;
  description?: string;
  headId?: string | null;
}) {
  return dbStore.createDepartment(data);
}

export async function updateDepartment(
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string;
    headId?: string | null;
    active?: boolean;
  }
) {
  return dbStore.updateDepartment(id, data);
}

export async function setDepartmentStatus(id: string, active: boolean) {
  return dbStore.setDepartmentActive(id, active);
}
