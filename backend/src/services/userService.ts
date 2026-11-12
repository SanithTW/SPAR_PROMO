import { dbStore } from '../data/dbStore.js';
import { RoleType } from '@prisma/client';

export interface UserFilterOptions {
  departmentId?: string;
  role?: RoleType;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  limit?: number;
}

export async function getAllUsers(filters?: string | UserFilterOptions) {
  let filterOptions: UserFilterOptions = {};
  if (typeof filters === 'string') {
    filterOptions = { departmentId: filters };
  } else if (filters) {
    filterOptions = filters;
  }

  let users = await dbStore.findUsers();

  if (filterOptions.departmentId) {
    users = users.filter((u) => u.departmentId === filterOptions.departmentId);
  }
  if (filterOptions.role) {
    users = users.filter((u) => u.role === filterOptions.role);
  }
  if (filterOptions.status) {
    const isActive = filterOptions.status === 'ACTIVE';
    users = users.filter((u) => u.active === isActive);
  }
  if (filterOptions.search && filterOptions.search.trim()) {
    const q = filterOptions.search.trim().toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)
    );
  }

  const departments = await dbStore.findDepartments();
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  const mappedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId,
    department: u.departmentId ? deptMap.get(u.departmentId) || null : null,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  if (filterOptions.page !== undefined || filterOptions.limit !== undefined) {
    const page = Math.max(1, filterOptions.page || 1);
    const limit = Math.max(1, filterOptions.limit || 20);
    const total = mappedUsers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paged = mappedUsers.slice(startIndex, startIndex + limit);

    return {
      users: paged,
      total,
      page,
      limit,
      totalPages,
    };
  }

  return mappedUsers;
}

export async function getUserById(id: string) {
  const user = await dbStore.findUserById(id);
  if (!user) return null;

  const department = user.departmentId ? await dbStore.findDepartmentById(user.departmentId) : null;

  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    department,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(data: {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  passwordPlain: string;
  role: RoleType;
  departmentId?: string | null;
  active?: boolean;
}) {
  let firstName = data.firstName;
  let lastName = data.lastName;

  if (!firstName || !lastName) {
    if (data.name) {
      const parts = data.name.trim().split(' ');
      firstName = parts[0] || 'User';
      lastName = parts.slice(1).join(' ') || 'Staff';
    } else {
      firstName = 'SPAR';
      lastName = 'User';
    }
  }

  const created = await dbStore.createUser({
    name: data.name || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: data.email,
    passwordPlain: data.passwordPlain,
    role: data.role,
    departmentId: data.departmentId,
    active: data.active,
  });

  const department = created.departmentId ? await dbStore.findDepartmentById(created.departmentId) : null;

  return {
    id: created.id,
    name: created.name,
    firstName: created.firstName,
    lastName: created.lastName,
    email: created.email,
    role: created.role,
    departmentId: created.departmentId,
    department,
    active: created.active,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: RoleType;
    departmentId?: string | null;
    active?: boolean;
  }
) {
  let firstName = data.firstName;
  let lastName = data.lastName;

  if (data.name && (!firstName || !lastName)) {
    const parts = data.name.trim().split(' ');
    firstName = parts[0];
    lastName = parts.slice(1).join(' ') || 'Staff';
  }

  const updated = await dbStore.updateUser(id, {
    ...data,
    firstName,
    lastName,
  });

  const department = updated.departmentId ? await dbStore.findDepartmentById(updated.departmentId) : null;

  return {
    id: updated.id,
    name: updated.name,
    firstName: updated.firstName,
    lastName: updated.lastName,
    email: updated.email,
    role: updated.role,
    departmentId: updated.departmentId,
    department,
    active: updated.active,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function setUserStatus(id: string, active: boolean, requestingUserId?: string) {
  const updated = await dbStore.setUserActive(id, active, requestingUserId);
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    active: updated.active,
    updatedAt: updated.updatedAt,
  };
}

export async function resetUserPassword(id: string, passwordPlain: string) {
  if (!passwordPlain || passwordPlain.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  await dbStore.setUserPassword(id, passwordPlain);
  return { success: true, message: 'Password reset successfully.' };
}
