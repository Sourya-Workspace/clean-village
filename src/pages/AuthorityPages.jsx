import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Clock,
  MapPin,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ImageOff,
  Eye,
  Check,
  CheckCheck,
  Archive,
  Bell,
  Lock,
  Wrench,
  RotateCcw,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  StatusBadge,
  PriorityBadge,
  normalizeComplaintStatus,
  getStatusBadgeLabel,
  getPermittedNextStatuses,
} from '../components/StatusBadge';
import ComplaintProgressTimeline from '../components/ComplaintProgressTimeline';
import {
  getNotificationCategoryLabel,
  getNotificationCategoryBadgeClass,
} from '../components/NotificationBellPanel';
import VillageMap from '../components/VillageMap';
import {
  COMPLAINT_CATEGORIES,
  CLEANING_TEAMS,
  LOCATION_REVIEW_STATUSES,
} from '../data/seedData';
import { INDIA_STATES_AND_UTS, isValidCoordinatePair } from '../services/geocoding';

const CHART_COLORS = ['#15803d', '#0284c7', '#f59e0b', '#7c3aed', '#dc2626', '#0d9488'];

/**
 * Reusable Incoming Complaint Card for Administrator Dashboard & Incoming Complaints Feed (Section 5)
 */
function IncomingComplaintCard({
  complaint,
  onQuickStatusChange,
  onRequestClarification,
  onOpenPhoto,
  isOverdue,
}) {
  const [imgError, setImgError] = useState(false);
  const currentCode = normalizeComplaintStatus(complaint.status);
  const permittedNext = getPermittedNextStatuses(currentCode, 'authority');
  const hasValidCoords = isValidCoordinatePair(
    complaint.reported_latitude,
    complaint.reported_longitude
  );
  const externalMapUrl = hasValidCoords
    ? `https://www.openstreetmap.org/?mlat=${complaint.reported_latitude}&mlon=${complaint.reported_longitude}#map=16/${complaint.reported_latitude}/${complaint.reported_longitude}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm hover:border-emerald-300 transition space-y-4">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Submitted Photograph or Clear No-Photo State */}
        <div className="w-full lg:w-52 shrink-0 space-y-2">
          {complaint.photoUrl && !imgError ? (
            <div className="relative group">
              <img
                src={complaint.photoUrl}
                alt={complaint.title}
                onError={() => setImgError(true)}
                className="w-full h-36 rounded-xl object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={() => onOpenPhoto(complaint)}
                className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-100 text-forest-900 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Photograph
              </button>
            </div>
          ) : (
            <div className="w-full h-36 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-3 text-center text-xs text-slate-500">
              <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
              <span>
                {imgError
                  ? 'Photograph could not be loaded.'
                  : 'No photograph was attached to this complaint.'}
              </span>
            </div>
          )}
        </div>

        {/* Complaint Metadata, Description, Location & Actions */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold bg-emerald-100 text-forest-900 px-2.5 py-0.5 rounded">
                {complaint.id}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.urgency} />
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                Review: {complaint.location_review_status || 'Not Reviewed'}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                  OVERDUE
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              Submitted: {new Date(complaint.submittedAt).toLocaleString()}
            </span>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase text-emerald-700">
              {complaint.category}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{complaint.title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{complaint.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Reported Address / Village
              </span>
              <span className="font-bold text-slate-800">{complaint.area}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Map Coordinates
              </span>
              {hasValidCoords ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-800">
                    {complaint.reported_latitude}°N, {complaint.reported_longitude}°E
                  </span>
                  {externalMapUrl && (
                    <a
                      href={externalMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-forest-800 underline"
                    >
                      Map
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-slate-500">Manual entry (No GPS coords)</span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Citizen Reference
              </span>
              <span className="font-semibold text-slate-800">
                {complaint.citizen_name || complaint.userName}
              </span>
              {complaint.assignedTeam && (
                <span className="block text-[11px] text-emerald-700 font-semibold">
                  Team: {complaint.assignedTeam}
                </span>
              )}
            </div>
          </div>

          {/* Role & State-Permitted Action Buttons */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {permittedNext.includes('under_review') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'under_review',
                      remarks: `Complaint ${complaint.id} is now under administrative verification.`,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition"
                >
                  Begin Verification
                </button>
              )}

              {permittedNext.includes('verified') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'verified',
                      remarks: 'Verified genuine sanitation issue (+10 Green Points credited).',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  Verify Complaint (+10 Pts)
                </button>
              )}

              {permittedNext.includes('worker_assigned') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'worker_assigned',
                      assignedTeam: complaint.assignedTeam || CLEANING_TEAMS[0],
                      remarks: `Sanitation worker assigned (${
                        complaint.assignedTeam || CLEANING_TEAMS[0]
                      }).`,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition"
                >
                  Assign Worker
                </button>
              )}

              {permittedNext.includes('in_progress') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'in_progress',
                      remarks: 'Cleaning work started at the reported location.',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition"
                >
                  Start Cleaning
                </button>
              )}

              {permittedNext.includes('resolved') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'resolved',
                      remarks: 'Sanitation issue cleaned and verified as resolved.',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                >
                  Mark Resolved
                </button>
              )}

              {permittedNext.includes('reopened') && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickStatusChange(complaint.id, {
                      newStatus: 'reopened',
                      remarks: 'Complaint reopened by Administrator for further attention.',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition"
                >
                  Reopen
                </button>
              )}

              <button
                type="button"
                onClick={() => onRequestClarification(complaint.id)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 transition"
              >
                Request Clarification
              </button>
            </div>

            <div className="flex items-center gap-2">
              {externalMapUrl && (
                <a
                  href={externalMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-forest-900 border border-emerald-200"
                >
                  View Reported Location
                </a>
              )}
              <Link
                to={`/authority/complaints/${complaint.id}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
              >
                View Details &amp; Full Actions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 19. AUTHORITY DASHBOARD */
export function AuthorityDashboardPage() {
  const {
    complaints,
    tasks,
    slaTargetHours,
    setSlaTargetHours,
    isComplaintOverdue,
    updateComplaintStatus,
    updateComplaintLocationReview,
  } = useApp();

  const [adminStateFilter, setAdminStateFilter] = useState('All');
  const [lightboxComplaint, setLightboxComplaint] = useState(null);

  const visibleComplaints =
    adminStateFilter === 'All'
      ? complaints
      : complaints.filter(
          (c) => (c.state_name || '').toLowerCase() === adminStateFilter.toLowerCase()
        );

  const totalComplaints = visibleComplaints.length;
  const awaitingVerification = visibleComplaints.filter((c) =>
    ['submitted', 'under_review', 'reopened'].includes(normalizeComplaintStatus(c.status))
  ).length;
  const verifiedCount = visibleComplaints.filter(
    (c) => normalizeComplaintStatus(c.status) === 'verified'
  ).length;
  const tasksInProgress = visibleComplaints.filter((c) =>
    ['worker_assigned', 'in_progress'].includes(normalizeComplaintStatus(c.status))
  ).length;
  const resolvedCount = visibleComplaints.filter(
    (c) => normalizeComplaintStatus(c.status) === 'resolved'
  ).length;
  const overdueList = visibleComplaints.filter((c) => isComplaintOverdue(c));

  const categoryData = COMPLAINT_CATEGORIES.map((cat) => ({
    name: cat.split(' ')[0],
    fullName: cat,
    count: visibleComplaints.filter((c) => c.category === cat).length,
  })).filter((d) => d.count > 0);

  const statusData = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Verification' },
    { key: 'verified', label: 'Verified' },
    { key: 'worker_assigned', label: 'Worker Assigned' },
    { key: 'in_progress', label: 'Cleaning In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'rejected', label: 'Not Approved' },
  ]
    .map((st) => ({
      name: st.label,
      value: visibleComplaints.filter(
        (c) => normalizeComplaintStatus(c.status) === st.key
      ).length,
    }))
    .filter((d) => d.value > 0);

  const handleRequestClarification = (complaintId) => {
    updateComplaintLocationReview(complaintId, {
      reviewStatus: 'Needs Clarification',
      reviewNote:
        'Please provide a clearer landmark or additional location description for your complaint.',
    });
  };

  return (
    <DashboardLayout
      role="authority"
      title="Sanitation Authority Dashboard"
      subtitle="Centralized administrative console for Incoming Complaints, status lifecycle verification, worker assignment, and Green Points."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-semibold text-slate-700">Service Area:</span>
            <select
              value={adminStateFilter}
              onChange={(e) => setAdminStateFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 font-bold text-forest-900"
            >
              <option value="All">All India (All Records)</option>
              {INDIA_STATES_AND_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
            <Clock className="w-3.5 h-3.5 text-forest-800" />
            <span className="font-semibold text-slate-700">Target SLA:</span>
            <select
              value={slaTargetHours}
              onChange={(e) => setSlaTargetHours(Number(e.target.value))}
              className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 font-bold text-forest-900"
            >
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>
        </div>
      }
    >
      {/* 6 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Complaints</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalComplaints}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-800 uppercase">Incoming / Review</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{awaitingVerification}</p>
        </div>
        <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-blue-800 uppercase">Verified</p>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">{verifiedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-purple-800 uppercase">Worker / In Progress</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{tasksInProgress}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-800 uppercase">Resolved</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{resolvedCount}</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-red-800 uppercase">
            Overdue (&gt;{slaTargetHours}h)
          </p>
          <p className="text-2xl font-extrabold text-red-700 mt-1">{overdueList.length}</p>
        </div>
      </div>

      {/* Quick Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-slate-900">Complaints by Category</h2>
            <Link
              to="/authority/reports"
              className="text-xs font-bold text-forest-800 hover:underline"
            >
              Full Analytics →
            </Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">
            Complaint Lifecycle Distribution
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label
                >
                  {statusData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* INCOMING COMPLAINTS SECTION (Section 5) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Incoming Complaints</h2>
            <p className="text-xs text-slate-500">
              All citizen-submitted sanitation complaints within your authorized administrator scope, including photographs, descriptions, and location evidence.
            </p>
          </div>
          <Link
            to="/authority/complaints"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            View All Incoming Complaints ({visibleComplaints.length}) →
          </Link>
        </div>

        <div className="space-y-4">
          {visibleComplaints.slice(0, 4).map((c) => (
            <IncomingComplaintCard
              key={c.id}
              complaint={c}
              isOverdue={isComplaintOverdue(c)}
              onQuickStatusChange={updateComplaintStatus}
              onRequestClarification={handleRequestClarification}
              onOpenPhoto={(comp) => setLightboxComplaint(comp)}
            />
          ))}
        </div>
      </div>

      {/* Photograph Lightbox Modal */}
      {lightboxComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-forest-900">
                  {lightboxComplaint.id}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {lightboxComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxComplaint(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxComplaint.photoUrl}
              alt={lightboxComplaint.title}
              className="w-full max-h-[420px] object-contain rounded-2xl bg-slate-900"
            />
            <p className="text-xs text-slate-600">{lightboxComplaint.description}</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* 20. INCOMING COMPLAINTS MANAGEMENT PAGE (Section 5) */
export function ComplaintManagementPage() {
  const {
    complaints,
    isComplaintOverdue,
    slaTargetHours,
    updateComplaintStatus,
    updateComplaintLocationReview,
  } = useApp();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [lightboxComplaint, setLightboxComplaint] = useState(null);
  const pageSize = 6;

  const filtered = complaints
    .filter((c) => {
      const combinedLocation = `${c.locality || ''} ${c.village_name || ''} ${c.city_name || ''} ${
        c.district_name || ''
      } ${c.state_name || ''} ${c.area || ''}`.toLowerCase();

      const matchesSearch =
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        combinedLocation.includes(search.toLowerCase()) ||
        (c.userName || '').toLowerCase().includes(search.toLowerCase());

      const matchesState =
        stateFilter === 'All' ||
        (c.state_name || '').toLowerCase() === stateFilter.toLowerCase();
      const matchesStatus =
        statusFilter === 'All' || normalizeComplaintStatus(c.status) === statusFilter;
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
      const matchesOverdue = !onlyOverdue || isComplaintOverdue(c);

      return matchesSearch && matchesState && matchesStatus && matchesCategory && matchesOverdue;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.submittedAt) - new Date(a.submittedAt);
      if (sortBy === 'oldest') return new Date(a.submittedAt) - new Date(b.submittedAt);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleRequestClarification = (complaintId) => {
    updateComplaintLocationReview(complaintId, {
      reviewStatus: 'Needs Clarification',
      reviewNote:
        'Please provide a clearer landmark or additional location description for your complaint.',
    });
  };

  return (
    <DashboardLayout
      role="authority"
      title="Incoming Complaints (Administrator Intake & Verification)"
      subtitle="View all citizen complaints across India with submitted photographs, descriptions, coordinates, and lifecycle actions."
    >
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search ID, description, citizen, village, city, or street..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All States / UTs</option>
          {INDIA_STATES_AND_UTS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Verification</option>
          <option value="verified">Verified</option>
          <option value="worker_assigned">Worker Assigned</option>
          <option value="in_progress">Cleaning In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
          <option value="rejected">Not Approved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="All">All Categories</option>
          {COMPLAINT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-red-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => {
                setOnlyOverdue(e.target.checked);
                setPage(1);
              }}
              className="rounded text-red-600"
            />
            <span>Overdue (&gt;{slaTargetHours}h)</span>
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Incoming Complaint Cards */}
      <div className="space-y-4">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center text-xs text-slate-600">
            No incoming complaints match the selected filters.
          </div>
        ) : (
          paginated.map((c) => (
            <IncomingComplaintCard
              key={c.id}
              complaint={c}
              isOverdue={isComplaintOverdue(c)}
              onQuickStatusChange={updateComplaintStatus}
              onRequestClarification={handleRequestClarification}
              onOpenPhoto={(comp) => setLightboxComplaint(comp)}
            />
          ))
        )}

        {/* Pagination */}
        <div className="bg-white rounded-2xl border border-emerald-100 px-5 py-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {paginated.length} of {filtered.length} incoming complaints
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-bold">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {lightboxComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-forest-900">
                  {lightboxComplaint.id}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {lightboxComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxComplaint(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxComplaint.photoUrl}
              alt={lightboxComplaint.title}
              className="w-full max-h-[420px] object-contain rounded-2xl bg-slate-900"
            />
            <p className="text-xs text-slate-600">{lightboxComplaint.description}</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* 21. COMPLAINT DETAILS, REPORTED LOCATION & EVIDENCE, AND LIFECYCLE MANAGEMENT PAGE */
export function AuthorityComplaintDetailPage() {
  const { id } = useParams();
  const {
    getAuthorizedComplaintById,
    getComplaintHistoryForViewer,
    updateComplaintStatus,
    updateComplaintLocationReview,
    assignCleaningTask,
  } = useApp();

  const { complaint } = getAuthorizedComplaintById(id);
  const historyEntries = complaint ? getComplaintHistoryForViewer(complaint.id) : [];

  const [remarks, setRemarks] = useState(complaint?.authorityRemarks || '');
  const [internalNote, setInternalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState(complaint?.rejectionReason || '');
  const [selectedTeam, setSelectedTeam] = useState(
    complaint?.assignedTeam || CLEANING_TEAMS[0]
  );
  const [taskDesc, setTaskDesc] = useState(
    `Clean & sanitize reported ${complaint?.category || 'issue'} at ${
      complaint?.area || 'site'
    }`
  );
  const [reviewStatus, setReviewStatus] = useState(
    complaint?.location_review_status || 'Not Reviewed'
  );
  const [reviewNote, setReviewNote] = useState(complaint?.location_review_note || '');
  const [actionError, setActionError] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);

  if (!complaint) {
    return (
      <DashboardLayout role="authority" title="Complaint Not Found">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 space-y-3">
          <p className="text-xs">No complaint found with ID {id}.</p>
          <Link
            to="/authority/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Incoming Complaints
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const currentCode = normalizeComplaintStatus(complaint.status);
  const permittedNext = getPermittedNextStatuses(currentCode, 'authority');
  const hasValidCoords = isValidCoordinatePair(
    complaint.reported_latitude,
    complaint.reported_longitude
  );

  const handleStatusChange = async (newStatus) => {
    setActionError('');
    const res = await updateComplaintStatus(complaint.id, {
      newStatus,
      remarks,
      internalNote,
      rejectionReason,
      assignedTeam: selectedTeam,
    });
    if (!res.success) {
      setActionError(res.error);
    } else {
      setInternalNote('');
    }
  };

  const handleSaveLocationReview = (e) => {
    e.preventDefault();
    setActionError('');
    const res = updateComplaintLocationReview(complaint.id, {
      reviewStatus,
      reviewNote,
    });
    if (!res.success) {
      setActionError(res.error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setActionError('');
    const res = await assignCleaningTask({
      complaintId: complaint.id,
      assignedTeam: selectedTeam,
      description: taskDesc,
      area: complaint.area,
      priority: complaint.urgency,
    });
    if (!res.success) {
      setActionError(res.error);
    }
  };

  const externalMapUrl = hasValidCoords
    ? `https://www.openstreetmap.org/?mlat=${complaint.reported_latitude}&mlon=${complaint.reported_longitude}#map=16/${complaint.reported_latitude}/${complaint.reported_longitude}`
    : null;

  return (
    <DashboardLayout
      role="authority"
      title={`Inspect & Manage Complaint: ${complaint.id}`}
      subtitle={`Submitted by ${complaint.citizen_name || complaint.userName} • ${
        complaint.area
      }`}
      actions={
        <Link
          to="/authority/complaints"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incoming Complaints
        </Link>
      }
    >
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
          {actionError}
        </div>
      )}

      {/* DEDICATED SECTION: REPORTED LOCATION & EVIDENCE */}
      <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase text-emerald-700">
              Dedicated Verification Panel
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              Reported Location &amp; Evidence
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={complaint.status} size="lg" />
            <PriorityBadge priority={complaint.urgency} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Structured Location, Description & Photographs */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{complaint.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {complaint.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Complaint ID
                </span>
                <span className="font-mono font-bold text-forest-900">{complaint.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Category
                </span>
                <span className="font-bold text-slate-800">{complaint.category}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Reported Address
                </span>
                <span className="font-bold text-slate-900">{complaint.area}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  State &amp; District
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.state_name || '—'} / {complaint.district_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Village, Town, or City
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.village_name || complaint.city_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Locality / Landmark
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.locality || '—'}{' '}
                  {complaint.landmark ? `(${complaint.landmark})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Submission Timestamp
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(complaint.submittedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Latitude &amp; Longitude
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {hasValidCoords
                    ? `${complaint.reported_latitude}° N, ${complaint.reported_longitude}° E`
                    : 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Location Capture Method
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.location_capture_method}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Citizen Reference
                </span>
                <span className="font-bold text-forest-900">
                  {complaint.citizen_name || complaint.userName}
                </span>
              </div>
            </div>

            {/* Photographs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">
                  Submitted Complaint Photograph
                </p>
                {complaint.photoUrl && !imgLoadError ? (
                  <img
                    src={complaint.photoUrl}
                    alt="Submitted complaint evidence"
                    onError={() => setImgLoadError(true)}
                    className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-44 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-500">
                    <ImageOff className="w-6 h-6 text-slate-400 mb-1" />
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
                  <p className="text-xs font-bold text-emerald-700 mb-1">
                    Resolution Photograph (After)
                  </p>
                  <img
                    src={complaint.resolutionPhotoUrl}
                    alt="Resolution evidence"
                    className="w-full h-44 object-cover rounded-xl border border-emerald-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Map & Administrative Location Review */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Reported Coordinates on Interactive Map
              </h3>
              {externalMapUrl && (
                <a
                  href={externalMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-forest-800 hover:underline"
                >
                  Open in OpenStreetMap
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {hasValidCoords ? (
              <VillageMap
                center={{
                  lat: Number(complaint.reported_latitude),
                  lng: Number(complaint.reported_longitude),
                }}
                height="280px"
                showSingleMarker={true}
              />
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>No Map Coordinates Provided</span>
                </div>
                <p className="leading-relaxed">
                  Location coordinates were not provided. Please review the citizen&apos;s manually entered address: <strong>{complaint.area}</strong>.
                </p>
              </div>
            )}

            {/* Administrative Location Review */}
            <form
              onSubmit={handleSaveLocationReview}
              className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-forest-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Administrative Location Review
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-emerald-300 text-forest-900">
                  {complaint.location_review_status || 'Not Reviewed'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Location Review Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {LOCATION_REVIEW_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Review Note
                  </label>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g., Landmark verified / Requesting street clarification"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {complaint.location_reviewed_by ? (
                  <span className="text-[11px] text-slate-500">
                    Reviewed by <strong>{complaint.location_reviewed_by}</strong> on{' '}
                    {new Date(complaint.location_reviewed_at).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Not yet reviewed by an administrator
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
                >
                  Save Location Review
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Row: Lifecycle Status Transition Controls + History & Task Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Update Complaint Lifecycle Status
            </h3>
            <p className="text-xs text-slate-500">
              Current Status: <strong>{getStatusBadgeLabel(complaint.status)}</strong>. Every status transition records an entry in <code>complaint_history</code> and sends an in-app notification to the citizen.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Public Update Message (Visible to Citizen in Progress Timeline)
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter public progress update or resolution summary for the citizen..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Internal Administrative Note (Private — Never Visible to Citizens)
              </label>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Optional internal audit note for sanitation staff only..."
                className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Review Explanation (Mandatory if Marking &quot;Not Approved&quot;)
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Duplicate report / Unrelated image / Already serviced"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {permittedNext.includes('under_review') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('under_review')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Begin Verification (Under Verification)
                </button>
              )}

              {permittedNext.includes('verified') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('verified')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Verify Complaint (+10 Green Points)
                </button>
              )}

              {permittedNext.includes('worker_assigned') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('worker_assigned')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Assign Sanitation Worker
                </button>
              )}

              {permittedNext.includes('in_progress') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Start Cleaning (In Progress)
                </button>
              )}

              {permittedNext.includes('resolved') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('resolved')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mark Resolved (+10 Green Points)
                </button>
              )}

              {permittedNext.includes('rejected') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('rejected')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  Reject with Explanation (Not Approved)
                </button>
              )}

              {permittedNext.includes('reopened') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('reopened')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Reopen Complaint
                </button>
              )}
            </div>
          </div>

          {/* Assign Cleaning Task Form */}
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Assign Cleaning Task to Sanitation Squad
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign Worker / Sanitation Squad
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                {CLEANING_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Task Instructions
              </label>
              <textarea
                rows={2}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
            >
              Create &amp; Assign Cleaning Task
            </button>
          </form>
        </div>

        {/* Right: Full Lifecycle Timeline + Internal Admin Notes */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
          <ComplaintProgressTimeline
            complaint={complaint}
            historyEntries={historyEntries}
            viewerRole="authority"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 22. CLEANING TASK MANAGEMENT PAGE */
export function CleaningTaskManagementPage() {
  const { tasks, complaints, assignCleaningTask, updateCleaningTask } = useApp();
  const [complaintId, setComplaintId] = useState(complaints[0]?.id || '');
  const [assignedTeam, setAssignedTeam] = useState(CLEANING_TEAMS[0]);
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('Main Bazar Road');
  const [priority, setPriority] = useState('High');
  const [remarksMap, setRemarksMap] = useState({});
  const [taskError, setTaskError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setTaskError('');
    if (!description.trim()) return;
    const res = await assignCleaningTask({
      complaintId,
      assignedTeam,
      description,
      area,
      priority,
    });
    if (!res.success) {
      setTaskError(res.error);
      return;
    }
    setDescription('');
  };

  const handleStatusUpdate = async (task, newStatus) => {
    setTaskError('');
    const completionRemarks =
      remarksMap[task.id] !== undefined ? remarksMap[task.id] : task.completionRemarks;
    const res = await updateCleaningTask(task.id, {
      status: newStatus,
      completionRemarks,
    });
    if (!res.success) {
      setTaskError(res.error);
    }
  };

  return (
    <DashboardLayout
      role="authority"
      title="Cleaning Task Management"
      subtitle="Assign tasks to sanitation teams, record completion remarks, and synchronize complaint resolution."
    >
      {taskError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
          {taskError}
        </div>
      )}

      {/* Create Task Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Related Complaint ID</label>
          <select
            value={complaintId}
            onChange={(e) => setComplaintId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            <option value="">Standalone Task</option>
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} ({c.village_name || c.city_name || c.area.split(',')[0]})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Squad</label>
          <select
            value={assignedTeam}
            onChange={(e) => setAssignedTeam(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          >
            {CLEANING_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Task Description *</label>
          <input
            type="text"
            required
            placeholder="e.g., Desilt drain & apply bleaching powder"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>

        <button
          type="submit"
          className="py-2 px-4 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
        >
          + Assign Task
        </button>
      </form>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-emerald-100 text-forest-900 px-2.5 py-0.5 rounded">
                  {t.id}
                </span>
                {t.complaintId && (
                  <Link
                    to={`/authority/complaints/${t.complaintId}`}
                    className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded hover:underline"
                  >
                    Linked: {t.complaintId}
                  </Link>
                )}
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
              <span className="text-xs text-slate-500">
                Target Date: {new Date(t.targetDate).toLocaleDateString()}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{t.description}</h3>
            <p className="text-xs text-slate-600">
              📍 {t.area} • 👥 Assigned Team: <strong>{t.assignedTeam}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 items-center">
              <div className="md:col-span-7">
                <input
                  type="text"
                  placeholder="Enter mandatory completion remarks before marking Completed..."
                  value={remarksMap[t.id] !== undefined ? remarksMap[t.id] : t.completionRemarks}
                  onChange={(e) => setRemarksMap({ ...remarksMap, [t.id]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="md:col-span-5 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(t, 'In Progress')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(t, 'Completed')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Mark Completed &amp; Resolve
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(t, 'Cancelled')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* 23. LOCATION-AWARE WASTE COLLECTION MANAGEMENT PAGE (Requirement 10) */
export function WasteCollectionManagementPage() {
  const { schedules, saveSchedule, toggleScheduleActive, deleteSchedule } = useApp();
  const [form, setForm] = useState({
    id: '',
    state_name: 'Andhra Pradesh',
    district_name: 'Guntur',
    city_or_village: '',
    locality: '',
    wasteType: 'Wet Waste',
    collectionDay: 'Daily (Mon - Sun)',
    collectionDate: '2026-10-25',
    scheduledTime: '06:30 AM - 08:00 AM',
    assignedTeam: CLEANING_TEAMS[0],
    frequency: 'Daily',
    instructions: 'Segregate wet and dry waste in separate bins.',
    nextCollectionDate: 'Tomorrow, 06:30 AM',
    active: true,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSchedule(form);
    setForm({
      ...form,
      id: '',
      city_or_village: '',
      locality: '',
    });
  };

  return (
    <DashboardLayout
      role="authority"
      title="Location-Aware Waste Collection Management"
      subtitle="Create, edit, activate/deactivate, or delete waste collection routes for any State, District, City/Village, and Locality."
    >
      {/* Create / Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">
          {form.id ? `Editing Schedule ${form.id}` : 'Create New Location-Aware Collection Schedule'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">State / Union Territory *</label>
            <select
              value={form.state_name}
              onChange={(e) => setForm({ ...form, state_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {INDIA_STATES_AND_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
            <input
              type="text"
              required
              placeholder="e.g., Guntur, Hyderabad, Pune"
              value={form.district_name}
              onChange={(e) => setForm({ ...form, district_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City, Town, or Village *</label>
            <input
              type="text"
              required
              placeholder="e.g., Tenali, Pinapadu, Warangal, Mysuru"
              value={form.city_or_village}
              onChange={(e) => setForm({ ...form, city_or_village: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Locality / Street *</label>
            <input
              type="text"
              required
              placeholder="e.g., Ward 4 Main Road"
              value={form.locality}
              onChange={(e) => setForm({ ...form, locality: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Waste Category</label>
            <select
              value={form.wasteType}
              onChange={(e) => setForm({ ...form, wasteType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="Wet Waste">Wet Waste</option>
              <option value="Dry Waste">Dry Waste</option>
              <option value="Mixed Waste">Mixed Waste</option>
              <option value="General Waste Collection">General Waste Collection</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Collection Date / Days</label>
            <input
              type="text"
              value={form.collectionDay}
              onChange={(e) => setForm({ ...form, collectionDay: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Collection Time</label>
            <input
              type="text"
              value={form.scheduledTime}
              onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Worker / Squad</label>
            <select
              value={form.assignedTeam}
              onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {CLEANING_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1">Citizen Instructions</label>
            <input
              type="text"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl text-xs font-bold bg-forest-800 text-white shrink-0"
          >
            {form.id ? 'Update Schedule' : '+ Publish Schedule'}
          </button>
        </div>
      </form>

      {/* Schedule List */}
      <div className="space-y-3">
        {schedules.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-forest-900">{s.id}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-forest-800">
                  {s.wasteType}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {[s.city_or_village, s.district_name, s.state_name].filter(Boolean).join(', ')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{s.area}</p>
              <p className="text-xs text-slate-600">
                {s.collectionDay} • {s.scheduledTime} • {s.assignedTeam}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setForm(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => toggleScheduleActive(s.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900"
              >
                {s.active ? 'Deactivate' : 'Activate'}
              </button>
              {confirmDeleteId === s.id ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteSchedule(s.id);
                    setConfirmDeleteId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(s.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* 24. CLEANLINESS MONITORING & DRIVES ATTENDANCE PAGE */
export function CleanlinessMonitoringPage() {
  const {
    complaints,
    activities,
    users,
    createCleanlinessActivity,
    confirmActivityAttendance,
  } = useApp();

  const [actForm, setActForm] = useState({
    title: '',
    description: '',
    state_name: 'Andhra Pradesh',
    district_name: 'Guntur',
    city_or_village: 'Tenali',
    date: '2026-11-12',
    time: '07:00 AM - 09:30 AM',
    location: 'Main Market Road, Tenali, Andhra Pradesh',
    pointsAwarded: 20,
    participationLimit: 50,
  });

  // Only plot complaints that genuinely have valid coordinates
  const markers = complaints
    .filter((c) => isValidCoordinatePair(c.reported_latitude, c.reported_longitude))
    .map((c) => ({
      lat: Number(c.reported_latitude),
      lng: Number(c.reported_longitude),
      label: `${c.id}: ${c.category}`,
      sublabel: `${c.area} (${c.status})`,
    }));

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!actForm.title) return;
    createCleanlinessActivity(actForm);
    setActForm({ ...actForm, title: '', description: '' });
  };

  return (
    <DashboardLayout
      role="authority"
      title="Geospatial Cleanliness Monitoring & Shramdaan Drives"
      subtitle="India-wide geospatial complaint map (showing only verified coordinate reports) and attendance confirmation."
    >
      {/* Interactive Complaint Map */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">
            Geospatial Sanitation Map ({markers.length} Coordinate-Tagged Reports)
          </h2>
          <span className="text-xs text-slate-500">
            Reports without coordinates are listed in the table without fabricating map pins.
          </span>
        </div>
        <VillageMap markers={markers} height="320px" />
      </div>

      {/* Organize Cleanliness Drive & Confirm Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateEvent}
          className="lg:col-span-5 bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3"
        >
          <h3 className="text-sm font-extrabold text-slate-900">Schedule New Cleanliness Drive</h3>
          <input
            type="text"
            required
            placeholder="Event Title (e.g., Ward 4 Shramdaan)"
            value={actForm.title}
            onChange={(e) => setActForm({ ...actForm, title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <textarea
            rows={2}
            required
            placeholder="Event description & instructions..."
            value={actForm.description}
            onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={actForm.state_name}
              onChange={(e) => setActForm({ ...actForm, state_name: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              {INDIA_STATES_AND_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="City or Village"
              value={actForm.city_or_village}
              onChange={(e) => setActForm({ ...actForm, city_or_village: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={actForm.date}
              onChange={(e) => setActForm({ ...actForm, date: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              placeholder="Meeting Location"
              value={actForm.location}
              onChange={(e) => setActForm({ ...actForm, location: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            + Publish Cleanliness Drive
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">
            Verify Citizen Attendance (Awards +20 Green Points Only After Confirmation)
          </h3>
          {activities.map((act) => (
            <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>{act.title}</span>
                <span className="text-emerald-700">+{act.pointsAwarded} Pts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {act.participants.map((uid) => {
                  const u = users.find((usr) => usr.id === uid);
                  const confirmed = act.confirmedAttendees.includes(uid);
                  return (
                    <div
                      key={uid}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <span>{u?.fullName || uid}</span>
                      {confirmed ? (
                        <span className="text-emerald-700 font-bold">✓ Confirmed</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => confirmActivityAttendance(act.id, uid)}
                          className="px-2 py-0.5 rounded bg-forest-800 text-white font-bold text-[11px]"
                        >
                          Confirm Attendance
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 25. REWARDS MANAGEMENT PAGE */
export function RewardsManagementPage() {
  const {
    redemptions,
    processRedemptionRequest,
    saveRewardCatalogItem,
  } = useApp();

  const [newReward, setNewReward] = useState({
    title: '',
    category: 'Eco Utility',
    description: '',
    pointsCost: 25,
    stock: 20,
  });

  const handleAddReward = (e) => {
    e.preventDefault();
    if (!newReward.title) return;
    saveRewardCatalogItem(newReward);
    setNewReward({ title: '', category: 'Eco Utility', description: '', pointsCost: 25, stock: 20 });
  };

  return (
    <DashboardLayout
      role="authority"
      title="Green Rewards & Redemption Approval Manager"
      subtitle="Approve or reject citizen redemption requests (rejected requests automatically refund points) and manage catalog stock."
    >
      {/* Citizen Redemption Requests */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Citizen Reward Redemption Requests</h2>
        <div className="space-y-3">
          {redemptions.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-forest-900">{r.id}</span>
                  <StatusBadge status={r.status} />
                  <span className="font-bold text-amber-800">{r.pointsCost} Green Points</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {r.rewardTitle} — Requested by {r.userName}
                </p>
                <p className="text-slate-500">Requested: {new Date(r.requestedAt).toLocaleString()}</p>
              </div>

              {r.status !== 'Rejected' && r.status !== 'Delivered / Issued' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => processRedemptionRequest(r.id, 'Approved', 'Approved for collection.')}
                    className="px-3 py-1.5 rounded-xl font-bold bg-teal-600 text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      processRedemptionRequest(r.id, 'Delivered / Issued', 'Fulfilled & handed over to citizen.')
                    }
                    className="px-3 py-1.5 rounded-xl font-bold bg-emerald-700 text-white"
                  >
                    Mark Delivered
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      processRedemptionRequest(r.id, 'Rejected', 'Stock reserved for upcoming camp; points refunded.')
                    }
                    className="px-3 py-1.5 rounded-xl font-bold bg-red-600 text-white"
                  >
                    Reject &amp; Refund Pts
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Reward Catalog */}
      <form onSubmit={handleAddReward} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900">Add New Reward to Catalog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Reward Title"
            value={newReward.title}
            onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:col-span-2"
          />
          <input
            type="number"
            required
            placeholder="Points Cost"
            value={newReward.pointsCost}
            onChange={(e) => setNewReward({ ...newReward, pointsCost: Number(e.target.value) })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <input
            type="number"
            required
            placeholder="Available Stock"
            value={newReward.stock}
            onChange={(e) => setNewReward({ ...newReward, stock: Number(e.target.value) })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Short description..."
            value={newReward.description}
            onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            + Add Reward
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

/* 26. REPORTS AND ANALYTICS PAGE */
export function ReportsAnalyticsPage() {
  const { complaints, showToast } = useApp();
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredComplaints =
    categoryFilter === 'All' ? complaints : complaints.filter((c) => c.category === categoryFilter);

  const byCategory = COMPLAINT_CATEGORIES.map((cat) => ({
    name: cat.split(' ')[0],
    count: filteredComplaints.filter((c) => c.category === cat).length,
  }));

  const byStatus = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Verification' },
    { key: 'verified', label: 'Verified' },
    { key: 'worker_assigned', label: 'Worker Assigned' },
    { key: 'in_progress', label: 'Cleaning In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'reopened', label: 'Reopened' },
    { key: 'rejected', label: 'Not Approved' },
  ].map((st) => ({
    name: st.label,
    value: filteredComplaints.filter((c) => normalizeComplaintStatus(c.status) === st.key).length,
  })).filter((item) => item.value > 0);

  const monthlyTrends = [
    { month: 'Jul', reported: 4, resolved: 3, pointsEarned: 60 },
    { month: 'Aug', reported: 7, resolved: 6, pointsEarned: 110 },
    { month: 'Sep', reported: 9, resolved: 8, pointsEarned: 145 },
    {
      month: 'Oct',
      reported: complaints.length,
      resolved: complaints.filter((c) => normalizeComplaintStatus(c.status) === 'resolved').length,
      pointsEarned: 185,
    },
  ];

  const scheduleCompletionData = [
    { route: 'Andhra Pradesh', completion: 96 },
    { route: 'Telangana', completion: 92 },
    { route: 'Karnataka', completion: 95 },
    { route: 'Maharashtra', completion: 90 },
  ];

  const handleExportCsv = () => {
    const headers = [
      'Complaint ID,Category,State,District,City/Village,Locality,Latitude,Longitude,Capture Method,Location Review,Urgency,Status,Submitted At',
    ];
    const rows = filteredComplaints.map(
      (c) =>
        `"${c.id}","${c.category}","${c.state_name || ''}","${c.district_name || ''}","${
          c.village_name || c.city_name || ''
        }","${c.locality || ''}","${c.reported_latitude ?? ''}","${c.reported_longitude ?? ''}","${
          c.location_capture_method || ''
        }","${c.location_review_status || ''}","${c.urgency}","${getStatusBadgeLabel(c.status)}","${c.submittedAt}"`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CleanVillage_Monthly_Sanitation_Report.csv';
    a.click();
    showToast('Monthly Sanitation Report downloaded as CSV!', 'success');
  };

  return (
    <DashboardLayout
      role="authority"
      title="Monthly Sanitation Reports & Analytics"
      subtitle="Comprehensive analytics across participating states and communities."
      actions={
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="All">All Categories</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            <Download className="w-3.5 h-3.5" />
            Export Monthly CSV Report
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">1. Complaints by Category</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">2. Complaint Status Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">
            3. Complaints Reported &amp; Resolution Trends by Month
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="reported" stroke="#f59e0b" strokeWidth={2.5} name="Reported" />
                <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2.5} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">
            4. Route Collection Completion (%) by State
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scheduleCompletionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="route" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="completion" fill="#0d9488" radius={[6, 6, 0, 0]} name="Schedule Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 27. USER MANAGEMENT PAGE */
export function UserManagementPage() {
  const { users, complaints } = useApp();

  return (
    <DashboardLayout
      role="authority"
      title="User & Role Management"
      subtitle="View registered citizens and the single authorized administrator."
    >
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase">
              <th className="py-2.5 px-3">Full Name</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Email</th>
              <th className="py-2.5 px-3">Registered Locality &amp; State</th>
              <th className="py-2.5 px-3">Complaints Filed</th>
              <th className="py-2.5 px-3">Green Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const filed = complaints.filter((c) => c.userId === u.id).length;
              return (
                <tr key={u.id} className="hover:bg-emerald-50/40">
                  <td className="py-3 px-3 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        u.role === 'authority'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-forest-900'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{u.email}</td>
                  <td className="py-3 px-3 text-slate-600">
                    {u.householdArea} ({u.village})
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{filed}</td>
                  <td className="py-3 px-3 font-extrabold text-emerald-700">{u.greenPoints} pts</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

/* 28. AUTHORITY NOTIFICATIONS PAGE */
export function AuthorityNotificationsPage() {
  const {
    myNotifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
  } = useApp();
  const [filterMode, setFilterMode] = useState('all');

  const visibleNotifs = myNotifications.filter((n) => {
    const cat = n.type || n.category;
    if (filterMode === 'unread') return !n.is_read && !n.read;
    if (filterMode === 'new_complaint') return cat === 'admin_new_complaint' || cat === 'new_complaint';
    return true;
  });

  return (
    <DashboardLayout
      role="authority"
      title="Administrator Notifications & Incoming Alerts"
      subtitle="Real-time alerts for new citizen complaints, reopened issues, and reward redemptions."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs">
            {[
              { id: 'all', label: `All (${myNotifications.length})` },
              { id: 'unread', label: `Unread (${unreadNotificationCount})` },
              { id: 'new_complaint', label: 'New Complaints' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterMode === tab.id ? 'bg-forest-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900 hover:bg-emerald-200"
            >
              Mark All as Read
            </button>
          )}
          {myNotifications.some((n) => n.is_read || n.read) && (
            <button
              type="button"
              onClick={clearReadNotifications}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Archive Read
            </button>
          )}
        </div>
      }
    >
      {visibleNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-10 text-center space-y-2 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-sm font-extrabold text-slate-900">
            You&apos;re all caught up! New updates will appear here.
          </p>
          <p className="text-xs text-slate-500">
            Whenever a citizen submits a new sanitation complaint, an alert will appear here immediately.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifs.map((n) => {
            const isRead = Boolean(n.is_read ?? n.read);
            const cat = n.type || n.category;
            const compId = n.related_complaint_id || n.complaint_id || n.metadata?.complaint_id;
            const targetPath =
              n.action_url || n.link || (compId ? `/authority/complaints/${compId}` : '/authority/complaints');

            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  isRead ? 'bg-white border-slate-200' : 'bg-amber-50/70 border-amber-300 shadow-sm'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      {cat === 'admin_new_complaint' || cat === 'new_complaint'
                        ? 'Incoming Complaint'
                        : cat || 'Admin Alert'}
                    </span>
                    {compId && (
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        ID: {compId}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isRead ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(n.created_at || n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={targetPath}
                    onClick={() => {
                      if (!isRead) markNotificationRead(n.id);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
                  >
                    {compId ? 'Open Complaint' : 'View'}
                  </Link>
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
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
