import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem } from '../../types/index.js';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationService.js';

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 45) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-ZA');
  } catch {
    return 'Recently';
  }
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('spar_token');
    if (!token) return;
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Quiet fail on polling unread count
    }
  }, []);

  const loadNotificationList = useCallback(async () => {
    const token = localStorage.getItem('spar_token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications(1, 30);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err: any) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread notifications every 20 seconds
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // When dropdown opens, load the full notifications list
  useEffect(() => {
    if (isOpen) {
      loadNotificationList();
    }
  }, [isOpen, loadNotificationList]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // 1. Mark as read if not already read
    if (!notif.isRead) {
      try {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await markNotificationRead(notif.id);
      } catch {
        // Continue even if network error
      }
    }

    // 2. Close dropdown
    setIsOpen(false);

    // 3. Deep link navigation
    if (notif.linkUrl) {
      navigate(notif.linkUrl);
    } else if (notif.promoListId) {
      navigate(`/promo-entry/${notif.promoListId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PROMO_SUBMITTED':
        return (
          <div className="p-2 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'PROMO_APPROVED':
        return (
          <div className="p-2 rounded-full bg-emerald-50 text-spar-green border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      case 'PROMO_REJECTED':
        return (
          <div className="p-2 rounded-full bg-red-50 text-spar-red border border-red-200">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'PROMO_REOPENED':
        return (
          <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <RefreshCw className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-spar-green/20"
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-spar-red text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-emerald-100 text-spar-green px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-xs text-spar-green hover:text-emerald-700 hover:underline flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-full" />
                      <div className="h-2 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-600 mb-2">{error}</p>
                <button
                  onClick={loadNotificationList}
                  className="text-xs text-spar-green hover:underline font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">No notifications</h4>
                <p className="text-xs text-slate-400">You're all caught up.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 text-xs transition-colors cursor-pointer group flex items-start gap-3 ${
                      isUnread
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-spar-green'
                        : 'bg-white hover:bg-slate-50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`font-semibold truncate ${
                            isUnread ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-spar-green shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed text-[11px]">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400 border-t border-slate-100/60">
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        {notif.linkUrl && (
                          <span className="flex items-center gap-0.5 text-spar-green font-medium group-hover:underline">
                            View details <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
