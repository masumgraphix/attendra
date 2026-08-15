import React from 'react';
import {
  UserCheck,
  Palmtree,
  UserPlus,
  FileSpreadsheet,
  Sparkles,
  Zap,
} from 'lucide-react';

interface QuickActionsProps {
  onClockIn: () => void;
  onApplyLeave: () => void;
  onAddEmployee: () => void;
  onManualAdjustment?: () => void;
  onRunAI: () => void;
  onExportReport: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onClockIn,
  onApplyLeave,
  onAddEmployee,
  onRunAI,
  onExportReport,
}) => {
  const actions = [
    {
      title: 'Record Attendance',
      desc: 'Manual check-in/out log',
      icon: UserCheck,
      color: 'from-blue-600 to-indigo-600 text-white',
      shadow: 'shadow-blue-500/20',
      onClick: onClockIn,
    },
    {
      title: 'Log Employee Leave',
      desc: 'Direct time-off entry',
      icon: Palmtree,
      color: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80',
      shadow: '',
      onClick: onApplyLeave,
    },
    {
      title: 'AI HR Analysis',
      desc: 'Generate workforce insights',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/80',
      shadow: '',
      onClick: onRunAI,
    },
    {
      title: 'Add New Employee',
      desc: 'Onboard team member',
      icon: UserPlus,
      color: 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/80',
      shadow: '',
      onClick: onAddEmployee,
    },
    {
      title: 'Export Audit Ledger',
      desc: 'Download CSV log file',
      icon: FileSpreadsheet,
      color: 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/80',
      shadow: '',
      onClick: onExportReport,
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          Administrator Quick Shortcuts
        </h3>
        <span className="text-[11px] font-medium text-slate-400">Office Manager Tools</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act, i) => {
          const Icon = act.icon;
          const isPrimary = act.color.includes('from-blue-600');
          return (
            <button
              key={i}
              onClick={act.onClick}
              className={`flex flex-col items-start p-3.5 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 ${
                isPrimary
                  ? `bg-gradient-to-r ${act.color} ${act.shadow} shadow-md`
                  : act.color
              }`}
            >
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md mb-2">
                <Icon className="w-4 h-4" />
              </div>
              <p className={`text-xs font-bold leading-snug ${isPrimary ? 'text-white' : 'text-slate-900'}`}>
                {act.title}
              </p>
              <p className={`text-[10px] mt-0.5 line-clamp-1 ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>
                {act.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
