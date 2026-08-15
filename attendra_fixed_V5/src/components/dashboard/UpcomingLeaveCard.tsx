import React from 'react';
import { LeaveRequest } from '../../types';
import { Palmtree, ArrowRight } from 'lucide-react';

interface UpcomingLeaveCardProps {
  leaves: LeaveRequest[];
  onNavigateToLeave: () => void;
  onSelectEmployee?: (empId: string) => void;
}

export const UpcomingLeaveCard: React.FC<UpcomingLeaveCardProps> = ({
  leaves,
  onNavigateToLeave,
  onSelectEmployee,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Palmtree className="w-4 h-4 text-purple-600" />
          Upcoming Team Leaves
        </h3>
        <button
          onClick={onNavigateToLeave}
          className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {leaves.length > 0 ? (
        <div className="space-y-2.5">
          {leaves.slice(0, 3).map((l) => (
            <div
              key={l.id}
              onClick={() => onSelectEmployee && onSelectEmployee(l.employeeId)}
              className="p-3 rounded-2xl bg-purple-50/40 hover:bg-purple-50/70 border border-purple-100/80 transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={l.employeeAvatar}
                  alt={l.employeeName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{l.employeeName}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {l.department} • <span className="capitalize">{l.leaveType} Leave</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md block">
                  {l.startDate} to {l.endDate}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  {l.totalDays} {l.totalDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-purple-50/30 border border-dashed border-purple-200/60 text-center flex flex-col items-center justify-center">
          <Palmtree className="w-5 h-5 text-purple-400 mb-1" />
          <p className="text-xs font-bold text-slate-700">No upcoming team leaves</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            When employee leave requests are submitted or logged, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
