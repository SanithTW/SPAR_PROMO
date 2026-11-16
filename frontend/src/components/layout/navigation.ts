import {
  LayoutDashboard,
  FilePlus2,
  CheckSquare,
  BadgeCheck,
  Users,
  Settings,
  ShieldAlert,
  Database,
  CalendarDays,
  LucideIcon,
} from 'lucide-react';
import { RoleType } from '../../types/index.js';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  /** One line shown in the quick search and as a tooltip. */
  description: string;
  roles?: RoleType[];
  section: 'Promotions' | 'Administration' | 'Account';
  /** Extra words the quick search should match. */
  keywords?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    description: 'Your promo lists and what needs attention',
    section: 'Promotions',
    keywords: 'home overview summary',
  },
  {
    name: 'Calendar',
    path: '/calendar',
    icon: CalendarDays,
    description: 'See every promo laid out by date',
    section: 'Promotions',
    keywords: 'schedule dates month',
  },
  {
    name: 'Promo Entry',
    path: '/promo-entry',
    icon: FilePlus2,
    description: 'Create a promo list and add products',
    roles: ['STAFF', 'ADMIN'],
    section: 'Promotions',
    keywords: 'new create add draft lines products',
  },
  {
    name: 'Head Review',
    path: '/head-review',
    icon: CheckSquare,
    description: 'Approve or reject submitted promo lists',
    roles: ['HEAD', 'ADMIN'],
    section: 'Promotions',
    keywords: 'approve reject queue pending',
  },
  {
    name: 'Approved Promos',
    path: '/approved-promos',
    icon: BadgeCheck,
    description: 'Signed-off promos, ready to export',
    roles: ['STAFF', 'MARKETING', 'HEAD', 'ADMIN'],
    section: 'Promotions',
    keywords: 'view export excel pdf marketing',
  },
  {
    name: 'Users & Departments',
    path: '/users-departments',
    icon: Users,
    description: 'Manage accounts, roles and departments',
    roles: ['ADMIN'],
    section: 'Administration',
    keywords: 'people staff admin roles',
  },
  {
    name: 'Master Data',
    path: '/master-data',
    icon: Database,
    description: 'Products, promo types and base pricing',
    roles: ['MASTER_DATA', 'ADMIN'],
    section: 'Administration',
    keywords: 'catalog products pricing',
  },
  {
    name: 'Audit Trail',
    path: '/audit',
    icon: ShieldAlert,
    description: 'Who did what, and when',
    roles: ['HEAD', 'ADMIN'],
    section: 'Administration',
    keywords: 'log history compliance',
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'Your profile and preferences',
    roles: ['STAFF', 'MARKETING', 'HEAD', 'ADMIN'],
    section: 'Account',
    keywords: 'profile account preferences',
  },
];

export function navItemsFor(role?: RoleType): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

/** The nav item whose path is the longest prefix of the current pathname. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((i) => pathname === i.path || pathname.startsWith(i.path + '/')).sort(
    (a, b) => b.path.length - a.path.length
  )[0];
}

export function roleLabel(role?: RoleType): string {
  switch (role) {
    case 'STAFF':
      return 'Dept Staff';
    case 'HEAD':
      return 'Dept Head';
    case 'MARKETING':
      return 'Marketing';
    case 'ADMIN':
      return 'Administrator';
    case 'MASTER_DATA':
      return 'Master Data';
    default:
      return 'Staff';
  }
}
