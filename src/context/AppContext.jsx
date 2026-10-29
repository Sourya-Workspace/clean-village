import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { isFirebaseConfigured } from '../services/firebase';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { isValidCoordinatePair, formatLocationLabel } from '../services/geocoding';
import {
  normalizeComplaintStatus,
  getStatusBadgeLabel,
  getPermittedNextStatuses,
} from '../components/StatusBadge';
import {
  INITIAL_USERS,
  INITIAL_COMPLAINTS,
  INITIAL_TASKS,
  INITIAL_SCHEDULES,
  INITIAL_REWARDS,
  INITIAL_REDEMPTIONS,
  INITIAL_POINT_TRANSACTIONS,
  INITIAL_ACTIVITIES,
  INITIAL_NOTIFICATIONS,
  SANITATION_TIPS,
} from '../data/seedData';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  USERS: 'cv_csp_users_v4',
  CURRENT_USER: 'cv_csp_current_user_v4',
  COMPLAINTS: 'cv_csp_complaints_v4',
  COMPLAINT_HISTORY: 'cv_csp_complaint_history_v4',
  TASKS: 'cv_csp_tasks_v4',
  SCHEDULES: 'cv_csp_schedules_v4',
  REWARDS: 'cv_csp_rewards_v4',
  REDEMPTIONS: 'cv_csp_redemptions_v4',
  TRANSACTIONS: 'cv_csp_transactions_v4',
  ACTIVITIES: 'cv_csp_activities_v4',
  NOTIFICATIONS: 'cv_csp_notifications_v4',
  SLA_HOURS: 'cv_csp_sla_hours_v4',
  SELECTED_LOCATION: 'cv_selected_india_location_v1',
};

/**
 * Safely normalizes any complaint record from Supabase or Demo Storage
 * without inventing fabricated GPS coordinates.
 */
function normalizeComplaintRecord(c) {
  const rawLat = c.reported_latitude ?? c.coordinates?.lat ?? null;
  const rawLng = c.reported_longitude ?? c.coordinates?.lng ?? null;
  const validCoords = isValidCoordinatePair(rawLat, rawLng);
  const canonicalStatus = normalizeComplaintStatus(c.status);
  const ownerId = c.citizen_user_id || c.userId;
  const ownerName = c.citizen_name || c.userName || 'Citizen';
  const submittedAt = c.submitted_at || c.submittedAt || new Date().toISOString();
  const updatedAt = c.updated_at || c.updatedAt || submittedAt;

  return {
    ...c,
    id: c.id,
    userId: ownerId,
    citizen_user_id: ownerId,
    userName: ownerName,
    citizen_name: ownerName,
    citizenRegisteredLocality: c.citizen_registered_locality || c.citizenRegisteredLocality || '',
    status: canonicalStatus,
    state_name: c.state_name || '',
    district_name: c.district_name || '',
    city_name: c.city_name || '',
    village_name: c.village_name || (c.village ? c.village.split(',')[0].trim() : ''),
    locality: c.locality || (c.area ? c.area.split(',')[0].trim() : ''),
    landmark: c.landmark || '',
    reported_latitude: validCoords ? Number(rawLat) : null,
    reported_longitude: validCoords ? Number(rawLng) : null,
    coordinates: validCoords ? { lat: Number(rawLat), lng: Number(rawLng) } : null,
    location_capture_method:
      c.location_capture_method || (validCoords ? 'map_confirmed' : 'manual_entry'),
    location_confirmation_status:
      c.location_confirmation_status ||
      (validCoords ? 'Confirmed Map Location' : 'Manually Entered Address (No Map Coordinates)'),
    location_review_status: c.location_review_status || 'Not Reviewed',
    location_review_note: c.location_review_note || '',
    location_reviewed_by: c.location_reviewed_by || '',
    location_reviewed_at: c.location_reviewed_at || null,
    assignedTeam: c.assigned_team ?? c.assignedTeam ?? '',
    taskId: c.task_id ?? c.taskId ?? '',
    authorityRemarks: c.authority_remarks ?? c.authorityRemarks ?? '',
    rejectionReason: c.rejection_reason ?? c.rejectionReason ?? '',
    photoUrl: c.photo_url ?? c.photoUrl ?? '',
    resolutionPhotoUrl: c.resolution_photo_url ?? c.resolutionPhotoUrl ?? '',
    pointsAwarded: Boolean(c.points_awarded ?? c.pointsAwarded),
    submittedAt,
    submitted_at: submittedAt,
    updatedAt,
    updated_at: updatedAt,
    resolvedAt: c.resolved_at ?? c.resolvedAt ?? null,
    history: Array.isArray(c.history) ? c.history : [],
    timeline: Array.isArray(c.timeline) ? c.timeline : [],
  };
}

function buildInitialHistoryFromComplaints(complaintsList) {
  const all = [];
  for (const c of complaintsList) {
    if (Array.isArray(c.history) && c.history.length > 0) {
      all.push(...c.history);
    } else if (Array.isArray(c.timeline)) {
      c.timeline.forEach((t, idx) => {
        all.push({
          id: `HIST-${c.id}-${idx + 1}`,
          complaint_id: c.id,
          previous_status: idx === 0 ? null : normalizeComplaintStatus(c.timeline[idx - 1].status),
          new_status: normalizeComplaintStatus(t.status),
          updated_by_user_id: null,
          actor_role: idx === 0 ? 'citizen' : 'authority',
          actor_name: t.actor || 'CleanVillage System',
          public_update_message: t.note || `Status updated to ${getStatusBadgeLabel(t.status)}.`,
          internal_admin_note: null,
          created_at: t.timestamp || c.submittedAt,
        });
      });
    }
  }
  return all;
}

