import { dbStore } from '../data/dbStore.js';
import { NotificationData, NotificationEventType } from '../types/index.js';

export interface CreateNotificationParams {
  userId: string;
  promoListId?: string | null;
  type: NotificationEventType | string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead?: boolean;
}

export class NotificationService {
  /**
   * Creates a single notification record.
   */
  public async createNotification(params: CreateNotificationParams): Promise<NotificationData> {
    return dbStore.createNotification(params);
  }

  /**
   * Helper to notify a single user.
   */
  public async notifyUser(
    userId: string,
    payload: {
      type: NotificationEventType | string;
      title: string;
      message: string;
      promoListId?: string | null;
      linkUrl?: string | null;
    }
  ): Promise<NotificationData> {
    return this.createNotification({
      userId,
      ...payload,
    });
  }

  /**
   * Helper to notify multiple users with the same notification payload.
   */
  public async notifyUsers(
    userIds: string[],
    payload: {
      type: NotificationEventType | string;
      title: string;
      message: string;
      promoListId?: string | null;
      linkUrl?: string | null;
    }
  ): Promise<NotificationData[]> {
    const results: NotificationData[] = [];
    for (const uid of userIds) {
      const notif = await this.notifyUser(uid, payload);
      results.push(notif);
    }
    return results;
  }

  /**
   * Get user notifications with pagination.
   */
  public async getUserNotifications(
    userId: string,
    options?: { page?: number; limit?: number }
  ) {
    return dbStore.findNotifications(userId, options);
  }

  /**
   * Get unread notification count for a user.
   */
  public async getUnreadNotificationCount(userId: string): Promise<number> {
    return dbStore.getUnreadNotificationCount(userId);
  }

  /**
   * Mark a single notification as read, enforcing user ownership.
   */
  public async markAsRead(id: string, userId: string): Promise<NotificationData | null> {
    return dbStore.markNotificationAsRead(id, userId);
  }

  /**
   * Mark all notifications belonging to a user as read.
   */
  public async markAllAsRead(userId: string): Promise<number> {
    return dbStore.markAllNotificationsAsRead(userId);
  }
}

export const notificationService = new NotificationService();
