import React from 'react';
import { Clock, CheckCircle2, Wrench, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status, size = 'sm' }) {
  const styles = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-300',
    Verified: 'bg-blue-100 text-blue-800 border-blue-300',
    'In Progress': 'bg-purple-100 text-purple-800 border-purple-300',
    Assigned: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Delivered / Issued': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Approved: 'bg-teal-100 text-teal-800 border-teal-300',
    'Pending Approval': 'bg-amber-100 text-amber-800 border-amber-300',
    Rejected: 'bg-red-100 text-red-800 border-red-300',
    Cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
  };

  const icons = {
    Pending: Clock,
    Verified: ShieldCheck,
    'In Progress': Wrench,
    Assigned: Wrench,
    Resolved: CheckCircle2,
    Completed: CheckCircle2,
    'Delivered / Issued': CheckCircle2,
    Rejected: XCircle,
  };

  const Icon = icons[status] || Clock;
  const cls = styles[status] || 'bg-slate-100 text-slate-800 border-slate-300';
  const sizeCls = size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${cls} ${sizeCls}`}>
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${map[priority] || map.Medium}`}>
      {priority === 'High' && <AlertTriangle className="w-3 h-3 text-red-600" />}
      {priority || 'Medium'}
    </span>
  );
}
