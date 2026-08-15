import React, { useState, useEffect } from 'react';
import { AttendanceRecord, OfficeShiftSettings } from '../../types';
import { parseTimeToMinutes, formatMinutesTo12H } from '../../utils/salaryDeduction';
import { Clock, LogIn, LogOut, CheckCircle2, ShieldCheck, MapPin, AlertCircle, Sparkles, Zap } from 'lucide-react';

interface EmployeeCheckInWidgetProps {
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  department?: string;
  todayRecord?: AttendanceRecord;
  shiftSettings: OfficeShiftSettings;
  onCheckIn: (status: 'present' | 'grace_period' | 'late', checkInTime: string) => void;
  onCheckOut: (checkOutTime: string, hoursWorked: number) => void;
}

export const EmployeeCheckInWidget: React.FC<EmployeeCheckInWidgetProps> = ({
  employeeId,
  employeeName,
  todayRecord,
  shiftSettings,
  onCheckIn,
  onCheckOut,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString12H = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateString = currentTime.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Calculate current check-in status preview based on configurable shiftSettings
  const evalCheckInStatus = (timeStr: string): { status: 'present' | 'grace_period' | 'late'; label: string; badgeColor: string } => {
    const timeMins = parseTimeToMinutes(timeStr);
    const startMins = parseTimeToMinutes(shiftSettings.officeStartTime || '09:00') ?? 540;
    const lateMins = parseTimeToMinutes(shiftSettings.lateThresholdTime || '09:20') ?? 560;

    if (timeMins === null) {
      return { status: 'present', label: 'On-Time', badgeColor: 'bg-emerald-100 text-emerald-800' };
    }

    if (timeMins <= startMins) {
      return {
        status: 'present',
        label: 'Excellent / On-Time',
        badgeColor: 'bg-emerald-500 text-white shadow-xs',
      };
    } else if (timeMins <= lateMins) {
      return {
        status: 'grace_period',
        label: 'On-Time (Grace Window)',
        badgeColor: 'bg-blue-600 text-white shadow-xs',
      };
    } else {
      return {
        status: 'late',
        label: 'Late Entry',
        badgeColor: 'bg-amber-500 text-white shadow-xs',
      };
    }
  };

  const currentPreview = evalCheckInStatus(timeString12H);

  // Handle Check-In Click
  const handleCheckInClick = () => {
    const statusEval = evalCheckInStatus(timeString12H);
    onCheckIn(statusEval.status, timeString12H);
  };

  // Handle Check-Out Click
  const handleCheckOutClick = () => {
    if (!todayRecord || !todayRecord.entryTime) return;

    const entryMins = parseTimeToMinutes(todayRecord.entryTime);
    const exitMins = parseTimeToMinutes(timeString12H);

    let diffMins = 0;
    if (entryMins !== null && exitMins !== null) {
      diffMins = exitMins >= entryMins ? exitMins - entryMins : exitMins + 24 * 60 - entryMins;
    }

    const hours = Math.round((diffMins / 60) * 10) / 10;
    onCheckOut(timeString12H, Math.max(0.1, hours));
  };

  const isCheckedIn = !!todayRecord && !!todayRecord.entryTime;
  const isCheckedOut = !!todayRecord && !!todayRecord.exitTime;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        {/* Top Header & Live Clock */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Zap className="w-4 h-4 fill-blue-400" />
              </span>
              <h3 className="text-base font-black tracking-tight text-white">Employee Attendance Portal</h3>
            </div>
            <p className="text-xs text-slate-400">
              Welcome back, <strong className="text-slate-200">{employeeName}</strong>! Record your daily shift attendance.
            </p>
          </div>

          {/* Clock Display */}
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-right shrink-0 font-mono">
            <p className="text-xs text-slate-400 font-sans">{dateString}</p>
            <p className="text-xl font-black text-emerald-400 tracking-wider mt-0.5">{timeString12H}</p>
          </div>
        </div>

        {/* Shift Timings Bar */}
        <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300">Office Shift:</span>
            <span className="font-bold text-white font-mono">{shiftSettings.officeStartTime || '09:00 AM'} - {shiftSettings.officeEndTime || '05:00 PM'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Grace Window:</span>
            <span className="font-bold text-emerald-400 font-mono">Until {shiftSettings.lateThresholdTime || '09:20 AM'}</span>
          </div>
        </div>

        {/* Check-In / Check-Out Action Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Status Display Card */}
          <div className="p-4 bg-slate-800/90 border border-slate-700/90 rounded-2xl space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Today's Shift Status</p>

            {!isCheckedIn ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                  <p className="text-sm font-bold text-amber-300">Not Checked In Yet</p>
                </div>
                <p className="text-xs text-slate-400">
                  Checking in now will record status as{' '}
                  <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${currentPreview.badgeColor}`}>
                    {currentPreview.label}
                  </span>
                </p>
              </div>
            ) : !isCheckedOut ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <p className="text-sm font-bold text-emerald-400">
                    Checked In at {todayRecord?.entryTime}
                  </p>
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <span>Status: <strong className="text-white uppercase">{todayRecord?.status.replace('_', ' ')}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-300 font-semibold">Active Shift in Progress</span>
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-white">
                    Checked Out at {todayRecord?.exitTime}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Total Worked: {todayRecord?.workHours ?? 0} hours
                  </span>
                  <span>•</span>
                  <span className="text-slate-400">Completed</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div>
            {!isCheckedIn ? (
              <button
                type="button"
                onClick={handleCheckInClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                Check In Now ({timeString12H})
              </button>
            ) : !isCheckedOut ? (
              <button
                type="button"
                onClick={handleCheckOutClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <LogOut className="w-5 h-5 stroke-[2.5]" />
                Check Out Now ({timeString12H})
              </button>
            ) : (
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-slate-300">Checked Out at {todayRecord?.exitTime}</p>
                <p className="text-[11px] text-slate-400">
                  You have logged {todayRecord?.workHours ?? 0} hours today. Second check-in disabled for today.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
