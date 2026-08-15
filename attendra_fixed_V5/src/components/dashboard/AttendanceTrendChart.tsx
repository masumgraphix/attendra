import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AttendanceRecord } from '../../types';
import { BarChart2, Calendar } from 'lucide-react';

interface AttendanceTrendChartProps {
  records?: AttendanceRecord[];
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ records = [] }) => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('week');
  const [activeSeries, setActiveSeries] = useState({
    onTime: true,
    late: true,
    wfh: true,
  });

  // Calculate dynamic trend data from records if available
  const trendDataMap: { [key: string]: { day: string; onTime: number; late: number; wfh: number; absent: number } } = {};
  records.forEach((r) => {
    const dayLabel = r.date;
    if (!trendDataMap[dayLabel]) {
      trendDataMap[dayLabel] = { day: dayLabel, onTime: 0, late: 0, wfh: 0, absent: 0 };
    }
    if (r.status === 'present' || r.status === 'grace_period') trendDataMap[dayLabel].onTime += 1;
    else if (r.status === 'late') trendDataMap[dayLabel].late += 1;
    else if (r.status === 'wfh') trendDataMap[dayLabel].wfh += 1;
    else if (r.status === 'absent') trendDataMap[dayLabel].absent += 1;
  });

  const chartData = Object.values(trendDataMap);
  const hasData = chartData.length > 0;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Attendance Velocity & Trend Analysis
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full">
              Real Database
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily check-in distribution calculated strictly from recorded attendance
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Series Toggles */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setActiveSeries({ ...activeSeries, onTime: !activeSeries.onTime })}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeSeries.onTime ? 'bg-white text-blue-700 font-bold shadow-xs' : 'opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block mr-1.5"></span>
              On-Time
            </button>
            <button
              onClick={() => setActiveSeries({ ...activeSeries, late: !activeSeries.late })}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeSeries.late ? 'bg-white text-amber-700 font-bold shadow-xs' : 'opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-1.5"></span>
              Late
            </button>
            <button
              onClick={() => setActiveSeries({ ...activeSeries, wfh: !activeSeries.wfh })}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeSeries.wfh ? 'bg-white text-purple-700 font-bold shadow-xs' : 'opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600 inline-block mr-1.5"></span>
              Remote
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl text-[11px] font-semibold text-slate-600">
            {(['week', 'month', 'quarter'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded-xl transition-all capitalize ${
                  timeframe === t ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area or Empty State */}
      {hasData ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorWfh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              {activeSeries.onTime && (
                <Area type="monotone" dataKey="onTime" name="On-Time" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnTime)" />
              )}
              {activeSeries.late && (
                <Area type="monotone" dataKey="late" name="Late" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLate)" />
              )}
              {activeSeries.wfh && (
                <Area type="monotone" dataKey="wfh" name="Remote WFH" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWfh)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-800">No attendance data available yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Data will appear here automatically as attendance is recorded by the Administrator.
          </p>
        </div>
      )}
    </div>
  );
};
