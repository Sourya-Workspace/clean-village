import React from 'react';
import {
  Clock,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  SearchCheck,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export const COMPLAINT_STATUS_FLOW = [
  {
    code: 'submitted',
    badgeLabel: 'Submitted',
    stageLabel: 'Complaint Submitted',
    description: 'Complaint received and logged in the CleanVillage system.',
  },
  {
    code: 'under_review',
    badgeLabel: 'Under Verification',
    stageLabel: 'Verifying Your Complaint',
    description: 'Administrator is reviewing photographic and location evidence.',
  },
  {
    code: 'verified',
    badgeLabel: 'Verified',
    stageLabel: 'Complaint Verified',
    description: 'Complaint verified as genuine (+10 Green Points eligible).',
  },
  {
    code: 'worker_assigned',
    badgeLabel: 'Worker Assigned',
    stageLabel: 'Sanitation Worker Assigned',
    description: 'A sanitation squad or worker has been assigned to the site.',
  },
  {
    code: 'in_progress',
    badgeLabel: 'Cleaning In Progress',
    stageLabel: 'Cleaning Work In Progress',
    description: 'Sanitation team is actively cleaning the reported spot.',
  },
  {
    code: 'resolved',
    badgeLabel: 'Resolved',
    stageLabel: 'Problem Resolved',
    description: 'Cleaning work completed and verified with resolution details.',
  },
];

export function normalizeComplaintStatus(rawStatus) {
  if (!rawStatus) return 'submitted';
  const s = String(rawStatus).trim().toLowerCase();
  if (s === 'pending' || s === 'submitted') return 'submitted';
  if (s === 'under_review' || s === 'under verification' || s === 'verifying your complaint') {
    return 'under_review';
  }
  if (s === 'verified' || s === 'complaint verified') return 'verified';
  if (s === 'worker_assigned' || s === 'worker assigned' || s === 'sanitation worker assigned' || s === 'assigned') {
    return 'worker_assigned';
  }
  if (s === 'in_progress' || s === 'in progress' || s === 'cleaning in progress' || s === 'cleaning work in progress') {
    return 'in_progress';
  }
  if (s === 'resolved' || s === 'problem resolved' || s === 'completed') return 'resolved';
  if (s === 'reopened' || s === 'complaint reopened') return 'reopened';
  if (s === 'rejected' || s === 'not approved' || s === 'complaint not approved') return 'rejected';
  return s;
}

export function getStatusBadgeLabel(rawStatus) {
  const code = normalizeComplaintStatus(rawStatus);
  const map = {
    submitted: 'Submitted',
    under_review: 'Under Verification',
    verified: 'Verified',
    worker_assigned: 'Worker Assigned',
    in_progress: 'Cleaning In Progress',
    resolved: 'Resolved',
    reopened: 'Reopened',
    rejected: 'Not Approved',
  };
  return map[code] || rawStatus;
}

export function getLifecycleStageTitle(rawStatus) {
  const code = normalizeComplaintStatus(rawStatus);
  const map = {
    submitted: 'Complaint Submitted',
    under_review: 'Verifying Your Complaint',
    verified: 'Complaint Verified',
    worker_assigned: 'Sanitation Worker Assigned',
    in_progress: 'Cleaning Work In Progress',
    resolved: 'Problem Resolved',
    reopened: 'Complaint Reopened',
    rejected: 'Complaint Not Approved',
  };
  return map[code] || rawStatus;
}

export function getPermittedNextStatuses(rawCurrentStatus, role = 'authority') {
  const current = normalizeComplaintStatus(rawCurrentStatus);
  if (role === 'citizen') return [];
  if (role === 'worker') {
    return current === 'worker_assigned' ? ['in_progress'] : [];
  }
  const transitions = {
    submitted: ['under_review', 'verified', 'rejected'],
    under_review: ['verified', 'worker_assigned', 'rejected'],
    verified: ['worker_assigned', 'in_progress', 'resolved', 'rejected'],
    worker_assigned: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: ['reopened'],
    reopened: ['under_review', 'verified', 'worker_assigned', 'in_progress', 'resolved', 'rejected'],
    rejected: ['reopened', 'under_review', 'verified'],
  };
  return transitions[current] || [];
}

export function StatusBadge({ status, size = 'sm' }) {
  const code = normalizeComplaintStatus(status);
  const displayLabel = getStatusBadgeLabel(status);

  const styles = {
    submitted: 'bg-amber-100 text-amber-900 border-amber-300',
    under_review: 'bg-sky-100 text-sky-900 border-sky-300',
    verified: 'bg-blue-100 text-blue-900 border-blue-300',
    worker_assigned: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    in_progress: 'bg-purple-100 text-purple-900 border-purple-300',
    resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    reopened: 'bg-orange-100 text-orange-900 border-orange-300',
    rejected: 'bg-red-100 text-red-900 border-red-300',
    // Additional non-complaint badges (tasks, redemptions)
    'pending approval': 'bg-amber-100 text-amber-900 border-amber-300',
    approved: 'bg-teal-100 text-teal-900 border-teal-300',
    'delivered / issued': 'bg-emerald-100 text-emerald-900 border-emerald-300',
    cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
  };

  const icons = {
    submitted: Clock,
    under_review: SearchCheck,
    verified: ShieldCheck,
    worker_assigned: UserCheck,
    in_progress: Wrench,
    resolved: CheckCircle2,
    reopened: RotateCcw,
    rejected: XCircle,
  };

  const Icon = icons[code] || Clock;
  const cls =
    styles[code] ||
    styles[String(status || '').toLowerCase()] ||
    'bg-slate-100 text-slate-800 border-slate-300';
  const sizeCls = size === 'lg' ? 'px-3.5 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${cls} ${sizeCls}`}
      title={`Current Status: ${displayLabel}`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{displayLabel}</span>
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
        map[priority] || map.Medium
      }`}
    >
      {priority === 'High' && <AlertTriangle className="w-3 h-3 text-red-600" />}
      {priority || 'Medium'} Priority
    </span>
  );
}
