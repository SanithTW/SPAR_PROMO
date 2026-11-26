import { RoleType } from '../types/index.js';

export interface RoleTheme {
  role: RoleType;
  label: string;
  badge: string;
  badgeClass: string;
  darkBadgeClass: string;
  dotClass: string;
  accentBar: string;
  workspaceLabel: string;
  ctaClass: string;
}

const ROLE_THEMES: Record<RoleType, RoleTheme> = {
  STAFF: {
    role: 'STAFF',
    label: 'Commercial Staff',
    badge: 'Planner',
    badgeClass: 'bg-emerald-50 text-[#007D32] border-emerald-200',
    darkBadgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    dotClass: 'bg-[#007D32]',
    accentBar: 'from-[#E31B23] via-emerald-500 to-[#007D32]',
    workspaceLabel: 'Commercial Planner Workspace',
    ctaClass: 'bg-[#007D32] hover:bg-[#00682a] focus-visible:ring-[#007D32]',
  },
  HEAD: {
    role: 'HEAD',
    label: 'Department Head',
    badge: 'Final Approver',
    badgeClass: 'bg-red-50 text-[#E31B23] border-red-200',
    darkBadgeClass: 'bg-[#E31B23]/25 text-red-200 border-red-400/35',
    dotClass: 'bg-[#E31B23]',
    accentBar: 'from-[#E31B23] via-[#E31B23] to-[#007D32]',
    workspaceLabel: 'Final Approver Workspace',
    ctaClass: 'bg-[#E31B23] hover:bg-[#C9141B] focus-visible:ring-[#E31B23]',
  },
  MARKETING: {
    role: 'MARKETING',
    label: 'Marketing Team',
    badge: 'Export',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    darkBadgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
    dotClass: 'bg-sky-600',
    accentBar: 'from-[#E31B23] via-sky-500 to-[#007D32]',
    workspaceLabel: 'Campaign & Export Workspace',
    ctaClass: 'bg-[#007D32] hover:bg-[#00682a] focus-visible:ring-[#007D32]',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'System Admin',
    badge: 'Admin',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    darkBadgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    dotClass: 'bg-purple-600',
    accentBar: 'from-[#E31B23] via-purple-500 to-[#007D32]',
    workspaceLabel: 'Enterprise Admin Console',
    ctaClass: 'bg-[#007D32] hover:bg-[#00682a] focus-visible:ring-[#007D32]',
  },
  MASTER_DATA: {
    role: 'MASTER_DATA',
    label: 'Master Data',
    badge: 'Catalog',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    darkBadgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    dotClass: 'bg-amber-600',
    accentBar: 'from-[#E31B23] via-amber-500 to-[#007D32]',
    workspaceLabel: 'Master Data & Pricing Workspace',
    ctaClass: 'bg-[#007D32] hover:bg-[#00682a] focus-visible:ring-[#007D32]',
  },
};

export function getRoleTheme(role?: RoleType): RoleTheme {
  return role ? ROLE_THEMES[role] : ROLE_THEMES.STAFF;
}
