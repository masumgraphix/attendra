import React, { useState } from 'react';
import { Employee, AttendanceStatus } from '../../types';
import { UserCheck, X, Calendar, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DirectAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSubmitRecord: (record: {
    employeeId: string;
    date: string;
    entryTime: string;
    exitTime: string;
    status: AttendanceStatus;
    locationType: 'Office HQ' | 'Remote - Home' | 'Client Site' | 'Geofence App' | 'Official Tour';
    reason: string;
    notes: string;
  }) => void;
}

export const ClockInModal: React.FC<DirectAttendanceModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSubmitRecord,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [date, setDate] = useState('2026-07-29');
  const [entryTime, setEntryTime] = useState('08:30 AM');
  const [exitTime, setExitTime] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [locationType, setLocationType] = useState<
    'Office HQ' | 'Remote - Home' | 'Client Site' | 'Geofence App' | 'Official Tour'
  >('Office HQ');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    onSubmitRecord({
      employeeId: selectedEmpId,
      date,
      entryTime,
      exitTime,
      status,
      locationType,
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Administrator Direct Attendance Entry
            </h3>
            <p className="text-xs text-slate-500">
              Manually log daily entry, exit, status, and compliance notes for an employee
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Employee */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Employee *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id}) — {emp.department}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Attendance Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Location Type</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Office HQ">Office HQ</option>
                <option value="Remote - Home">Remote - Home</option>
                <option value="Client Site">Client Site</option>
                <option value="Official Tour">Official Tour</option>
                <option value="Geofence App">Geofence App</option>
              </select>
            </div>
          </div>

          {/* Entry & Exit Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Entry Time (Check-In) *</label>
              <input
                type="text"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                placeholder="e.g. 08:30 AM"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Exit Time (Check-Out)</label>
              <input
                type="text"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                placeholder="e.g. 05:30 PM"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Leave blank if the employee has not checked out yet — they can check out later from their Dashboard.
              </p>
            </div>
          </div>

          {/* Attendance Status */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Attendance Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 capitalize"
            >
              <option value="present">Present (On Time)</option>
              <option value="late">Late Arrival</option>
              <option value="grace_period">Grace Period (5-15m)</option>
              <option value="wfh">Remote WFH</option>
              <option value="half_day">Half Day Shift</option>
              <option value="official_tour">Official Tour / Onsite</option>
              <option value="on_leave">On Approved Leave</option>
              <option value="absent">Unexcused Absent</option>
            </select>
          </div>

          {/* Reason & Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Administrator Reason / Justification</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Client meeting onsite, verified transit delay, manual admin log"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Administrative Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional shift details or supervisor confirmation..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
            >
              Record Attendance Log (Admin Override)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