function loadFromStorage(key, fallback, migrator = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (migrator && Array.isArray(parsed)) {
      return parsed.map(migrator);
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Generates exact notification title and message for a complaint lifecycle status change.
 */
export function buildStatusNotificationContent(complaintId, rawNewStatus) {
  const status = normalizeComplaintStatus(rawNewStatus);
  switch (status) {
    case 'submitted':
      return {
        title: 'Complaint Submitted',
        message: `Your sanitation complaint has been submitted successfully. Complaint ID: ${complaintId}. We will notify you when its status changes.`,
        type: 'complaint_submitted',
      };
    case 'under_review':
      return {
        title: 'Complaint Under Verification',
        message: `Your complaint ${complaintId} is being reviewed by the CleanVillage team.`,
        type: 'complaint_status',
      };
    case 'verified':
      return {
        title: 'Complaint Verified',
        message: `Your complaint ${complaintId} has been verified. The next steps will be updated as work progresses.`,
        type: 'complaint_status',
      };
    case 'worker_assigned':
      return {
        title: 'Cleaning Team Assigned',
        message: `A sanitation worker has been assigned to your complaint ${complaintId}.`,
        type: 'complaint_status',
      };
    case 'in_progress':
      return {
        title: 'Cleaning Work Started',
        message: `Work on your reported sanitation issue ${complaintId} is now in progress.`,
        type: 'complaint_status',
      };
    case 'resolved':
      return {
        title: 'Complaint Resolved',
        message: `The sanitation issue you reported under complaint ${complaintId} has been marked as resolved. Please review the latest status in your CleanVillage account.`,
        type: 'complaint_status',
      };
    case 'reopened':
      return {
        title: 'Complaint Reopened',
        message: `Your complaint ${complaintId} has been reopened for further attention.`,
        type: 'complaint_status',
      };
    case 'rejected':
      return {
        title: 'Complaint Update',
        message: `Your complaint ${complaintId} could not be approved at this stage. Please check the complaint details for the review explanation, if available.`,
        type: 'complaint_status',
      };
    default:
      return {
        title: 'Complaint Status Updated',
        message: `Your complaint ${complaintId} status is now ${getStatusBadgeLabel(status)}.`,
        type: 'complaint_status',
      };
  }
}

export function AppProvider({ children }) {
  const [users, setUsers] = useState(() => loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUserId, setCurrentUserId] = useState(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_USER, null)
  );
  const [allComplaintsState, setAllComplaintsState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS, normalizeComplaintRecord)
  );
  const [complaintHistory, setComplaintHistory] = useState(() =>
    loadFromStorage(
      STORAGE_KEYS.COMPLAINT_HISTORY,
      buildInitialHistoryFromComplaints(INITIAL_COMPLAINTS)
    )
  );
  const [tasks, setTasks] = useState(() => loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS));
  const [schedules, setSchedules] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES)
  );
  const [rewards, setRewards] = useState(() =>
    loadFromStorage(STORAGE_KEYS.REWARDS, INITIAL_REWARDS)
  );
  const [redemptions, setRedemptions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.REDEMPTIONS, INITIAL_REDEMPTIONS)
  );
  const [pointTransactions, setPointTransactions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_POINT_TRANSACTIONS)
  );
  const [activities, setActivities] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES)
  );
  const [notifications, setNotifications] = useState(() =>
    loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );
  const [slaTargetHours, setSlaTargetHours] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SLA_HOURS, Number(import.meta.env.VITE_SLA_TARGET_HOURS) || 48)
  );
  const [selectedLocation, setSelectedLocationState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_LOCATION, null)
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);

  // Track shown notification toast IDs so the same toast is never displayed repeatedly
  const shownNotificationToastIds = useRef(new Set());
  const broadcastChannelRef = useRef(null);

  const showToast = (message, type = 'success', dedupeKey = null) => {
    if (dedupeKey && shownNotificationToastIds.current.has(dedupeKey)) {
      return;
    }
    if (dedupeKey) {
      shownNotificationToastIds.current.add(dedupeKey);
    }
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  };

  // Persist local state when in Demo Mode (or as cache)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(allComplaintsState));
  }, [allComplaintsState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLAINT_HISTORY, JSON.stringify(complaintHistory));
  }, [complaintHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
  }, [rewards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify(redemptions));
  }, [redemptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(pointTransactions));
  }, [pointTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SLA_HOURS, JSON.stringify(slaTargetHours));
  }, [slaTargetHours]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_LOCATION, JSON.stringify(selectedLocation));
  }, [selectedLocation]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  // Cross-tab real-time synchronization channel
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cleanvillage_realtime_sync_v4');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'SYNC_STATE') {
          setAllComplaintsState(
            loadFromStorage(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS, normalizeComplaintRecord)
          );
          setComplaintHistory(
            loadFromStorage(
              STORAGE_KEYS.COMPLAINT_HISTORY,
              buildInitialHistoryFromComplaints(INITIAL_COMPLAINTS)
            )
          );
          setNotifications(loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS));
          setPointTransactions(
            loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_POINT_TRANSACTIONS)
          );
          setUsers(loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
          if (
            msg.toastForUserId &&
            currentUser &&
            msg.toastForUserId === currentUser.id &&
            msg.toastMessage
          ) {
            showToast(msg.toastMessage, msg.toastType || 'info', msg.dedupeKey);
          }
        }
      };
      return () => bc.close();
    }
  }, [currentUser]);

  const broadcastRealtimeSync = (payload = {}) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'SYNC_STATE', ...payload });
      } catch {
        // Ignore broadcast errors
      }
    }
  };

  // ==========================================================================
  // SUPABASE SESSION, PROFILE, ROLE-SCOPED QUERIES & REALTIME SUBSCRIPTIONS
  // ==========================================================================
  const fetchAuthorizedSupabaseData = async (authUser) => {
    if (!isSupabaseConfigured || !authUser?.id) return;

    // 1. Load authenticated user's profile & role from public.profiles
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const mappedUser = profileRow
      ? {
          id: profileRow.id,
          fullName: profileRow.full_name,
          email: profileRow.email,
          mobile: profileRow.mobile || '',
          role: profileRow.role || 'citizen',
          state_name: profileRow.state_name || '',
          district_name: profileRow.district_name || '',
          city_name: profileRow.city_name || '',
          village_name: profileRow.village_name || '',
          locality: profileRow.locality || '',
          householdArea: profileRow.household_area || '',
          village: profileRow.village || 'India',
          greenPoints: profileRow.green_points || 0,
          totalPointsEarned: profileRow.total_points_earned || 0,
          totalPointsRedeemed: profileRow.total_points_redeemed || 0,
          optInLeaderboard: profileRow.opt_in_leaderboard ?? true,
          notificationPrefs: profileRow.notification_prefs || {},
          joinedAt: profileRow.created_at,
        }
      : {
          id: authUser.id,
          fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Citizen',
          email: authUser.email,
          role: 'citizen',
          greenPoints: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
          village: 'India',
        };

    setUsers((prev) => {
      const others = prev.filter((u) => u.id !== mappedUser.id);
      return [mappedUser, ...others];
    });
    setCurrentUserId(mappedUser.id);

    // 2. Role-Scoped Complaint Query (Mandatory Section 6 Privacy Enforcement)
    let complaintsQuery = supabase
      .from('complaints')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (mappedUser.role !== 'authority') {
      // Citizens strictly fetch ONLY their own complaints
      complaintsQuery = complaintsQuery.eq('citizen_user_id', mappedUser.id);
    }

    const { data: dbComplaints } = await complaintsQuery;
    if (Array.isArray(dbComplaints)) {
      setAllComplaintsState(dbComplaints.map(normalizeComplaintRecord));
    }

    // 3. Role-Scoped Complaint History Query (Citizens use citizen_complaint_timeline view without internal_admin_note)
    const historyTable =
      mappedUser.role === 'authority' ? 'complaint_history' : 'citizen_complaint_timeline';
    const { data: dbHistory } = await supabase
      .from(historyTable)
      .select('*')
      .order('created_at', { ascending: true });
    if (Array.isArray(dbHistory)) {
      setComplaintHistory(dbHistory);
    }

    // 4. Recipient-Scoped Notifications Query
    const { data: dbNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', mappedUser.id)
      .order('created_at', { ascending: false });
    if (Array.isArray(dbNotifs)) {
      setNotifications(
        dbNotifs.map((n) => ({
          ...n,
          userId: n.recipient_user_id,
          read: Boolean(n.is_read),
          createdAt: n.created_at,
          link: n.metadata?.link || '/',
        }))
      );
    }

    // 5. User-Scoped Green Points Transactions Query
    let txQuery = supabase
      .from('green_points_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (mappedUser.role !== 'authority') {
      txQuery = txQuery.eq('user_id', mappedUser.id);
    }
    const { data: dbTx } = await txQuery;
    if (Array.isArray(dbTx)) {
      setPointTransactions(
        dbTx.map((t) => ({
          ...t,
          userId: t.user_id,
          type: t.transaction_type === 'credit' ? 'EARNED' : 'REDEEMED',
          points: t.points_amount,
          referenceId: t.complaint_id || t.idempotency_key,
          createdAt: t.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session?.user) {
        fetchAuthorizedSupabaseData(data.session.user).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchAuthorizedSupabaseData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Subscribe to Supabase Realtime for live notifications, complaint updates, and profile balance changes
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) return;

    const channel = supabase
      .channel(`user-live-updates-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (!payload.new) return;
          const n = {
            ...payload.new,
            userId: payload.new.recipient_user_id,
            read: Boolean(payload.new.is_read),
            createdAt: payload.new.created_at,
            link: payload.new.metadata?.link || '/',
          };
          setNotifications((prev) => {
            if (prev.some((existing) => existing.id === n.id)) return prev;
            return [n, ...prev];
          });
          showToast(`${n.title}: ${n.message}`, 'info', `notif-toast-${n.id}`);
          // Refresh citizen Green Points balance, transactions, and complaints when a reward or status notification arrives
          fetchAuthorizedSupabaseData(currentUser);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`,
        },
        () => {
          fetchAuthorizedSupabaseData(currentUser);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter:
            currentUser.role === 'authority'
              ? undefined
              : `citizen_user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchAuthorizedSupabaseData(currentUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role]);

  // ==========================================================================
  // STRICT CITIZEN vs ADMINISTRATOR DATA SEPARATION (Requirement 6)
  // ==========================================================================
  /**
   * `complaints` exposed to the UI is strictly scoped by role:
   * - If logged in as a citizen, ONLY returns complaints owned by `currentUser.id`.
   * - If logged in as an authorized administrator, returns all complaints within scope.
   */
  const complaints = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'authority') {
      return allComplaintsState;
    }
    return allComplaintsState.filter(
      (c) => c.citizen_user_id === currentUser.id || c.userId === currentUser.id
    );
  }, [allComplaintsState, currentUser]);

  /**
   * Public Aggregate Statistics (Safe for Homepage / Community Impact page
   * without leaking any citizen's private complaint details, photos, or identity).
   */
  const publicAggregateStats = useMemo(() => {
    const total = allComplaintsState.length;
    const resolved = allComplaintsState.filter(
      (c) => normalizeComplaintStatus(c.status) === 'resolved'
    ).length;
    const inProgress = allComplaintsState.filter((c) =>
      ['under_review', 'verified', 'worker_assigned', 'in_progress'].includes(
        normalizeComplaintStatus(c.status)
      )
    ).length;
    return { total, resolved, inProgress };
  }, [allComplaintsState]);

  /**
   * Authorized Complaint Lookup by ID:
   * Enforces that Citizen B can NEVER access Citizen A's complaint by guessing a URL or ID!
   */
  const getAuthorizedComplaintById = (complaintId) => {
    if (!currentUser || !complaintId) {
      return { complaint: null, unauthorized: true };
    }
    const target = allComplaintsState.find((c) => c.id === complaintId);
    if (!target) {
      return { complaint: null, unauthorized: false };
    }
    if (
      currentUser.role !== 'authority' &&
      target.citizen_user_id !== currentUser.id &&
      target.userId !== currentUser.id
    ) {
      return { complaint: null, unauthorized: true };
    }
    return { complaint: target, unauthorized: false };
  };

  /**
   * Returns complaint history entries for a complaint, stripping `internal_admin_note`
   * whenever the viewer is not an authorized administrator.
   */
  const getComplaintHistoryForViewer = (complaintId) => {
    const { complaint, unauthorized } = getAuthorizedComplaintById(complaintId);
    if (!complaint || unauthorized) return [];

    const fromTable = complaintHistory.filter((h) => h.complaint_id === complaintId);
    const sourceList =
      fromTable.length > 0
        ? fromTable
        : Array.isArray(complaint.history) && complaint.history.length > 0
        ? complaint.history
        : [];

    if (currentUser?.role === 'authority') {
      return sourceList;
    }
    // Strip internal_admin_note for non-administrators
    return sourceList.map((entry) => ({
      ...entry,
      internal_admin_note: null,
      internalNote: null,
    }));
  };

  /**
   * Strict Recipient-Scoped Notifications for the currently authenticated user.
   */
  const myNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => {
        const recipientId = n.recipient_user_id || n.userId;
        if (recipientId === currentUser.id) return true;
        if (
          !isSupabaseConfigured &&
          currentUser.role === 'authority' &&
          n.targetRole === 'authority'
        ) {
          return true;
        }
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || b.createdAt).getTime() -
          new Date(a.created_at || a.createdAt).getTime()
      );
  }, [notifications, currentUser]);

  const unreadNotificationCount = useMemo(
    () => myNotifications.filter((n) => !(n.is_read ?? n.read)).length,
    [myNotifications]
  );

  const setSelectedLocation = (loc) => {
    setSelectedLocationState(loc);
    if (loc) {
      showToast(`Location set to: ${formatLocationLabel(loc)}`, 'info');
    }
  };

  const clearSelectedLocation = () => {
    setSelectedLocationState(null);
    showToast('Location filter cleared (Showing All India).', 'info');
  };

  const matchesLocationFilter = (record, filterLoc = selectedLocation) => {
    if (!filterLoc) return true;
    const recState = (record.state_name || '').toLowerCase();
    const recDistrict = (record.district_name || '').toLowerCase();
    const recPlace = (
      record.city_or_village ||
      record.village_name ||
      record.city_name ||
      record.village ||
      record.area ||
      record.location ||
      ''
    ).toLowerCase();
    const combinedText = `${recState} ${recDistrict} ${recPlace} ${(record.locality || '').toLowerCase()} ${(
      record.area || ''
    ).toLowerCase()}`;

    const filterState = (filterLoc.stateName || '').toLowerCase();
    const filterDistrict = (filterLoc.districtName || '').toLowerCase();
    const filterCityVillage = (
      filterLoc.cityOrVillage ||
      filterLoc.villageName ||
      filterLoc.cityName ||
      ''
    ).toLowerCase();

    if (filterCityVillage) return combinedText.includes(filterCityVillage);
    if (filterDistrict) return combinedText.includes(filterDistrict);
    if (filterState) return combinedText.includes(filterState);
    return true;
  };

  const isComplaintOverdue = (complaint) => {
    if (!complaint) return false;
    const status = normalizeComplaintStatus(complaint.status);
    if (status === 'resolved' || status === 'rejected') return false;
    const submittedTime = new Date(complaint.submittedAt || complaint.submitted_at).getTime();
    const elapsedHours = (Date.now() - submittedTime) / (1000 * 60 * 60);
    return elapsedHours > slaTargetHours;
  };

  const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test((email || '').trim());

  // ==========================================================================
  // PERSISTENT IDEMPOTENT NOTIFICATION HELPER
  // ==========================================================================
  const createPersistentNotification = ({
    recipientUserId,
    targetRole = 'citizen',
    title,
    message,
    type = 'complaint_status',
    relatedComplaintId = null,
    relatedTransactionId = null,
    idempotencyKey = null,
    metadata = {},
    triggerToast = false,
  }) => {
    if (!recipientUserId) return null;
    const finalKey =
      idempotencyKey ||
      `notif:${recipientUserId}:${type}:${relatedComplaintId || ''}:${title}:${Date.now()}`;

    let createdNotif = null;
    setNotifications((prev) => {
      if (idempotencyKey && prev.some((n) => n.idempotency_key === idempotencyKey)) {
        return prev;
      }
      const nowIso = new Date().toISOString();
      createdNotif = {
        id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipient_user_id: recipientUserId,
        userId: recipientUserId,
        targetRole,
        title,
        message,
        type,
        related_complaint_id: relatedComplaintId,
        related_transaction_id: relatedTransactionId,
        idempotency_key: finalKey,
        is_read: false,
        read: false,
        created_at: nowIso,
        createdAt: nowIso,
        read_at: null,
        metadata,
        link: metadata?.link || '/',
      };
      return [createdNotif, ...prev];
    });

    if (triggerToast && currentUser && currentUser.id === recipientUserId) {
      showToast(`${title}: ${message}`, 'info', finalKey);
    }

    return createdNotif;
  };

  const markNotificationRead = async (notifId) => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId &&
        (n.recipient_user_id === currentUser?.id ||
          n.userId === currentUser?.id ||
          (currentUser?.role === 'authority' && n.targetRole === 'authority'))
          ? { ...n, is_read: true, read: true, read_at: nowIso }
          : n
      )
    );
    if (isSupabaseConfigured && currentUser) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: nowIso })
        .eq('id', notifId)
        .eq('recipient_user_id', currentUser.id);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipient_user_id === currentUser.id ||
        n.userId === currentUser.id ||
        (currentUser.role === 'authority' && n.targetRole === 'authority')
          ? { ...n, is_read: true, read: true, read_at: nowIso }
          : n
      )
    );
    if (isSupabaseConfigured) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: nowIso })
        .eq('recipient_user_id', currentUser.id)
        .eq('is_read', false);
    }
    showToast('All notifications marked as read.', 'info');
  };

  const clearReadNotifications = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.filter((n) => {
        const isMine =
          n.recipient_user_id === currentUser.id ||
          n.userId === currentUser.id ||
          (currentUser.role === 'authority' && n.targetRole === 'authority');
        if (!isMine) return true;
        return !(n.is_read ?? n.read);
      })
    );
    showToast('Cleared read notifications from your view.', 'info');
  };

  // ==========================================================================
  // AUTHENTICATION (Cross-Device Supabase Auth + Clearly Labeled Demo Mode)
  // ==========================================================================
  const login = async (email, password, expectedTab = 'citizen') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidGmail(cleanEmail)) {
      return {
        success: false,
        error: 'Email ID must be a valid @gmail.com address (e.g., xxxxxx@gmail.com).',
      };
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data?.user) {
        return {
          success: false,
          error: error?.message || 'Invalid email or password.',
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const actualRole = profile?.role || 'citizen';
      if (expectedTab === 'admin' && actualRole !== 'authority') {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            'Unauthorized: This account does not have Administrator privileges. Only the provisioned Administrator account may sign in here.',
        };
      }

      await fetchAuthorizedSupabaseData(data.user);
      showToast(`Signed in as ${profile?.full_name || cleanEmail}`, 'success');
      return {
        success: true,
        user: {
          id: data.user.id,
          email: cleanEmail,
          fullName: profile?.full_name || cleanEmail,
          role: actualRole,
        },
      };
    }

    // Local Demo Mode fallback when Supabase environment variables are not yet configured
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        success: false,
        error:
          'No account found with this @gmail.com address in Demo Mode. Connect Supabase in .env for shared cross-device accounts, or register a citizen account.',
      };
    }

    if (expectedTab === 'admin' && user.role !== 'authority') {
      return {
        success: false,
        error: 'Unauthorized: Only the provisioned Administrator account can access the Admin portal.',
      };
    }

    if (user.passwordHash && user.passwordHash !== `demo_hashed_${password}`) {
      return {
        success: false,
        error: 'Incorrect password for this account.',
      };
    }

    setCurrentUserId(user.id);
    showToast(`Welcome back, ${user.fullName}!`, 'success');
    return { success: true, user };
  };

  const quickDemoLogin = (role, demoUserId = null) => {
    if (isSupabaseConfigured) {
      showToast(
        'Live Supabase mode is active. Please sign in with your real Supabase credentials.',
        'warning'
      );
      return null;
    }
    const target = demoUserId
      ? users.find((u) => u.id === demoUserId)
      : role === 'authority'
      ? users.find((u) => u.role === 'authority')
      : users.find((u) => u.role === 'citizen');

    if (target) {
      setCurrentUserId(target.id);
      showToast(
        `Demo Mode: Switched to ${target.role === 'authority' ? 'Administrator' : 'Citizen'} (${
          target.fullName
        })`,
        'info'
      );
      return target;
    }
    return null;
  };

  const registerCitizen = async (payload) => {
    const {
      fullName,
      email,
      mobile,
      password,
      householdArea,
      village,
      stateName = '',
      districtName = '',
      cityOrVillage = '',
      consent,
    } = payload;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!isValidGmail(cleanEmail)) {
      return {
        success: false,
        error: 'You must provide a valid @gmail.com email address (e.g., xxxxxx@gmail.com).',
      };
    }
    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'You must create a password of at least 6 characters during citizen signup.',
      };
    }
    if (!consent) {
      return { success: false, error: 'You must accept the Privacy Policy to register.' };
    }

    const formattedVillage =
      [cityOrVillage || village, districtName, stateName].filter(Boolean).join(', ') || 'India';

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            mobile: mobile.trim(),
            state_name: stateName.trim(),
            district_name: districtName.trim(),
            city_name: cityOrVillage.trim(),
            village_name: (cityOrVillage || village || '').trim(),
            household_area: householdArea.trim(),
            village: formattedVillage,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        await fetchAuthorizedSupabaseData(data.user);
      }
      showToast(`Citizen account (${cleanEmail}) registered in Supabase!`, 'success');
      return {
        success: true,
        requiresEmailConfirmation: !data?.session,
        user: {
          id: data?.user?.id,
          email: cleanEmail,
          fullName: fullName.trim(),
          role: 'citizen',
        },
      };
    }

    // Demo Mode registration
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: 'An account with this @gmail.com address already exists.',
      };
    }

    const newUser = {
      id: `user-citizen-${Date.now()}`,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      passwordHash: `demo_hashed_${password}`,
      role: 'citizen', // Never promotes any signup to authority
      state_name: stateName.trim(),
      district_name: districtName.trim(),
      city_name: cityOrVillage.trim(),
      village_name: (cityOrVillage || village || '').trim(),
      locality: householdArea.trim(),
      householdArea: householdArea.trim(),
      village: formattedVillage,
      greenPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      optInLeaderboard: true,
      notificationPrefs: {
        complaintUpdates: true,
        collectionReminders: true,
        cleanlinessDrives: true,
        rewardAlerts: true,
      },
      joinedAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    createPersistentNotification({
      recipientUserId: newUser.id,
      targetRole: 'citizen',
      title: 'Welcome to CleanVillage!',
      message:
        'Your citizen account has been created. Report sanitation issues or join cleanliness drives to earn Green Points.',
      type: 'system',
      idempotencyKey: `notif:welcome:${newUser.id}`,
      metadata: { link: '/citizen/dashboard' },
    });
    showToast(`Citizen account (${cleanEmail}) registered!`, 'success');
    return { success: true, user: newUser };
  };

  const requestPasswordReset = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidGmail(cleanEmail)) {
      return {
        success: false,
        error: 'Please enter a valid @gmail.com email address.',
      };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    showToast(`Password reset instructions sent to ${cleanEmail}.`, 'info');
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setCurrentUserId(null);
    showToast('You have been signed out safely.', 'info');
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    const safeUpdates = {
      fullName: updates.fullName ?? currentUser.fullName,
      mobile: updates.mobile ?? currentUser.mobile,
      state_name: updates.state_name ?? currentUser.state_name,
      district_name: updates.district_name ?? currentUser.district_name,
      village_name: updates.village_name ?? currentUser.village_name,
      householdArea: updates.householdArea ?? currentUser.householdArea,
      village: updates.village ?? currentUser.village,
      optInLeaderboard:
        typeof updates.optInLeaderboard === 'boolean'
          ? updates.optInLeaderboard
          : currentUser.optInLeaderboard,
      notificationPrefs: updates.notificationPrefs || currentUser.notificationPrefs,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: safeUpdates.fullName,
          mobile: safeUpdates.mobile,
          state_name: safeUpdates.state_name,
          district_name: safeUpdates.district_name,
          village_name: safeUpdates.village_name,
          household_area: safeUpdates.householdArea,
          village: safeUpdates.village,
          opt_in_leaderboard: safeUpdates.optInLeaderboard,
          notification_prefs: safeUpdates.notificationPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
      if (error) return { success: false, error: error.message };
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...safeUpdates } : u))
    );
    showToast('Profile settings updated successfully.', 'success');
    return { success: true };
  };

  // ==========================================================================
  // GREEN POINTS ATOMIC TRANSACTION & CREDIT NOTIFICATION (Section 4)
  // ==========================================================================
  const awardGreenPointsOnce = ({
    userId,
    points,
    reason,
    referenceId,
    complaintId = null,
    idempotencyKey: explicitKey = null,
  }) => {
    if (!userId || !points || points <= 0) {
      return {
        awarded: false,
        alreadyAwarded: false,
        error: 'Valid recipient userId and positive points amount are required.',
      };
    }

    const idempotencyKey =
      explicitKey ||
      (referenceId && String(referenceId).startsWith('gp:')
        ? String(referenceId)
        : `gp:${userId}:${referenceId || complaintId || reason}`);

    const existingTx = pointTransactions.find(
      (tx) =>
        tx.idempotency_key === idempotencyKey ||
        (referenceId && tx.userId === userId && tx.referenceId === referenceId && tx.type === 'EARNED')
    );

    if (existingTx) {
      return { awarded: false, alreadyAwarded: true, transaction: existingTx };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return {
        awarded: false,
        alreadyAwarded: false,
        error: `Recipient user profile (${userId}) not found; Green Points were not credited.`,
      };
    }

    const currentBalance = targetUser.greenPoints || 0;
    const updatedBalance = currentBalance + points;
    const nowIso = new Date().toISOString();

    const tx = {
      id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      userId,
      complaint_id: complaintId,
      transaction_type: 'credit',
      type: 'EARNED',
      points_amount: points,
      points,
      balance_after: updatedBalance,
      reason,
      referenceId: referenceId || complaintId,
      idempotency_key: idempotencyKey,
      authorized_by_user_id: currentUser?.id || null,
      created_at: nowIso,
      createdAt: nowIso,
    };

    setPointTransactions((prev) => [tx, ...prev]);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              greenPoints: updatedBalance,
              totalPointsEarned: (u.totalPointsEarned || 0) + points,
            }
          : u
      )
    );

    // Send Required Green Points Credited! Notification ONLY after balance & transaction succeed
    createPersistentNotification({
      recipientUserId: userId,
      targetRole: 'citizen',
      title: 'Green Points Credited!',
      message: `Green Points have been credited to your account. You received ${points} points for ${reason}. Your updated balance is ${updatedBalance} points.`,
      type: 'green_points',
      relatedComplaintId: complaintId,
      relatedTransactionId: tx.id,
      idempotencyKey: `notif:gp_credit:${idempotencyKey}`,
      metadata: {
        link: '/citizen/rewards',
        points_credited: points,
        updated_balance: updatedBalance,
        reason,
        complaint_id: complaintId,
      },
      triggerToast: true,
    });

    return { awarded: true, alreadyAwarded: false, transaction: tx, updatedBalance };
  };

  // ==========================================================================
  // COMPLAINT SUBMISSION, LIFECYCLE TRANSITIONS & NOTIFICATIONS (Sections 2, 3, 5, 7)
  // ==========================================================================
  const generateComplaintId = (existingList) => {
    const maxNum = existingList.reduce((max, item) => {
      const match = item.id && item.id.match(/CV-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = String(maxNum + 1).padStart(4, '0');
    return `CV-2026-${nextNum}`;
  };

  const findSimilarComplaints = (areaText, category) => {
    if (!areaText || !category) return [];
    const cleanArea = areaText.trim().toLowerCase();
    if (cleanArea.length < 3) return [];
    return complaints.filter((c) => {
      const st = normalizeComplaintStatus(c.status);
      return (
        (c.area.toLowerCase().includes(cleanArea) ||
          (c.village_name && c.village_name.toLowerCase() === cleanArea)) &&
        c.category.toLowerCase() === category.toLowerCase() &&
        st !== 'resolved' &&
        st !== 'rejected'
      );
    });
  };

  const submitComplaint = async (data) => {
    if (!currentUser) {
      return {
        success: false,
        error: 'Authentication required: Please sign in with your citizen account to submit a complaint.',
      };
    }

    const newId = generateComplaintId(allComplaintsState);
    const nowIso = new Date().toISOString();

    const rawLat = data.reported_latitude ?? data.coordinates?.lat ?? null;
    const rawLng = data.reported_longitude ?? data.coordinates?.lng ?? null;
    const hasValidCoords = isValidCoordinatePair(rawLat, rawLng);

    const stateName = (data.state_name || data.stateName || '').trim();
    const districtName = (data.district_name || data.districtName || '').trim();
    const cityOrVillage = (
      data.village_name ||
      data.city_name ||
      data.cityOrVillage ||
      data.village ||
      ''
    ).trim();
    const locality = (data.locality || data.area || '').trim();
    const landmark = (data.landmark || '').trim();

    const fullReadableArea = [locality, landmark, cityOrVillage, districtName, stateName]
      .filter(Boolean)
      .join(', ');

    const captureMethod = hasValidCoords
      ? data.location_capture_method === 'gps'
        ? 'gps'
        : 'map_confirmed'
      : 'manual_entry';

    const confirmationStatus =
      captureMethod === 'gps'
        ? 'GPS Coordinates Confirmed'
        : captureMethod === 'map_confirmed'
        ? 'Confirmed Map Location'
        : 'Manually Entered Address (No Map Coordinates)';

    // Do NOT fabricate stock/placeholder photos if the citizen did not attach an image
    const uploadedPhotoUrl = (data.photoUrl || '').trim();

    const initialHistoryEntry = {
      id: `HIST-${newId}-1`,
      complaint_id: newId,
      previous_status: null,
      new_status: 'submitted',
      updated_by_user_id: currentUser.id,
      actor_role: 'citizen',
      actor_name: currentUser.fullName,
      public_update_message: `Complaint submitted (${confirmationStatus}).`,
      internal_admin_note: null,
      created_at: nowIso,
    };

    const newComplaint = normalizeComplaintRecord({
      id: newId,
      userId: currentUser.id,
      citizen_user_id: currentUser.id,
      userName: currentUser.fullName,
      citizen_name: currentUser.fullName,
      citizenRegisteredLocality: `${currentUser.householdArea || ''}, ${
        currentUser.village || ''
      }`.replace(/^,\s*/, ''),
      title: data.title.trim(),
      category: data.category,
      description: data.description.trim(),
      state_name: stateName,
      district_name: districtName,
      city_name: cityOrVillage,
      village_name: cityOrVillage,
      locality,
      landmark,
      village: [cityOrVillage, districtName, stateName].filter(Boolean).join(', ') || 'India',
      area: fullReadableArea || locality || cityOrVillage,
      reported_latitude: hasValidCoords ? Number(rawLat) : null,
      reported_longitude: hasValidCoords ? Number(rawLng) : null,
      coordinates: hasValidCoords ? { lat: Number(rawLat), lng: Number(rawLng) } : null,
      location_capture_method: captureMethod,
      location_confirmation_status: confirmationStatus,
      location_review_status: 'Not Reviewed',
      location_review_note: '',
      location_reviewed_by: '',
      location_reviewed_at: null,
      urgency: data.urgency || 'Medium',
      status: 'submitted',
      assignedTeam: '',
      taskId: '',
      authorityRemarks: '',
      rejectionReason: '',
      photoUrl: uploadedPhotoUrl,
      resolutionPhotoUrl: '',
      pointsAwarded: false,
      submittedAt: nowIso,
      updatedAt: nowIso,
      resolvedAt: null,
      history: [initialHistoryEntry],
      timeline: [
        {
          status: 'submitted',
          timestamp: nowIso,
          actor: `${currentUser.fullName} (Citizen)`,
          note: `Complaint submitted (${confirmationStatus}).`,
        },
      ],
    });

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('complaints').insert({
        id: newComplaint.id,
        citizen_user_id: currentUser.id,
        citizen_name: currentUser.fullName,
        citizen_registered_locality: newComplaint.citizenRegisteredLocality,
        title: newComplaint.title,
        category: newComplaint.category,
        description: newComplaint.description,
        urgency: newComplaint.urgency,
        status: 'submitted',
        state_name: newComplaint.state_name,
        district_name: newComplaint.district_name,
        city_name: newComplaint.city_name,
        village_name: newComplaint.village_name,
        locality: newComplaint.locality,
        landmark: newComplaint.landmark,
        village: newComplaint.village,
        area: newComplaint.area,
        reported_latitude: newComplaint.reported_latitude,
        reported_longitude: newComplaint.reported_longitude,
        location_capture_method: newComplaint.location_capture_method,
        location_confirmation_status: newComplaint.location_confirmation_status,
        photo_url: newComplaint.photoUrl,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      await fetchAuthorizedSupabaseData(currentUser);
      showToast(`Complaint ${newId} submitted!`, 'success');
      return { success: true, complaint: newComplaint };
    }

    // Update state atomically in local/demo store
    setAllComplaintsState((prev) => [newComplaint, ...prev]);
    setComplaintHistory((prev) => [...prev, initialHistoryEntry]);

    // 1. Citizen Notification: Complaint Submitted
    const citizenNotif = buildStatusNotificationContent(newId, 'submitted');
    createPersistentNotification({
      recipientUserId: currentUser.id,
      targetRole: 'citizen',
      title: citizenNotif.title,
      message: citizenNotif.message,
      type: citizenNotif.type,
      relatedComplaintId: newId,
      idempotencyKey: `notif:complaint_submitted:citizen:${newId}`,
      metadata: {
        link: `/citizen/complaints/${newId}`,
        complaint_id: newId,
        status: 'submitted',
      },
      triggerToast: true,
    });

    // 2. Administrator Notification(s): Notify every authorized administrator
    const adminUsers = users.filter((u) => u.role === 'authority');
    for (const admin of adminUsers) {
      createPersistentNotification({
        recipientUserId: admin.id,
        targetRole: 'authority',
        title: 'New Sanitation Complaint Received',
        message: `A new complaint ${newId} has been submitted. Category: ${newComplaint.category}. Location: ${newComplaint.area}.`,
        type: 'admin_new_complaint',
        relatedComplaintId: newId,
        idempotencyKey: `notif:complaint_submitted:admin:${admin.id}:${newId}`,
        metadata: {
          link: `/authority/complaints/${newId}`,
          complaint_id: newId,
          category: newComplaint.category,
          location: newComplaint.area,
        },
      });
    }

    broadcastRealtimeSync({
      toastForUserId: adminUsers[0]?.id,
      toastMessage: `New Sanitation Complaint Received: ${newId} (${newComplaint.category})`,
      toastType: 'warning',
      dedupeKey: `admin-new-${newId}`,
    });

    return { success: true, complaint: newComplaint };
  };

  /**
   * Authorized Complaint Status Update (Enforces role checks, permitted transitions,
   * separates public_update_message from internal_admin_note, and triggers notifications).
   */
  const updateComplaintStatus = async (
    complaintId,
    {
      newStatus: rawNewStatus,
      remarks = '',
      internalNote = '',
      rejectionReason = '',
      resolutionPhotoUrl = '',
      assignedTeam = '',
      expectedOldStatus = null,
    }
  ) => {
    if (!currentUser || (currentUser.role !== 'authority' && currentUser.role !== 'worker')) {
      return {
        success: false,
        error: 'Unauthorized: Citizens cannot directly modify complaint statuses.',
      };
    }

    const complaint = allComplaintsState.find((c) => c.id === complaintId);
    if (!complaint) return { success: false, error: 'Complaint not found.' };

    const oldStatus = normalizeComplaintStatus(expectedOldStatus || complaint.status);
    const targetStatus = normalizeComplaintStatus(rawNewStatus);

    if (oldStatus === targetStatus) {
      return {
        success: false,
        error: `Complaint ${complaintId} is already in "${getStatusBadgeLabel(targetStatus)}" status.`,
      };
    }

    const permitted = getPermittedNextStatuses(oldStatus, currentUser.role);
    if (!permitted.includes(targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition from "${getStatusBadgeLabel(
          oldStatus
        )}" to "${getStatusBadgeLabel(targetStatus)}".`,
      };
    }

    if (targetStatus === 'rejected' && !rejectionReason.trim() && !remarks.trim()) {
      return {
        success: false,
        error: 'A clear review explanation is required when marking a complaint as Not Approved.',
      };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('transition_complaint_status', {
        p_complaint_id: complaintId,
        p_new_status: targetStatus,
        p_public_message: remarks,
        p_internal_note: internalNote || null,
        p_assigned_team: assignedTeam || null,
        p_rejection_reason: rejectionReason || null,
        p_resolution_photo_url: resolutionPhotoUrl || null,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      await fetchAuthorizedSupabaseData(currentUser);
      showToast(
        `Complaint ${complaintId} updated to ${getStatusBadgeLabel(targetStatus)}.`,
        'success'
      );
      return { success: true };
    }

    const nowIso = new Date().toISOString();
    let pointsResult = { awarded: false };

    if (targetStatus === 'verified') {
      pointsResult = awardGreenPointsOnce({
        userId: complaint.citizen_user_id || complaint.userId,
        points: 10,
        reason: `Verified Sanitation Complaint (${complaint.id})`,
        referenceId: `gp:complaint_verified:${complaint.id}`,
        idempotencyKey: `gp:complaint_verified:${complaint.id}`,
        complaintId: complaint.id,
      });
    } else if (targetStatus === 'resolved') {
      pointsResult = awardGreenPointsOnce({
        userId: complaint.citizen_user_id || complaint.userId,
        points: 10,
        reason: `Resolved Sanitation Complaint (${complaint.id})`,
        referenceId: `gp:complaint_resolved:${complaint.id}`,
        idempotencyKey: `gp:complaint_resolved:${complaint.id}`,
        complaintId: complaint.id,
      });
    }

    const publicMessage =
      remarks.trim() ||
      (targetStatus === 'under_review'
        ? `Your complaint ${complaint.id} is being reviewed by the CleanVillage team.`
        : targetStatus === 'verified'
        ? `Complaint verified by the sanitation authority.${
            pointsResult.awarded ? ' +10 Green Points credited.' : ''
          }`
        : targetStatus === 'worker_assigned'
        ? `Sanitation team (${
            assignedTeam || complaint.assignedTeam || 'Sanitation Squad'
          }) has been assigned.`
        : targetStatus === 'in_progress'
        ? `Cleaning work on ${complaint.id} is now in progress.`
        : targetStatus === 'resolved'
        ? `Sanitation issue ${complaint.id} has been cleaned and marked as resolved.${
            pointsResult.awarded ? ' +10 Green Points credited.' : ''
          }`
        : targetStatus === 'reopened'
        ? `Complaint ${complaint.id} has been reopened for further attention.`
        : targetStatus === 'rejected'
        ? `Not Approved: ${rejectionReason || remarks}`
        : `Status updated to ${getStatusBadgeLabel(targetStatus)}.`);

    const historyEntry = {
      id: `HIST-${complaint.id}-${Date.now()}`,
      complaint_id: complaint.id,
      previous_status: oldStatus,
      new_status: targetStatus,
      updated_by_user_id: currentUser.id,
      actor_role: currentUser.role,
      actor_name: currentUser.fullName,
      public_update_message: publicMessage,
      internal_admin_note: internalNote.trim() ? internalNote.trim() : null,
      created_at: nowIso,
    };

    setComplaintHistory((prev) => [...prev, historyEntry]);

    setAllComplaintsState((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return normalizeComplaintRecord({
          ...c,
          status: targetStatus,
          authorityRemarks: remarks.trim() ? remarks.trim() : c.authorityRemarks,
          rejectionReason:
            targetStatus === 'rejected'
              ? rejectionReason.trim() || remarks.trim()
              : c.rejectionReason,
          assignedTeam: assignedTeam || c.assignedTeam,
          resolutionPhotoUrl: resolutionPhotoUrl || c.resolutionPhotoUrl,
          pointsAwarded: c.pointsAwarded || pointsResult.awarded,
          updatedAt: nowIso,
          resolvedAt: targetStatus === 'resolved' ? nowIso : c.resolvedAt,
          history: [...(c.history || []), historyEntry],
          timeline: [
            ...(c.timeline || []),
            {
              status: targetStatus,
              timestamp: nowIso,
              actor: currentUser.fullName,
              note: publicMessage,
            },
          ],
        });
      })
    );

    if (targetStatus === 'resolved' && complaint.taskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === complaint.taskId
            ? {
                ...t,
                status: 'Completed',
                completedAt: nowIso,
                completionRemarks:
                  remarks ||
                  t.completionRemarks ||
                  'Marked completed upon complaint resolution.',
                afterPhotoUrl: resolutionPhotoUrl || t.afterPhotoUrl,
              }
            : t
        )
      );
    }

    // Create exact Citizen Status Notification
    const notifContent = buildStatusNotificationContent(complaint.id, targetStatus);
    const citizenOwnerId = complaint.citizen_user_id || complaint.userId;

    createPersistentNotification({
      recipientUserId: citizenOwnerId,
      targetRole: 'citizen',
      title: notifContent.title,
      message: notifContent.message,
      type: notifContent.type,
      relatedComplaintId: complaint.id,
      idempotencyKey: `notif:status:${complaint.id}:${historyEntry.id}`,
      metadata: {
        link: `/citizen/complaints/${complaint.id}`,
        complaint_id: complaint.id,
        previous_status: oldStatus,
        new_status: targetStatus,
      },
    });

    broadcastRealtimeSync({
      toastForUserId: citizenOwnerId,
      toastMessage: `${notifContent.title}: ${notifContent.message}`,
      toastType: targetStatus === 'rejected' ? 'error' : 'info',
      dedupeKey: `notif:status:${complaint.id}:${historyEntry.id}`,
    });

    showToast(
      `Complaint ${complaint.id} updated to "${getStatusBadgeLabel(targetStatus)}".`,
      'success'
    );
    return { success: true };
  };

  // Authority: Record Human Location Review Outcome
  const updateComplaintLocationReview = (complaintId, { reviewStatus, reviewNote }) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return {
        success: false,
        error: 'Unauthorized: Only the Administrator can record location reviews.',
      };
    }
    const target = allComplaintsState.find((c) => c.id === complaintId);
    if (!target) return { success: false, error: 'Complaint not found.' };

    const nowIso = new Date().toISOString();

    setAllComplaintsState((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          location_review_status: reviewStatus,
          location_review_note: reviewNote || '',
          location_reviewed_by: currentUser.fullName,
          location_reviewed_at: nowIso,
          updatedAt: nowIso,
        };
      })
    );

    if (reviewStatus === 'Needs Clarification') {
      const citizenOwnerId = target.citizen_user_id || target.userId;
      createPersistentNotification({
        recipientUserId: citizenOwnerId,
        targetRole: 'citizen',
        title: `Location Clarification Requested for ${target.id}`,
        message:
          reviewNote ||
          'The administrator requested additional landmark/location details for your report.',
        type: 'location_review',
        relatedComplaintId: target.id,
        idempotencyKey: `notif:loc_review:${target.id}:${nowIso}`,
        metadata: {
          link: `/citizen/complaints/${target.id}`,
          complaint_id: target.id,
        },
      });
    }

    showToast(`Location review status updated to "${reviewStatus}".`, 'success');
    return { success: true };
  };

  // Resubmit a Rejected Complaint (Citizen Correction)
  const resubmitRejectedComplaint = (complaintId, updatedFields) => {
    const target = allComplaintsState.find((c) => c.id === complaintId);
    if (!target) return { success: false, error: 'Complaint not found.' };
    if (
      !currentUser ||
      (target.citizen_user_id !== currentUser.id && target.userId !== currentUser.id)
    ) {
      return {
        success: false,
        error: 'Unauthorized: You can only update your own complaints.',
      };
    }
    if (normalizeComplaintStatus(target.status) !== 'rejected') {
      return {
        success: false,
        error: 'Only complaints marked Not Approved can be corrected and reopened.',
      };
    }

    const nowIso = new Date().toISOString();
    const historyEntry = {
      id: `HIST-${complaintId}-${Date.now()}`,
      complaint_id: complaintId,
      previous_status: 'rejected',
      new_status: 'reopened',
      updated_by_user_id: currentUser.id,
      actor_role: 'citizen',
      actor_name: currentUser.fullName,
      public_update_message:
        'Citizen provided updated details and reopened the complaint for verification.',
      internal_admin_note: null,
      created_at: nowIso,
    };

    setComplaintHistory((prev) => [...prev, historyEntry]);
    setAllComplaintsState((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return normalizeComplaintRecord({
          ...c,
          title: updatedFields.title || c.title,
          description: updatedFields.description || c.description,
          area: updatedFields.area || c.area,
          photoUrl: updatedFields.photoUrl || c.photoUrl,
          status: 'reopened',
          rejectionReason: '',
          updatedAt: nowIso,
          history: [...(c.history || []), historyEntry],
          timeline: [
            ...(c.timeline || []),
            {
              status: 'reopened',
              timestamp: nowIso,
              actor: `${currentUser.fullName} (Citizen)`,
              note: 'Citizen corrected details and reopened complaint for verification.',
            },
          ],
        });
      })
    );

    showToast(`Complaint ${complaintId} reopened for verification.`, 'success');
    return { success: true };
  };

  // Authority: Create & Assign Cleaning Task (Transitions complaint to worker_assigned)
  const assignCleaningTask = async (payload) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const { complaintId, assignedTeam, description, area, priority, targetDate } = payload;
    const nextNum = 100 + tasks.length + 1;
    const taskId = `TASK-2026-${nextNum}`;
    const nowIso = new Date().toISOString();

    const relatedComplaint = allComplaintsState.find((c) => c.id === complaintId);

    if (relatedComplaint) {
      let currentSt = normalizeComplaintStatus(relatedComplaint.status);
      if (currentSt === 'submitted' || currentSt === 'under_review') {
        const verifyRes = await updateComplaintStatus(complaintId, {
          newStatus: 'verified',
          remarks: `Verified prior to assigning task ${taskId}.`,
          assignedTeam,
          expectedOldStatus: currentSt,
        });
        if (!verifyRes.success) {
          return verifyRes;
        }
        currentSt = 'verified';
      }
      if (currentSt !== 'worker_assigned') {
        const assignRes = await updateComplaintStatus(complaintId, {
          newStatus: 'worker_assigned',
          remarks: `Sanitation team (${assignedTeam}) assigned under task ${taskId}.`,
          assignedTeam,
          expectedOldStatus: currentSt,
        });
        if (!assignRes.success) {
          return assignRes;
        }
      }
    }

    const newTask = {
      id: taskId,
      complaintId: complaintId || '',
      assignedTeam,
      description,
      state_name: relatedComplaint?.state_name || '',
      district_name: relatedComplaint?.district_name || '',
      city_or_village: relatedComplaint?.village_name || '',
      area: area || relatedComplaint?.area || 'Service Area',
      priority: priority || relatedComplaint?.urgency || 'Medium',
      assignedAt: nowIso,
      targetDate: targetDate || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      completedAt: null,
      status: 'Assigned',
      completionRemarks: '',
      beforePhotoUrl: relatedComplaint?.photoUrl || '',
      afterPhotoUrl: '',
      updatedBy: currentUser.fullName,
    };

    setTasks((prev) => [newTask, ...prev]);
    showToast(`Cleaning Task ${taskId} assigned to ${assignedTeam}.`, 'success');
    return { success: true, task: newTask };
  };

  // Authority: Update Cleaning Task Status & Sync with Related Complaint
  const updateCleaningTask = async (taskId, { status, completionRemarks, afterPhotoUrl }) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found.' };

    if (status === 'Completed' && (!completionRemarks || !completionRemarks.trim())) {
      return {
        success: false,
        error: 'Completion remarks are required before marking a cleaning task as Completed.',
      };
    }

    if (task.complaintId) {
      if (status === 'In Progress') {
        const progressRes = await updateComplaintStatus(task.complaintId, {
          newStatus: 'in_progress',
          remarks: `Cleaning work started by ${task.assignedTeam} (${task.id}).`,
        });
        if (!progressRes.success) {
          return progressRes;
        }
      } else if (status === 'Completed') {
        const resolveRes = await updateComplaintStatus(task.complaintId, {
          newStatus: 'resolved',
          remarks: `Task ${task.id} completed by ${task.assignedTeam}: ${completionRemarks}`,
          resolutionPhotoUrl: afterPhotoUrl,
        });
        if (!resolveRes.success) {
          return resolveRes;
        }
      }
    }

    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completionRemarks:
                completionRemarks !== undefined ? completionRemarks : t.completionRemarks,
              afterPhotoUrl: afterPhotoUrl || t.afterPhotoUrl,
              completedAt: status === 'Completed' ? nowIso : t.completedAt,
              updatedBy: currentUser.fullName,
            }
          : t
      )
    );

    showToast(`Task ${taskId} updated to ${status}.`, 'success');
    return { success: true };
  };

  // Location-Aware Waste Collection Schedule Management
  const saveSchedule = (scheduleData) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const fullArea = [
      scheduleData.locality,
      scheduleData.city_or_village,
      scheduleData.district_name,
      scheduleData.state_name,
    ]
      .filter(Boolean)
      .join(', ');

    const normalized = {
      ...scheduleData,
      area: fullArea || scheduleData.area || 'Community Route',
    };

    if (scheduleData.id) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === scheduleData.id ? { ...s, ...normalized } : s))
      );
      showToast(`Schedule ${scheduleData.id} updated.`, 'success');
    } else {
      const newSchedule = {
        ...normalized,
        id: `SCH-IND-0${schedules.length + 1}`,
        active: scheduleData.active ?? true,
      };
      setSchedules((prev) => [...prev, newSchedule]);
      showToast(`New collection schedule ${newSchedule.id} created.`, 'success');
    }
    return { success: true };
  };

  const toggleScheduleActive = (scheduleId) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, active: !s.active } : s))
    );
    showToast('Schedule status toggled.', 'info');
  };

  const deleteSchedule = (scheduleId) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    showToast(`Schedule ${scheduleId} deleted.`, 'info');
  };

  // Green Rewards & Redemption Workflow
  const requestRewardRedemption = (rewardId) => {
    if (!currentUser) return { success: false, error: 'Please log in to redeem rewards.' };
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward || !reward.available || reward.stock <= 0) {
      return { success: false, error: 'This reward is currently out of stock or unavailable.' };
    }
    if ((currentUser.greenPoints || 0) < reward.pointsCost) {
      return {
        success: false,
        error: `Insufficient Green Points. You need ${reward.pointsCost} pts, but have ${currentUser.greenPoints} pts.`,
      };
    }

    const existingPending = redemptions.find(
      (r) =>
        r.userId === currentUser.id &&
        r.rewardId === rewardId &&
        r.status === 'Pending Approval'
    );
    if (existingPending) {
      return {
        success: false,
        error: 'You already have a pending redemption request for this item.',
      };
    }

    const redemptionId = `RED-2026-0${redemptions.length + 1}`;
    const nowIso = new Date().toISOString();
    const updatedBalance = (currentUser.greenPoints || 0) - reward.pointsCost;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              greenPoints: updatedBalance,
              totalPointsRedeemed: (u.totalPointsRedeemed || 0) + reward.pointsCost,
            }
          : u
      )
    );

    setRewards((prev) =>
      prev.map((r) => (r.id === rewardId ? { ...r, stock: Math.max(0, r.stock - 1) } : r))
    );

    const newRedemption = {
      id: redemptionId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsCost: reward.pointsCost,
      status: 'Pending Approval',
      requestedAt: nowIso,
      processedAt: null,
      authorityNote: '',
    };

    setRedemptions((prev) => [newRedemption, ...prev]);

    const txId = `TX-${Date.now()}`;
    setPointTransactions((prev) => [
      {
        id: txId,
        user_id: currentUser.id,
        userId: currentUser.id,
        transaction_type: 'debit',
        type: 'REDEEMED',
        points_amount: -reward.pointsCost,
        points: -reward.pointsCost,
        balance_after: updatedBalance,
        reason: `Redemption Requested: ${reward.title} (${redemptionId})`,
        referenceId: redemptionId,
        idempotency_key: `gp:debit:${redemptionId}`,
        created_at: nowIso,
        createdAt: nowIso,
      },
      ...prev,
    ]);

    createPersistentNotification({
      recipientUserId: currentUser.id,
      targetRole: 'citizen',
      title: `Reward Redemption Requested (${redemptionId})`,
      message: `${reward.pointsCost} Green Points reserved for "${reward.title}". Updated balance: ${updatedBalance} points.`,
      type: 'reward',
      relatedTransactionId: txId,
      idempotencyKey: `notif:redemption:${redemptionId}`,
      metadata: { link: '/citizen/rewards' },
    });

    showToast(`Redemption request ${redemptionId} submitted!`, 'success');
    return { success: true, redemption: newRedemption };
  };

  const processRedemptionRequest = (redemptionId, newStatus, authorityNote = '') => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const target = redemptions.find((r) => r.id === redemptionId);
    if (!target) return { success: false, error: 'Redemption request not found.' };

    if (target.status === 'Rejected' || target.status === 'Delivered / Issued') {
      return { success: false, error: 'This redemption request has already been finalized.' };
    }

    const nowIso = new Date().toISOString();

    if (newStatus === 'Rejected') {
      const targetUser = users.find((u) => u.id === target.userId);
      const restoredBalance = (targetUser?.greenPoints || 0) + target.pointsCost;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.userId
            ? {
                ...u,
                greenPoints: restoredBalance,
                totalPointsRedeemed: Math.max(
                  0,
                  (u.totalPointsRedeemed || 0) - target.pointsCost
                ),
              }
            : u
        )
      );
      setRewards((prev) =>
        prev.map((r) =>
          r.id === target.rewardId ? { ...r, stock: (r.stock || 0) + 1 } : r
        )
      );
      setPointTransactions((prev) => [
        {
          id: `TX-REFUND-${Date.now()}`,
          user_id: target.userId,
          userId: target.userId,
          transaction_type: 'reversal',
          type: 'REFUNDED',
          points_amount: target.pointsCost,
          points: target.pointsCost,
          balance_after: restoredBalance,
          reason: `Points Restored (Rejected Redemption ${target.id}): ${
            authorityNote || 'Not eligible'
          }`,
          referenceId: target.id,
          idempotency_key: `gp:refund:${target.id}`,
          created_at: nowIso,
          createdAt: nowIso,
        },
        ...prev,
      ]);
    }

    setRedemptions((prev) =>
      prev.map((r) =>
        r.id === redemptionId
          ? {
              ...r,
              status: newStatus,
              processedAt: nowIso,
              authorityNote: authorityNote || r.authorityNote,
            }
          : r
      )
    );

    createPersistentNotification({
      recipientUserId: target.userId,
      targetRole: 'citizen',
      title: `Reward Request ${target.id}: ${newStatus}`,
      message:
        newStatus === 'Rejected'
          ? `Your request for "${target.rewardTitle}" was declined and ${target.pointsCost} Green Points have been restored.`
          : `Your reward "${target.rewardTitle}" status is now: ${newStatus}.`,
      type: 'reward',
      idempotencyKey: `notif:redemption_status:${target.id}:${newStatus}`,
      metadata: { link: '/citizen/rewards' },
    });

    showToast(`Redemption ${redemptionId} marked as ${newStatus}.`, 'success');
    return { success: true };
  };

  const saveRewardCatalogItem = (rewardData) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    if (rewardData.id) {
      setRewards((prev) =>
        prev.map((r) => (r.id === rewardData.id ? { ...r, ...rewardData } : r))
      );
      showToast(`Reward "${rewardData.title}" updated.`, 'success');
    } else {
      const newReward = {
        ...rewardData,
        id: `REW-0${rewards.length + 1}`,
        available: true,
        badgeIcon: rewardData.badgeIcon || 'Award',
      };
      setRewards((prev) => [...prev, newReward]);
      showToast(`New reward "${newReward.title}" added to catalog.`, 'success');
    }
    return { success: true };
  };

  const completeSegregationActivity = () => {
    if (!currentUser) return { success: false, error: 'Please log in first.' };
    const refId = `SEG-ACTIVITY-${currentUser.id}`;
    const result = awardGreenPointsOnce({
      userId: currentUser.id,
      points: 5,
      reason: 'Completed Approved Household Two-Bin Waste Segregation Quiz & Pledge',
      referenceId: refId,
    });
    if (!result.awarded) {
      showToast(
        'You have already claimed your +5 Green Points for the Household Segregation Activity.',
        'info'
      );
      return { success: false, error: 'Points already claimed for this activity.' };
    }
    showToast(
      '+5 Green Points awarded for completing the Waste Segregation Activity!',
      'success'
    );
    return { success: true };
  };

  const registerForActivity = (activityId) => {
    if (!currentUser) return { success: false, error: 'Please log in to register for a drive.' };
    const act = activities.find((a) => a.id === activityId);
    if (!act) return { success: false, error: 'Event not found.' };
    if (act.participants.includes(currentUser.id)) {
      return { success: false, error: 'You are already registered for this event.' };
    }
    if (act.participationLimit && act.participants.length >= act.participationLimit) {
      return { success: false, error: 'Participation limit reached for this event.' };
    }

    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, participants: [...a.participants, currentUser.id] } : a
      )
    );
    showToast(
      `Registered for "${act.title}"! Points are awarded after attendance confirmation.`,
      'success'
    );
    return { success: true };
  };

  const cancelActivityRegistration = (activityId) => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    const act = activities.find((a) => a.id === activityId);
    if (!act) return { success: false, error: 'Event not found.' };
    if (act.confirmedAttendees.includes(currentUser.id)) {
      return {
        success: false,
        error: 'Attendance is already confirmed; cannot cancel registration.',
      };
    }
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? { ...a, participants: a.participants.filter((id) => id !== currentUser.id) }
          : a
      )
    );
    showToast('Registration cancelled.', 'info');
    return { success: true };
  };

  const createCleanlinessActivity = (payload) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const newAct = {
      id: `ACT-2026-0${activities.length + 1}`,
      title: payload.title,
      description: payload.description,
      state_name: payload.state_name || '',
      district_name: payload.district_name || '',
      city_or_village: payload.city_or_village || '',
      date: payload.date,
      time: payload.time,
      location: payload.location,
      instructions: payload.instructions || 'Bring reusable water bottles. Gloves provided.',
      participationLimit: Number(payload.participationLimit) || 50,
      pointsAwarded: Number(payload.pointsAwarded) || 20,
      status: 'Open for Registration',
      participants: [],
      confirmedAttendees: [],
    };
    setActivities((prev) => [newAct, ...prev]);
    showToast(`Cleanliness drive "${newAct.title}" scheduled!`, 'success');
    return { success: true, activity: newAct };
  };

  const confirmActivityAttendance = (activityId, participantUserId) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const act = activities.find((a) => a.id === activityId);
    if (!act) return { success: false, error: 'Activity not found.' };

    if (act.confirmedAttendees.includes(participantUserId)) {
      return { success: false, error: 'Attendance already confirmed for this citizen.' };
    }

    awardGreenPointsOnce({
      userId: participantUserId,
      points: act.pointsAwarded || 20,
      reason: `Confirmed Attendance at "${act.title}"`,
      referenceId: `${act.id}-${participantUserId}`,
    });

    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? {
              ...a,
              confirmedAttendees: [...a.confirmedAttendees, participantUserId],
            }
          : a
      )
    );

    showToast('Citizen attendance confirmed & Green Points credited!', 'success');
    return { success: true };
  };

  const resetDemoData = () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    setUsers(INITIAL_USERS);
    setAllComplaintsState(INITIAL_COMPLAINTS.map(normalizeComplaintRecord));
    setComplaintHistory(buildInitialHistoryFromComplaints(INITIAL_COMPLAINTS));
    setTasks(INITIAL_TASKS);
    setSchedules(INITIAL_SCHEDULES);
    setRewards(INITIAL_REWARDS);
    setRedemptions(INITIAL_REDEMPTIONS);
    setPointTransactions(INITIAL_POINT_TRANSACTIONS);
    setActivities(INITIAL_ACTIVITIES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSlaTargetHours(48);
    setSelectedLocationState(null);
    showToast('Demo data reset to initial state.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        isFirebaseConfigured,
        isSupabaseConfigured,
        authLoading,
        users,
        currentUser,
        complaints,
        publicAggregateStats,
        getAuthorizedComplaintById,
        getComplaintHistoryForViewer,
        tasks,
        schedules,
        rewards,
        redemptions,
        pointTransactions,
        activities,
        notifications,
        myNotifications,
        unreadNotificationCount,
        slaTargetHours,
        setSlaTargetHours,
        selectedLocation,
        setSelectedLocation,
        clearSelectedLocation,
        isLocationModalOpen,
        setIsLocationModalOpen,
        matchesLocationFilter,
        sanitationTips: SANITATION_TIPS,
        toast,
        showToast,
        isComplaintOverdue,
        login,
        quickDemoLogin,
        registerCitizen,
        requestPasswordReset,
        logout,
        updateProfile,
        submitComplaint,
        updateComplaintLocationReview,
        resubmitRejectedComplaint,
        findSimilarComplaints,
        updateComplaintStatus,
        assignCleaningTask,
        updateCleaningTask,
        awardGreenPointsOnce,
        saveSchedule,
        toggleScheduleActive,
        deleteSchedule,
        requestRewardRedemption,
        processRedemptionRequest,
        saveRewardCatalogItem,
        completeSegregationActivity,
        registerForActivity,
        cancelActivityRegistration,
        createCleanlinessActivity,
        confirmActivityAttendance,
        markNotificationRead,
        markAllNotificationsRead,
        clearReadNotifications,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
