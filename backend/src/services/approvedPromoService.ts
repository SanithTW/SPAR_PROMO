import { RoleType, PromoStatus } from '@prisma/client';
import { dbStore } from '../data/dbStore.js';
import { PromoListData, UserTokenPayload } from '../types/index.js';

export interface ApprovedPromoFilterOptions {
  search?: string;
  departmentId?: string;
  promoType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedApprovedPromos {
  items: PromoListData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getApprovedPromos(
  user: UserTokenPayload,
  filters: ApprovedPromoFilterOptions = {}
): Promise<PaginatedApprovedPromos> {
  await dbStore.initStore();

  let lists = [...dbStore.promoLists];

  // 1. MUST only return APPROVED promo lists
  lists = lists.filter((p) => p.status === PromoStatus.APPROVED);

  // 2. Department-level Scoping by Role:
  // - ADMIN and MARKETING can view approved promos across all departments.
  //   If they specify a department filter, apply it.
  // - HEAD can only view approved promos belonging to their assigned department.
  // - STAFF can only view approved promos belonging to their assigned department.
  if (user.role === RoleType.HEAD || user.role === RoleType.STAFF) {
    if (user.departmentId) {
      lists = lists.filter((p) => p.departmentId === user.departmentId);
    }
  } else if (filters.departmentId) {
    lists = lists.filter((p) => p.departmentId === filters.departmentId);
  }

  // 3. Search query filter (matches promoCode, title, notes, or department name)
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    lists = lists.filter((p) => {
      const codeMatch = p.promoCode?.toLowerCase().includes(q);
      const titleMatch = p.title?.toLowerCase().includes(q);
      const notesMatch = p.notes?.toLowerCase().includes(q);
      return codeMatch || titleMatch || notesMatch;
    });
  }

  // 4. Promo Type filter
  if (filters.promoType) {
    lists = lists.filter((p) => p.promoType === filters.promoType);
  }

  // 5. Date Range filters
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    if (!isNaN(start.getTime())) {
      lists = lists.filter((p) => new Date(p.startDate) >= start);
    }
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    if (!isNaN(end.getTime())) {
      lists = lists.filter((p) => new Date(p.endDate) <= end);
    }
  }

  // Sort descending by approval date (or updatedAt)
  lists.sort((a, b) => {
    const dateA = a.headApprovedAt ? new Date(a.headApprovedAt).getTime() : new Date(a.updatedAt).getTime();
    const dateB = b.headApprovedAt ? new Date(b.headApprovedAt).getTime() : new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  const total = lists.length;
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const totalPages = Math.ceil(total / pageSize) || 1;

  const startIndex = (page - 1) * pageSize;
  const pagedLists = lists.slice(startIndex, startIndex + pageSize);

  // Attach full relationship data: department, creator, headApprover, approvals, and promoLines
  const enrichedItems = await Promise.all(
    pagedLists.map(async (promo) => {
      const full = await dbStore.findPromoById(promo.id);
      return full || promo;
    })
  );

  return {
    items: enrichedItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getApprovedPromoById(
  user: UserTokenPayload,
  promoId: string
): Promise<PromoListData> {
  await dbStore.initStore();

  const promo = await dbStore.findPromoById(promoId);
  if (!promo) {
    throw new Error('Approved promotional list not found.');
  }

  // Ensure record is APPROVED
  if (promo.status !== PromoStatus.APPROVED) {
    throw new Error(`Promotional list is not approved (Current status: ${promo.status}).`);
  }

  // RBAC & Department Scoping
  // STAFF and HEAD can only view approved promo lists belonging to their department
  if (user.role === RoleType.STAFF || user.role === RoleType.HEAD) {
    if (user.departmentId && promo.departmentId !== user.departmentId) {
      throw new Error('Unauthorized: You do not have permission to view approved promo lists outside your department.');
    }
  }

  return promo;
}
