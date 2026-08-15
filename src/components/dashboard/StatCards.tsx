import React from 'react';
import {
  UserCheck,
  Clock,
  UserX,
  Palmtree,
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react';

interface StatCardsProps {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  avgEntry?: string;
  avgExit?: string;
  avgHours?: number;
  totalEmployees?: number;
  isEmployeeView?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({
  presentCount,
  lateCount,
  absentCount,
  leaveCount,
  avgEntry = '09:00 AM',
  avgExit = '06:00 PM',
  avgHours = 8.0,
  totalEmployees = 8,
  isEmployeeView = false,
}) => {
  const adminCards = [
    {
      title: 'Present Today',
      value: presentCount.toString(),
      subtext: `${presentCount} of ${totalEmployees} employees`,
      icon: UserCheck,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
    },
    {
      title: 'Late Today',
      value: lateCount.toString(),
      subtext: 'Grace window (20m)',
      icon: Clock,
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
    },
    {
      title: 'Absent Today',
      value: absentCount.toString(),
      subtext: 'Unexcused / Pending',
      icon: UserX,
      gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
      iconBg: 'bg-rose-500 text-white shadow-md shadow-rose-500/20',
    },
    {
      title: 'Leave Today',
      value: leaveCount.toString(),
      subtext: 'Approved scheduling',
      icon: Palmtree,
      gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
      iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
    },
  ];

  const employeeCards = [
    {
      title: 'Monthly Attendance Rate',
      value: presentCount > 0 ? '98.5%' : '100%',
      subtext: 'Personal log summary',
      icon: UserCheck,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
    },
    {
      title: 'Avg Daily Entry',
      value: avgEntry,
      subtext: 'Target: 09:00 AM',
      icon: LogIn,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
    },
    {
      title: 'Avg Daily Exit',
      value: avgExit,
      subtext: 'Target: 06:00 PM',
      icon: LogOut,
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      iconBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
    },
    {
      title: 'Avg Work Hours',
      value: `${avgHours.toFixed(1)} hrs`,
      subtext: 'Daily target: 8.0 hrs/day',
      icon: Timer,
      gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
      iconBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/20',
    },
  ];

  const cards = isEmployeeView ? employeeCards : adminCards;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            {/* Top Gradient Tint */}
            <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${card.gradient} -z-10`} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 line-clamp-1">{card.title}</span>
                <div className={`p-1.5 rounded-xl ${card.iconBg}`}>
                  <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {card.value}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium truncate">{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

