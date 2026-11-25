import React from 'react';
import { Clock, LogOut, MessageCircle, Mail } from 'lucide-react';
import { Company, UserAccount } from '../../types';

interface Props {
  company: Company | null;
  reason?: string;
  currentUser: UserAccount;
  onLogout: () => void;
}

const SUPPORT_WHATSAPP = (import.meta as any).env?.VITE_SUPPORT_WHATSAPP || '8801560027255';
const SUPPORT_EMAIL = (import.meta as any).env?.VITE_SUPPORT_EMAIL || '';

/** Shown when a company's trial has ended or its account is suspended. */
export const CompanyBlockedView: React.FC<Props> = ({ company, reason, currentUser, onLogout }) => {
  const isOwner = currentUser.role === 'super_admin';
  const text = encodeURIComponent(`Hello, I want to activate Attendra for ${company?.name || 'my company'} (code: ${company?.slug || '-'}).`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-8 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center">
          <Clock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900">{company?.name || 'Your company'}</h1>
          <p className="text-sm text-slate-600">{reason || 'Access to this workspace is paused.'}</p>
          <p className="text-xs text-slate-500">Your data is safe and will be available again as soon as the account is active.</p>
        </div>

        {isOwner ? (
          <div className="space-y-2">
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-extrabold"
            >
              <MessageCircle className="w-4 h-4" /> Contact us on WhatsApp to activate
            </a>
            {SUPPORT_EMAIL && (
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${text}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold">
                <Mail className="w-4 h-4" /> Email support
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl p-3">
            Please ask your company admin to renew the Attendra subscription.
          </p>
        )}

        <button onClick={onLogout} className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5 cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
};
