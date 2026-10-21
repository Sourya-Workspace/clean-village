import React, { createContext, useContext, useState, useEffect } from 'react';
import { isFirebaseConfigured } from '../services/firebase';
import { isValidCoordinatePair, formatLocationLabel } from '../services/geocoding';
import {
  SINGLE_ADMIN_EMAIL,
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
  createSvgEvidence,
} from '../data/seedData';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  USERS: 'cv_csp_users_v3',
  CURRENT_USER: 'cv_csp_current_user_v3',
  COMPLAINTS: 'cv_csp_complaints_v3',
  TASKS: 'cv_csp_tasks_v3',
  SCHEDULES: 'cv_csp_schedules_v3',
  REWARDS: 'cv_csp_rewards_v3',
  REDEMPTIONS: 'cv_csp_redemptions_v3',
  TRANSACTIONS: 'cv_csp_transactions_v3',
  ACTIVITIES: 'cv_csp_activities_v3',
  NOTIFICATIONS: 'cv_csp_notifications_v3',
  SLA_HOURS: 'cv_csp_sla_hours_v3',
  SELECTED_LOCATION: 'cv_selected_india_location_v1',
};

/**
 * Safely migrates any legacy complaint record without inventing fabricated GPS coordinates.
 */
function migrateComplaintRecord(c) {
  const rawLat = c.reported_latitude ?? c.coordinates?.lat ?? null;
  const rawLng = c.reported_longitude ?? c.coordinates?.lng ?? null;
  const validCoords = isValidCoordinatePair(rawLat, rawLng);

  return {
    ...c,
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
  };
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
  } catch (e) {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const [users, setUsers] = useState(() => loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUserId, setCurrentUserId] = useState(() => loadFromStorage(STORAGE_KEYS.CURRENT_USER, null));
  const [complaints, setComplaints] = useState(() =>
    loadFromStorage(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS, migrateComplaintRecord)
  );
  const [tasks, setTasks] = useState(() => loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS));
  const [schedules, setSchedules] = useState(() => loadFromStorage(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES));
  const [rewards, setRewards] = useState(() => loadFromStorage(STORAGE_KEYS.REWARDS, INITIAL_REWARDS));
  const [redemptions, setRedemptions] = useState(() => loadFromStorage(STORAGE_KEYS.REDEMPTIONS, INITIAL_REDEMPTIONS));
  const [pointTransactions, setPointTransactions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_POINT_TRANSACTIONS)
  );
  const [activities, setActivities] = useState(() => loadFromStorage(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES));
  const [notifications, setNotifications] = useState(() =>
    loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );
  const [slaTargetHours, setSlaTargetHours] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SLA_HOURS, Number(import.meta.env.VITE_SLA_TARGET_HOURS) || 48)
  );
  // Global India-wide selected location (null = All India / No filter)
  const [selectedLocation, setSelectedLocationState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_LOCATION, null)
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
  }, [complaints]);

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

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  };

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

  /**
   * Checks whether a complaint, schedule, or activity record matches a selected location filter.
   */
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

    if (filterCityVillage) {
      return combinedText.includes(filterCityVillage);
    }
    if (filterDistrict) {
      return combinedText.includes(filterDistrict);
    }
    if (filterState) {
      return combinedText.includes(filterState);
    }
    return true;
  };

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // Helper: Check if a complaint is overdue based on configurable SLA hours
  const isComplaintOverdue = (complaint) => {
    if (!complaint || complaint.status === 'Resolved' || complaint.status === 'Rejected') return false;
    const submittedTime = new Date(complaint.submittedAt).getTime();
    const referenceNow = new Date('2026-10-21T15:15:00+05:30').getTime();
    const now = Math.max(Date.now(), referenceNow);
    const elapsedHours = (now - submittedTime) / (1000 * 60 * 60);
    return elapsedHours > slaTargetHours;
  };

  // Helper: Validate strict @gmail.com email requirement
  const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test((email || '').trim());

  // Authentication Actions
  const login = (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isValidGmail(cleanEmail)) {
      return {
        success: false,
        error: 'Email ID must be a valid @gmail.com address (e.g., xxxxxx@gmail.com).',
      };
    }

    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        success: false,
        error: 'No account found with this @gmail.com address. Citizens can sign up on the Register page.',
      };
    }

    // Strict Single-Admin Enforcement: Only SINGLE_ADMIN_EMAIL can log in as authority
    if (user.role === 'authority' && cleanEmail !== SINGLE_ADMIN_EMAIL) {
      return {
        success: false,
        error: 'Unauthorized: Only the single designated Admin account is allowed.',
      };
    }

    if (user.passwordHash !== `demo_hashed_${password}`) {
      return {
        success: false,
        error: 'Incorrect password. Please enter the password you created at signup (or Admin@123 / Citizen@123 for demo accounts).',
      };
    }
    setCurrentUserId(user.id);
    showToast(`Welcome back, ${user.fullName}!`, 'success');
    return { success: true, user };
  };

  const quickDemoLogin = (role) => {
    const target =
      role === 'authority'
        ? users.find((u) => u.role === 'authority' && u.email.toLowerCase() === SINGLE_ADMIN_EMAIL)
        : users.find((u) => u.role === 'citizen');
    if (target) {
      setCurrentUserId(target.id);
      showToast(`Logged in as ${role === 'authority' ? 'Sole Admin' : 'Citizen'}: ${target.email}`, 'success');
      return target;
    }
    return null;
  };

  const registerCitizen = (payload) => {
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
    if (cleanEmail === SINGLE_ADMIN_EMAIL) {
      return {
        success: false,
        error: 'This email is reserved for the single Administrator. Please sign up with your personal @gmail.com ID.',
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
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A citizen account with this @gmail.com address already exists.' };
    }

    const formattedVillage =
      [cityOrVillage || village, districtName, stateName].filter(Boolean).join(', ') || 'India';

    const newUser = {
      id: `user-citizen-${Date.now()}`,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      passwordHash: `demo_hashed_${password}`,
      role: 'citizen',
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
    addNotification({
      userId: newUser.id,
      targetRole: 'citizen',
      title: 'Welcome to CleanVillage!',
      message: 'Thank you for signing up with your @gmail.com account. Report sanitation issues or join drives to earn Green Points.',
      type: 'success',
      link: '/citizen/dashboard',
    });
    showToast(`Citizen account (${cleanEmail}) registered!`, 'success');
    return { success: true, user: newUser };
  };

  const logout = () => {
    setCurrentUserId(null);
    showToast('You have been logged out safely.', 'info');
  };

  const updateProfile = (updates) => {
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
        typeof updates.optInLeaderboard === 'boolean' ? updates.optInLeaderboard : currentUser.optInLeaderboard,
      notificationPrefs: updates.notificationPrefs || currentUser.notificationPrefs,
    };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...safeUpdates } : u)));
    showToast('Profile settings updated successfully.', 'success');
    return { success: true };
  };

  // Notifications Helper
  const addNotification = ({ userId, targetRole = 'citizen', title, message, type = 'info', link = '/' }) => {
    const newNotif = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      targetRole,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      link,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (notifId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.userId === currentUser.id || (currentUser.role === 'authority' && n.targetRole === 'authority')
          ? { ...n, read: true }
          : n
      )
    );
    showToast('All notifications marked as read.', 'info');
  };

  // Safe Unique Complaint ID Generation (CV-2026-XXXX)
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

  // Check for similar recent complaints in the same area & category
  const findSimilarComplaints = (areaText, category) => {
    if (!areaText || !category) return [];
    const cleanArea = areaText.trim().toLowerCase();
    if (cleanArea.length < 3) return [];
    return complaints.filter(
      (c) =>
        (c.area.toLowerCase().includes(cleanArea) ||
          (c.village_name && c.village_name.toLowerCase() === cleanArea)) &&
        c.category.toLowerCase() === category.toLowerCase() &&
        c.status !== 'Resolved' &&
        c.status !== 'Rejected'
    );
  };

  // Submit New Complaint with Complete India Location Schema & Coordinate Validation
  const submitComplaint = (data) => {
    const activeUser = currentUser || users.find((u) => u.role === 'citizen');
    const newId = generateComplaintId(complaints);
    const nowIso = new Date().toISOString();

    const rawLat = data.reported_latitude ?? data.coordinates?.lat ?? null;
    const rawLng = data.reported_longitude ?? data.coordinates?.lng ?? null;
    const hasValidCoords = isValidCoordinatePair(rawLat, rawLng);

    const stateName = (data.state_name || data.stateName || '').trim();
    const districtName = (data.district_name || data.districtName || '').trim();
    const cityOrVillage = (data.village_name || data.city_name || data.cityOrVillage || data.village || '').trim();
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

    const photoToSave =
      data.photoUrl ||
      createSvgEvidence(
        `Submitted: ${data.category}`,
        fullReadableArea || 'Reported Community Location',
        '#14532d',
        '#065f46',
        'CITIZEN EVIDENCE (DEMO)'
      );

    const newComplaint = {
      id: newId,
      userId: activeUser.id,
      userName: activeUser.fullName,
      citizenRegisteredLocality: `${activeUser.householdArea || ''}, ${activeUser.village || ''}`.replace(/^,\s*/, ''),
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
      status: 'Pending',
      assignedTeam: '',
      taskId: '',
      authorityRemarks: '',
      rejectionReason: '',
      photoUrl: photoToSave,
      resolutionPhotoUrl: '',
      pointsAwarded: false,
      submittedAt: nowIso,
      resolvedAt: null,
      timeline: [
        {
          status: 'Pending',
          timestamp: nowIso,
          actor: `${activeUser.fullName} (Citizen)`,
          note: `Complaint submitted (${confirmationStatus}).`,
        },
      ],
    };

    setComplaints((prev) => [newComplaint, ...prev]);

    addNotification({
      userId: activeUser.id,
      targetRole: 'citizen',
      title: `Complaint ${newId} Submitted`,
      message: `Your report "${newComplaint.title}" at ${newComplaint.area} has been logged with status Pending.`,
      type: 'info',
      link: `/citizen/complaints/${newId}`,
    });

    addNotification({
      userId: 'user-authority-1',
      targetRole: 'authority',
      title: `New Complaint Logged: ${newId}`,
      message: `${newComplaint.category} reported at ${newComplaint.area} (${newComplaint.urgency} urgency).`,
      type: 'warning',
      link: `/authority/complaints/${newId}`,
    });

    showToast(`Complaint ${newId} submitted successfully!`, 'success');
    return { success: true, complaint: newComplaint };
  };

  // Authority: Record Human Location Review Outcome (Without False AI Claims)
  const updateComplaintLocationReview = (complaintId, { reviewStatus, reviewNote }) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized: Only the Administrator can record location reviews.' };
    }
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return { success: false, error: 'Complaint not found.' };

    const nowIso = new Date().toISOString();

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          location_review_status: reviewStatus,
          location_review_note: reviewNote || '',
          location_reviewed_by: currentUser.fullName,
          location_reviewed_at: nowIso,
          timeline: [
            ...c.timeline,
            {
              status: `Location Review: ${reviewStatus}`,
              timestamp: nowIso,
              actor: currentUser.fullName,
              note: reviewNote
                ? `Administrative location review (${reviewStatus}): ${reviewNote}`
                : `Administrative location review recorded as: ${reviewStatus}.`,
            },
          ],
        };
      })
    );

    if (reviewStatus === 'Needs Clarification') {
      addNotification({
        userId: target.userId,
        targetRole: 'citizen',
        title: `Location Clarification Requested for ${target.id}`,
        message: reviewNote || 'The administrator requested additional landmark/location details for your report.',
        type: 'warning',
        link: `/citizen/complaints/${target.id}`,
      });
    }

    showToast(`Location review status updated to "${reviewStatus}".`, 'success');
    return { success: true };
  };

  // Resubmit a Rejected Complaint (Citizen Correction)
  const resubmitRejectedComplaint = (complaintId, updatedFields) => {
    const target = complaints.find((c) => c.id === complaintId);
    if (!target || target.status !== 'Rejected') {
      return { success: false, error: 'Only rejected complaints can be corrected and resubmitted.' };
    }
    const nowIso = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          title: updatedFields.title || c.title,
          description: updatedFields.description || c.description,
          area: updatedFields.area || c.area,
          photoUrl: updatedFields.photoUrl || c.photoUrl,
          status: 'Pending',
          rejectionReason: '',
          timeline: [
            ...c.timeline,
            {
              status: 'Pending',
              timestamp: nowIso,
              actor: `${currentUser?.fullName || c.userName} (Citizen)`,
              note: 'Citizen corrected details and resubmitted complaint for verification.',
            },
          ],
        };
      })
    );
    showToast(`Complaint ${complaintId} resubmitted for verification.`, 'success');
    return { success: true };
  };

  // Trusted Point Award Helper (Anti-abuse idempotency lock)
  const awardGreenPointsOnce = ({ userId, points, reason, referenceId }) => {
    const alreadyAwarded = pointTransactions.some(
      (tx) => tx.userId === userId && tx.referenceId === referenceId && tx.type === 'EARNED'
    );
    if (alreadyAwarded) {
      return false;
    }
    const tx = {
      id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      type: 'EARNED',
      points,
      reason,
      referenceId,
      createdAt: new Date().toISOString(),
    };
    setPointTransactions((prev) => [tx, ...prev]);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              greenPoints: (u.greenPoints || 0) + points,
              totalPointsEarned: (u.totalPointsEarned || 0) + points,
            }
          : u
      )
    );
    return true;
  };

  // Authority: Update Complaint Status (Enforces valid progression & anti-abuse rules)
  const updateComplaintStatus = (complaintId, { newStatus, remarks, rejectionReason, resolutionPhotoUrl, assignedTeam }) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized: Only the Administrator can verify or update complaints.' };
    }

    const complaint = complaints.find((c) => c.id === complaintId);
    if (!complaint) return { success: false, error: 'Complaint not found.' };

    if (newStatus === 'Rejected' && (!rejectionReason || !rejectionReason.trim())) {
      return { success: false, error: 'A clear rejection reason is mandatory when rejecting a complaint.' };
    }

    if (newStatus === 'Resolved') {
      const relatedTask = tasks.find((t) => t.complaintId === complaintId);
      if (relatedTask && relatedTask.status !== 'Completed' && (!remarks || !remarks.trim())) {
        return {
          success: false,
          error: 'Please complete the assigned cleaning task or provide completion remarks before marking Resolved.',
        };
      }
    }

    const nowIso = new Date().toISOString();
    let awardedNow = false;

    if (newStatus === 'Verified' && !complaint.pointsAwarded) {
      awardedNow = awardGreenPointsOnce({
        userId: complaint.userId,
        points: 10,
        reason: `Verified Sanitation Complaint (${complaint.id})`,
        referenceId: complaint.id,
      });
    }

    const finalResolutionPhoto =
      newStatus === 'Resolved'
        ? resolutionPhotoUrl ||
          complaint.resolutionPhotoUrl ||
          createSvgEvidence(
            `Resolved: ${complaint.category}`,
            `Cleaned at ${complaint.area}`,
            '#065f46',
            '#15803d',
            'RESOLUTION EVIDENCE (DEMO)'
          )
        : complaint.resolutionPhotoUrl;

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          status: newStatus,
          authorityRemarks: remarks !== undefined ? remarks : c.authorityRemarks,
          rejectionReason: newStatus === 'Rejected' ? rejectionReason : c.rejectionReason,
          assignedTeam: assignedTeam !== undefined ? assignedTeam : c.assignedTeam,
          resolutionPhotoUrl: finalResolutionPhoto,
          pointsAwarded: c.pointsAwarded || awardedNow,
          resolvedAt: newStatus === 'Resolved' ? nowIso : c.resolvedAt,
          timeline: [
            ...c.timeline,
            {
              status: newStatus,
              timestamp: nowIso,
              actor: `${currentUser.fullName}`,
              note:
                newStatus === 'Rejected'
                  ? `Rejected: ${rejectionReason} (0 points awarded)`
                  : remarks || `Status updated to ${newStatus}${awardedNow ? ' (+10 Green Points awarded)' : ''}.`,
            },
          ],
        };
      })
    );

    if (newStatus === 'Resolved' && complaint.taskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === complaint.taskId
            ? {
                ...t,
                status: 'Completed',
                completedAt: nowIso,
                completionRemarks: remarks || t.completionRemarks || 'Marked completed upon complaint resolution.',
                afterPhotoUrl: finalResolutionPhoto,
              }
            : t
        )
      );
    }

    addNotification({
      userId: complaint.userId,
      targetRole: 'citizen',
      title: `Complaint ${complaint.id} is now ${newStatus}`,
      message:
        newStatus === 'Verified'
          ? `Your complaint has been verified! ${awardedNow ? '+10 Green Points credited to your account.' : ''}`
          : newStatus === 'Rejected'
          ? `Your complaint was rejected: ${rejectionReason}`
          : `Status updated to ${newStatus}. ${remarks || ''}`,
      type: newStatus === 'Rejected' ? 'error' : newStatus === 'Resolved' ? 'success' : 'info',
      link: `/citizen/complaints/${complaint.id}`,
    });

    showToast(`Complaint ${complaint.id} updated to ${newStatus}.`, 'success');
    return { success: true };
  };

  // Authority: Create or Update Cleaning Task
  const assignCleaningTask = (payload) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    const { complaintId, assignedTeam, description, area, priority, targetDate } = payload;
    const nextNum = 100 + tasks.length + 1;
    const taskId = `TASK-2026-${nextNum}`;
    const nowIso = new Date().toISOString();

    const relatedComplaint = complaints.find((c) => c.id === complaintId);

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
      beforePhotoUrl:
        relatedComplaint?.photoUrl ||
        createSvgEvidence('Task Site Before Cleaning', area || 'Community Site', '#1e3a8a', '#065f46', 'BEFORE PHOTO'),
      afterPhotoUrl: '',
      updatedBy: currentUser.fullName,
    };

    setTasks((prev) => [newTask, ...prev]);

    if (relatedComplaint) {
      if (relatedComplaint.status === 'Pending' && !relatedComplaint.pointsAwarded) {
        awardGreenPointsOnce({
          userId: relatedComplaint.userId,
          points: 10,
          reason: `Verified Sanitation Complaint (${relatedComplaint.id})`,
          referenceId: relatedComplaint.id,
        });
      }

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? {
                ...c,
                status: 'In Progress',
                assignedTeam,
                taskId,
                pointsAwarded: true,
                authorityRemarks: `Assigned cleaning task ${taskId} to ${assignedTeam}.`,
                timeline: [
                  ...c.timeline,
                  {
                    status: 'In Progress',
                    timestamp: nowIso,
                    actor: currentUser.fullName,
                    note: `Cleaning task ${taskId} assigned to ${assignedTeam}.`,
                  },
                ],
              }
            : c
        )
      );

      addNotification({
        userId: relatedComplaint.userId,
        targetRole: 'citizen',
        title: `Cleaning Team Assigned for ${relatedComplaint.id}`,
        message: `${assignedTeam} has been assigned task ${taskId} to resolve your complaint.`,
        type: 'info',
        link: `/citizen/complaints/${relatedComplaint.id}`,
      });
    }

    showToast(`Cleaning Task ${taskId} assigned to ${assignedTeam}.`, 'success');
    return { success: true, task: newTask };
  };

  // Authority: Update Cleaning Task Status & Sync with Related Complaint
  const updateCleaningTask = (taskId, { status, completionRemarks, afterPhotoUrl }) => {
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

    const nowIso = new Date().toISOString();
    const resolvedPhoto =
      status === 'Completed'
        ? afterPhotoUrl ||
          task.afterPhotoUrl ||
          createSvgEvidence(
            `Task Completed: ${task.id}`,
            `Cleaned by ${task.assignedTeam}`,
            '#065f46',
            '#15803d',
            'AFTER CLEANING (DEMO)'
          )
        : task.afterPhotoUrl;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completionRemarks: completionRemarks !== undefined ? completionRemarks : t.completionRemarks,
              afterPhotoUrl: resolvedPhoto,
              completedAt: status === 'Completed' ? nowIso : t.completedAt,
              updatedBy: currentUser.fullName,
            }
          : t
      )
    );

    if (task.complaintId) {
      if (status === 'Completed') {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === task.complaintId
              ? {
                  ...c,
                  status: 'Resolved',
                  resolvedAt: nowIso,
                  authorityRemarks: completionRemarks,
                  resolutionPhotoUrl: resolvedPhoto,
                  timeline: [
                    ...c.timeline,
                    {
                      status: 'Resolved',
                      timestamp: nowIso,
                      actor: currentUser.fullName,
                      note: `Task ${task.id} completed by ${task.assignedTeam}: ${completionRemarks}`,
                    },
                  ],
                }
              : c
          )
        );
      } else if (status === 'In Progress') {
        setComplaints((prev) =>
          prev.map((c) => (c.id === task.complaintId && c.status !== 'Resolved' ? { ...c, status: 'In Progress' } : c))
        );
      }
    }

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
      setSchedules((prev) => prev.map((s) => (s.id === scheduleData.id ? { ...s, ...normalized } : s)));
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
    setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, active: !s.active } : s)));
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
      (r) => r.userId === currentUser.id && r.rewardId === rewardId && r.status === 'Pending Approval'
    );
    if (existingPending) {
      return {
        success: false,
        error: 'You already have a pending redemption request for this item.',
      };
    }

    const redemptionId = `RED-2026-0${redemptions.length + 1}`;
    const nowIso = new Date().toISOString();

    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              greenPoints: u.greenPoints - reward.pointsCost,
              totalPointsRedeemed: (u.totalPointsRedeemed || 0) + reward.pointsCost,
            }
          : u
      )
    );

    setRewards((prev) => prev.map((r) => (r.id === rewardId ? { ...r, stock: Math.max(0, r.stock - 1) } : r)));

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

    setPointTransactions((prev) => [
      {
        id: `TX-${Date.now()}`,
        userId: currentUser.id,
        type: 'REDEEMED',
        points: -reward.pointsCost,
        reason: `Redemption Requested: ${reward.title} (${redemptionId})`,
        referenceId: redemptionId,
        createdAt: nowIso,
      },
      ...prev,
    ]);

    addNotification({
      userId: currentUser.id,
      targetRole: 'citizen',
      title: `Reward Redemption Requested (${redemptionId})`,
      message: `${reward.pointsCost} Green Points reserved for "${reward.title}". Awaiting authority approval.`,
      type: 'reward',
      link: '/citizen/rewards',
    });

    showToast(`Redemption request ${redemptionId} submitted!`, 'success');
    return { success: true, redemption: newRedemption };
  };

  // Authority: Approve, Deliver, or Reject Redemption Request (restores points on rejection)
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
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.userId
            ? {
                ...u,
                greenPoints: (u.greenPoints || 0) + target.pointsCost,
                totalPointsRedeemed: Math.max(0, (u.totalPointsRedeemed || 0) - target.pointsCost),
              }
            : u
        )
      );
      setRewards((prev) =>
        prev.map((r) => (r.id === target.rewardId ? { ...r, stock: (r.stock || 0) + 1 } : r))
      );
      setPointTransactions((prev) => [
        {
          id: `TX-REFUND-${Date.now()}`,
          userId: target.userId,
          type: 'REFUNDED',
          points: target.pointsCost,
          reason: `Points Restored (Rejected Redemption ${target.id}): ${authorityNote || 'Not eligible'}`,
          referenceId: target.id,
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

    addNotification({
      userId: target.userId,
      targetRole: 'citizen',
      title: `Reward Request ${target.id}: ${newStatus}`,
      message:
        newStatus === 'Rejected'
          ? `Your request for "${target.rewardTitle}" was declined and ${target.pointsCost} Green Points have been restored.`
          : `Your reward "${target.rewardTitle}" status is now: ${newStatus}.`,
      type: newStatus === 'Rejected' ? 'warning' : 'reward',
      link: '/citizen/rewards',
    });

    showToast(`Redemption ${redemptionId} marked as ${newStatus}.`, 'success');
    return { success: true };
  };

  const saveRewardCatalogItem = (rewardData) => {
    if (!currentUser || currentUser.role !== 'authority') {
      return { success: false, error: 'Unauthorized action.' };
    }
    if (rewardData.id) {
      setRewards((prev) => prev.map((r) => (r.id === rewardData.id ? { ...r, ...rewardData } : r)));
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
    const awarded = awardGreenPointsOnce({
      userId: currentUser.id,
      points: 5,
      reason: 'Completed Approved Household Two-Bin Waste Segregation Quiz & Pledge',
      referenceId: refId,
    });
    if (!awarded) {
      showToast('You have already claimed your +5 Green Points for the Household Segregation Activity.', 'info');
      return { success: false, error: 'Points already claimed for this activity.' };
    }
    showToast('+5 Green Points awarded for completing the Waste Segregation Activity!', 'success');
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
      prev.map((a) => (a.id === activityId ? { ...a, participants: [...a.participants, currentUser.id] } : a))
    );
    showToast(`Registered for "${act.title}"! Points are awarded after attendance confirmation.`, 'success');
    return { success: true };
  };

  const cancelActivityRegistration = (activityId) => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    const act = activities.find((a) => a.id === activityId);
    if (!act) return { success: false, error: 'Event not found.' };
    if (act.confirmedAttendees.includes(currentUser.id)) {
      return { success: false, error: 'Attendance is already confirmed; cannot cancel registration.' };
    }
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, participants: a.participants.filter((id) => id !== currentUser.id) } : a
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

    const awarded = awardGreenPointsOnce({
      userId: participantUserId,
      points: act.pointsAwarded || 20,
      reason: `Confirmed Attendance: ${act.title}`,
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

    if (awarded) {
      addNotification({
        userId: participantUserId,
        targetRole: 'citizen',
        title: `+${act.pointsAwarded || 20} Green Points Awarded!`,
        message: `Your attendance at "${act.title}" was confirmed by the Village Authority.`,
        type: 'reward',
        link: '/citizen/rewards',
      });
    }

    showToast('Citizen attendance confirmed & Green Points awarded!', 'success');
    return { success: true };
  };

  const resetDemoData = () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    setUsers(INITIAL_USERS);
    setComplaints(INITIAL_COMPLAINTS);
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
        users,
        currentUser,
        complaints,
        tasks,
        schedules,
        rewards,
        redemptions,
        pointTransactions,
        activities,
        notifications,
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
        logout,
        updateProfile,
        submitComplaint,
        updateComplaintLocationReview,
        resubmitRejectedComplaint,
        findSimilarComplaints,
        updateComplaintStatus,
        assignCleaningTask,
        updateCleaningTask,
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
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
