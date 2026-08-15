import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AttendanceRecord } from '../../types';
import { PieChart as PieIcon, PieChart as EmptyIcon } from 'lucide-react';

interface AttendanceDoughnutProps {
  records?: AttendanceRecord[];
  totalEmployees?: number;
}

export const AttendanceDoughnut: React.FC<AttendanceDoughnutProps> = ({
  records = [],
  totalEmployees = 7,
}) => {
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late' || r.status === 'grace_period').length;
  const wfh = records.filter((r) => r.status === 'wfh').length;
  const onLeave = records.filter((r) => r.status === 'on_leave').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  const totalRecorded = records.length;
  const hasData = totalRecorded > 0;

  const doughnutData = [
    { name: 'Present On-Time', value: present, color: '#22C55E' },
    { name: 'Late / Grace', value: late, color: '#F59E0B' },
    { name: 'Remote WFH', value: wfh, color: '#3B82F6' },
    { name: 'On Approved Leave', value: onLeave, color: '#8B5CF6' },
    { name: 'Unexcused Absent', value: absent, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600" />
            Attendance Breakdown
          </h3>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Real Log
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Proportional workforce status distribution
        </p>
      </div>

      {hasData ? (
        <>
          {/* Doughnut Chart with Center Number */}
          <div className="relative h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={doughnutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {doughnutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 p-2.5 rounded-2xl shadow-xl text-xs">
                          <p className="font-bold text-slate-900" style={{ color: data.color }}>
                            {data.name}
                          </p>
                          <p className="text-slate-600 font-semibold mt-0.5">
                            {data.value} Employees ({((data.value / totalRecorded) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Overlay Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{totalRecorded}</span>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Entries</span>
            </div>
          </div>

          {/* Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {doughnutData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 ml-2">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-56 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4 text-center my-2">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl mb-2">
            <EmptyIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">No attendance data available yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Breakdown will calculate automatically when attendance is recorded.
          </p>
        </div>
      )}
    </div>
  );
};
