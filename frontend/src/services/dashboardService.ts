import { apiRequest } from './api.js';
import { DashboardSummary, RecentPromoItem } from '../types/index.js';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard/summary');
}

export async function fetchRecentPromos(limit = 8): Promise<RecentPromoItem[]> {
  return apiRequest<RecentPromoItem[]>(`/dashboard/recent?limit=${limit}`);
}
