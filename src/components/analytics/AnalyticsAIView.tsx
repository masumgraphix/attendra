import React, { useState } from 'react';
import { AIInsightData, AttendanceRecord, Employee, Department, UserRole } from '../../types';
import { PEAK_HOURS_DATA } from '../../data/mockData';
import { isLateEntry } from '../../utils/salaryDeduction';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Brain,
  ShieldCheck,
  Zap,
  Trophy,
  Grid,
  Award,
  Medal,
  Clock,
  Building2,
  Lock,
} from 'lucide-react';

interface AnalyticsAIViewProps {
  aiData: AIInsightData | null;
  isLoadingAI: boolean;
  onRefreshAI: () => void;
  attendanceHistory?: AttendanceRecord[];
  employees?: Employee[];
  departments?: Department[];
  currentUserRole?: UserRole;
}

const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export const AnalyticsAIView: React.FC<AnalyticsAIViewProps> = ({
  aiData,
  isLoadingAI,
  onRefreshAI,
  attendanceHistory = [],
  employees = [],
  departments = [],
  currentUserRole = 'super_admin',
}) => {
  const isEmployee = currentUserRole === 'employee';

  // Compute Leaderboard (Top 5 Most Punctual)
  const leaderboard = employees
    .map((emp) => {
      const empRecords = attendanceHistory.filter((r) => r.employeeId === emp.id);
      const totalTracked = empRecords.length;
      const onTimeCount = empRecords.filter(
        (r) => r.status === 'present' || r.status === 'grace_period' || r.status === 'wfh'
      ).length;
      const lateCount = empRecords.filter(
        (r) => r.status === 'late' || (r.entryTime && isLateEntry(r.entryTime))
      ).length;
      const onTimePercentage = totalTracked > 0 ? Math.round((onTimeCount / totalTracked) * 100) : 100;

      return {
        employee: emp,
        totalTracked,
        onTimeCount,
        lateCount,
        onTimePercentage,
      };
    })
    .sort((a, b) => {
      if (b.onTimePercentage !== a.onTimePercentage) {
        return b.onTimePercentage - a.onTimePercentage;
      }
      return a.lateCount - b.lateCount;
    })
    .slice(0, 5);

  // Department list
  const deptList = departments.length > 0
    ? departments.map((d) => d.name)
    : Array.from(new Set(employees.map((e) => e.department)));

  // Helper to calculate late count for a department and day of week
  const getDeptWeekdayLateCount = (deptName: string, weekdayName: string) => {
    return attendanceHistory.filter((r) => {
      if (r.department !== deptName) return false;
      const d = new Date(r.date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const isLate = r.status === 'late' || (r.entryTime && isLateEntry(r.entryTime));
      return dayName === weekdayName && isLate;
    }).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner AI Workforce Center */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-300">
                <Brain className="w-5 h-5 stroke-[2.2]" />
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">
                Attendra AI Strategic Workforce Intelligence
              </h3>
            </div>
            <p className="text-xs text-purple-200/90 max-w-2xl leading-relaxed">
              Powered by Gemini 3.6 Flash. Continuously evaluating arrival variance, burnout probability, shift bottlenecks, and leave distribution patterns.
            </p>
          </div>

          <button
            onClick={onRefreshAI}
            disabled={isLoadingAI}
            className="flex items-center gap-2 px-5 py-3 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-2xl shadow-lg transition-all shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAI ? 'animate-spin text-purple-600' : ''}`} />
            {isLoadingAI ? 'Analyzing Workforce...' : 'Re-Run AI Analysis'}
          </button>
        </div>
      </div>

      {/* PART A Widgets (Admin / Super Admin only) */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. PUNCTUALITY LEADERBOARD */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Trophy className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Punctuality Leaderboard
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Top 5 Most Punctual Staff (Lowest late count & highest on-time %)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-600">
                Current Month
              </span>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((item, idx) => {
                const rankColor =
                  idx === 0
                    ? 'bg-amber-400 text-amber-950 border-amber-500 ring-2 ring-amber-300'
                    : idx === 1
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : idx === 2
                    ? 'bg-amber-700/20 text-amber-900 border-amber-600/30'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <div
                    key={item.employee.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border ${rankColor}`}
                      >
                        #{idx + 1}
                      </div>

                      <img
                        src={item.employee.avatar}
                        alt={item.employee.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                      />

                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{item.employee.name}</h5>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {item.employee.role} • <span className="font-semibold text-slate-700">{item.employee.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.onTimePercentage}% On-Time
                      </span>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">
                        {item.lateCount} Lates • {item.onTimeCount} On-Time
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. DEPARTMENT LATE HEATMAP */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Grid className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Department Late Heatmap
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Late arrival intensity grid by weekday (Sat–Thu)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200 inline-block"></span> 0
                <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 inline-block ml-1"></span> 1
                <span className="w-2.5 h-2.5 rounded bg-orange-300 border border-orange-400 inline-block ml-1"></span> 2-3
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block ml-1"></span> 4+
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-extrabold">Department</th>
                    {WEEKDAYS.map((day) => (
                      <th key={day} className="py-2.5 px-2 font-extrabold text-center">
                        {day.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptList.map((dept) => (
                    <tr key={dept} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{dept}</span>
                      </td>

                      {WEEKDAYS.map((day) => {
                        const count = getDeptWeekdayLateCount(dept, day);
                        let cellStyle = 'bg-slate-50 text-slate-400 border-slate-100';
                        if (count === 1) cellStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                        else if (count >= 2 && count <= 3) cellStyle = 'bg-orange-300/90 text-orange-950 border-orange-400 font-extrabold';
                        else if (count >= 4) cellStyle = 'bg-rose-500 text-white border-rose-600 font-black shadow-xs';

                        return (
                          <td key={day} className="p-1 text-center">
                            <div
                              className={`py-2 px-1 rounded-xl border text-[11px] transition-all flex items-center justify-center ${cellStyle}`}
                              title={`${dept} on ${day}: ${count} late instances`}
                            >
                              {count > 0 ? count : '—'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Intelligence Output Panel */}
      {aiData && (
        <div className="bg-white/90 backdrop-blur-xl border border-purple-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          {/* Executive Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                Executive HR Summary
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1 leading-relaxed">
                {aiData.executiveSummary}
              </p>
            </div>
            <div className="text-center bg-white px-4 py-2 rounded-2xl border border-purple-200/60 shrink-0">
              <span className="text-2xl font-black text-purple-700">{aiData.healthScore}/100</span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Health Index</span>
            </div>
          </div>

          {/* Highlights & Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Highlights */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Workforce Positives
              </h4>
              <div className="space-y-2">
                {aiData.keyHighlights.map((hl, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-slate-50 text-xs font-semibold text-slate-800 border border-slate-100">
                    • {hl}
                  </div>
                ))}
              </div>
            </div>

            {/* Burnout & Late Risks */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Identified Risk Bottlenecks
              </h4>
              <div className="space-y-2">
                {aiData.burnoutOrLateRisks.map((risk, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950">{risk.title}</span>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-amber-200 text-amber-900">
                        {risk.severity} risk
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 font-medium text-[11px]">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400 fill-purple-400" />
              Strategic HR Action Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
              {aiData.actionableRecommendations.map((rec, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  ⚡ {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Peak Arrival Hours Histogram */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 className="text-base font-extrabold text-slate-900 mb-1">
          Peak Morning Check-In Hour Histogram
        </h3>
        <p className="text-xs text-slate-500 mb-6">Arrival volume distribution across HQ terminals</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PEAK_HOURS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 p-2.5 rounded-2xl shadow-xl text-xs font-bold text-slate-900">
                        {label}: {payload[0].value} check-ins
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
