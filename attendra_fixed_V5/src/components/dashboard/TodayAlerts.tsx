import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Plus, Megaphone, ShieldCheck, Trash2 } from 'lucide-react';
import { AttendanceRecord, UserRole, Announcement } from '../../types';

interface TodayAlertsProps {
  records?: AttendanceRecord[];
  announcements?: Announcement[];
  currentUserRole?: UserRole;
  onResolveAlert: (id: string) => void;
  onSendAlert?: () => void;
  onSelectAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => Promise<void> | void;
}

export const TodayAlerts: React.FC<TodayAlertsProps> = ({
  records = [],
  announcements = [],
  currentUserRole = 'super_admin',
  onResolveAlert,
  onSendAlert,
  onSelectAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  // Dynamically derive alerts from real attendance records (e.g. late check-ins)
  const lateRecords = records.filter(
    (r) => (r.status === 'late' || r.status === 'absent') && !dismissedAlerts.includes(r.id)
  );

  // Active broadcasts from announcements
  const activeAnnouncements = announcements.filter((a) => !dismissedAlerts.includes(a.id));

  const totalActiveCount = lateRecords.length + activeAnnouncements.length;

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
    onResolveAlert(id);
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          Today's HR & Compliance Alerts
        </h3>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${
              totalActiveCount > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            }`}
          >
            {totalActiveCount} Active
          </span>

          {isSuperAdmin && onSendAlert && (
            <button
              onClick={onSendAlert}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="Post an official HR Policy or Compliance Alert to all employees"
            >
              <Plus className="w-3.5 h-3.5" />
              Send Notice
            </button>
          )}
        </div>
      </div>

      {totalActiveCount > 0 ? (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
          {/* Company Announcements / Compliance Alerts */}
          {activeAnnouncements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => onSelectAnnouncement && onSelectAnnouncement(ann)}
              className="p-3.5 rounded-2xl border bg-blue-50/60 hover:bg-blue-100/60 border-blue-200/80 text-slate-900 transition-all flex items-start justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl shrink-0 mt-0.5 bg-blue-600 text-white shadow-xs">
                  <Megaphone className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-200/80 text-blue-800 rounded-md">
                      {ann.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{ann.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight mt-1 group-hover:text-blue-700 transition-colors">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                  <p className="text-[10px] font-semibold text-blue-700 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    By {ann.author} ({ann.authorRole})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleDismiss(ann.id)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-white/90 hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
                  title="Dismiss alert for this session"
                >
                  Dismiss
                </button>

                {isSuperAdmin && onDeleteAnnouncement && (
                  <button
                    type="button"
                    onClick={() => setAnnouncementToDelete(ann)}
                    className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/80 transition-colors cursor-pointer"
                    title="Delete announcement permanently from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Late / Absent Attendance Flags */}
          {lateRecords.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-2xl border bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/80 text-amber-950 transition-all flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl shrink-0 mt-0.5 bg-amber-500 text-white shadow-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold leading-tight">
                      {r.employeeName} ({r.department})
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400">{r.entryTime}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Flagged as <span className="font-bold capitalize text-amber-900">{r.status}</span>. {r.notes || r.reason || 'Manual review advised.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(r.id)}
                className="px-2.5 py-1 text-[10px] font-bold bg-white/80 hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-xs shrink-0 transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-center flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <div>
            <p className="text-xs font-bold text-emerald-900">No active HR alerts</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              System is clean. Punctuality alerts and company broadcasts will appear here.
            </p>
          </div>
          {isSuperAdmin && onSendAlert && (
            <button
              onClick={onSendAlert}
              className="mt-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-700" />
              Broadcast Compliance Notice
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modal for Deleting Announcement */}
      {announcementToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Delete Announcement?</h4>
                <p className="text-[11px] text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Are you sure you want to delete this announcement?
              <br />
              <strong className="text-slate-900 mt-1 block font-semibold">"{announcementToDelete.title}"</strong>
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteAnnouncement) {
                    await onDeleteAnnouncement(announcementToDelete.id);
                  }
                  setAnnouncementToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
