import React, { useMemo, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { api, Payment, PlatformCompany, PlatformOverview } from '../../services/api';
import { taka, fmtDate, METHOD_LABEL } from './shared';

interface Props {
  company: PlatformCompany;
  plans: PlatformOverview['plans'];
  onClose: () => void;
  onSaved: (payment: Payment) => void;
  onError: (msg: string) => void;
  /** Activate the plan without recording money (free / demo / complimentary). */
  onActivateFree?: (plan: string, months: number) => void;
}

export const RecordPaymentModal: React.FC<Props> = ({ company, plans, onClose, onSaved, onError, onActivateFree }) => {
  const paidPlans = Object.entries(plans).filter(([k]) => k !== 'trial');
  const [plan, setPlan] = useState(company.plan !== 'trial' && plans[company.plan] ? company.plan : paidPlans[0]?.[0] || '');
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState<string>(String((plans[plan]?.priceBdt || 0) * 1));
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const expected = (plans[plan]?.priceBdt || 0) * months;
  const shownAmount = amountTouched ? amount : String(expected);

  const newEnd = useMemo(() => {
    const start = company.paidUntil && new Date(company.paidUntil).getTime() > Date.now() ? new Date(company.paidUntil) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return end.toISOString();
  }, [company.paidUntil, months]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.platformRecordPayment(company.id, {
        plan, months, amountBdt: Number(shownAmount), method, trxId: trxId.trim() || undefined, note: note.trim() || undefined,
        paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
      });
      onSaved(r.payment);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-600" /> Record payment</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500">{company.name}</p>

        <label className="block">
          <span className="text-xs font-bold text-slate-700">Plan</span>
          <select className={`${input} mt-1`} value={plan} onChange={(e) => setPlan(e.target.value)}>
            {paidPlans.map(([k, p]) => (
              <option key={k} value={k}>{p.name} — up to {p.maxEmployees} employees — {taka(p.priceBdt)}/month</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Months</span>
            <select className={`${input} mt-1`} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Amount received (৳)</span>
            <input className={`${input} mt-1`} type="number" min={0} value={shownAmount} onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }} required />
          </label>
        </div>
        {Number(shownAmount) !== expected && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">List price is {taka(expected)}. Recording {taka(Number(shownAmount) || 0)} (discount or partial payment).</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Method</span>
            <select className={`${input} mt-1`} value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Payment date</span>
            <input className={`${input} mt-1`} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700">Transaction ID {method !== 'cash' && <span className="text-slate-400 font-normal">(recommended)</span>}</span>
          <input className={`${input} mt-1 font-mono`} value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9KF3LMQ2XA" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Note (optional)</span>
          <input className={`${input} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
          Subscription will be active until <strong>{fmtDate(newEnd)}</strong>.
        </div>

        <button type="submit" disabled={busy || !plan} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold disabled:opacity-60 cursor-pointer">
          {busy ? 'Saving…' : `Save payment of ${taka(Number(shownAmount) || 0)}`}
        </button>
        {onActivateFree && (
          <button
            type="button"
            disabled={busy || !plan}
            onClick={() => {
              if (window.confirm(`Activate ${company.name} on the ${plans[plan]?.name} plan for ${months} month${months > 1 ? 's' : ''} without recording any payment?`)) onActivateFree(plan, months);
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            Activate without payment (free)
          </button>
        )}
      </form>
    </div>
  );
};
