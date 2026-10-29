import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import {
  COMPLAINT_STATUS_FLOW,
  normalizeComplaintStatus,
  getLifecycleStageTitle,
  getStatusBadgeLabel,
} from './StatusBadge';

/**
 * Renders both:
 * 1) The 6-stage Complaint Progress Tracker (showing Reached / Current / Pending stages,
 *    or Reopened / Not Approved branches accurately from real history records).
 * 2) The chronological Complaint History Log (filtering out internal_admin_note for citizens).
 */
export default function ComplaintProgressTimeline({
  complaint,
  historyEntries = [],
  viewerRole = 'citizen',
}) {
  if (!complaint) return null;

  const currentCode = normalizeComplaintStatus(complaint.status);

  // Normalize history entries from either Supabase complaint_history table or complaint.timeline
  const rawHistory =
    Array.isArray(historyEntries) && historyEntries.length > 0
      ? historyEntries
      : Array.isArray(complaint.history) && complaint.history.length > 0
      ? complaint.history
      : Array.isArray(complaint.timeline)
      ? complaint.timeline
      : [];

  const normalizedHistory = rawHistory.map((item, idx) => {
    const statusCode = normalizeComplaintStatus(item.new_status || item.status || 'submitted');
    const prevCode = item.previous_status ? normalizeComplaintStatus(item.previous_status) : null;
    const publicMessage =
      item.public_update_message ??
      item.publicMessage ??
      item.note ??
      `Status updated to ${getStatusBadgeLabel(statusCode)}.`;
    const internalNote =
      viewerRole === 'authority' ? item.internal_admin_note || item.internalNote || null : null;

    return {
      id: item.id || `hist-${idx}`,
      previousStatus: prevCode,
      newStatus: statusCode,
      stageTitle: getLifecycleStageTitle(statusCode),
      badgeLabel: getStatusBadgeLabel(statusCode),
      timestamp: item.created_at || item.timestamp || complaint.submittedAt,
      actorName: item.actor_name || item.actor || 'CleanVillage System',
      actorRole: item.actor_role || 'system',
      publicMessage,
      internalNote,
    };
  });

  // Map latest history entry per canonical stage code
  const reachedStageMap = {};
  for (const h of normalizedHistory) {
    reachedStageMap[h.newStatus] = h;
  }

  // Ensure 'submitted' always has at least the complaint submission timestamp
  if (!reachedStageMap.submitted) {
    reachedStageMap.submitted = {
      newStatus: 'submitted',
      stageTitle: 'Complaint Submitted',
      timestamp: complaint.submitted_at || complaint.submittedAt,
      publicMessage: `Complaint submitted (${complaint.location_confirmation_status || 'Location recorded'}).`,
      actorName: complaint.citizen_name || complaint.userName || 'Citizen',
    };
  }

  const standardOrder = COMPLAINT_STATUS_FLOW.map((s) => s.code);
  const currentIdxInStandard = standardOrder.indexOf(currentCode);

  return (
    <div className="space-y-6">
      {/* 1. Standard 6-Stage Progress Tracker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-forest-900">
            Live Complaint Progress Tracker
          </h4>
          <span className="text-[11px] font-semibold text-slate-500">
            Current Stage: <strong className="text-forest-900">{getLifecycleStageTitle(currentCode)}</strong>
          </span>
        </div>

        {/* Special Branch Alert if Rejected or Reopened */}
        {currentCode === 'rejected' && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Complaint Not Approved</p>
              <p className="mt-0.5">
                {complaint.rejection_reason ||
                  complaint.rejectionReason ||
                  reachedStageMap.rejected?.publicMessage ||
                  'This complaint could not be approved at this stage.'}
              </p>
            </div>
          </div>
        )}

        {currentCode === 'reopened' && (
          <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-2.5 text-xs text-orange-950">
            <RotateCcw className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Complaint Reopened for Further Attention</p>
              <p className="mt-0.5">
                {reachedStageMap.reopened?.publicMessage ||
                  'Your complaint has been reopened and is awaiting updated verification or field work.'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-emerald-200">
          {COMPLAINT_STATUS_FLOW.map((stage, idx) => {
            const historyItem = reachedStageMap[stage.code];
            const isCurrent = currentCode === stage.code;
            const isCompleted =
              Boolean(historyItem) ||
              (currentIdxInStandard !== -1 && idx < currentIdxInStandard && currentCode !== 'rejected');

            let stateBadge = 'Pending';
            let stateBadgeCls = 'bg-slate-100 text-slate-500 border-slate-200';
            let circleCls = 'bg-slate-200 text-slate-500 border-2 border-white';

            if (isCurrent) {
              stateBadge = stage.code === 'resolved' ? 'Completed' : 'Current Stage';
              stateBadgeCls = 'bg-amber-100 text-amber-900 border-amber-300';
              circleCls = 'bg-amber-500 text-slate-950 ring-4 ring-amber-100';
            } else if (isCompleted) {
              stateBadge = 'Completed';
              stateBadgeCls = 'bg-emerald-100 text-emerald-900 border-emerald-300';
              circleCls = 'bg-forest-800 text-white';
            }

            return (
              <div key={stage.code} className="relative pl-9">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold absolute left-0 top-1 shadow-sm ${circleCls}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs transition ${
                    isCurrent
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                      : isCompleted
                      ? 'bg-white border-emerald-100'
                      : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="font-extrabold text-slate-900">{stage.stageLabel}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stateBadgeCls}`}
                    >
                      {stateBadge}
                    </span>
                  </div>

                  {historyItem ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-slate-700">{historyItem.publicMessage}</p>
                      <p className="text-[10px] text-slate-400">
                        Reached: {new Date(historyItem.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-0.5">{stage.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Recorded Status History Log */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Recorded Status History ({normalizedHistory.length})
          </h4>
          {viewerRole === 'citizen' && (
            <span className="text-[10px] text-slate-400">Public Updates Only</span>
          )}
        </div>

        <div className="space-y-2.5">
          {normalizedHistory.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-forest-900">
                  {entry.previousStatus
                    ? `${getStatusBadgeLabel(entry.previousStatus)} → ${entry.badgeLabel}`
                    : entry.stageTitle}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-700">{entry.publicMessage}</p>
              <p className="text-[10px] text-slate-500">Recorded by: {entry.actorName}</p>

              {/* Private Internal Admin Note - NEVER rendered for Citizens */}
              {viewerRole === 'authority' && entry.internalNote && (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold">Internal Admin Note (Private): </span>
                    <span>{entry.internalNote}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
