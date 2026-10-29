import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  CheckCircle2,
  MapPin,
  Upload,
  AlertTriangle,
  Sparkles,
  Truck,
  Search,
  RefreshCw,
  ArrowLeft,
  Info,
  Lock,
  Bell,
  ImageOff,
  ExternalLink,
  Check,
  CheckCheck,
  Archive,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  StatusBadge,
  PriorityBadge,
  normalizeComplaintStatus,
  getStatusBadgeLabel,
} from '../components/StatusBadge';
import ComplaintProgressTimeline from '../components/ComplaintProgressTimeline';
import {
  getNotificationCategoryLabel,
  getNotificationCategoryBadgeClass,
} from '../components/NotificationBellPanel';
import VillageMap from '../components/VillageMap';
import IndiaLocationSelector from '../components/IndiaLocationSelector';
import { COMPLAINT_CATEGORIES } from '../data/seedData';
import { isValidCoordinatePair } from '../services/geocoding';

function getLatestPublicMessage(complaint, historyEntries = []) {
  if (Array.isArray(historyEntries) && historyEntries.length > 0) {
    const last = historyEntries[historyEntries.length - 1];
    return last.public_update_message || last.publicMessage || last.note || '';
  }
  if (Array.isArray(complaint.history) && complaint.history.length > 0) {
    const last = complaint.history[complaint.history.length - 1];
    return last.public_update_message || last.publicMessage || '';
  }
  if (Array.isArray(complaint.timeline) && complaint.timeline.length > 0) {
    const last = complaint.timeline[complaint.timeline.length - 1];
    return last.note || '';
  }
  return complaint.authorityRemarks || 'Complaint submitted and awaiting review.';
}

