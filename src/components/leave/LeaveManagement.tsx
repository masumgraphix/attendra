import React, { useState } from 'react';
import { LeaveRequest, UserRole } from '../../types';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  MessageSquareText,
  FileText,
  Trash2,
} from 'lucide-react';
import { LeaveDetailModal } from '../modals/LeaveDetailModal';

interface LeaveManagementProps {
  leaveRequests: LeaveRequest[];
  currentUserRole?: UserRole;
  onApplyLeave: () => void;
  onApproveLeave: (id: string, comment?: string) => void;
  onRejectLeave: (id: string, comment?: string) => void;
  onSelectEmployee?: (empId: string) => void;
  onDeleteLeave?: (id: string) => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
  leaveRequests,
  currentUserRole = 'super_admin',
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onSelectEmployee,
  onDeleteLeave,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const filteredRequests = leaveRequests.filter((r) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (r.employeeName || '').toLowerCase().includes(s) ||
      (r.department || '').toLowerCase().includes(s) ||
      (r.leaveType || r.type || '').toLowerCase().includes(s) ||
      (r.reason || '').toLowerCase().includes(s);
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1 w-fit shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1 w-fit shadow-xs">
          <XCircle className="w-3 h-3 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1 w-fit shadow-xs animate-pulse">
        <Clock className="w-3 h-3 text-amber-600" />
        Pending Review
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Leave Overview Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Annual Paid Leave Pool', total: '24 Days / yr', iconBg: 'bg-blue-600 text-white', accent: 'border-blue-200' },
          { title: 'Sick & Wellness Reserve', total: '12 Days / yr', iconBg: 'bg-emerald-600 text-white', accent: 'border-emerald-200' },
          { title: 'Casual & Personal Days', total: '6 Days / yr', iconBg: 'bg-purple-600 text-white', accent: 'border-purple-200' },
          { title: 'Total Company Absences', total: `${leaveRequests.length} Recorded`, iconBg: 'bg-amber-500 text-white', accent: 'border-amber-200' },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-white/90 backdrop-blur-xl border ${card.accent} rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500">{card.title}</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{card.total}</p>
            </div>
            <div className={`p-3 rounded-2xl ${card.iconBg} shadow-md`}>
              <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Leave Workflow Section */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Company Leave & Absence Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrator record book for all employee time off and leave requests
            </p>
          </div>

          <button
            onClick={onApplyLeave}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 rounded-2xl shadow-sm shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Log Employee Leave
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'pending' ? 'Pending Approval' : st}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee leave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Total Days</th>
                <th className="py-3.5 px-4">Reason & Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((lr) => (
                  <tr key={lr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onSelectEmployee && onSelectEmployee(lr.employeeId)}
                        className="flex items-center gap-3 text-left hover:opacity-80 group cursor-pointer"
                      >
                        <img
                          src={lr.employeeAvatar}
                          alt={lr.employeeName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                            {lr.employeeName}
                          </p>
                          <p className="text-[10px] text-slate-400">{lr.department}</p>
                        </div>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                        {lr.leaveType} Leave
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {lr.startDate} to {lr.endDate}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">{lr.totalDays} days</td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        <p className="line-clamp-1 font-semibold text-slate-800">{lr.reason}</p>
                        {lr.notes ? (
                          <button
                            onClick={() => setSelectedLeave(lr)}
                            className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                          >
                            <MessageSquareText className="w-3 h-3 text-purple-500" />
                            View detailed explanation
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No notes</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(lr.status)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedLeave(lr)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="View Full Leave Details & Explanation"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>

                        {/* Super Admin Quick Approve / Reject Actions - Only for pending requests */}
                        {isSuperAdmin && lr.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onApproveLeave(lr.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Approve Leave Request"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approve
                            </button>

                            <button
                              onClick={() => onRejectLeave(lr.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Reject Leave Request"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Reject
                            </button>
                          </>
                        )}

                        {/* Delete Leave Application - Super Admin only, any status */}
                        {isSuperAdmin && onDeleteLeave && (
                          <div className="relative">
                            <button
                              onClick={() => setPendingDeleteId(pendingDeleteId === lr.id ? null : lr.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Delete Leave Application"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {pendingDeleteId === lr.id && (
                              <div className="absolute right-0 top-full mt-1.5 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 text-left">
                                <p className="text-[11px] font-bold text-slate-700 mb-2">
                                  Delete this leave application permanently?
                                </p>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      onDeleteLeave(lr.id);
                                      setPendingDeleteId(null);
                                    }}
                                    className="flex-1 px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setPendingDeleteId(null)}
                                    className="flex-1 px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-extrabold text-sm text-slate-800">No leave records found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the "Log Employee Leave" button above to record new leave applications.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Detail Modal */}
      <LeaveDetailModal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        leaveRequest={selectedLeave}
        currentUserRole={currentUserRole}
        onApproveLeave={onApproveLeave}
        onRejectLeave={onRejectLeave}
        onSelectEmployee={onSelectEmployee}
      />
    </div>
  );
};
