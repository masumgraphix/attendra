import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { LeaveRequest, UserRole } from '../../types';

interface LeaveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequest | null;
  currentUserRole?: UserRole;
  onApproveLeave: (id: string, comment?: string) => void;
  onRejectLeave: (id: string, comment?: string) => void;
  onSelectEmployee?: (empId: string) => void;
}

export const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  currentUserRole = 'super_admin',
  onApproveLeave,
  onRejectLeave,
  onSelectEmployee,
}) => {
  const [managerComment, setManagerComment] = useState('');

  if (!isOpen || !leaveRequest) return null;

  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const handleApprove = () => {
    onApproveLeave(leaveRequest.id, managerComment);
    onClose();
  };

  const handleReject = () => {
    onRejectLeave(leaveRequest.id, managerComment);
    onClose();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <span className="px-3 py-1 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Approved Leave
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="px-3 py-1 text-xs font-black rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-xs">
          <XCircle className="w-4 h-4 text-rose-600" />
          Rejected Leave
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-xs animate-pulse">
        <Clock className="w-4 h-4 text-amber-600" />
        Pending Approval
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                {leaveRequest.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">
                Applied on {leaveRequest.appliedDate || '2026-07-31'}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Leave Application Review
            </h3>
          </div>
          <div>{getStatusBadge(leaveRequest.status)}</div>
        </div>

        {/* Employee Info Header Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={leaveRequest.employeeAvatar}
              alt={leaveRequest.employeeName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20 shadow-xs"
            />
            <div>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                {leaveRequest.employeeName}
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-md">
                  {leaveRequest.employeeId}
                </span>
              </h4>
              <p className="text-xs font-semibold text-slate-500">
                {leaveRequest.department} Department
              </p>
            </div>
          </div>

          {onSelectEmployee && (
            <button
              type="button"
              onClick={() => {
                onSelectEmployee(leaveRequest.employeeId);
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer"
            >
              View Full Profile
            </button>
          )}
        </div>

        {/* Leave Metadata Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
              Leave Category
            </span>
            <span className="text-sm font-black text-purple-900 uppercase">
              {leaveRequest.leaveType} Leave
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
              Start Date
            </span>
            <span className="text-sm font-black text-blue-900 font-mono">
              {leaveRequest.startDate}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
              End Date
            </span>
            <span className="text-sm font-black text-blue-900 font-mono">
              {leaveRequest.endDate}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
              Total Duration
            </span>
            <span className="text-sm font-black text-amber-900">
              {leaveRequest.totalDays} Days Off
            </span>
          </div>
        </div>

        {/* Substitute / Handover Person if exists */}
        {leaveRequest.substituteColleague && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900 font-semibold">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong className="font-extrabold">Work Handover Assigned To:</strong>{' '}
              {leaveRequest.substituteColleague}
            </span>
          </div>
        )}

        {/* Primary Purpose / Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-600" />
            Primary Leave Purpose & Reason
          </label>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-900">
            {leaveRequest.reason}
          </div>
        </div>

        {/* Detailed Explanation / Additional Notes (Crucial User Requirement!) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Detailed Employee Explanation & Notes
          </label>
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-medium leading-relaxed border border-slate-800 shadow-inner">
            {leaveRequest.notes ? (
              <p className="whitespace-pre-wrap">{leaveRequest.notes}</p>
            ) : (
              <p className="text-slate-400 italic">No additional explanation provided by employee.</p>
            )}
          </div>
        </div>

        {/* Manager Comment if present */}
        {leaveRequest.managerComment && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
            <span className="font-extrabold text-amber-900 block">
              Super Admin / HR Review Comment:
            </span>
            <p className="text-amber-800 font-medium">{leaveRequest.managerComment}</p>
          </div>
        )}

        {/* Super Admin / Admin Approval Controls - Only for pending requests */}
        {isSuperAdmin && leaveRequest.status === 'pending' && (
          <div className="pt-4 border-t border-slate-200/80 space-y-3">
            <label className="text-xs font-bold text-slate-800 block">
              Super Admin Decision & Comments
            </label>
            <input
              type="text"
              value={managerComment}
              onChange={(e) => setManagerComment(e.target.value)}
              placeholder="e.g. Approved as requested, ensure sprint tasks are completed in time..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-800"
            />

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleApprove}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Leave Request
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Reject Leave Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