/* 10. CITIZEN DASHBOARD */
export function CitizenDashboardPage() {
  const {
    currentUser,
    complaints,
    schedules,
    myNotifications,
    pointTransactions,
    markNotificationRead,
    sanitationTips,
    selectedLocation,
    matchesLocationFilter,
    getComplaintHistoryForViewer,
  } = useApp();
  const navigate = useNavigate();

  // Strict privacy: Only complaints owned by the authenticated citizen
  const myComplaints = complaints.filter(
    (c) =>
      currentUser &&
      (c.citizen_user_id === currentUser.id || c.userId === currentUser.id)
  );

  const submittedOrReviewCount = myComplaints.filter((c) =>
    ['submitted', 'under_review', 'verified', 'reopened'].includes(
      normalizeComplaintStatus(c.status)
    )
  ).length;
  const inProgressCount = myComplaints.filter((c) =>
    ['worker_assigned', 'in_progress'].includes(normalizeComplaintStatus(c.status))
  ).length;
  const resolvedCount = myComplaints.filter(
    (c) => normalizeComplaintStatus(c.status) === 'resolved'
  ).length;

  const relevantSchedules = schedules.filter(
    (s) => s.active && matchesLocationFilter(s, selectedLocation)
  );

  const myRecentTransactions = pointTransactions
    .filter((t) => currentUser && (t.userId === currentUser.id || t.user_id === currentUser.id))
    .slice(0, 4);

  const tipOfTheDay = sanitationTips[0];
  const nextMilestone = 100;
  const currentPts = currentUser?.greenPoints || 0;
  const progressPct = Math.min(100, Math.round((currentPts / nextMilestone) * 100));

  return (
    <DashboardLayout
      role="citizen"
      title={`Namaste, ${currentUser?.fullName || 'Citizen'}!`}
      subtitle={`Registered Locality: ${currentUser?.householdArea || ''}, ${
        currentUser?.village || 'India'
      } • Private Citizen Portal`}
      actions={
        <Link
          to="/citizen/submit-complaint"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Issue
        </Link>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">My Total Complaints</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{myComplaints.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-800 uppercase">Submitted / Verified</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{submittedOrReviewCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-purple-800 uppercase">Cleaning In Progress</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-800 uppercase">Resolved</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{resolvedCount}</p>
        </div>
        <div className="village-canopy-bg rounded-2xl p-4 text-white shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-amber-300 uppercase">My Green Points</p>
          <p className="text-2xl font-extrabold text-white mt-1">{currentPts} pts</p>
        </div>
      </div>

      {/* Sanitation Tip of the Day */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-emerald-800">
            Sanitation Tip of the Day
          </span>
          <p className="text-xs sm:text-sm text-emerald-950 font-medium mt-0.5">{tipOfTheDay}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: MY COMPLAINTS (Live Status Tracker - Section 3 & Section 6) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">My Complaints</h2>
              <p className="text-[11px] text-slate-500">
                Strict Privacy: Showing only complaints submitted by your account (
                {currentUser?.email})
              </p>
            </div>
            <Link
              to="/citizen/complaints"
              className="text-xs font-bold text-forest-800 hover:underline"
            >
              View All ({myComplaints.length}) →
            </Link>
          </div>

          {myComplaints.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">
                You have not submitted any sanitation complaints yet.
              </p>
              <Link
                to="/citizen/submit-complaint"
                className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
              >
                Submit Your First Report
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myComplaints.slice(0, 4).map((c) => {
                const hist = getComplaintHistoryForViewer(c.id);
                const latestMsg = getLatestPublicMessage(c, hist);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-forest-900 bg-emerald-100 px-2 py-0.5 rounded">
                            {c.id}
                          </span>
                          <StatusBadge status={c.status} />
                          <span className="text-[11px] font-semibold text-slate-500">
                            {c.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">{c.title}</h3>
                        <p className="text-xs text-slate-600">📍 {c.area}</p>
                      </div>

                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.title}
                          className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-400 shrink-0 p-1 text-center">
                          <ImageOff className="w-3.5 h-3.5 mb-0.5" />
                          <span>No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-slate-700">
                      <span className="font-bold text-forest-900">Latest Status Update: </span>
                      <span>{latestMsg}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span>Submitted: {new Date(c.submittedAt).toLocaleDateString()}</span>
                        <span className="mx-1.5">•</span>
                        <span>
                          Last Updated:{' '}
                          {new Date(c.updatedAt || c.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/citizen/complaints/${c.id}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                        >
                          View Details
                        </Link>
                        <Link
                          to={`/citizen/complaints/${c.id}#progress`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition"
                        >
                          View Progress →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Green Points Balance & History, Notifications, Schedule */}
        <div className="lg:col-span-5 space-y-6">
          {/* Green Points Balance & Recent Transactions */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Green Points Balance &amp; History
              </h2>
              <Link
                to="/citizen/rewards"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Open Green Rewards →
              </Link>
            </div>
            <div className="w-full h-3 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-forest-700 to-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              Confirmed Balance: <strong>{currentPts} pts</strong> (
              {nextMilestone - currentPts > 0
                ? `${nextMilestone - currentPts} pts to Cleanliness Champion tier`
                : 'Champion Tier Reached!'}
              ).
            </p>

            {myRecentTransactions.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  Recent Points Transactions
                </p>
                {myRecentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="truncate text-slate-700 pr-2">{tx.reason}</span>
                    <span
                      className={`font-extrabold shrink-0 ${
                        tx.points > 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Center Preview */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Notification Center</h2>
              <Link
                to="/citizen/notifications"
                className="text-xs font-bold text-forest-800 hover:underline"
              >
                View All ({myNotifications.length})
              </Link>
            </div>
            {myNotifications.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                You&apos;re all caught up! New updates will appear here.
              </p>
            ) : (
              myNotifications.slice(0, 4).map((n) => {
                const isRead = Boolean(n.is_read ?? n.read);
                const complaintId =
                  n.related_complaint_id || n.relatedComplaintId || n.metadata?.complaint_id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!isRead) markNotificationRead(n.id);
                      if (n.type === 'green_points' || n.type === 'reward') {
                        navigate('/citizen/rewards');
                      } else if (complaintId) {
                        navigate(`/citizen/complaints/${complaintId}`);
                      } else {
                        navigate('/citizen/notifications');
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                      isRead
                        ? 'bg-slate-50 border-slate-200/70'
                        : 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      {!isRead && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-0.5">{n.message}</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Upcoming Waste Collection */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Upcoming Waste Collection</h2>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            {relevantSchedules.length === 0 ? (
              <p className="text-xs text-slate-500">
                No collection schedules have been published for this location yet.
              </p>
            ) : (
              relevantSchedules.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-forest-900">
                    <span>{s.wasteType}</span>
                    <span>{s.nextCollectionDate}</span>
                  </div>
                  <p className="text-slate-700">{s.area}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 11. SUBMIT COMPLAINT PAGE */
export function SubmitComplaintPage() {
  const {
    currentUser,
    complaints,
    submitComplaint,
    findSimilarComplaints,
    selectedLocation,
    quickDemoLogin,
    isSupabaseConfigured,
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');

  const [issueLocation, setIssueLocation] = useState(() => ({
    stateName: selectedLocation?.stateName || '',
    districtName: selectedLocation?.districtName || '',
    cityOrVillage: selectedLocation?.cityOrVillage || '',
    locality: selectedLocation?.locality || '',
    landmark: '',
    lat: selectedLocation?.lat ?? null,
    lng: selectedLocation?.lng ?? null,
    locationCaptureMethod: selectedLocation?.lat ? 'map_confirmed' : 'manual_entry',
    locationConfirmationStatus: selectedLocation?.lat
      ? 'Confirmed Map Location'
      : 'Manually Entered Address (No Map Coordinates)',
    isConfirmed: Boolean(selectedLocation),
  }));

  const [landmark, setLandmark] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-forest-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Sign In to Submit a Sanitation Complaint
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every sanitation complaint is linked privately to your citizen account so you can receive real-time status notifications and Green Points.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
            >
              Sign In with @gmail.com
            </Link>
            {!isSupabaseConfigured && (
              <button
                type="button"
                onClick={() => quickDemoLogin('citizen', 'user-citizen-1')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
              >
                Continue as Demo Citizen A
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const nextIdPreview = `CV-2026-${String(complaints.length + 1).padStart(4, '0')}`;
  const similarExisting = findSimilarComplaints(
    issueLocation.locality || issueLocation.cityOrVillage,
    category
  );

  const handlePhotoUpload = (e) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Only JPEG, PNG, and WebP images are permitted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file size must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (title.trim().length < 5) {
      setFormError('Please provide a clear complaint title (at least 5 characters).');
      return;
    }
    if (description.trim().length < 15) {
      setFormError('Please provide a detailed description (at least 15 characters).');
      return;
    }
    if (!issueLocation.stateName && !issueLocation.cityOrVillage) {
      setFormError(
        'Please specify the location of the reported sanitation issue (State and City/Town/Village) and click "Confirm Location".'
      );
      return;
    }

    const hasValidCoords = isValidCoordinatePair(issueLocation.lat, issueLocation.lng);

    setSubmitting(true);
    try {
      const res = await submitComplaint({
        title,
        category,
        description,
        state_name: issueLocation.stateName,
        district_name: issueLocation.districtName,
        city_name: issueLocation.cityOrVillage,
        village_name: issueLocation.cityOrVillage,
        locality: issueLocation.locality,
        landmark: landmark || issueLocation.landmark,
        reported_latitude: hasValidCoords ? Number(issueLocation.lat) : null,
        reported_longitude: hasValidCoords ? Number(issueLocation.lng) : null,
        location_capture_method: issueLocation.locationCaptureMethod,
        location_confirmation_status: issueLocation.locationConfirmationStatus,
        urgency,
        photoUrl: photoPreview,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to submit complaint.');
        return;
      }
      setSubmittedRecord(res.complaint);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRecord) {
    return (
      <DashboardLayout
        role="citizen"
        title="Complaint Submitted"
        subtitle="Your sanitation complaint has been recorded and an alert has been sent to the Administrator."
      >
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase text-emerald-700">
              Confirmed Complaint ID
            </span>
            <p className="text-3xl font-black font-mono text-forest-900">{submittedRecord.id}</p>
            <p className="text-xs text-slate-600 pt-1">
              Your sanitation complaint has been submitted successfully. Complaint ID:{' '}
              <strong>{submittedRecord.id}</strong>. We will notify you when its status changes.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
            <div>
              <strong>Title:</strong> {submittedRecord.title}
            </div>
            <div>
              <strong>Category:</strong> {submittedRecord.category}
            </div>
            <div>
              <strong>Reported Location:</strong> {submittedRecord.area}
            </div>
            <div>
              <strong>Coordinates:</strong>{' '}
              {isValidCoordinatePair(
                submittedRecord.reported_latitude,
                submittedRecord.reported_longitude
              )
                ? `${submittedRecord.reported_latitude}° N, ${submittedRecord.reported_longitude}° E`
                : 'Not provided (Manual address entry)'}
            </div>
            <div>
              <strong>Photograph:</strong>{' '}
              {submittedRecord.photoUrl
                ? 'Attached and stored with complaint'
                : 'No photograph was attached to this complaint.'}
            </div>
            <div>
              <strong>Current Status:</strong> <StatusBadge status={submittedRecord.status} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={`/citizen/complaints/${submittedRecord.id}`}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
            >
              Track Complaint {submittedRecord.id}
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedRecord(null);
                setTitle('');
                setDescription('');
                setPhotoPreview('');
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
            >
              Submit Another Issue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="citizen"
      title="Report a Community Sanitation Issue"
      subtitle="Provide issue details, optional photographic evidence, and the location of the reported sanitation problem anywhere in India."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="text-xs text-slate-600">
              Submitting as:{' '}
              <span className="font-bold text-forest-900">
                {currentUser.fullName} ({currentUser.email})
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Submission Date: {new Date().toLocaleDateString()}
            </span>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          {similarExisting.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Similar Recent Complaint Notice (Area &amp; Category Match)</span>
              </div>
              <p>
                You already have an active <strong>{category}</strong> report in this area (ID:{' '}
                <code>{similarExisting[0].id}</code> – Status:{' '}
                {getStatusBadgeLabel(similarExisting[0].status)}).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complaint Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Overflowing garbage bin near market road corner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complaint Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe the sanitation problem, approximate duration, and any impact on nearby households or drains..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High (School/Health/Drain Blockage)</option>
              </select>

              <label className="block text-xs font-bold text-slate-700 mt-3 mb-1">
                Nearby Landmark
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Near Primary School Gate"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Dedicated Issue Location Section using IndiaLocationSelector */}
        <div className="space-y-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Location of the Sanitation Problem:</strong> Select the exact location where the sanitation problem exists anywhere in India, then click{' '}
              <strong>&quot;Confirm Location&quot;</strong>.
            </div>
          </div>

          <IndiaLocationSelector
            value={issueLocation}
            mode="complaint"
            showGpsButton={true}
            title="Location of the Reported Sanitation Problem (India-Wide)"
            subtitle="Method A: Use My Current Location (GPS) • Method B: Search or Select Location Manually on Map"
            onConfirm={(loc) => setIssueLocation(loc)}
            onClear={() =>
              setIssueLocation({
                stateName: '',
                districtName: '',
                cityOrVillage: '',
                locality: '',
                landmark: '',
                lat: null,
                lng: null,
                locationCaptureMethod: 'manual_entry',
                locationConfirmationStatus:
                  'Manually Entered Address (No Map Coordinates)',
                isConfirmed: false,
              })
            }
          />
        </div>

        {/* Photographic Evidence Upload */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Upload Photographic Evidence (JPEG, PNG, WebP • Max 5 MB)
          </label>
          <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-4 bg-emerald-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-forest-800 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Attach actual photograph of the reported sanitation issue
                </p>
                <p className="text-[11px] text-slate-500">
                  Uploaded photographs are transmitted to the Administrator Incoming Complaints console. If no image is attached, the complaint will state &quot;No photograph was attached to this complaint.&quot;
                </p>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-forest-800 file:text-white"
            />
          </div>
          {photoError && <p className="text-xs text-red-600 font-medium">{photoError}</p>}
          {photoPreview && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-emerald-800 mb-1">
                Attached Photograph Preview:
              </p>
              <img
                src={photoPreview}
                alt="Complaint preview"
                className="h-44 rounded-xl border border-emerald-200 object-cover"
              />
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-600">
              <strong>Confirmation Status:</strong>{' '}
              <span className="font-semibold text-forest-900">
                {issueLocation.locationConfirmationStatus}
              </span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white shadow-sm transition"
            >
              {submitting ? 'Submitting...' : `Submit Sanitation Complaint`}
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

/* 12. MY COMPLAINTS PAGE */
export function MyComplaintsPage() {
  const { currentUser, complaints, getComplaintHistoryForViewer } = useApp();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Mandatory Citizen Privacy: Only show complaints belonging to the authenticated citizen
  const myComplaints = complaints.filter((c) => {
    if (!currentUser) return false;
    if (c.citizen_user_id !== currentUser.id && c.userId !== currentUser.id) return false;
    const canonicalStatus = normalizeComplaintStatus(c.status);
    const matchesStatus = statusFilter === 'All' || canonicalStatus === statusFilter;
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase()) ||
      (c.state_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout
      role="citizen"
      title="My Complaints"
      subtitle="Live complaint status tracker for reports submitted from your personal citizen account."
      actions={
        <Link
          to="/citizen/submit-complaint"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
        >
          <PlusCircle className="w-4 h-4" />
          New Complaint
        </Link>
      }
    >
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your complaints by ID, title, village, city, or state..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All Lifecycle Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Verification</option>
          <option value="verified">Verified</option>
          <option value="worker_assigned">Worker Assigned</option>
          <option value="in_progress">Cleaning In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
          <option value="rejected">Not Approved</option>
        </select>
      </div>

      {myComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800">
            No matching complaints found in your account.
          </p>
          <Link
            to="/citizen/submit-complaint"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Submit a New Sanitation Complaint
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myComplaints.map((c) => {
            const hist = getComplaintHistoryForViewer(c.id);
            const latestMessage = getLatestPublicMessage(c, hist);
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={c.title}
                      className="w-full sm:w-32 h-28 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-full sm:w-32 h-28 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-xs text-slate-400 shrink-0 p-2 text-center">
                      <ImageOff className="w-5 h-5 mb-1" />
                      <span>No Photograph Attached</span>
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-emerald-100 text-forest-900 px-2.5 py-0.5 rounded">
                        {c.id}
                      </span>
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.urgency} />
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600">{c.description}</p>
                    <p className="text-xs text-slate-500">
                      📍 <strong>Reported Location:</strong> {c.area}
                    </p>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-slate-700">
                      <span className="font-bold text-forest-900">Latest Update: </span>
                      <span>{latestMessage}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span>Submitted: {new Date(c.submittedAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>
                        Last Updated: {new Date(c.updatedAt || c.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0">
                  <Link
                    to={`/citizen/complaints/${c.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-forest-900 border border-emerald-200"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/citizen/complaints/${c.id}#progress`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
                  >
                    View Progress →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* 13. COMPLAINT DETAILS AND TRACKING PAGE (Enforces Strict Ownership Check) */
export function CitizenComplaintDetailPage() {
  const { id } = useParams();
  const {
    getAuthorizedComplaintById,
    getComplaintHistoryForViewer,
    resubmitRejectedComplaint,
  } = useApp();

  const { complaint, unauthorized } = getAuthorizedComplaintById(id);
  const historyEntries = complaint ? getComplaintHistoryForViewer(complaint.id) : [];

  const [editTitle, setEditTitle] = useState(complaint?.title || '');
  const [editDesc, setEditDesc] = useState(complaint?.description || '');
  const [imgLoadError, setImgLoadError] = useState(false);

  if (unauthorized) {
    return (
      <DashboardLayout
        role="citizen"
        title="Access Denied — Private Complaint Record"
        subtitle="Citizens are strictly restricted to viewing only the complaints they personally submitted."
      >
        <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Unauthorized Access Denied (403)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have permission to view complaint <code>{id}</code> because it belongs to another citizen account. CleanVillage enforces strict Row Level Security and ownership checks.
          </p>
          <Link
            to="/citizen/complaints"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to My Complaints
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!complaint) {
    return (
      <DashboardLayout role="citizen" title="Complaint Not Found">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 space-y-3">
          <p className="text-xs text-slate-600">No complaint found with ID {id}.</p>
          <Link
            to="/citizen/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Complaints
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const hasValidCoords = isValidCoordinatePair(
    complaint.reported_latitude,
    complaint.reported_longitude
  );

  const handleResubmit = (e) => {
    e.preventDefault();
    resubmitRejectedComplaint(complaint.id, {
      title: editTitle,
      description: editDesc,
    });
  };

  return (
    <DashboardLayout
      role="citizen"
      title={`Complaint Tracking: ${complaint.id}`}
      subtitle={`${complaint.category} • ${complaint.area}`}
      actions={
        <Link
          to="/citizen/complaints"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Complaints
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StatusBadge status={complaint.status} size="lg" />
              <PriorityBadge priority={complaint.urgency} />
            </div>

            <h2 className="text-lg font-extrabold text-slate-900">{complaint.title}</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {complaint.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <div>
                <strong>Complaint ID:</strong> {complaint.id}
              </div>
              <div>
                <strong>Category:</strong> {complaint.category}
              </div>
              <div>
                <strong>State / District:</strong> {complaint.state_name || '—'} /{' '}
                {complaint.district_name || '—'}
              </div>
              <div>
                <strong>City / Village:</strong>{' '}
                {complaint.village_name || complaint.city_name || '—'}
              </div>
              <div>
                <strong>Locality / Landmark:</strong> {complaint.locality || '—'}{' '}
                {complaint.landmark ? `(${complaint.landmark})` : ''}
              </div>
              <div>
                <strong>Capture Method:</strong> {complaint.location_confirmation_status}
              </div>
              <div>
                <strong>Submission Date:</strong>{' '}
                {new Date(complaint.submittedAt).toLocaleString()}
              </div>
              <div>
                <strong>Last Updated:</strong>{' '}
                {new Date(complaint.updatedAt || complaint.submittedAt).toLocaleString()}
              </div>
              <div className="sm:col-span-2">
                <strong>Assigned Sanitation Team:</strong>{' '}
                {complaint.assignedTeam || 'Pending Worker Assignment'}
              </div>
            </div>

            {complaint.authorityRemarks && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-forest-900">Public Status Update Note:</p>
                <p className="text-emerald-950">{complaint.authorityRemarks}</p>
              </div>
            )}

            {/* If Not Approved (rejected): Show Explanation & Reopen Form */}
            {normalizeComplaintStatus(complaint.status) === 'rejected' && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <p className="text-xs font-bold text-red-800">
                  Review Explanation:{' '}
                  {complaint.rejectionReason || 'Requires additional clarification.'}
                </p>
                <form
                  onSubmit={handleResubmit}
                  className="space-y-3 pt-2 border-t border-red-200"
                >
                  <p className="text-xs font-bold text-slate-800">
                    Correct Details &amp; Reopen This Complaint:
                  </p>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reopen Complaint with Updated Details
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Photographs: Submitted & Resolution */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Photographic Evidence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">
                  Submitted Photograph
                </p>
                {complaint.photoUrl && !imgLoadError ? (
                  <img
                    src={complaint.photoUrl}
                    alt="Submitted complaint"
                    onError={() => setImgLoadError(true)}
                    className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-44 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-500">
                    <ImageOff className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span>
                      {imgLoadError
                        ? 'Photograph could not be loaded.'
                        : 'No photograph was attached to this complaint.'}
                    </span>
                  </div>
                )}
              </div>
              {complaint.resolutionPhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5">
                    Resolution Evidence (After Cleaning)
                  </p>
                  <img
                    src={complaint.resolutionPhotoUrl}
                    alt="Resolution proof"
                    className="w-full h-44 object-cover rounded-xl border border-emerald-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reported Location Map */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-extrabold text-slate-900">Reported Location Map</h3>
            {hasValidCoords ? (
              <>
                <p className="text-xs text-slate-500">
                  {complaint.reported_latitude}° N, {complaint.reported_longitude}° E •{' '}
                  {complaint.area}
                </p>
                <VillageMap
                  center={{
                    lat: complaint.reported_latitude,
                    lng: complaint.reported_longitude,
                  }}
                  height="220px"
                />
              </>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Location coordinates were not provided. Reported textual address:{' '}
                <strong>{complaint.area}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Complaint Progress Timeline (Section 3) */}
        <div id="progress" className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
            <ComplaintProgressTimeline
              complaint={complaint}
              historyEntries={historyEntries}
              viewerRole="citizen"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 14. GREEN REWARDS PAGE */
export function GreenRewardsPage() {
  const {
    currentUser,
    rewards,
    redemptions,
    pointTransactions,
    requestRewardRedemption,
  } = useApp();

  const currentPts = currentUser?.greenPoints || 0;
  const totalEarned = currentUser?.totalPointsEarned || 0;
  const totalRedeemed = currentUser?.totalPointsRedeemed || 0;

  const myRedemptions = redemptions.filter(
    (r) => !currentUser || r.userId === currentUser.id
  );
  const myTransactions = pointTransactions.filter(
    (t) =>
      !currentUser ||
      t.userId === currentUser.id ||
      t.user_id === currentUser.id
  );

  const participationLevel =
    totalEarned >= 80
      ? 'Cleanliness Champion'
      : totalEarned >= 40
      ? 'Active Green Guardian'
      : 'Rising Eco Citizen';

  return (
    <DashboardLayout
      role="citizen"
      title="Green Rewards & Point Ledger"
      subtitle="Rule-based rewards for verified sanitation complaints, cleanliness drives, and waste segregation."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="village-canopy-bg rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-amber-300 uppercase">Current Balance</p>
          <p className="text-3xl font-extrabold mt-1">{currentPts} Pts</p>
          <p className="text-[11px] text-emerald-200 mt-1">Available for redemption</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Points Earned</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">+{totalEarned}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified actions only</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Points Redeemed</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{totalRedeemed}</p>
          <p className="text-[11px] text-slate-500 mt-1">Reserved or issued rewards</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Participation Level</p>
          <p className="text-lg font-extrabold text-forest-900 mt-2">{participationLevel}</p>
          <p className="text-[11px] text-emerald-700 mt-1">Anti-duplicate protected</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>Trusted Point Rules:</strong> Verified Complaint = <strong>+10 Pts</strong> • Confirmed Cleanliness Drive Attendance = <strong>+20 Pts</strong> • Household Segregation Activity = <strong>+5 Pts</strong> (Unapproved complaints earn 0 pts; duplicate awards are blocked).
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">Available Eco Rewards Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((r) => {
            const canRedeem = currentPts >= r.pointsCost && r.available && r.stock > 0;
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900">
                      {r.pointsCost} Green Points
                    </span>
                    <span className="text-xs text-slate-500">Available Stock: {r.stock}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{r.title}</h3>
                  <p className="text-xs text-slate-600">{r.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {canRedeem
                      ? 'Eligible to redeem'
                      : `Need ${Math.max(0, r.pointsCost - currentPts)} more pts`}
                  </span>
                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => requestRewardRedemption(r.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      canRedeem
                        ? 'bg-forest-800 hover:bg-forest-900 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Request Redemption
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">My Redemption Requests</h3>
          {myRedemptions.length === 0 ? (
            <p className="text-xs text-slate-500">No reward redemptions requested yet.</p>
          ) : (
            <div className="space-y-2.5">
              {myRedemptions.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{req.rewardTitle}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-slate-500">
                    ID: {req.id} • Cost: {req.pointsCost} pts •{' '}
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </p>
                  {req.authorityNote && (
                    <p className="text-emerald-800">Note: {req.authorityNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            Green Points Transaction History
          </h3>
          {myTransactions.length === 0 ? (
            <p className="text-xs text-slate-500">No Green Points transactions recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {myTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{tx.reason}</p>
                    <p className="text-[11px] text-slate-400">
                      Ref: {tx.referenceId || tx.complaint_id || tx.id} •{' '}
                      {new Date(tx.createdAt || tx.created_at).toLocaleString()}
                      {tx.balance_after !== undefined
                        ? ` • Balance After: ${tx.balance_after} pts`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                      tx.points > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 15. COMMUNITY LEADERBOARD PAGE */
export function LeaderboardPage() {
  const { users } = useApp();

  const rankedCitizens = users
    .filter((u) => u.role === 'citizen' && u.optInLeaderboard !== false)
    .sort((a, b) => (b.greenPoints || 0) - (a.greenPoints || 0));

  return (
    <DashboardLayout
      role="citizen"
      title="Green Citizens Leaderboard"
      subtitle="Privacy-conscious recognition of citizens contributing to sanitation reporting and cleanliness drives across India."
    >
      <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <strong>Privacy Protection Notice:</strong> Only opt-in display names, city/village/state, and Green Points are shown. Phone numbers, email addresses, and personal complaint details are strictly private.
        </div>

        <div className="divide-y divide-slate-100">
          {rankedCitizens.map((u, index) => (
            <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950'
                      : index === 1
                      ? 'bg-slate-200 text-slate-800'
                      : index === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-emerald-50 text-forest-800'
                  }`}
                >
                  #{index + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{u.fullName}</p>
                  <p className="text-xs text-slate-500">{u.village}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-forest-900 text-xs font-extrabold">
                  {u.greenPoints} Green Points
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 16. CLEANLINESS ACTIVITIES PAGE */
export function CleanlinessActivitiesPage() {
  const {
    currentUser,
    activities,
    registerForActivity,
    cancelActivityRegistration,
    selectedLocation,
    matchesLocationFilter,
    clearSelectedLocation,
  } = useApp();

  const filteredActivities = activities.filter((a) =>
    matchesLocationFilter(a, selectedLocation)
  );

  return (
    <DashboardLayout
      role="citizen"
      title="Cleanliness Drives & Community Participation"
      subtitle="Register for upcoming Shramdaan drives. (+20 Green Points awarded upon authorized attendance confirmation.)"
    >
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">
            No cleanliness drives scheduled for the selected location filter yet.
          </p>
          <button
            type="button"
            onClick={clearSelectedLocation}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
          >
            Show All Cleanliness Drives Across India
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredActivities.map((act) => {
            const isRegistered = currentUser && act.participants.includes(currentUser.id);
            const isConfirmed =
              currentUser && act.confirmedAttendees.includes(currentUser.id);
            const isPast = act.status === 'Completed';

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isPast
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-emerald-100 text-forest-900'
                      }`}
                    >
                      {act.status}
                    </span>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      +{act.pointsAwarded} Pts
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{act.title}</h3>
                  <p className="text-xs text-slate-600">{act.description}</p>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <div>
                      📅 <strong>Date &amp; Time:</strong> {act.date} • {act.time}
                    </div>
                    <div>
                      📍 <strong>Meeting Point:</strong> {act.location}
                    </div>
                    <div>
                      👥 <strong>Registered:</strong> {act.participants.length} /{' '}
                      {act.participationLimit} citizens
                    </div>
                    <div>
                      ℹ️ <strong>Instructions:</strong> {act.instructions}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {isConfirmed ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Attendance Confirmed (+{act.pointsAwarded} Pts Awarded)
                    </span>
                  ) : isPast ? (
                    <span className="text-xs text-slate-400">Event concluded</span>
                  ) : isRegistered ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-emerald-800">
                        Registered (Awaiting Event Day)
                      </span>
                      <button
                        type="button"
                        onClick={() => cancelActivityRegistration(act.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Cancel Registration
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => registerForActivity(act.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition"
                    >
                      Register for Cleanliness Drive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* 17. CITIZEN NOTIFICATIONS PAGE (Section 1) */
export function CitizenNotificationsPage() {
  const {
    myNotifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
  } = useApp();
  const navigate = useNavigate();

  const handleOpen = (n) => {
    const isRead = Boolean(n.is_read ?? n.read);
    if (!isRead) markNotificationRead(n.id);
    const complaintId =
      n.related_complaint_id || n.relatedComplaintId || n.metadata?.complaint_id;
    if (n.type === 'green_points' || n.type === 'reward') {
      navigate('/citizen/rewards');
    } else if (complaintId) {
      navigate(`/citizen/complaints/${complaintId}`);
    } else if (n.metadata?.link || n.link) {
      navigate(n.metadata?.link || n.link);
    }
  };

  return (
    <DashboardLayout
      role="citizen"
      title="Notification Center"
      subtitle="Persistent in-app updates for your complaint status lifecycle and Green Points credits."
      actions={
        <div className="flex items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All as Read ({unreadNotificationCount})
            </button>
          )}
          {myNotifications.some((n) => n.is_read || n.read) && (
            <button
              type="button"
              onClick={clearReadNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700"
            >
              <Archive className="w-3.5 h-3.5" />
              Clear Read
            </button>
          )}
        </div>
      }
    >
      {myNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-emerald-100 p-10 text-center space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-extrabold text-slate-900">
            You&apos;re all caught up! New updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myNotifications.map((n) => {
            const isRead = Boolean(n.is_read ?? n.read);
            const complaintId =
              n.related_complaint_id || n.relatedComplaintId || n.metadata?.complaint_id;
            const createdTime = n.created_at || n.createdAt;
            const categoryLabel = getNotificationCategoryLabel(n.type);
            const badgeCls = getNotificationCategoryBadgeClass(n.type);

            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isRead
                    ? 'bg-white border-slate-200/80'
                    : 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isRead && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}
                    >
                      {categoryLabel}
                    </span>
                    {complaintId && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-forest-900">
                        {complaintId}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-400">
                    {createdTime ? new Date(createdTime).toLocaleString() : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
                  >
                    <span>
                      {n.type === 'green_points' || n.type === 'reward'
                        ? 'Open Green Rewards'
                        : complaintId
                        ? `Open ${complaintId}`
                        : 'Open Details'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900 hover:bg-emerald-200"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* 18. MY PROFILE PAGE */
export function CitizenProfilePage() {
  const { currentUser, updateProfile, logout } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [householdArea, setHouseholdArea] = useState(currentUser?.householdArea || '');
  const [village, setVillage] = useState(currentUser?.village || '');
  const [optInLeaderboard, setOptInLeaderboard] = useState(
    currentUser?.optInLeaderboard ?? true
  );

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({
      fullName,
      mobile,
      householdArea,
      village,
      optInLeaderboard,
    });
  };

  return (
    <DashboardLayout
      role="citizen"
      title="My Citizen Profile & Preferred Locality"
      subtitle="Manage your contact details, preferred village/city, and privacy settings."
    >
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4 max-w-2xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preferred Locality / Street Address
            </label>
            <input
              type="text"
              value={householdArea}
              onChange={(e) => setHouseholdArea(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Village, Town, or City &amp; State
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={optInLeaderboard}
            onChange={(e) => setOptInLeaderboard(e.target.checked)}
            className="rounded text-forest-800"
          />
          <span>Display my name and Green Points on the public Community Leaderboard</span>
        </label>

        <div className="pt-3 flex items-center justify-between">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            Save Profile Changes
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700"
          >
            Log Out
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
