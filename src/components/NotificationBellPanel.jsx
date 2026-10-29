import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  Sprout,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Archive,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function getNotificationCategoryLabel(type) {
  const map = {
    complaint_submitted: 'Complaint Submitted',
    complaint_status: 'Status Update',
    green_points: 'Green Points',
    admin_new_complaint: 'Incoming Complaint',
    location_review: 'Location Review',
    reward: 'Green Rewards',
    info: 'Update',
    success: 'Resolved / Credit',
    warning: 'Action Required',
    error: 'Review Notice',
  };
  return map[type] || 'System Update';
}

export function getNotificationCategoryBadgeClass(type) {
  if (type === 'green_points' || type === 'reward') {
    return 'bg-amber-100 text-amber-900 border-amber-300';
  }
  if (type === 'admin_new_complaint' || type === 'warning') {
    return 'bg-orange-100 text-orange-900 border-orange-300';
  }
  if (type === 'error') {
    return 'bg-red-100 text-red-900 border-red-300';
  }
  return 'bg-emerald-100 text-forest-900 border-emerald-300';
}

export default function NotificationBellPanel() {
  const {
    currentUser,
    myNotifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
  } = useApp();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!currentUser) return null;

  const allNotificationsPath =
    currentUser.role === 'authority' ? '/authority/notifications' : '/citizen/notifications';

  const getTargetLink = (notif) => {
    if (notif.type === 'green_points' || notif.type === 'reward') {
      return '/citizen/rewards';
    }
    const complaintId =
      notif.related_complaint_id ||
      notif.relatedComplaintId ||
      notif.metadata?.complaint_id ||
      null;
    if (complaintId) {
      return currentUser.role === 'authority'
        ? `/authority/complaints/${complaintId}`
        : `/citizen/complaints/${complaintId}`;
    }
    if (notif.metadata?.link) return notif.metadata.link;
    if (notif.link) return notif.link;
    return allNotificationsPath;
  };

  const handleOpenNotification = (notif) => {
    if (!notif.is_read && !notif.read) {
      markNotificationRead(notif.id);
    }
    setOpen(false);
    navigate(getTargetLink(notif));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-forest-900 border border-transparent hover:border-emerald-200 transition"
        aria-label={`Notifications (${unreadNotificationCount} unread)`}
        title="Open Notification Center"
      >
        <Bell className="w-4 h-4 text-forest-800" />
        {unreadNotificationCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-extrabold shadow-sm">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[350px] sm:w-[410px] bg-white rounded-2xl border border-emerald-200 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="village-canopy-bg px-4 py-3 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-300" />
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold">Notification Center</h3>
                <p className="text-[10px] text-emerald-200">
                  {unreadNotificationCount > 0
                    ? `${unreadNotificationCount} unread update${unreadNotificationCount === 1 ? '' : 's'}`
                    : 'All notifications read'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white transition"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 text-emerald-100"
                aria-label="Close Notification Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {myNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  You&apos;re all caught up! New updates will appear here.
                </p>
              </div>
            ) : (
              myNotifications.slice(0, 12).map((n) => {
                const isRead = Boolean(n.is_read ?? n.read);
                const complaintId =
                  n.related_complaint_id || n.relatedComplaintId || n.metadata?.complaint_id || null;
                const createdTime = n.created_at || n.createdAt;
                const categoryLabel = getNotificationCategoryLabel(n.type);
                const badgeCls = getNotificationCategoryBadgeClass(n.type);

                return (
                  <div
                    key={n.id}
                    className={`p-3.5 transition ${
                      isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/70 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"
                            title="Unread"
                          />
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}
                        >
                          {categoryLabel}
                        </span>
                        {complaintId && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-forest-900">
                            {complaintId}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400">
                          {isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>

                      {!isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                          }}
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-forest-800 hover:underline shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                          Read
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNotification(n)}
                      className="mt-1.5 text-left w-full group"
                    >
                      <p className="text-xs font-extrabold text-slate-900 group-hover:text-forest-800">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    </button>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>{createdTime ? new Date(createdTime).toLocaleString() : ''}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(n)}
                        className="inline-flex items-center gap-1 font-bold text-forest-800 hover:underline"
                      >
                        <span>
                          {n.type === 'green_points' || n.type === 'reward'
                            ? 'Open Green Rewards'
                            : complaintId
                            ? `Open ${complaintId}`
                            : 'Open Details'}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
            <Link
              to={allNotificationsPath}
              onClick={() => setOpen(false)}
              className="text-xs font-extrabold text-forest-800 hover:underline"
            >
              View All Notifications ({myNotifications.length}) →
            </Link>
            {myNotifications.some((n) => n.is_read || n.read) && (
              <button
                type="button"
                onClick={() => clearReadNotifications()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-700"
              >
                <Archive className="w-3 h-3" />
                Clear Read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
