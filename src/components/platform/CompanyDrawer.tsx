import React, { useEffect, useState } from 'react';
import {
  X, Wallet, Clock, KeyRound, Eye, MessageCircle, Save, Users, CalendarCheck, Receipt, PlayCircle, Undo2,
} from 'lucide-react';
import { api, PlatformCompanyDetail, PlatformOverview } from '../../services/api';
import { companyState, fmtDate, taka, whatsappLink, METHOD_LABEL, Toast } from './shared';
import { RecordPaymentModal } from './RecordPaymentModal';

interface Props {
  companyId: string;
  plans: PlatformOverview['plans'];
  onClose: () => void;
  onChanged: () => void;
  onToast: Toast;
  onShowReceipt: (paymentId: string) => void;
  onCredential: (cred: { email: string; password: string }) => void;
  onSupportLogin: (companyId: string, companyName: string) => void;
}

export const CompanyDrawer: React.FC<Props> = ({ companyId, plans, onClose, onChanged, onToast, onShowReceipt, onCredential, onSupportLogin }) => {
  const [d, setD] = useState<PlatformCompanyDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const load = async () => {
    try {
      const data = await api.platformCompany(companyId);
      setD(data);
      setNotes(data.company.notes || '');
      setPhone(data.company.phone || '');
    } catch (err) {
      onToast('error', 'Could not load company', err instanceof Error ? err.message : '');
    }
  };
  useEffect(() => { load(); }, [companyId]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      onToast('success', d?.company.name || 'Company', msg);
      await load();
      onChanged();
    } catch (err) {
      onToast('error', 'Action failed', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const c = d?.company;
  const state = c ? companyState(c) : null;

  const changeStatus = (target: 'active' | 'trial' | 'suspended') => {
    if (!c || target === c.status) return;
    const paidStillValid = !!c.paidUntil && new Date(c.paidUntil).getTime() > Date.now();
    if (target === 'active') {
      if (c.status === 'suspended' && paidStillValid) {
        act(() => api.platformUpdateCompany(c.id, { status: 'active' }), 'Reactivated');
      } else {
        setShowPay(true); // becoming a paying customer always goes through a recorded payment
      }
      return;
    }
    if (target === 'trial') {
      if (c.status === 'active') {
        if (!window.confirm(`End the paid subscription of ${c.name} and move it back to the free trial plan?\n\nRecorded payments stay in the payments list. To also remove a wrong payment, use "Cancel" on that payment.`)) return;
        act(() => api.platformUpdateCompany(c.id, { endSubscription: true }), 'Moved back to free trial');
      } else {
        act(() => api.platformUpdateCompany(c.id, { status: 'trial' }), 'Moved to free trial');
      }
      return;
    }
    if (window.confirm(`Suspend ${c.name}? Everyone in this company will be signed out until you reactivate it.`)) {
      act(() => api.platformUpdateCompany(c.id, { status: 'suspended' }), 'Suspended');
    }
  };

  const latestPaymentId = d?.payments.reduce<{ id: string; n: number } | null>((m, p) => (!m || p.receiptNo > m.n ? { id: p.id, n: p.receiptNo } : m), null)?.id;
  const wa = c ? whatsappLink(c.phone, `Assalamu alaikum, Attendra থেকে বলছি — ${c.name}-এর ব্যাপারে।`) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto sm:rounded-l-[32px]" style={{ fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{c?.name || 'Loading…'}</h2>
            {c && (
              <p className="text-xs text-slate-500">
                code <span className="font-mono">{c.slug}</span> · joined {fmtDate(c.createdAt)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        {c && state && (
          <div className={`p-5 space-y-5 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
            <section className="rounded-[22px] bg-[#f7f8ff] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Account status</h3>
                <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${state.cls}`}>{state.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-full" role="radiogroup" aria-label="Account status">
                {([
                  { key: 'active', label: 'Active (paid)' },
                  { key: 'trial', label: 'Free trial' },
                  { key: 'suspended', label: 'Suspended' },
                ] as const).map((o) => {
                  const current = c.status === 'cancelled' ? 'suspended' : c.status;
                  const selected = current === o.key;
                  return (
                    <button
                      key={o.key}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => changeStatus(o.key)}
                      className={`py-2 rounded-full text-xs font-semibold transition cursor-pointer ${selected ? (o.key === 'active' ? 'bg-emerald-500 text-white' : o.key === 'trial' ? 'bg-amber-400 text-white' : 'bg-slate-700 text-white') : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                {c.status === 'active' && 'Paying customer. Switching to "Free trial" ends the paid subscription (use this if it was activated by mistake).'}
                {c.status === 'trial' && 'On the free plan. To make it Active, record the payment you received.'}
                {(c.status === 'suspended' || c.status === 'cancelled') && 'Nobody in this company can sign in. Their data is kept safe.'}
              </p>
            </section>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold">
                {c.planName} · {c.employeeCount}/{c.maxEmployees} employees
              </span>
              {c.paidUntil && <span className="text-xs text-slate-500">paid until {fmtDate(c.paidUntil)}</span>}
              {c.status === 'trial' && <span className="text-xs text-slate-500">trial ends {fmtDate(c.trialEndsAt)}</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => setShowPay(true)} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">
                <Wallet className="w-4 h-4" /> Record payment
              </button>
              <button onClick={() => act(() => api.platformUpdateCompany(c.id, { extendTrialDays: 7, ...(c.status !== 'trial' ? { status: 'trial' } : {}) }), 'Trial extended by 7 days')} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-amber-500 text-white text-xs font-bold cursor-pointer">
                <Clock className="w-4 h-4" /> +7 days trial
              </button>
              <button onClick={() => onSupportLogin(c.id, c.name)} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-[#5b5ef4] text-white text-xs font-bold cursor-pointer">
                <Eye className="w-4 h-4" /> Open as support
              </button>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-green-500 text-white text-xs font-bold">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              ) : (
                <span className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold" title="Add a phone number below">
                  <MessageCircle className="w-4 h-4" /> No phone
                </span>
              )}
            </div>

            <section className="rounded-[22px] bg-[#f7f8ff] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Contact &amp; notes</h3>
              <div className="text-xs text-slate-600">
                Owner: <strong>{c.owner?.name || '—'}</strong> {c.owner?.email && <span className="font-mono">· {c.owner.email}</span>}
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700">Your private notes</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="e.g. Call on Friday about renewal. Wants 20% discount for yearly." className="mt-1 w-full px-3 py-2 text-sm bg-amber-50/60 border border-amber-200 rounded-xl" />
              </label>
              <div className="flex justify-end">
                <button
                  onClick={() => act(() => api.platformUpdateCompany(c.id, { notes, phone }), 'Saved')}
                  disabled={notes === (c.notes || '') && phone === (c.phone || '')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2">
              {[
                { icon: Users, label: 'Logins', value: c.userCount },
                { icon: CalendarCheck, label: 'Check-ins (30d)', value: d!.usage.attendance_30d },
                { icon: PlayCircle, label: 'Active days (30d)', value: d!.usage.active_days_30d },
              ].map((s) => (
                <div key={s.label} className="rounded-[20px] bg-[#f7f8ff] p-3">
                  <s.icon className="w-4 h-4 text-[#5b5ef4] mb-1" />
                  <p className="text-lg font-semibold text-slate-900">{s.value}</p>
                  <p className="text-[11px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[22px] bg-[#f7f8ff]">
              <h3 className="text-sm font-semibold text-slate-900 px-4 pt-4 pb-2">Payments · total {taka(c.totalPaid || 0)}</h3>
              {d!.payments.length === 0 ? (
                <p className="px-4 pb-4 text-xs text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {d!.payments.map((p) => (
                    <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{taka(p.amountBdt)} <span className="font-normal text-slate-500">· {METHOD_LABEL[p.method] || p.method}{p.trxId ? ` · ${p.trxId}` : ''}</span></p>
                        <p className="text-[11px] text-slate-500">{fmtDate(p.paidAt)} · {p.planName} × {p.months}m → until {fmtDate(p.periodTo)}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => onShowReceipt(p.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[11px] font-semibold text-slate-700 cursor-pointer">
                          <Receipt className="w-3 h-3" /> Receipt
                        </button>
                        {p.id === latestPaymentId && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Cancel this payment of ${taka(p.amountBdt)}?\n\nThe subscription goes back to what it was before this payment.`)) return;
                              act(() => api.platformCancelPayment(p.id), 'Payment cancelled');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-[11px] font-semibold text-rose-600 cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3" /> Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[22px] bg-[#f7f8ff]">
              <h3 className="text-sm font-semibold text-slate-900 px-4 pt-4 pb-2">People with logins</h3>
              <ul className="divide-y divide-slate-100">
                {d!.users.map((u) => (
                  <li key={u.id} className="px-4 py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{u.name} <span className="font-normal text-slate-500">· {u.role.replace('_', ' ')}{u.status !== 'active' ? ' · inactive' : ''}</span></p>
                      <p className="text-slate-500 font-mono">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500 hidden sm:inline">{u.lastLoginAt ? `last login ${fmtDate(u.lastLoginAt)}` : 'never logged in'}</span>
                      <button
                        role="switch"
                        aria-checked={u.status === 'active'}
                        aria-label={`${u.status === 'active' ? 'Deactivate' : 'Activate'} ${u.name}`}
                        onClick={() => {
                          const next = u.status === 'active' ? 'inactive' : 'active';
                          if (next === 'inactive' && !window.confirm(`Turn off ${u.name}'s login? They will be signed out immediately.`)) return;
                          act(() => api.platformSetUserStatus(u.id, next), next === 'inactive' ? `${u.name} can no longer sign in` : `${u.name} can sign in again`);
                        }}
                        className={`relative w-10 h-6 rounded-full transition cursor-pointer ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${u.status === 'active' ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[22px] bg-[#f7f8ff] p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">More actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!window.confirm(`Send a new temporary password to the owner of ${c.name}?`)) return;
                    setBusy(true);
                    try {
                      const r = await api.platformResetOwner(c.id);
                      if (r.temporaryPassword) onCredential({ email: r.data.email, password: r.temporaryPassword });
                      else onToast('success', 'Password sent', `Emailed to ${r.data.email}.`);
                    } catch (err) {
                      onToast('error', 'Could not reset', err instanceof Error ? err.message : '');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Reset owner password
                </button>
                <select
                  value={c.plan}
                  onChange={(e) => act(() => api.platformUpdateCompany(c.id, { plan: e.target.value }), `Plan changed to ${plans[e.target.value]?.name}`)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  title="Change plan without recording a payment"
                >
                  {Object.entries(plans).map(([k, p]) => <option key={k} value={k}>Plan: {p.name}</option>)}
                </select>
              </div>
            </section>
          </div>
        )}
      </aside>

      {showPay && c && (
        <div onClick={(e) => e.stopPropagation()}>
          <RecordPaymentModal
            company={c}
            plans={plans}
            onClose={() => setShowPay(false)}
            onError={(m) => onToast('error', 'Payment not saved', m)}
            onSaved={async (p) => {
              setShowPay(false);
              onToast('success', 'Payment recorded', `${taka(p.amountBdt)} — active until ${fmtDate(p.periodTo)}`);
              await load();
              onChanged();
              onShowReceipt(p.id);
            }}
          />
        </div>
      )}
    </div>
  );
};
