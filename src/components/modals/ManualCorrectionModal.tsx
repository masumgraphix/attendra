import React, { useState, useEffect } from 'react';
import { X, ClipboardEdit, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Employee, AttendanceRecord, AttendanceStatus } from '../../types';

interface DirectCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  initialRecordId?: string | null;
  onSubmitCorrection: (data: {
    recordId: string;
    entryTime: string;
    exitTime: string;
    status: AttendanceStatus;
    reason: string;
  }) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const ManualCorrectionModal: React.FC<DirectCorrectionModalProps> = ({
  isOpen,
  onClose,
  employees,
  attendanceRecords,
  initialRecordId,
  onSubmitCorrection,
  onDeleteRecord,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [entryTime, setEntryTime] = useState('08:30 AM');
  const [exitTime, setExitTime] = useState('05:30 PM');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const targetId = initialRecordId && attendanceRecords.some(r => r.id === initialRecordId)
        ? initialRecordId
        : (attendanceRecords[0]?.id || '');
      
      setSelectedRecordId(targetId);
      const rec = attendanceRecords.find((r) => r.id === targetId);
      if (rec) {
        setEntryTime(rec.entryTime || '08:30 AM');
        setExitTime(rec.exitTime || '05:30 PM');
        setStatus(rec.status || 'present');
        setReason(rec.notes || rec.reason || 'Corrected wrongly entered timestamp/status.');
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialRecordId, attendanceRecords]);

  if (!isOpen) return null;

  const handleRecordChange = (recordId: string) => {
    setSelectedRecordId(recordId);
    const rec = attendanceRecords.find((r) => r.id === recordId);
    if (rec) {
      setEntryTime(rec.entryTime || '08:30 AM');
      setExitTime(rec.exitTime || '05:30 PM');
      setStatus(rec.status || 'present');
      setReason(rec.notes || rec.reason || 'Corrected wrongly entered timestamp/status.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;

    onSubmitCorrection({
      recordId: selectedRecordId,
      entryTime,
      exitTime,
      status,
      reason,
    });
    onClose();
  };

  const handleDelete = () => {
    if (selectedRecordId && onDeleteRecord) {
      onDeleteRecord(selectedRecordId);
      onClose();
    }
  };

  const activeRecord = attendanceRecords.find((r) => r.id === selectedRecordId);

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
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardEdit className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Edit Attendance Entry
            </h3>
            <p className="text-xs text-slate-500">
              Correct wrong attendance entries, entry/exit timestamps, or status
            </p>
          </div>
        </div>

        {attendanceRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <p className="font-bold text-sm text-slate-800">No attendance records found to edit.</p>
            <p className="text-xs text-slate-400 mt-1">Please log attendance first using "Record Attendance".</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Record To Edit *</label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleRecordChange(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                required
              >
                {attendanceRecords.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.date} — {rec.employeeName} ({rec.entryTime} to {rec.exitTime || 'Active'}) [{rec.status}]
                  </option>
                ))}
              </select>
            </div>

            {activeRecord && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                <img
                  src={activeRecord.employeeAvatar}
                  alt={activeRecord.employeeName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30"
                />
                <div>
                  <p className="font-extrabold text-slate-900 text-xs">{activeRecord.employeeName}</p>
                  <p className="text-[10px] text-slate-500">{activeRecord.department} • Date: <span className="font-bold text-slate-700">{activeRecord.date}</span></p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Corrected Entry Time *</label>
                <input
                  type="text"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  placeholder="e.g. 08:30 AM"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Corrected Exit Time *</label>
                <input
                  type="text"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  placeholder="e.g. 05:30 PM"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Updated Attendance Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 capitalize"
              >
                <option value="present">Present (On Time)</option>
                <option value="late">Late Arrival</option>
                <option value="grace_period">Grace Period</option>
                <option value="wfh">Remote WFH</option>
                <option value="half_day">Half Day Shift</option>
                <option value="official_tour">Official Tour</option>
                <option value="on_leave">On Approved Leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Correction Note / Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Corrected entry time mistake made during manual check-in."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                required
              />
            </div>

            {/* Danger Zone: Delete wrong entry */}
            {showDeleteConfirm ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="font-extrabold text-xs">Delete this attendance record entirely?</p>
                </div>
                <p className="text-[11px] text-rose-600">This action will remove this entry from the attendance ledger.</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Yes, Delete Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                {onDeleteRecord && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Entry
                  </button>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ClipboardEdit className="w-4 h-4" />
                Save Corrected Attendance & Log Audit Trail
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

