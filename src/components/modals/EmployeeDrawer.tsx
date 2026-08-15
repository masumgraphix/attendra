import React from 'react';
import { Employee, AttendanceRecord } from '../../types';
import { X, Mail, Phone, MapPin, Calendar, Clock, ShieldCheck, UserCheck, Palmtree } from 'lucide-react';

interface EmployeeDrawerProps {
  employee: Employee | null;
  attendanceHistory: AttendanceRecord[];
  onClose: () => void;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  employee,
  attendanceHistory,
  onClose,
}) => {
  if (!employee) return null;

  const empHistory = attendanceHistory.filter((r) => r.employeeId === employee.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200/80 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 font-mono">{employee.id}</span>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Info */}
            <div className="text-center space-y-2">
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-20 h-20 rounded-3xl object-cover mx-auto ring-4 ring-blue-50"
              />
              <h3 className="text-lg font-extrabold text-slate-900">{employee.name}</h3>
              <p className="text-xs font-semibold text-blue-600">{employee.role}</p>
              <p className="text-[11px] font-medium text-slate-400">{employee.department}</p>
            </div>

            {/* Quick Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email:</span>
                <span className="font-bold text-slate-900">{employee.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone:</span>
                <span className="font-bold text-slate-900">{employee.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location:</span>
                <span className="font-bold text-slate-900">{employee.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Join Date:</span>
                <span className="font-bold text-slate-900">{employee.joinDate}</span>
              </div>
            </div>

            {/* Leave Balances */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Leave Balance</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
                  <span className="block font-black text-blue-700 text-sm">{employee.leaveBalance.annual}d</span>
                  <span className="text-[10px] text-slate-500 font-medium">Annual</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="block font-black text-emerald-700 text-sm">{employee.leaveBalance.sick}d</span>
                  <span className="text-[10px] text-slate-500 font-medium">Sick</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="block font-black text-purple-700 text-sm">{employee.leaveBalance.casual}d</span>
                  <span className="text-[10px] text-slate-500 font-medium">Casual</span>
                </div>
              </div>
            </div>

            {/* Recent Attendance Punch Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Recent Punch Logs</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {empHistory.length > 0 ? (
                  empHistory.map((rec) => (
                    <div key={rec.id} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{rec.date}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{rec.entryTime} - {rec.exitTime || 'Active'}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {rec.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No recent log entries</p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
