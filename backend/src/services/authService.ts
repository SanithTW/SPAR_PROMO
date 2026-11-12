import { dbStore } from '../data/dbStore.js';
import { comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';

export async function loginUser(email: string, passwordPlain: string) {
  if (!email || !email.trim()) {
    throw new Error('Email is required.');
  }
  if (!passwordPlain || !passwordPlain.trim()) {
    throw new Error('Password is required.');
  }

  const user = await dbStore.findUserByEmail(email.trim());

  // Generic rejection: Do not reveal whether email exists
  if (!user || !user.active) {
    throw new Error('Invalid email or password.');
  }

  const isPasswordValid = await comparePassword(passwordPlain, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  const department = user.departmentId ? await dbStore.findDepartmentById(user.departmentId) : null;

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId || null,
    name: user.name || `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
  };

  const token = generateToken(tokenPayload);

  return {
    token,
    user: {
      id: user.id,
      name: user.name || `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      department,
      active: user.active,
    },
  };
}

export async function getProfile(userId: string) {
  const user = await dbStore.findUserById(userId);

  if (!user || !user.active) {
    throw new Error('User not found or account is deactivated.');
  }

  const department = user.departmentId ? await dbStore.findDepartmentById(user.departmentId) : null;

  return {
    id: user.id,
    name: user.name || `${user.firstName} ${user.lastName}`.trim(),
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
