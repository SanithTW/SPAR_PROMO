import { apiRequest, apiDownload } from './api.js';
import { PromoList, PromoStatus, AuditLogItem, Product, PromoTypeOption, PromoLine } from '../types/index.js';

export interface ProductSalesSummary {
  productCode: string;
  productDesc: string;
  totalTransactions: number;
  totalQuantitySold: number;
  totalSalesValue: number;
  averageSellingPrice: number;
  previousMonthQty?: number;
  lastYearQty?: number;
  avg3MonthsQty?: number;
  salesNet?: number;
  periods?: {
    previousMonth: string; // 'YYYY-MM' — latest month with recorded sales
    lastYear: string;
    avg3Months: string[];
    firstSaleDate: string;
    lastSaleDate: string;
  };
  monthlyQty?: Record<string, number>;
  recentSalesLines: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    locationDesc: string;
    qty: number;
    sellingPrice: number;
    amount: number;
  }>;
}

export async function fetchPromos(status?: PromoStatus, departmentId?: string): Promise<PromoList[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (departmentId) params.append('departmentId', departmentId);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PromoList[]>(`/promo-lists${query}`);
}

export async function fetchPromoById(id: string): Promise<PromoList> {
  return apiRequest<PromoList>(`/promo-lists/${id}`);
}

export async function fetchHeadReviewList(filters?: { status?: string; search?: string }): Promise<PromoList[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PromoList[]>(`/head-review${query}`);
}

export async function fetchHeadReviewById(id: string): Promise<PromoList> {
  return apiRequest<PromoList>(`/head-review/${id}`);
}

export interface ApprovedPromoFilterParams {
  search?: string;
  departmentId?: string;
  promoType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedApprovedPromos {
  items: PromoList[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchApprovedPromos(
  params?: ApprovedPromoFilterParams
): Promise<PaginatedApprovedPromos> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.departmentId) query.append('departmentId', params.departmentId);
  if (params?.promoType) query.append('promoType', params.promoType);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

  const q = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedApprovedPromos>(`/approved-promos${q}`);
}

export async function fetchApprovedPromoById(id: string): Promise<PromoList> {
  return apiRequest<PromoList>(`/approved-promos/${id}`);
}

export async function fetchPromoTypes(): Promise<PromoTypeOption[]> {
  return apiRequest<PromoTypeOption[]>('/promo-types');
}

export async function searchProducts(query: string, departmentId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (departmentId) params.append('departmentId', departmentId);

  return apiRequest<Product[]>(`/products/search?${params.toString()}`);
}

export async function fetchProductSales(code: string): Promise<ProductSalesSummary | null> {
  return apiRequest<ProductSalesSummary | null>(`/sales/product/${encodeURIComponent(code)}`);
}

export async function createPromo(data: {
  title: string;
  promoType?: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
  departmentId?: string;
  lines?: Partial<PromoLine>[];
}): Promise<PromoList> {
  return apiRequest<PromoList>('/promo-lists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePromo(
  id: string,
  data: {
    title?: string;
    promoType?: string;
    startDate?: string;
    endDate?: string;
    notes?: string | null;
    lines?: Partial<PromoLine>[];
  }
): Promise<PromoList> {
  return apiRequest<PromoList>(`/promo-lists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function submitPromoToHead(id: string): Promise<PromoList> {
  return apiRequest<PromoList>(`/promo-lists/${id}/submit`, {
    method: 'POST',
  });
}

export async function deletePromo(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/promo-lists/${id}`, {
    method: 'DELETE',
  });
}

export async function headApprovePromo(id: string, comments?: string): Promise<PromoList> {
  return apiRequest<PromoList>(`/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export async function headRejectPromo(
  id: string,
  comments: string,
  lineComments?: Record<string, string>
): Promise<PromoList> {
  return apiRequest<PromoList>(`/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comments, lineComments }),
  });
}

/**
 * Head approves only the selected lines. Unselected lines are returned to staff as a new
 * REJECTED_BY_HEAD list (`returnedPromo`), each carrying its line comment.
 */
export async function headApprovePromoLines(
  id: string,
  approvedLineIds: string[],
  lineComments: Record<string, string>,
  comments?: string
): Promise<PromoList & { returnedPromo: PromoList | null }> {
  return apiRequest<PromoList & { returnedPromo: PromoList | null }>(`/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approvedLineIds, lineComments, comments }),
  });
}

export interface TypeReviewDecision {
  promoId: string;
  approvedLineIds: string[];
  lineComments?: Record<string, string>;
}

export interface TypeReviewResult {
  promoId: string;
  sourcePromoCode: string;
  reviewedPromoCode: string;
  approvedCount: number;
  returnedCount: number;
  stillWaitingCount: number;
  approvedPromo: PromoList | null;
  returnedPromo: PromoList | null;
}

/**
 * Head reviews the lines of one promotion type across promo lists. Ticked lines are approved,
 * unticked lines of that type are returned to Staff; lines of other types stay waiting.
 */
export async function headReviewByType(
  type: string,
  decisions: TypeReviewDecision[],
  comments?: string
): Promise<TypeReviewResult[]> {
  return apiRequest<TypeReviewResult[]>('/head-review/by-type/review', {
    method: 'POST',
    body: JSON.stringify({ type, decisions, comments }),
  });
}

export async function exportPromoExcel(id: string, fallbackFilename = 'promo_export.xlsx'): Promise<void> {
  return apiDownload(`/approved-promos/${id}/export/excel`, fallbackFilename);
}

export async function exportSpecialPromoExcel(id: string, fallbackFilename = 'Special_Promo.xlsx'): Promise<void> {
  return apiDownload(`/promos/${id}/export/special-excel`, fallbackFilename);
}

export async function fillSpecialPromoExcelDirect(
  payload: {
    lines: any[];
    promoType?: string;
    fromDate?: string;
    toDate?: string;
    title?: string;
  },
  fallbackFilename = 'Special_Promo_Sep_2026.xlsx'
): Promise<void> {
  return apiDownload(`/promos/fill-special-excel`, fallbackFilename, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportPromoPdf(id: string, fallbackFilename = 'promo_report.pdf'): Promise<void> {
  return apiDownload(`/approved-promos/${id}/export/pdf`, fallbackFilename);
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogItem[]> {
  return apiRequest<AuditLogItem[]>(`/audit?limit=${limit}`);
}

export async function fetchDepartments(): Promise<{ id: string; name: string }[]> {
  return apiRequest<{ id: string; name: string }[]>('/departments');
}
