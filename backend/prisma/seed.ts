import { PrismaClient, RoleType, PromoStatus, PromoType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SPAR Promo database seeding...');

  const devPassword = process.env.DEV_SEED_PASSWORD || 'Password123!';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const defaultPasswordHash = await bcrypt.hash(devPassword, saltRounds);

  // 1. Seed Roles (NO DIRECTOR)
  const roles: { name: RoleType; description: string }[] = [
    { name: RoleType.ADMIN, description: 'System Administrator with full access to manage users and departments' },
    { name: RoleType.HEAD, description: 'Department Head - Final promotional approval authority (One Head per department)' },
    { name: RoleType.STAFF, description: 'Commercial Staff - Creates and submits promotional lists for their department' },
    { name: RoleType.MARKETING, description: 'Marketing Specialist - Accesses and exports approved promotional campaigns' },
    { name: RoleType.MASTER_DATA, description: 'Master Data Specialist - Manages SKU catalogs and promotional master data' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
  }
  console.log('✅ Roles seeded (Director role strictly omitted).');

  // 2. Seed Initial Departments: Fresh, Food, Non-Food
  const departments = [
    { code: 'FRESH', name: 'Fresh', description: 'Fresh Produce, Butchery, Bakery & Dairy' },
    { code: 'FOOD', name: 'Food', description: 'Packaged Groceries, Ambient & Dry Foods' },
    { code: 'NONFOOD', name: 'Non-Food', description: 'Household, Cleaning, Personal Care & General Merchandise' },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departments) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description, active: true },
      create: { ...d, active: true },
    });
    deptMap[d.code] = dept.id;
  }
  console.log('✅ Departments seeded: Fresh, Food, Non-Food.');

  // 3. Seed Users
  const users = [
    {
      name: 'Admin System',
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@spar.internal',
      role: RoleType.ADMIN,
      departmentId: null,
      active: true,
    },
    {
      name: 'Evelyn Vance',
      firstName: 'Evelyn',
      lastName: 'Vance',
      email: 'head.fresh@spar.internal',
      role: RoleType.HEAD,
      departmentId: deptMap['FRESH'],
      active: true,
    },
    {
      name: 'Marcus Chen',
      firstName: 'Marcus',
      lastName: 'Chen',
      email: 'staff.fresh@spar.internal',
      role: RoleType.STAFF,
      departmentId: deptMap['FRESH'],
      active: true,
    },
    {
      name: 'Sarah Jenkins',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'head.food@spar.internal',
      role: RoleType.HEAD,
      departmentId: deptMap['FOOD'],
      active: true,
    },
    {
      name: 'Lucas Meyer',
      firstName: 'Lucas',
      lastName: 'Meyer',
      email: 'staff.food@spar.internal',
      role: RoleType.STAFF,
      departmentId: deptMap['FOOD'],
      active: true,
    },
    {
      name: 'Sophia Taylor',
      firstName: 'Sophia',
      lastName: 'Taylor',
      email: 'marketing@spar.internal',
      role: RoleType.MARKETING,
      departmentId: null,
      active: true,
    },
    {
      name: 'David Miller',
      firstName: 'David',
      lastName: 'Miller',
      email: 'masterdata@spar.internal',
      role: RoleType.MASTER_DATA,
      departmentId: null,
      active: true,
    },
    {
      name: 'Robert Inactive',
      firstName: 'Robert',
      lastName: 'Inactive',
      email: 'inactive.staff@spar.internal',
      role: RoleType.STAFF,
      departmentId: deptMap['FRESH'],
      active: false,
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        departmentId: u.departmentId,
        active: u.active,
        passwordHash: defaultPasswordHash,
      },
      create: {
        ...u,
        passwordHash: defaultPasswordHash,
      },
    });

    // If Head, assign headId to department (One Head per department)
    if (u.role === RoleType.HEAD && u.departmentId) {
      await prisma.department.update({
        where: { id: u.departmentId },
        data: { headId: user.id },
      });
    }
  }
  console.log(`✅ Users seeded. Default development password: ${devPassword}`);
  console.log('🚀 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
