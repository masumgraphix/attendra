import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Receipt, Plus, Trash2, Save, Megaphone } from 'lucide-react';
import { api, Payment, PlatformOverview, Broadcast } from '../../services/api';
import { companyState, downloadCsv, fmtDate, taka, METHOD_LABEL, Toast } from './shared';

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

type Filter = 'all' | 'trial' | 'trial_ended' | 'active' | 'attention' | 'suspended';

export const CompaniesTab: React.FC<{ data: PlatformOverview; onOpen: (id: string) => void }> = ({ data, onOpen }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.companies.filter((c) => {
      const st = companyState(c).key;
      if (filter === 'trial' && !(st === 'trial' || st === 'trial_ending')) return false;
      if (filter === 'trial_ended' && st !== 'trial_ended') return false;
      if (filter === 'active' && !(st === 'active' || st === 'renewal_due')) return false;
      if (filter === 'attention' && !['trial_ending', 'trial_ended', 'renewal_due', 'overdue'].includes(st)) return false;
      if (filter === 'suspended' && st !== 'suspended') return false;
      if (!q) return true;
      return [c.name, c.slug, c.owner?.email, c.owner?.name, c.phone].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [data, search, filter]);

  const exportCsv = () =>
    downloadCsv(`attendra-companies-${new Date().toISOString().split('T')[0]}.csv`, rows.map((c) => ({
      Company: c.name, Code: c.slug, Status: companyState(c).label, Plan: c.planName, 'Price (BDT/month)': c.priceBdt,
      Employees: c.employeeCount, 'Employee limit': c.maxEmployees, Owner: c.owner?.name || '', 'Owner email': c.owner?.email || '',
      Phone: c.phone || '', 'Trial ends': c.trialEndsAt ? fmtDate(c.trialEndsAt) : '', 'Paid until': c.paidUntil ? fmtDate(c.paidUntil) : '',
      'Total paid (BDT)': c.totalPaid, 'Last active': c.lastActiveAt ? fmtDate(c.lastActiveAt) : '', Joined: fmtDate(c.createdAt), Notes: c.notes,
    })));

  const FILTERS: [Filter, string][] = [['all', 'All'], ['attention', 'Needs attention'], ['trial', 'On trial'], ['trial_ended', 'Trial ended'], ['active', 'Paying'], ['suspended', 'Suspended']];

  return (
    <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,94,244,0.06)]">
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-[#f0f1fa]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, owner, email, phone…" className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f6ff] border border-transparent rounded-full focus:outline-none focus:border-[#5b5ef4] focus:bg-white" />
        </div>
        <div className="flex gap-1 text-xs font-semibold overflow-x-auto">
          {FILTERS.map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${filter === f ? 'bg-[#5b5ef4] text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#f0f1ff] text-[#5b5ef4] text-xs font-semibold disabled:opacity-40 cursor-pointer">
          <Download className="w-3.5 h-3.5" /> Excel / CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400 bg-[#f7f8ff]">
            <tr>
              <th className="text-left px-4 py-2.5">Company</th>
              <th className="text-left px-4 py-2.5">Owner</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Plan</th>
              <th className="text-right px-4 py-2.5">Employees</th>
              <th className="text-right px-4 py-2.5">Total paid</th>
              <th className="text-left px-4 py-2.5">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f1fa]">
            {rows.map((c) => {
              const st = companyState(c);
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} className="hover:bg-indigo-50/40 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">code <span className="font-mono">{c.slug}</span> · since {fmtDate(c.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-800">{c.owner?.name || '—'}</p>
                    <p className="text-[11px] text-slate-500">{c.owner?.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{c.planName}{c.priceBdt ? ` · ${taka(c.priceBdt)}` : ''}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 text-right">{c.employeeCount} / {c.maxEmployees}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 text-right">{taka(c.totalPaid || 0)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.lastActiveAt)}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No companies match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-100">Click a company to see details, record a payment, or open it as support.</p>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Payments ledger
// ---------------------------------------------------------------------------

export const PaymentsTab: React.FC<{ payments: Payment[] | null; onReceipt: (id: string) => void; onOpenCompany: (id: string) => void }> = ({ payments, onReceipt, onOpenCompany }) => {
  const [month, setMonth] = useState('all');

  const months = useMemo(() => Array.from(new Set((payments || []).map((p) => p.paidAt.slice(0, 7)))).sort().reverse(), [payments]);
  const rows = (payments || []).filter((p) => month === 'all' || p.paidAt.startsWith(month));
  const total = rows.reduce((s, p) => s + p.amountBdt, 0);

  const exportCsv = () =>
    downloadCsv(`attendra-payments-${month}.csv`, rows.map((p) => ({
      Receipt: String(p.receiptNo).padStart(5, '0'), Date: fmtDate(p.paidAt), Company: p.companyName, 'Amount (BDT)': p.amountBdt,
      Method: METHOD_LABEL[p.method] || p.method, 'Transaction ID': p.trxId || '', Plan: p.planName, Months: p.months,
      'Period from': fmtDate(p.periodFrom), 'Period to': fmtDate(p.periodTo), Note: p.note || '', 'Recorded by': p.recordedBy || '',
    })));

  return (
    <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,94,244,0.06)]">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f1fa]">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Payments</h3>
          <p className="text-xs text-slate-500">{rows.length} payment{rows.length === 1 ? '' : 's'} · total <strong className="text-slate-900">{taka(total)}</strong></p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <option value="all">All months</option>
            {months.map((m) => <option key={m} value={m}>{new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>)}
          </select>
          <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#f0f1ff] text-[#5b5ef4] text-xs font-semibold disabled:opacity-40 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Excel / CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400 bg-[#f7f8ff]">
            <tr>
              <th className="text-left px-4 py-2.5">Receipt</th>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Company</th>
              <th className="text-right px-4 py-2.5">Amount</th>
              <th className="text-left px-4 py-2.5">Method</th>
              <th className="text-left px-4 py-2.5">Plan</th>
              <th className="text-right px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f1fa]">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 font-mono text-xs">#{String(p.receiptNo).padStart(5, '0')}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{fmtDate(p.paidAt)}</td>
                <td className="px-4 py-2.5"><button onClick={() => onOpenCompany(p.companyId)} className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer">{p.companyName}</button></td>
                <td className="px-4 py-2.5 text-right font-semibold">{taka(p.amountBdt)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{METHOD_LABEL[p.method] || p.method}{p.trxId ? <span className="font-mono"> · {p.trxId}</span> : ''}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{p.planName} × {p.months}m</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => onReceipt(p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <Receipt className="w-3 h-3" /> Receipt
                  </button>
                </td>
              </tr>
            ))}
            {payments && !rows.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No payments yet. Open a company and press "Record payment" when they pay.</td></tr>
            )}
            {!payments && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Plans & prices
// ---------------------------------------------------------------------------

export const PlansTab: React.FC<{ data: PlatformOverview; onSaved: () => void; onToast: Toast }> = ({ data, onSaved, onToast }) => {
  const [rows, setRows] = useState(() => Object.entries(data.plans).map(([key, p]) => ({ key, ...p })));
  const [busy, setBusy] = useState(false);
  const inUse = useMemo(() => new Set(data.companies.map((c) => c.plan)), [data.companies]);

  const update = (i: number, field: 'name' | 'maxEmployees' | 'priceBdt' | 'key', value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: field === 'name' || field === 'key' ? value : Number(value) } : row)));

  const save = async () => {
    setBusy(true);
    try {
      const plans = Object.fromEntries(rows.map(({ key, ...p }) => [key.trim().toLowerCase(), p]));
      await api.platformSavePlans(plans);
      onToast('success', 'Plans saved', 'New prices apply to new payments. Existing companies keep their current plan.');
      onSaved();
    } catch (err) {
      onToast('error', 'Plans not saved', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg';

  return (
    <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,94,244,0.06)] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Plans &amp; prices</h3>
        <p className="text-xs text-slate-500">Monthly price in taka and the maximum number of active employees for each plan.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-2 py-2">Code</th>
              <th className="text-left px-2 py-2">Name</th>
              <th className="text-left px-2 py-2">Max employees</th>
              <th className="text-left px-2 py-2">Price / month (৳)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isNew = !(r.key in data.plans);
              return (
                <tr key={i}>
                  <td className="px-2 py-1.5 w-32"><input className={`${input} font-mono`} value={r.key} disabled={!isNew} onChange={(e) => update(i, 'key', e.target.value)} placeholder="e.g. pro" /></td>
                  <td className="px-2 py-1.5"><input className={input} value={r.name} onChange={(e) => update(i, 'name', e.target.value)} /></td>
                  <td className="px-2 py-1.5 w-36"><input className={input} type="number" min={1} value={r.maxEmployees} onChange={(e) => update(i, 'maxEmployees', e.target.value)} /></td>
                  <td className="px-2 py-1.5 w-40"><input className={input} type="number" min={0} value={r.priceBdt} disabled={r.key === 'trial'} onChange={(e) => update(i, 'priceBdt', e.target.value)} /></td>
                  <td className="px-2 py-1.5 w-10 text-right">
                    {r.key !== 'trial' && !inUse.has(r.key) && (
                      <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label={`Remove ${r.name}`}><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        <button onClick={() => setRows((r) => [...r, { key: '', name: '', maxEmployees: 50, priceBdt: 0 }])} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#f0f1ff] text-[#5b5ef4] text-xs font-semibold text-slate-700 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add plan
        </button>
        <button onClick={save} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5b5ef4] text-white text-xs font-semibold disabled:opacity-60 cursor-pointer">
          <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save plans'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">Plans that a company is using can't be removed. The Free Trial plan is always free.</p>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Broadcast banner
// ---------------------------------------------------------------------------

export const BroadcastTab: React.FC<{ onToast: Toast }> = ({ onToast }) => {
  const [current, setCurrent] = useState<Broadcast | null>(null);
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<Broadcast['level']>('info');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.platformGetBroadcast().then((b) => {
      setCurrent(b);
      if (b) { setMessage(b.message); setLevel(b.level); }
    }).catch(() => {});
  }, []);

  const save = async (active: boolean) => {
    setBusy(true);
    try {
      const b = await api.platformSaveBroadcast({ message: active ? message : '', level, active });
      setCurrent(b);
      if (!active) setMessage('');
      onToast('success', active ? 'Announcement is live' : 'Announcement removed', active ? 'Every company sees it at the top of their app.' : '');
    } catch (err) {
      onToast('error', 'Not saved', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const preview = { info: 'bg-blue-50 border-blue-200 text-blue-900', warning: 'bg-amber-50 border-amber-200 text-amber-900', success: 'bg-emerald-50 border-emerald-200 text-emerald-900' }[level];

  return (
    <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,94,244,0.06)] p-5 space-y-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Megaphone className="w-4 h-4 text-[#5b5ef4]" /> Announcement to all companies</h3>
        <p className="text-xs text-slate-500">Shown as a banner at the top of every company's app until you remove it.</p>
      </div>
      {current?.active && <p className="text-xs font-semibold text-emerald-700">● Live now (since {fmtDate(current.updatedAt)})</p>}
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} placeholder="e.g. আজ রাত ১২টা থেকে ১২:৩০ পর্যন্ত update চলবে।" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full" />
      <div className="flex gap-2 text-xs font-semibold">
        {(['info', 'warning', 'success'] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`px-3.5 py-1.5 rounded-full capitalize cursor-pointer ${level === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{l === 'info' ? 'Info' : l === 'warning' ? 'Warning' : 'Good news'}</button>
        ))}
      </div>
      {message.trim() && <div className={`px-4 py-2.5 rounded-full border text-sm font-semibold ${preview}`}>{message}</div>}
      <div className="flex gap-2">
        <button onClick={() => save(true)} disabled={busy || !message.trim()} className="px-4 py-2 rounded-full bg-[#5b5ef4] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">Publish to all companies</button>
        {current?.active && <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer">Remove announcement</button>}
      </div>
    </section>
  );
};
