import { apiRequest } from './api.js';
import { NotificationItem } from '../types/index.js';

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface UnreadCountResponse {
  count: number;
}

export async function fetchNotifications(
  page = 1,
  limit = 20
): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>(`/notifications?page=${page}&limit=${limit}`);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const data = await apiRequest<UnreadCountResponse>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<number> {
  const data = await apiRequest<{ count: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
  return data.count;
}
