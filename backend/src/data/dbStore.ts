import { RoleType, PromoStatus, PromoType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { DepartmentData, UserData, PromoListData, ProductData, PromoLineData, ApprovalData, DashboardSummaryResponse, NotificationData } from '../types/index.js';
import { calculateLineMetrics, calculatePromoTotals } from '../services/calculationService.js';

class DbStore {
  public departments: DepartmentData[] = [];
  public users: UserData[] = [];
  public products: ProductData[] = [];
  public promoLines: PromoLineData[] = [];
  public promoLists: PromoListData[] = [];
  public approvals: ApprovalData[] = [];
  public notifications: NotificationData[] = [];


  public auditLogs: Array<{
    id: string;
    entityType: string;
    entityId?: string | null;
    action: string;
    performedById?: string | null;
    details?: string | null;
    ipAddress?: string | null;
    createdAt: Date;
  }> = [];

  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initStore();
  }

  /** Seeds the store once; concurrent callers share the same run (so seeding can't overwrite restored data). */
  public initStore(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.seedStore();
    return this.initPromise;
  }

  private async seedStore() {
    if (this.isInitialized) return;

    const defaultPasswordHash = await bcrypt.hash(config.devSeedPassword, config.bcryptSaltRounds);

    // 1. Initial departments: Fresh, Food, Non-Food
    const freshDept: DepartmentData = {
      id: 'dept-fresh-001',
      code: 'FRESH',
      name: 'Fresh',
      description: 'Fresh Produce, Butchery, Bakery & Dairy',
      active: true,
      headId: 'user-head-fresh-001',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const foodDept: DepartmentData = {
      id: 'dept-food-002',
      code: 'FOOD',
      name: 'Food',
      description: 'Packaged Groceries, Ambient & Dry Foods',
      active: true,
      headId: 'user-head-food-002',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const nonFoodDept: DepartmentData = {
      id: 'dept-nonfood-003',
      code: 'NONFOOD',
      name: 'Non-Food',
      description: 'Household, Cleaning, Personal Care & General Merchandise',
      active: true,
      headId: null,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    this.departments = [freshDept, foodDept, nonFoodDept];

    // 2. Initial users
    this.users = [
      {
        id: 'user-admin-001',
        name: 'Admin System',
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.ADMIN,
        departmentId: null,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-head-fresh-001',
        name: 'Evelyn Vance',
        firstName: 'Evelyn',
        lastName: 'Vance',
        email: 'head.fresh@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.HEAD,
        departmentId: freshDept.id,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-staff-fresh-001',
        name: 'Marcus Chen',
        firstName: 'Marcus',
        lastName: 'Chen',
        email: 'staff.fresh@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.STAFF,
        departmentId: freshDept.id,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-head-food-002',
        name: 'Sarah Jenkins',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'head.food@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.HEAD,
        departmentId: foodDept.id,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-staff-food-002',
        name: 'Lucas Meyer',
        firstName: 'Lucas',
        lastName: 'Meyer',
        email: 'staff.food@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.STAFF,
        departmentId: foodDept.id,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-marketing-001',
        name: 'Sophia Taylor',
        firstName: 'Sophia',
        lastName: 'Taylor',
        email: 'marketing@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.MARKETING,
        departmentId: null,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'user-masterdata-001',
        name: 'David Miller',
        firstName: 'David',
        lastName: 'Miller',
        email: 'masterdata@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.MASTER_DATA,
        departmentId: null,
        active: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      // Inactive user for testing TEST 7 and TEST 12
      {
        id: 'user-inactive-001',
        name: 'Robert Inactive',
        firstName: 'Robert',
        lastName: 'Inactive',
        email: 'inactive.staff@spar.internal',
        passwordHash: defaultPasswordHash,
        role: RoleType.STAFF,
        departmentId: freshDept.id,
        active: false,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
    ];

    // 3. Promotional lists start empty (no sample data)
    this.promoLists = [];

    // 4. Initial Product Master Data (across Fresh, Food, Non-Food)
    this.products = [
      // Standard SPAR Product Master Items
      {
        id: 'pm-00003654',
        sku: '00003654',
        barcode: '6001000036541',
        name: 'SPAR Choice Basmati Rice 5kg',
        category: 'Grains & Rice',
        departmentId: freshDept.id,
        baseCost: 180.00,
        retailPrice: 240.00,
        vatRate: 0.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'pm-00000014',
        sku: '00000014',
        barcode: '4792000000142',
        name: 'RANCRIP CASSAVA CHIPS ORIGINAL 100G',
        category: 'Snacks & Confectionery',
        departmentId: foodDept.id,
        baseCost: 135.00,
        retailPrice: 180.00,
        vatRate: 15.00,
        uom: 'PK',
        isActive: true,
      },
      {
        id: 'pm-00000008',
        sku: '00000008',
        barcode: '4792000000081',
        name: 'CAMPIONI PASTA LASAGNE PLAIN #96 250G',
        category: 'Pasta & Noodles',
        departmentId: foodDept.id,
        baseCost: 240.00,
        retailPrice: 320.00,
        vatRate: 15.00,
        uom: 'PK',
        isActive: true,
      },
      {
        id: 'pm-00000020',
        sku: '00000020',
        barcode: '4792000000203',
        name: 'ANCHOR FRESH MILK BOTTLE 1L',
        category: 'Dairy & Milk',
        departmentId: freshDept.id,
        baseCost: 344.40,
        retailPrice: 420.00,
        vatRate: 0.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'pm-100245',
        sku: '100245',
        barcode: '4791002450017',
        name: 'Fresh Milk 1L',
        category: 'Chilled Milk',
        departmentId: freshDept.id,
        baseCost: 369.00,
        retailPrice: 450.00,
        vatRate: 0.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'pm-00016348',
        sku: '00016348',
        barcode: '6001000163489',
        name: 'SPAR Premium Pasta Spaghetti 500g',
        category: 'Pasta & Noodles',
        departmentId: foodDept.id,
        baseCost: 116.25,
        retailPrice: 155.00,
        vatRate: 15.00,
        uom: 'PK',
        isActive: true,
      },
      // Fresh Department Products
      {
        id: 'prod-fresh-001',
        sku: 'SKU-FR-101',
        barcode: '600100100101',
        name: 'SPAR Fresh Milk Full Cream 2L',
        category: 'Dairy & Milk',
        departmentId: freshDept.id,
        baseCost: 22.50,
        retailPrice: 29.99,
        vatRate: 0.00, // zero-rated staple
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'prod-fresh-002',
        sku: 'SKU-FR-102',
        barcode: '600100100102',
        name: 'SPAR Fresh Lean Beef Mince 1kg',
        category: 'Butchery',
        departmentId: freshDept.id,
        baseCost: 75.00,
        retailPrice: 99.99,
        vatRate: 15.00,
        uom: 'KG',
        isActive: true,
      },
      {
        id: 'prod-fresh-003',
        sku: 'SKU-FR-103',
        barcode: '600100100103',
        name: 'SPAR Brown Onions Bag 2kg',
        category: 'Fresh Produce',
        departmentId: freshDept.id,
        baseCost: 18.00,
        retailPrice: 26.99,
        vatRate: 0.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'prod-fresh-004',
        sku: 'SKU-FR-104',
        barcode: '600100100104',
        name: 'SPAR Granny Smith Apples 1.5kg',
        category: 'Fresh Produce',
        departmentId: freshDept.id,
        baseCost: 19.50,
        retailPrice: 27.99,
        vatRate: 0.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'prod-fresh-005',
        sku: 'SKU-FR-105',
        barcode: '600100100105',
        name: 'SPAR Farm Fresh Large Eggs 18pk',
        category: 'Dairy & Eggs',
        departmentId: freshDept.id,
        baseCost: 41.00,
        retailPrice: 54.99,
        vatRate: 0.00,
        uom: 'PK',
        isActive: true,
      },
      {
        id: 'prod-fresh-006',
        sku: 'SKU-FR-106',
        barcode: '600100100106',
        name: 'SPAR Fresh Chicken Breast Fillets 1kg',
        category: 'Butchery',
        departmentId: freshDept.id,
        baseCost: 62.00,
        retailPrice: 84.99,
        vatRate: 15.00,
        uom: 'KG',
        isActive: true,
      },

      // Food Department Products
      {
        id: 'prod-food-001',
        sku: 'SKU-FD-201',
        barcode: '600200200201',
        name: 'SPAR Pure Sunflower Cooking Oil 2L',
        category: 'Cooking Oils',
        departmentId: foodDept.id,
        baseCost: 45.00,
        retailPrice: 62.99,
        vatRate: 15.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'prod-food-002',
        sku: 'SKU-FD-202',
        barcode: '600200200202',
        name: 'SPAR Long Grain Parboiled Rice 5kg',
        category: 'Grains & Rice',
        departmentId: foodDept.id,
        baseCost: 70.00,
        retailPrice: 94.99,
        vatRate: 0.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'prod-food-003',
        sku: 'SKU-FD-203',
        barcode: '600200200203',
        name: 'SPAR White Sugar Bag 2.5kg',
        category: 'Sugar & Sweeteners',
        departmentId: foodDept.id,
        baseCost: 38.00,
        retailPrice: 49.99,
        vatRate: 15.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'prod-food-004',
        sku: 'SKU-FD-204',
        barcode: '600200200204',
        name: 'SPAR Canned Shredded Tuna in Brine 170g',
        category: 'Canned Goods',
        departmentId: foodDept.id,
        baseCost: 16.00,
        retailPrice: 23.99,
        vatRate: 15.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'prod-food-005',
        sku: 'SKU-FD-205',
        barcode: '600200200205',
        name: 'SPAR Long Life Milk Full Cream 6x1L',
        category: 'Beverages & Milk',
        departmentId: foodDept.id,
        baseCost: 88.00,
        retailPrice: 119.99,
        vatRate: 0.00,
        uom: 'BOX',
        isActive: true,
      },

      // Non-Food Department Products
      {
        id: 'prod-nf-001',
        sku: 'SKU-NF-301',
        barcode: '600300300301',
        name: 'SPAR Dishwashing Liquid Lemon 750ml',
        category: 'Household Cleaning',
        departmentId: nonFoodDept.id,
        baseCost: 18.00,
        retailPrice: 28.99,
        vatRate: 15.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'prod-nf-002',
        sku: 'SKU-NF-302',
        barcode: '600300300302',
        name: 'SPAR Auto Washing Powder 2kg',
        category: 'Laundry Care',
        departmentId: nonFoodDept.id,
        baseCost: 44.00,
        retailPrice: 69.99,
        vatRate: 15.00,
        uom: 'BAG',
        isActive: true,
      },
      {
        id: 'prod-nf-003',
        sku: 'SKU-NF-303',
        barcode: '600300300303',
        name: 'SPAR Thick Bleach Regular 750ml',
        category: 'Household Cleaning',
        departmentId: nonFoodDept.id,
        baseCost: 16.50,
        retailPrice: 25.99,
        vatRate: 15.00,
        uom: 'EA',
        isActive: true,
      },
      {
        id: 'prod-nf-004',
        sku: 'SKU-NF-304',
        barcode: '600300300304',
        name: 'SPAR 2-Ply Toilet Tissue 18pk',
        category: 'Paper Products',
        departmentId: nonFoodDept.id,
        baseCost: 78.00,
        retailPrice: 109.99,
        vatRate: 15.00,
        uom: 'PK',
        isActive: true,
      },
    ];

    // 5. Promo lines and approvals start empty (no sample data)
    this.promoLines = [];
    this.approvals = [];

    this.isInitialized = true;
  }


  // ----------------------------------------------------
  // User Operations
  // ----------------------------------------------------

  public async findUserByEmail(email: string): Promise<UserData | null> {
    await this.initStore();
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user ? { ...user } : null;
  }

  public async findUserById(id: string): Promise<UserData | null> {
    await this.initStore();
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  public async findUsers(departmentId?: string): Promise<UserData[]> {
    await this.initStore();
    let result = [...this.users];
    if (departmentId) {
      result = result.filter((u) => u.departmentId === departmentId);
    }
    return result.map((u) => ({ ...u }));
  }

  public async createUser(data: {
    name?: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordPlain: string;
    role: RoleType;
    departmentId?: string | null;
    active?: boolean;
  }): Promise<UserData> {
    await this.initStore();

    // Check duplicate email
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new Error(`User with email '${data.email}' already exists.`);
    }

    // Role check: Disallow DIRECTOR
    if ((data.role as string).toUpperCase() === 'DIRECTOR') {
      throw new Error("Invalid role 'DIRECTOR'. The Director approval stage and role have been permanently eliminated.");
    }

    // Role requirements: HEAD and STAFF require departmentId
    if (data.role === RoleType.HEAD && !data.departmentId) {
      throw new Error("Department assignment is required for users with the 'HEAD' role.");
    }
    if (data.role === RoleType.STAFF && !data.departmentId) {
      throw new Error("Department assignment is required for users with the 'STAFF' role.");
    }

    // Inactive department validation
    if (data.departmentId) {
      const dept = this.departments.find((d) => d.id === data.departmentId);
      if (!dept) {
        throw new Error(`Department with ID '${data.departmentId}' not found.`);
      }
      if (!dept.active) {
        throw new Error(`Cannot assign inactive department '${dept.name}' to user.`);
      }
    }

    // Enforce ONE HEAD PER DEPARTMENT rule
    if (data.role === RoleType.HEAD && data.departmentId) {
      const existingHead = this.users.find(
        (u) => u.departmentId === data.departmentId && u.role === RoleType.HEAD && u.active
      );
      if (existingHead) {
        const dept = this.departments.find((d) => d.id === data.departmentId);
        throw new Error(
          `Validation error: Department '${dept ? dept.name : data.departmentId}' already has an assigned Head (${existingHead.name}). Only one Head per department is allowed.`
        );
      }
    }

    const passwordHash = await bcrypt.hash(data.passwordPlain, config.bcryptSaltRounds);
    const fullName = data.name || `${data.firstName} ${data.lastName}`.trim();

    const newUser: UserData = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: fullName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      departmentId: data.departmentId || null,
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);

    // If role is HEAD, update department's headId
    if (newUser.role === RoleType.HEAD && newUser.departmentId) {
      const dept = this.departments.find((d) => d.id === newUser.departmentId);
      if (dept) {
        dept.headId = newUser.id;
      }
    }

    return { ...newUser };
  }

  public async updateUser(
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
  ): Promise<UserData> {
    await this.initStore();
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = this.users[userIndex];

    // Check duplicate email
    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.findUserByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new Error(`Email '${data.email}' is already in use by another user.`);
      }
      user.email = data.email.toLowerCase();
    }

    // Role check: Disallow DIRECTOR
    if (data.role && (data.role as string).toUpperCase() === 'DIRECTOR') {
      throw new Error("Invalid role 'DIRECTOR'. The Director approval stage and role have been permanently eliminated.");
    }

    const targetRole = data.role !== undefined ? data.role : user.role;
    const targetDeptId = data.departmentId !== undefined ? data.departmentId : user.departmentId;

    // Role requirements: HEAD and STAFF require departmentId
    if (targetRole === RoleType.HEAD && !targetDeptId) {
      throw new Error("Department assignment is required for users with the 'HEAD' role.");
    }
    if (targetRole === RoleType.STAFF && !targetDeptId) {
      throw new Error("Department assignment is required for users with the 'STAFF' role.");
    }

    // Inactive department validation
    if (targetDeptId && targetDeptId !== user.departmentId) {
      const dept = this.departments.find((d) => d.id === targetDeptId);
      if (!dept) {
        throw new Error(`Department with ID '${targetDeptId}' not found.`);
      }
      if (!dept.active) {
        throw new Error(`Cannot assign inactive department '${dept.name}' to user.`);
      }
    }

    // Enforce ONE HEAD PER DEPARTMENT rule
    if (targetRole === RoleType.HEAD && targetDeptId) {
      const existingHead = this.users.find(
        (u) => u.departmentId === targetDeptId && u.role === RoleType.HEAD && u.id !== id && u.active
      );
      if (existingHead) {
        const dept = this.departments.find((d) => d.id === targetDeptId);
        throw new Error(
          `Validation error: Department '${dept ? dept.name : targetDeptId}' already has an assigned Head (${existingHead.name}). Only one Head per department is allowed.`
        );
      }
    }

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    user.name = data.name || `${user.firstName} ${user.lastName}`.trim();
    if (data.role) user.role = data.role;
    if (data.departmentId !== undefined) user.departmentId = data.departmentId;
    if (data.active !== undefined) user.active = data.active;
    user.updatedAt = new Date();

    // If role is HEAD, update department headId
    if (user.role === RoleType.HEAD && user.departmentId) {
      const dept = this.departments.find((d) => d.id === user.departmentId);
      if (dept) {
        dept.headId = user.id;
      }
    }

    return { ...user };
  }

  public async setUserActive(id: string, active: boolean, requestingUserId?: string): Promise<UserData> {
    await this.initStore();
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    if (!active && requestingUserId && requestingUserId === id) {
      throw new Error('You cannot deactivate your own account.');
    }
    if (!active && user.role === RoleType.ADMIN) {
      const activeAdmins = this.users.filter((u) => u.role === RoleType.ADMIN && u.active);
      if (activeAdmins.length <= 1) {
        throw new Error('Cannot deactivate the last active administrator.');
      }
    }
    user.active = active;
    user.updatedAt = new Date();
    return { ...user };
  }

  public async setUserPassword(id: string, passwordPlain: string): Promise<void> {
    await this.initStore();
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    user.passwordHash = await bcrypt.hash(passwordPlain, config.bcryptSaltRounds);
    user.updatedAt = new Date();
  }

  // ----------------------------------------------------
  // Department Operations
  // ----------------------------------------------------

  public async findDepartments(): Promise<DepartmentData[]> {
    await this.initStore();
    return this.departments.map((d) => ({ ...d }));
  }

  public async findDepartmentById(id: string): Promise<DepartmentData | null> {
    await this.initStore();
    const dept = this.departments.find((d) => d.id === id);
    return dept ? { ...dept } : null;
  }

  public async findDepartmentByCode(code: string): Promise<DepartmentData | null> {
    await this.initStore();
    const dept = this.departments.find((d) => d.code.toUpperCase() === code.toUpperCase());
    return dept ? { ...dept } : null;
  }

  public async createDepartment(data: {
    code: string;
    name: string;
    description?: string;
    headId?: string | null;
  }): Promise<DepartmentData> {
    await this.initStore();

    const existing = await this.findDepartmentByCode(data.code);
    if (existing) {
      throw new Error(`Department code '${data.code}' is already in use.`);
    }

    // If headId provided, verify user has HEAD role (not STAFF)
    if (data.headId) {
      const headUser = await this.findUserById(data.headId);
      if (!headUser) {
        throw new Error('Assigned Head user does not exist.');
      }
      if (headUser.role !== RoleType.HEAD) {
        throw new Error(
          `Invalid assignment: User '${headUser.name}' has role '${headUser.role}'. Only users with role 'HEAD' can be assigned as Department Head.`
        );
      }
    }

    const newDept: DepartmentData = {
      id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      description: data.description || null,
      active: true,
      headId: data.headId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.departments.push(newDept);
    return { ...newDept };
  }

  public async updateDepartment(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      headId?: string | null;
      active?: boolean;
    }
  ): Promise<DepartmentData> {
    await this.initStore();
    const deptIndex = this.departments.findIndex((d) => d.id === id);
    if (deptIndex === -1) {
      throw new Error('Department not found');
    }

    const dept = this.departments[deptIndex];

    if (data.code && data.code.toUpperCase() !== dept.code.toUpperCase()) {
      const existing = await this.findDepartmentByCode(data.code);
      if (existing && existing.id !== id) {
        throw new Error(`Department code '${data.code}' is already in use.`);
      }
      dept.code = data.code.toUpperCase().trim();
    }

    // Head assignment validation
    if (data.headId) {
      const headUser = await this.findUserById(data.headId);
      if (!headUser) {
        throw new Error('Assigned Head user does not exist.');
      }
      if (headUser.role !== RoleType.HEAD) {
        throw new Error(
          `Invalid assignment: User '${headUser.name}' has role '${headUser.role}'. Only users with role 'HEAD' can be assigned as Department Head.`
        );
      }
      dept.headId = data.headId;
      headUser.departmentId = id;
    } else if (data.headId === null) {
      dept.headId = null;
    }

    if (data.name) dept.name = data.name.trim();
    if (data.description !== undefined) dept.description = data.description;
    if (data.active !== undefined) dept.active = data.active;
    dept.updatedAt = new Date();

    return { ...dept };
  }

  public async setDepartmentActive(id: string, active: boolean): Promise<DepartmentData> {
    await this.initStore();
    const dept = this.departments.find((d) => d.id === id);
    if (!dept) {
      throw new Error('Department not found');
    }
    dept.active = active;
    dept.updatedAt = new Date();
    return { ...dept };
  }

  // ----------------------------------------------------
  // Promotional Lists & Dashboard Operations
  // ----------------------------------------------------

  public async findPromoLists(filter?: {
    userRole?: RoleType;
    userId?: string;
    departmentId?: string | null;
    status?: PromoStatus;
  }): Promise<PromoListData[]> {
    await this.initStore();
    let result = [...this.promoLists];

    if (!filter) return result;

    // RBAC & Department Scoping
    if (filter.userRole === RoleType.STAFF) {
      // Staff only sees their department lists
      if (filter.departmentId) {
        result = result.filter((p) => p.departmentId === filter.departmentId);
      }
    } else if (filter.userRole === RoleType.HEAD) {
      // Head only sees their department lists
      if (filter.departmentId) {
        result = result.filter((p) => p.departmentId === filter.departmentId);
      }
    } else if (filter.userRole === RoleType.MARKETING) {
      // Marketing sees only APPROVED promo lists
      result = result.filter((p) => p.status === PromoStatus.APPROVED);
    }

    if (filter.status) {
      result = result.filter((p) => p.status === filter.status);
    }

    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // ----------------------------------------------------
  // Product Operations
  // ----------------------------------------------------

  public async findProducts(options?: {
    departmentId?: string;
    search?: string;
    limit?: number;
  }): Promise<ProductData[]> {
    await this.initStore();
    let result = [...this.products];

    if (options?.departmentId) {
      result = result.filter((p) => p.departmentId === options.departmentId);
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    const limit = options?.limit || 30;
    return result.slice(0, limit).map((p) => ({ ...p }));
  }

  public async findProductById(id: string): Promise<ProductData | null> {
    await this.initStore();
    const cleanId = id.trim();
    const product = this.products.find(
      (p) =>
        p.id === cleanId ||
        p.sku === cleanId ||
        p.id === `pm-${cleanId}` ||
        `pm-${p.sku}` === cleanId
    );
    return product ? { ...product } : null;
  }

  public async upsertProduct(product: ProductData): Promise<ProductData> {
    await this.initStore();
    const idx = this.products.findIndex(
      (p) => p.id === product.id || p.sku === product.sku
    );
    if (idx >= 0) {
      this.products[idx] = { ...this.products[idx], ...product };
      return { ...this.products[idx] };
    } else {
      this.products.push({ ...product });
      return { ...product };
    }
  }

  // ----------------------------------------------------
  // Promo Types
  // ----------------------------------------------------

  public async findPromoTypes() {
    return [
      {
        code: PromoType.WEEKLY_LEAFLET,
        name: 'Weekly Leaflet',
        description: 'Standard 7-day printed flyer & digital circular',
      },
      {
        code: PromoType.MONTHLY_CATALOGUE,
        name: 'Monthly Catalogue',
        description: 'Monthly promotional booklet / magazine publication',
      },
      {
        code: PromoType.SEASONAL_CAMPAIGN,
        name: 'Seasonal Campaign',
        description: 'Braai weekend, Festive, Summer, or national holiday promotion',
      },
      {
        code: PromoType.INSTORE_SPECIAL,
        name: 'In-Store Special',
        description: 'Store-level and department manager daily promotional markdown',
      },
      {
        code: PromoType.CLEARANCE,
        name: 'Clearance',
        description: 'Inventory run-out, discontinued SKU clearance, and markdowns',
      },
    ];
  }

  // ----------------------------------------------------
  // Promo List & Lines Operations
  // ----------------------------------------------------

  public async findPromoById(id: string): Promise<PromoListData | null> {
    await this.initStore();
    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) return null;

    // Attach promo lines with products and server-recalculated metrics
    const lines = this.promoLines
      .filter((l) => l.promoListId === id)
      .map((line) => {
        const prod = this.products.find((p) => p.id === line.productId);
        const calculated = prod
          ? calculateLineMetrics(prod, {
              promoPrice: line.promoPrice,
              dealCost: line.dealCost,
              scanDiscount: line.scanDiscount,
              rebateAmount: line.rebateAmount,
              estimatedVolume: line.estimatedVolume,
            })
          : {};
        return {
          ...line,
          product: prod ? { ...prod } : undefined,
          ...calculated,
        };
      });

    const totals = calculatePromoTotals(lines);

    const approvals = this.approvals
      .filter((a) => a.promoListId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((a) => {
        const reviewer = this.users.find((u) => u.id === a.reviewerId);
        return {
          ...a,
          reviewer: reviewer
            ? {
                id: reviewer.id,
                firstName: reviewer.firstName,
                lastName: reviewer.lastName,
                name: reviewer.name,
                email: reviewer.email,
                role: reviewer.role,
              }
            : undefined,
        };
      });

    return {
      ...promo,
      promoLines: lines,
      approvals,
      totalVolume: totals.totalVolume,
      totalRevenue: totals.totalRevenue,
      totalMargin: totals.totalMargin,
      blendedMarginPercent: totals.blendedMarginPercent,
    };
  }

  public async createPromoList(
    data: {
      title: string;
      promoType?: PromoType;
      startDate: string | Date;
      endDate: string | Date;
      notes?: string | null;
      departmentId?: string;
      lines?: Array<{
        productId: string;
        promoPrice: number;
        dealCost?: number | null;
        scanDiscount?: number | null;
        fundingMechanism?: string | null;
        rebateAmount?: number | null;
        estimatedVolume?: number | null;
        mechanic?: string | null;
        displayType?: string | null;
        featurePosition?: string | null;
        coopSupport?: number | null;
        notes?: string | null;
      }>;
    },
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
    }
  ): Promise<PromoListData> {
    await this.initStore();

    // 1. Department authorization: Staff must create within own department
    let assignedDeptId = user.departmentId;
    if (user.role === RoleType.ADMIN && data.departmentId) {
      assignedDeptId = data.departmentId;
    } else if (user.role === RoleType.STAFF) {
      if (!user.departmentId) {
        throw new Error('Staff member is not assigned to a department.');
      }
      // Explicitly reject if request attempts to spoof another departmentId
      if (data.departmentId && data.departmentId !== user.departmentId) {
        throw new Error('Unauthorized: Staff cannot create promotional lists for another department.');
      }
      assignedDeptId = user.departmentId;
    }

    if (!assignedDeptId) {
      throw new Error('A valid department is required for promotional lists.');
    }

    const dept = await this.findDepartmentById(assignedDeptId);
    if (!dept) {
      throw new Error('Assigned department does not exist.');
    }

    // 2. Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Valid start and end dates are required.');
    }
    if (endDate < startDate) {
      throw new Error('End date cannot be earlier than start date.');
    }

    if (!data.title || !data.title.trim()) {
      throw new Error('Promo campaign name is required.');
    }

    // 3. Generate unique Promo Code
    const year = new Date().getFullYear();
    const count = this.promoLists.filter((p) => p.departmentId === assignedDeptId).length + 1;
    const promoCode = `PR-${year}-${dept.code}-${String(count).padStart(3, '0')}`;

    const newPromo: PromoListData = {
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoCode,
      title: data.title.trim(),
      promoType: data.promoType || PromoType.WEEKLY_LEAFLET,
      startDate,
      endDate,
      status: PromoStatus.DRAFT,
      version: 1,
      notes: data.notes || null,
      createdById: user.id,
      departmentId: assignedDeptId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.promoLists.unshift(newPromo);

    // 4. Save Promo Lines with duplicate product protection & server calculations
    if (data.lines && data.lines.length > 0) {
      const seenProductIds = new Set<string>();
      for (const lineInput of data.lines) {
        if (seenProductIds.has(lineInput.productId)) {
          throw new Error('Duplicate product detected: This product is already in the promo list.');
        }
        seenProductIds.add(lineInput.productId);

        const prod = await this.findProductById(lineInput.productId);
        if (!prod) {
          throw new Error(`Product ${lineInput.productId} not found in master catalog.`);
        }

        const metrics = calculateLineMetrics(prod, {
          promoPrice: lineInput.promoPrice,
          dealCost: lineInput.dealCost,
          scanDiscount: lineInput.scanDiscount,
          rebateAmount: lineInput.rebateAmount,
          estimatedVolume: lineInput.estimatedVolume,
        });

        const lineId = `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        this.promoLines.push({
          id: lineId,
          promoListId: newPromo.id,
          productId: lineInput.productId,
          product: prod,
          promoPrice: Number(lineInput.promoPrice),
          dealCost: lineInput.dealCost !== undefined && lineInput.dealCost !== null ? Number(lineInput.dealCost) : null,
          scanDiscount: lineInput.scanDiscount !== undefined && lineInput.scanDiscount !== null ? Number(lineInput.scanDiscount) : 0,
          fundingMechanism: lineInput.fundingMechanism || 'SUPPLIER_FUNDED',
          rebateAmount: lineInput.rebateAmount !== undefined && lineInput.rebateAmount !== null ? Number(lineInput.rebateAmount) : 0,
          estimatedVolume: lineInput.estimatedVolume !== undefined && lineInput.estimatedVolume !== null ? Number(lineInput.estimatedVolume) : 0,
          mechanic: lineInput.mechanic || 'Price Cut',
          displayType: lineInput.displayType || 'Standard Shelf',
          featurePosition: lineInput.featurePosition || null,
          coopSupport: lineInput.coopSupport !== undefined && lineInput.coopSupport !== null ? Number(lineInput.coopSupport) : 0,
          notes: lineInput.notes || null,
          ...metrics,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // 5. Audit log
    await this.logAudit({
      entityType: 'PromoList',
      entityId: newPromo.id,
      action: 'PROMO_LIST_CREATED',
      performedById: user.id,
      details: `Created draft promo list ${newPromo.promoCode} (${newPromo.title}) for department ${dept.name}`,
    });

    return (await this.findPromoById(newPromo.id))!;
  }

  public async updatePromoList(
    id: string,
    data: {
      title?: string;
      promoType?: PromoType;
      startDate?: string | Date;
      endDate?: string | Date;
      notes?: string | null;
      lines?: Array<{
        productId: string;
        promoPrice: number;
        dealCost?: number | null;
        scanDiscount?: number | null;
        fundingMechanism?: string | null;
        rebateAmount?: number | null;
        estimatedVolume?: number | null;
        mechanic?: string | null;
        displayType?: string | null;
        featurePosition?: string | null;
        coopSupport?: number | null;
        notes?: string | null;
      }>;
    },
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
    }
  ): Promise<PromoListData> {
    await this.initStore();
    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    // RBAC check: Staff can only edit their department's promo lists
    if (user.role === RoleType.STAFF) {
      if (promo.departmentId !== user.departmentId) {
        throw new Error('Unauthorized: You cannot edit promotional lists outside your department.');
      }
      if (promo.createdById !== user.id) {
        throw new Error('Unauthorized: Staff can only modify their own promo lists.');
      }
    }

    // Editing Rules by Status:
    // Only DRAFT, REJECTED_BY_HEAD, and REOPENED can be edited.
    if (promo.status === PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error('Cannot edit promo list: Currently waiting for Head review.');
    }
    if (promo.status === PromoStatus.APPROVED) {
      throw new Error('Cannot edit promo list: Approved promotional lists are locked and read-only.');
    }

    if (data.title && data.title.trim()) promo.title = data.title.trim();
    if (data.promoType) promo.promoType = data.promoType;
    if (data.startDate) promo.startDate = new Date(data.startDate);
    if (data.endDate) promo.endDate = new Date(data.endDate);
    if (data.notes !== undefined) promo.notes = data.notes;

    if (promo.endDate < promo.startDate) {
      throw new Error('End date cannot be earlier than start date.');
    }

    // Replace lines if provided
    if (data.lines) {
      const seenProductIds = new Set<string>();
      const newLines: PromoLineData[] = [];

      for (const lineInput of data.lines) {
        if (seenProductIds.has(lineInput.productId)) {
          throw new Error('Duplicate product detected: This product is already in the promo list.');
        }
        seenProductIds.add(lineInput.productId);

        const prod = await this.findProductById(lineInput.productId);
        if (!prod) {
          throw new Error(`Product ${lineInput.productId} not found in master catalog.`);
        }

        const metrics = calculateLineMetrics(prod, {
          promoPrice: lineInput.promoPrice,
          dealCost: lineInput.dealCost,
          scanDiscount: lineInput.scanDiscount,
          rebateAmount: lineInput.rebateAmount,
          estimatedVolume: lineInput.estimatedVolume,
        });

        const lineId = `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        newLines.push({
          id: lineId,
          promoListId: promo.id,
          productId: lineInput.productId,
          product: prod,
          promoPrice: Number(lineInput.promoPrice),
          dealCost: lineInput.dealCost !== undefined && lineInput.dealCost !== null ? Number(lineInput.dealCost) : null,
          scanDiscount: lineInput.scanDiscount !== undefined && lineInput.scanDiscount !== null ? Number(lineInput.scanDiscount) : 0,
          fundingMechanism: lineInput.fundingMechanism || 'SUPPLIER_FUNDED',
          rebateAmount: lineInput.rebateAmount !== undefined && lineInput.rebateAmount !== null ? Number(lineInput.rebateAmount) : 0,
          estimatedVolume: lineInput.estimatedVolume !== undefined && lineInput.estimatedVolume !== null ? Number(lineInput.estimatedVolume) : 0,
          mechanic: lineInput.mechanic || 'Price Cut',
          displayType: lineInput.displayType || 'Standard Shelf',
          featurePosition: lineInput.featurePosition || null,
          coopSupport: lineInput.coopSupport !== undefined && lineInput.coopSupport !== null ? Number(lineInput.coopSupport) : 0,
          notes: lineInput.notes || null,
          ...metrics,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Atomically replace promo lines
      this.promoLines = this.promoLines.filter((l) => l.promoListId !== id).concat(newLines);
    }

    promo.updatedAt = new Date();

    await this.logAudit({
      entityType: 'PromoList',
      entityId: promo.id,
      action: 'PROMO_LIST_UPDATED',
      performedById: user.id,
      details: `Updated promo list ${promo.promoCode} (${promo.title})`,
    });

    return (await this.findPromoById(promo.id))!;
  }

  public async submitPromoList(
    id: string,
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
    }
  ): Promise<PromoListData> {
    await this.initStore();
    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    // RBAC check: Staff must own list and belong to same department
    if (user.role === RoleType.STAFF) {
      if (promo.departmentId !== user.departmentId) {
        throw new Error('Unauthorized: You cannot submit promotional lists outside your department.');
      }
      if (promo.createdById !== user.id) {
        throw new Error('Unauthorized: Staff can only submit their own promo lists.');
      }
    }

    // State check
    if (promo.status === PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error('Promo list is already submitted for Head review.');
    }
    if (promo.status === PromoStatus.APPROVED) {
      throw new Error('Cannot submit an already approved promotional list.');
    }

    // Validation before submission:
    // 1. Must have at least 1 promo line
    const lines = this.promoLines.filter((l) => l.promoListId === id);
    if (lines.length === 0) {
      throw new Error('Cannot submit: Add at least one product before submitting to Head.');
    }

    // 2. Validate line values
    for (const line of lines) {
      if (!line.promoPrice || Number(line.promoPrice) <= 0) {
        throw new Error(`Invalid promo price for product ${line.product?.name || line.productId}. Price must be greater than 0.`);
      }
    }

    // 3. Increment version if resubmitting from rejection
    const wasRejected = promo.status === PromoStatus.REJECTED_BY_HEAD;
    if (wasRejected) {
      promo.version += 1;
    }

    // Transition state
    promo.status = PromoStatus.SUBMITTED_TO_HEAD;
    promo.submittedAt = new Date();
    promo.updatedAt = new Date();

    // Create approval submission record
    this.approvals.unshift({
      id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoListId: promo.id,
      reviewerId: user.id,
      action: 'SUBMITTED',
      comments: wasRejected ? 'Resubmitted after corrections' : 'Submitted for Head review (Final Approver)',
      createdAt: new Date(),
    });

    await this.logAudit({
      entityType: 'PromoList',
      entityId: promo.id,
      action: 'PROMO_LIST_SUBMITTED_TO_HEAD',
      performedById: user.id,
      details: `Submitted promo list ${promo.promoCode} (${promo.title}) for Head review (Final Approver). Total Lines: ${lines.length}`,
    });

    // Notify the department Head (Strict department scoping)
    const dept = this.departments.find((d) => d.id === promo.departmentId);
    let headUser = dept?.headId ? this.users.find((u) => u.id === dept.headId && u.active) : undefined;
    if (!headUser && promo.departmentId) {
      headUser = this.users.find((u) => u.role === RoleType.HEAD && u.departmentId === promo.departmentId && u.active);
    }
    if (headUser) {
      await this.createNotification({
        userId: headUser.id,
        promoListId: promo.id,
        type: 'PROMO_SUBMITTED',
        title: 'New Promo List Submitted',
        message: `Promo list #${promo.promoCode} has been submitted for your review.`,
        linkUrl: `/head-review/${promo.id}`,
      });
    }

    return (await this.findPromoById(promo.id))!;
  }

  public async approvePromoList(
    id: string,
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
      firstName?: string;
      lastName?: string;
    },
    comments?: string
  ): Promise<PromoListData> {
    await this.initStore();

    // 1. Role validation: Only HEAD or ADMIN can approve
    if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
      throw new Error(`Unauthorized: Role '${user.role}' cannot perform Head approval. Only Department Head can approve.`);
    }

    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    // 2. Department security: Head can only approve within their assigned department
    if (user.role === RoleType.HEAD && promo.departmentId !== user.departmentId) {
      throw new Error('Unauthorized: Department Head can only approve promotional lists within their assigned department.');
    }

    // 3. Status workflow check
    if (promo.status === PromoStatus.APPROVED) {
      throw new Error('Cannot approve promo list: Already approved.');
    }
    if (promo.status === PromoStatus.DRAFT) {
      throw new Error("Cannot approve promo list with status 'DRAFT'. Must be submitted for Head review first.");
    }
    if (promo.status === PromoStatus.REJECTED_BY_HEAD) {
      throw new Error('Cannot approve a rejected promo list. Staff must correct and resubmit first.');
    }
    if (promo.status !== PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error(`Cannot approve promo list with status '${promo.status}'. Must be SUBMITTED_TO_HEAD.`);
    }

    // 4. Atomic approval transition (Final approval - NO DIRECTOR STAGE)
    promo.status = PromoStatus.APPROVED;
    promo.headApproverId = user.id;
    promo.headApprovedAt = new Date();
    promo.updatedAt = new Date();

    // Create Approval record
    this.approvals.unshift({
      id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoListId: promo.id,
      reviewerId: user.id,
      action: 'APPROVED',
      comments: comments || 'Approved by Department Head (Final Approver)',
      createdAt: new Date(),
    });

    // Create Audit record
    await this.logAudit({
      entityType: 'PromoList',
      entityId: promo.id,
      action: 'HEAD_APPROVED',
      performedById: user.id,
      details: `Head ${user.firstName || ''} ${user.lastName || ''} approved promo list ${promo.promoCode} (${promo.title}). Final approval complete; available for Marketing.`,
    });

    // Notify Staff creator
    if (promo.createdById) {
      await this.createNotification({
        userId: promo.createdById,
        promoListId: promo.id,
        type: 'PROMO_APPROVED',
        title: 'Promo List Approved',
        message: `Promo list #${promo.promoCode} has been approved.`,
        linkUrl: `/approved-promos/${promo.id}`,
      });
    }

    // Notify Marketing users (strictly read-only role)
    const marketingUsers = this.users.filter((u) => u.role === RoleType.MARKETING && u.active);
    for (const mktUser of marketingUsers) {
      await this.createNotification({
        userId: mktUser.id,
        promoListId: promo.id,
        type: 'PROMO_APPROVED',
        title: 'New Approved Promo',
        message: `Promo list #${promo.promoCode} has been approved and is ready for Marketing.`,
        linkUrl: `/approved-promos/${promo.id}`,
      });
    }

    return (await this.findPromoById(promo.id))!;
  }

  public async rejectPromoList(
    id: string,
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
      firstName?: string;
      lastName?: string;
    },
    comments: string,
    lineComments?: Record<string, string>
  ): Promise<PromoListData> {
    await this.initStore();

    // 1. Role validation
    if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
      throw new Error(`Unauthorized: Role '${user.role}' cannot reject promo lists.`);
    }

    // 2. Comments validation: an overall reason OR at least one line comment is required
    const lineSummary = this.formatLineComments(id, lineComments);
    const overall = typeof comments === 'string' ? comments.trim() : '';
    if (!overall && !lineSummary) {
      throw new Error('A rejection reason/comment is required when rejecting a promotional submission.');
    }
    comments = [overall, lineSummary ? `Line comments:\n${lineSummary}` : ''].filter(Boolean).join('\n');

    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    // 3. Department security: Head can only reject within their department
    if (user.role === RoleType.HEAD && promo.departmentId !== user.departmentId) {
      throw new Error('Unauthorized: Department Head can only reject promotional lists within their assigned department.');
    }

    // 4. Status workflow check
    if (promo.status === PromoStatus.APPROVED) {
      throw new Error('Cannot reject an already approved promotional list.');
    }
    if (promo.status === PromoStatus.DRAFT) {
      throw new Error('Cannot reject a promo list that is still in draft state.');
    }
    if (promo.status !== PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error(`Cannot reject promo list with status '${promo.status}'. Must be SUBMITTED_TO_HEAD.`);
    }

    // 5. Atomic rejection transition
    for (const line of this.promoLines.filter((l) => l.promoListId === promo.id)) {
      line.headDecision = 'REJECTED';
      line.headComment = lineComments?.[line.id]?.trim() || null;
    }
    promo.status = PromoStatus.REJECTED_BY_HEAD;
    promo.rejectionReason = comments.trim();
    promo.updatedAt = new Date();

    // Create Approval record
    this.approvals.unshift({
      id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoListId: promo.id,
      reviewerId: user.id,
      action: 'REJECTED',
      comments: comments.trim(),
      createdAt: new Date(),
    });

    // Create Audit record
    await this.logAudit({
      entityType: 'PromoList',
      entityId: promo.id,
      action: 'HEAD_REJECTED',
      performedById: user.id,
      details: `Head ${user.firstName || ''} ${user.lastName || ''} rejected promo list ${promo.promoCode}. Reason: ${comments.trim()}`,
    });

    // Notify the Staff creator with the rejection comment
    if (promo.createdById) {
      await this.createNotification({
        userId: promo.createdById,
        promoListId: promo.id,
        type: 'PROMO_REJECTED',
        title: 'Promo List Rejected',
        message: `Promo list #${promo.promoCode} was rejected by the Head. Reason: ${comments.trim()}`,
        linkUrl: `/promo-entry/${promo.id}`,
      });
    }

    return (await this.findPromoById(promo.id))!;
  }

  /** "- SKU Name: comment" lines for every line of a promo list that has a non-empty comment. */
  private formatLineComments(promoListId: string, lineComments?: Record<string, string>): string {
    if (!lineComments) return '';
    return this.promoLines
      .filter((l) => l.promoListId === promoListId && lineComments[l.id]?.trim())
      .map((l) => {
        const prod = this.products.find((p) => p.id === l.productId);
        const label = prod ? `${prod.sku} ${prod.name}` : l.productId;
        return `- ${label}: ${lineComments[l.id].trim()}`;
      })
      .join('\n');
  }

  /**
   * Head line-level review: approve only the selected lines.
   *
   * - All lines selected      -> normal full approval.
   * - Some lines selected     -> the selected lines stay on this list, which becomes APPROVED.
   *                              The unselected lines are moved to a new "returned lines" list
   *                              with status REJECTED_BY_HEAD (each must carry a head comment),
   *                              so staff can fix and resubmit them through the normal workflow.
   * - No lines selected       -> refused; the head should use Reject instead.
   */
  public async reviewPromoListLines(
    id: string,
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
      firstName?: string;
      lastName?: string;
    },
    input: { approvedLineIds: string[]; lineComments?: Record<string, string>; comments?: string }
  ): Promise<{ approved: PromoListData; returned: PromoListData | null }> {
    await this.initStore();

    if (user.role !== RoleType.HEAD && user.role !== RoleType.ADMIN) {
      throw new Error(`Unauthorized: Role '${user.role}' cannot perform Head approval. Only Department Head can approve.`);
    }

    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) throw new Error('Promo list not found.');
    if (user.role === RoleType.HEAD && promo.departmentId !== user.departmentId) {
      throw new Error('Unauthorized: Department Head can only approve promotional lists within their assigned department.');
    }
    if (promo.status !== PromoStatus.SUBMITTED_TO_HEAD) {
      throw new Error(`Cannot approve promo list with status '${promo.status}'. Must be SUBMITTED_TO_HEAD.`);
    }

    const lines = this.promoLines.filter((l) => l.promoListId === promo.id);
    const lineIds = new Set(lines.map((l) => l.id));
    const approvedIds = new Set(input.approvedLineIds || []);
    for (const lid of approvedIds) {
      if (!lineIds.has(lid)) throw new Error(`Line ${lid} does not belong to this promo list.`);
    }
    if (approvedIds.size === 0) {
      throw new Error('Select at least one line to approve, or use Reject to return the whole list.');
    }

    const comments = input.lineComments || {};
    const rejectedLines = lines.filter((l) => !approvedIds.has(l.id));

    // Every line being returned to staff needs a reason (same rule as whole-list rejection).
    const missing = rejectedLines.filter((l) => !comments[l.id]?.trim());
    if (missing.length > 0) {
      const names = missing
        .map((l) => this.products.find((p) => p.id === l.productId)?.sku || l.productId)
        .join(', ');
      throw new Error(`Add a comment for each unselected (rejected) line: ${names}`);
    }

    for (const line of lines) {
      line.headComment = comments[line.id]?.trim() || null;
      line.headDecision = approvedIds.has(line.id) ? 'APPROVED' : 'REJECTED';
    }

    // Full approval: nothing to split off.
    if (rejectedLines.length === 0) {
      const approved = await this.approvePromoList(id, user, input.comments);
      return { approved, returned: null };
    }

    // Split the unselected lines into a new returned list.
    const existingReturns = this.promoLists.filter((p) => p.promoCode.startsWith(`${promo.promoCode}-R`)).length;
    const returnedCode = `${promo.promoCode}-R${existingReturns + 1}`;
    const lineSummary = this.formatLineComments(promo.id, Object.fromEntries(rejectedLines.map((l) => [l.id, comments[l.id]])));
    const reason = [
      `${rejectedLines.length} line(s) returned from ${promo.promoCode} (other lines approved).`,
      input.comments?.trim() || '',
      `Line comments:\n${lineSummary}`,
    ]
      .filter(Boolean)
      .join('\n');

    const now = new Date();
    const returned: PromoListData = {
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoCode: returnedCode,
      title: `${promo.title} (returned lines)`,
      promoType: promo.promoType,
      startDate: promo.startDate,
      endDate: promo.endDate,
      status: PromoStatus.REJECTED_BY_HEAD,
      version: 1,
      notes: promo.notes || null,
      rejectionReason: reason,
      createdById: promo.createdById,
      departmentId: promo.departmentId,
      submittedAt: promo.submittedAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.promoLists.unshift(returned);

    for (const line of rejectedLines) {
      line.promoListId = returned.id;
      line.updatedAt = now;
    }

    this.approvals.unshift({
      id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      promoListId: returned.id,
      reviewerId: user.id,
      action: 'REJECTED',
      comments: reason,
      createdAt: now,
    });

    await this.logAudit({
      entityType: 'PromoList',
      entityId: returned.id,
      action: 'HEAD_REJECTED',
      performedById: user.id,
      details: `Head ${user.firstName || ''} ${user.lastName || ''} returned ${rejectedLines.length} line(s) from ${promo.promoCode} as ${returnedCode}. ${reason}`,
    });

    if (promo.createdById) {
      await this.createNotification({
        userId: promo.createdById,
        promoListId: returned.id,
        type: 'PROMO_REJECTED',
        title: 'Promo Lines Returned',
        message: `${rejectedLines.length} line(s) of #${promo.promoCode} were not approved and were returned as #${returnedCode}. ${lineSummary}`,
        linkUrl: `/promo-entry/${returned.id}`,
      });
    }

    const approvalNote = [
      `Partially approved: ${approvedIds.size} of ${lines.length} lines. ${rejectedLines.length} line(s) returned to staff as ${returnedCode}.`,
      input.comments?.trim() || '',
    ]
      .filter(Boolean)
      .join(' ');
    const approved = await this.approvePromoList(id, user, approvalNote);

    return { approved, returned: (await this.findPromoById(returned.id))! };
  }


  public async deletePromoList(
    id: string,
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
    }
  ): Promise<void> {
    await this.initStore();
    const promo = this.promoLists.find((p) => p.id === id);
    if (!promo) {
      throw new Error('Promo list not found.');
    }

    if (user.role === RoleType.STAFF) {
      if (promo.createdById !== user.id || promo.departmentId !== user.departmentId) {
        throw new Error('Unauthorized: You can only delete your own draft promo lists.');
      }
    }

    if (promo.status !== PromoStatus.DRAFT) {
      throw new Error('Only draft promo lists can be deleted.');
    }

    this.promoLists = this.promoLists.filter((p) => p.id !== id);
    this.promoLines = this.promoLines.filter((l) => l.promoListId !== id);

    await this.logAudit({
      entityType: 'PromoList',
      entityId: id,
      action: 'PROMO_LIST_DELETED',
      performedById: user.id,
      details: `Deleted draft promo list ${promo.promoCode}`,
    });
  }


  /**
   * Calculates role-specific summary counts.
   * Derived purely from authenticated server user context.
   */
  public async getDashboardSummary(user: {
    id: string;
    role: RoleType;
    departmentId: string | null;
  }): Promise<DashboardSummaryResponse> {
    await this.initStore();

    const dept = user.departmentId ? await this.findDepartmentById(user.departmentId) : null;
    const departmentName = dept ? dept.name : null;

    if (user.role === RoleType.STAFF) {
      // Staff counts strictly for their permitted promos in their department:
      // Drafts: Created by staff member with status DRAFT
      const drafts = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.createdById === user.id && p.status === PromoStatus.DRAFT
      ).length;

      // Waiting for Me: Staff promo lists requiring action (e.g. returned with REJECTED_BY_HEAD for correction)
      const waitingForMe = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.createdById === user.id && p.status === PromoStatus.REJECTED_BY_HEAD
      ).length;

      // Rejected: Staff promo lists with REJECTED_BY_HEAD
      const rejected = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.createdById === user.id && p.status === PromoStatus.REJECTED_BY_HEAD
      ).length;

      // Approved: Staff promo lists with APPROVED
      const approved = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.createdById === user.id && p.status === PromoStatus.APPROVED
      ).length;

      return {
        drafts,
        waitingForMe,
        rejected,
        approved,
        role: user.role,
        departmentName,
      };
    }

    if (user.role === RoleType.HEAD) {
      // Head counts strictly for their department:
      // Drafts: Draft promo lists in Head's department
      const drafts = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.status === PromoStatus.DRAFT
      ).length;

      // Waiting for Me: Promo lists with SUBMITTED_TO_HEAD in Head's department (Crucial review queue!)
      const waitingForMe = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.status === PromoStatus.SUBMITTED_TO_HEAD
      ).length;

      // Rejected: Rejected promo lists in Head's department
      const rejected = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.status === PromoStatus.REJECTED_BY_HEAD
      ).length;

      // Approved: Approved promo lists in Head's department
      const approved = this.promoLists.filter(
        (p) => p.departmentId === user.departmentId && p.status === PromoStatus.APPROVED
      ).length;

      return {
        drafts,
        waitingForMe,
        rejected,
        approved,
        role: user.role,
        departmentName,
      };
    }

    if (user.role === RoleType.MARKETING) {
      // Marketing mainly works with approved promo lists across all departments
      const approved = this.promoLists.filter((p) => p.status === PromoStatus.APPROVED).length;

      return {
        drafts: 0,
        waitingForMe: 0,
        rejected: 0,
        approved,
        role: user.role,
        departmentName: 'All Retail Departments',
      };
    }

    if (user.role === RoleType.ADMIN) {
      // Admin sees global system-wide counts:
      const drafts = this.promoLists.filter((p) => p.status === PromoStatus.DRAFT).length;
      const waitingForMe = this.promoLists.filter((p) => p.status === PromoStatus.SUBMITTED_TO_HEAD).length;
      const rejected = this.promoLists.filter((p) => p.status === PromoStatus.REJECTED_BY_HEAD).length;
      const approved = this.promoLists.filter((p) => p.status === PromoStatus.APPROVED).length;

      return {
        drafts,
        waitingForMe,
        rejected,
        approved,
        role: user.role,
        departmentName: 'Enterprise Global',
      };
    }

    if (user.role === RoleType.MASTER_DATA) {
      // Master Data summary:
      const approved = this.promoLists.filter((p) => p.status === PromoStatus.APPROVED).length;

      return {
        drafts: 0,
        waitingForMe: 0,
        rejected: 0,
        approved,
        role: user.role,
        departmentName: 'Master Catalog',
      };
    }

    return {
      drafts: 0,
      waitingForMe: 0,
      rejected: 0,
      approved: 0,
      role: user.role,
      departmentName: null,
    };
  }

  /**
   * Returns recent promo lists scoped strictly by role and department.
   */
  public async getRecentPromos(
    user: {
      id: string;
      role: RoleType;
      departmentId: string | null;
    },
    limit = 8
  ) {
    await this.initStore();

    let permitted = [...this.promoLists];

    if (user.role === RoleType.STAFF) {
      permitted = permitted.filter((p) => p.departmentId === user.departmentId);
    } else if (user.role === RoleType.HEAD) {
      permitted = permitted.filter((p) => p.departmentId === user.departmentId);
    } else if (user.role === RoleType.MARKETING) {
      permitted = permitted.filter((p) => p.status === PromoStatus.APPROVED);
    } else if (user.role === RoleType.MASTER_DATA) {
      permitted = permitted.filter((p) => p.status === PromoStatus.APPROVED);
    }

    // Sort by most recently updated/created
    permitted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const sliced = permitted.slice(0, limit);

    const depts = await this.findDepartments();
    const deptMap = new Map(depts.map((d) => [d.id, d]));
    const userMap = new Map(this.users.map((u) => [u.id, u]));

    return sliced.map((p) => {
      const d = deptMap.get(p.departmentId);
      const c = userMap.get(p.createdById);
      return {
        id: p.id,
        promoCode: p.promoCode,
        title: p.title,
        promoType: p.promoType,
        status: p.status,
        version: p.version,
        startDate: p.startDate,
        endDate: p.endDate,
        department: d ? { id: d.id, name: d.name, code: d.code } : null,
        creator: c ? { id: c.id, name: c.name, email: c.email } : null,
        submittedAt: p.submittedAt,
        headApprovedAt: p.headApprovedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }

  // ----------------------------------------------------
  // Audit Operations
  // ----------------------------------------------------

  public async logAudit(params: {
    entityType: string;
    entityId?: string;
    action: string;
    performedById?: string;
    details?: string;
    ipAddress?: string;
  }) {
    const log = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entityType: params.entityType,
      entityId: params.entityId || null,
      action: params.action,
      performedById: params.performedById || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
      createdAt: new Date(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  public async getAuditLogs(limit = 100) {
    return this.auditLogs.slice(0, limit);
  }

  // ----------------------------------------------------
  // Notification Operations
  // ----------------------------------------------------

  public async createNotification(params: {
    userId: string;
    promoListId?: string | null;
    type: string;
    title: string;
    message: string;
    linkUrl?: string | null;
    isRead?: boolean;
  }): Promise<NotificationData> {
    await this.initStore();
    const notif: NotificationData = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: params.userId,
      promoListId: params.promoListId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl || null,
      isRead: params.isRead ?? false,
      createdAt: new Date(),
      readAt: null,
    };
    this.notifications.unshift(notif);
    return notif;
  }

  public async findNotifications(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{
    notifications: NotificationData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    await this.initStore();
    const userNotifs = this.notifications.filter((n) => n.userId === userId);
    const unreadCount = userNotifs.filter((n) => !n.isRead).length;

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const total = userNotifs.length;
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paged = userNotifs.slice(startIndex, startIndex + limit);

    return {
      notifications: paged,
      total,
      page,
      limit,
      totalPages,
      unreadCount,
    };
  }

  public async getUnreadNotificationCount(userId: string): Promise<number> {
    await this.initStore();
    return this.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  public async markNotificationAsRead(
    id: string,
    userId: string
  ): Promise<NotificationData | null> {
    await this.initStore();
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return null;
    if (notif.userId !== userId) {
      throw new Error('Unauthorized: You cannot access or modify notifications belonging to another user.');
    }
    notif.isRead = true;
    notif.readAt = new Date();
    return notif;
  }

  public async markAllNotificationsAsRead(userId: string): Promise<number> {
    await this.initStore();
    let count = 0;
    const now = new Date();
    for (const notif of this.notifications) {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = now;
        count++;
      }
    }
    return count;
  }
}

export const dbStore = new DbStore();
