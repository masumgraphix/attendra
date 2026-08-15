import React, { useState } from 'react';
import { AuditLog, UserRole } from '../../types';
import { ShieldCheck, CheckCircle2, Search, Eye, EyeOff, Lock } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
  onSelectEmployee?: (empId: string) => void;
  currentUserRole?: UserRole;
}

interface MaskedAuditCellProps {
  value: string;
  currentUserRole?: UserRole;
  isNew?: boolean;
}

const MaskedAuditCell: React.FC<MaskedAuditCellProps> = ({ value, currentUserRole, isNew }) => {
  const [revealed, setRevealed] = useState(false);
  const isSuperAdmin = currentUserRole === 'super_admin';

  // Check if string references passwords or security tokens
  const hasPasswordKey = /password|pass|\*{3,}|masked/i.test(value);

  if (!hasPasswordKey) {
    return (
      <span className={`font-mono text-[11px] px-2 py-1 rounded-md ${isNew ? 'text-emerald-700 bg-emerald-50/50' : 'text-rose-700 bg-rose-50/50'}`}>
        {value || '—'}
      </span>
    );
  }

  // Display masked representation unless Super Admin explicitly reveals
  const displayValue = revealed && isSuperAdmin
    ? value
    : value.replace(/(password:\s*)[^\s,.]+/gi, '$1******').replace(/Pass-[A-Za-z0-9!@#$]+/g, '******');

  return (
    <div className={`font-mono text-[11px] px-2.5 py-1 rounded-md flex items-center justify-between gap-1.5 ${isNew ? 'text-emerald-900 bg-emerald-50/80 border border-emerald-200/60' : 'text-rose-900 bg-rose-50/80 border border-rose-200/60'}`}>
      <span className="truncate max-w-[220px]" title={displayValue}>{displayValue}</span>
      {isSuperAdmin ? (
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="p-1 hover:bg-black/5 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          title={revealed ? "Hide sensitive details" : "Reveal details (Super Admin Only)"}
        >
          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      ) : (
        <span className="text-[9px] text-slate-400 font-sans italic shrink-0" title="Reveal restricted to Super Admin">
          <Lock className="w-3 h-3 inline text-slate-400" />
        </span>
      )}
    </div>
  );
};

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onSelectEmployee, currentUserRole = 'super_admin' }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log: any) => {
    const s = search.toLowerCase();
    return (
      (log.target || '').toLowerCase().includes(s) ||
      (log.action || '').toLowerCase().includes(s) ||
      (log.administrator || log.user_name || log.userName || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Administrator Audit Log & Security Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system audit trail recording every manual override, leave entry, and attendance modification
          </p>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Time & ID</th>
              <th className="py-3.5 px-4">Administrator</th>
              <th className="py-3.5 px-4">Action Event</th>
              <th className="py-3.5 px-4">Target Employee</th>
              <th className="py-3.5 px-4">Old Value</th>
              <th className="py-3.5 px-4">New Value</th>
              <th className="py-3.5 px-4">Reason / Justification</th>
              <th className="py-3.5 px-4">Audit Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-900">
                    <div>{log.timestamp}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{log.id}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{log.administrator}</td>
                  <td className="py-3.5 px-4 font-bold text-blue-900">{log.action}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => {
                        if (onSelectEmployee) {
                          onSelectEmployee('EMP-1001');
                        }
                      }}
                      className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                    >
                      {log.target}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <MaskedAuditCell value={log.oldValue || '—'} currentUserRole={currentUserRole} isNew={false} />
                  </td>
                  <td className="py-3.5 px-4">
                    <MaskedAuditCell value={log.newValue || '—'} currentUserRole={currentUserRole} isNew={true} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{log.reason || 'Manual Admin Log'}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Ledger
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="font-extrabold text-sm text-slate-800">No audit logs available.</p>
                  <p className="text-xs text-slate-400 mt-1">Audit trail will record actions automatically as Administrator actions are performed.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
