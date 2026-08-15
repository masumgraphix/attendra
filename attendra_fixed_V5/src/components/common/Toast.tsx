import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white';
        let icon = <Info className="w-4 h-4 text-blue-400" />;

        if (toast.type === 'success') {
          bg = 'bg-slate-900 text-white border-emerald-500/40';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-slate-900 text-white border-amber-500/40';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
        } else if (toast.type === 'error') {
          bg = 'bg-slate-900 text-white border-rose-500/40';
          icon = <XCircle className="w-4 h-4 text-rose-400" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl ${bg} animate-slide-up`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 pr-2">
              <p className="text-xs font-bold leading-tight">{toast.title}</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
