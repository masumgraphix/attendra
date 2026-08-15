import React, { useState } from 'react';
import { X, Palmtree, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Employee, LeaveType, LeavePolicy } from '../../types';

interface DirectLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  leavePolicies?: LeavePolicy[];
  onSubmitLeave: (data: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
  }) => void;
}

export const ApplyLeaveModal: React.FC<DirectLeaveModalProps> = ({
  isOpen,
  onClose,
  employees,
  leavePolicies = [
    { id: 'sick', name: 'Sick Leave', yearlyQuota: 14, colorTag: 'emerald' },
    { id: 'casual', name: 'Casual Leave', yearlyQuota: 20, colorTag: 'purple' },
    { id: 'emergency', name: 'Emergency Leave', yearlyQuota: 10, colorTag: 'amber' },
    { id: 'annual', name: 'Annual Leave', yearlyQuota: 20, colorTag: 'blue' },
  ],
  onSubmitLeave,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState<string>(leavePolicies[0]?.id || 'casual');
  const [startDate, setStartDate] = useState('2026-08-03');
  const [endDate, setEndDate] = useState('2026-08-05');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];
  const selectedPolicy = leavePolicies.find((p) => p.id === leaveType || (p.name && leaveType && p.name.toLowerCase() === leaveType.toLowerCase())) || leavePolicies[0];

  // Calculate requested total days
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

  // Calculate balance metrics
  const used = selectedEmp?.leaveUsed?.[selectedPolicy?.id || ''] ?? selectedEmp?.leaveUsed?.[selectedPolicy?.name?.toLowerCase() || ''] ?? 0;
  const quota = selectedPolicy?.yearlyQuota ?? 14;
  const remaining = quota - used;
  const isOverQuota = diffDays > remaining;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    onSubmitLeave({
      employeeId: selectedEmpId,
      leaveType: selectedPolicy?.id || leaveType,
      startDate,
      endDate,
      reason,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
            <Palmtree className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Administrator Log Employee Leave
            </h3>
            <p className="text-xs text-slate-500">
              Directly record employee absence or time off into company ledger
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Employee *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id}) — {emp.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Leave Category *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 capitalize"
            >
              {leavePolicies.map((pol) => (
                <option key={pol.id} value={pol.id}>
                  {pol.name} ({pol.yearlyQuota} days/yr quota)
                </option>
              ))}
              <option value="unpaid">Unpaid Personal Off</option>
            </select>
          </div>

          {/* Live Balance Banner & Over-Quota Warning */}
          {selectedEmp && selectedPolicy && (
            <div className={`p-3.5 rounded-2xl border ${isOverQuota ? 'bg-amber-50/90 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'} space-y-1.5`}>
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1.5">
                  {isOverQuota ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {selectedPolicy.name} Balance for {selectedEmp.name}
                </span>
                <span className="font-mono">{remaining} days remaining</span>
              </div>

              <div className="text-[11px] text-slate-600 flex justify-between">
                <span>Quota: {quota}d • Taken: {used}d</span>
                <span className="font-bold">Requested: {diffDays} day(s)</span>
              </div>

              {isOverQuota && (
                <p className="text-[11px] font-bold text-amber-800 pt-1 border-t border-amber-200/60">
                  ⚠️ Warning: Logging {diffDays} day(s) will exceed remaining balance by {diffDays - remaining} day(s) (New Balance: {remaining - diffDays}d). Admin override enabled.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason / Purpose *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical consultation, personal family emergency, approved annual rest"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Administrator Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Medical certificate number, manager verbal note, or HR log comments..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              Directly Save & Approve Leave Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
