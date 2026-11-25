import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2, Users, Clock, AlertTriangle, Ban, Wallet, Plus, LogOut, RefreshCw, Search, KeyRound, X, Copy,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { api, PlatformOverview, PlatformCompany } from '../../services/api';

interface Props {
  currentUser: UserAccount;
  onLogout: () => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000) : null);
const taka = (n: number) => `৳${n.toLocaleString('en-IN')}`;

const statusBadge = (c: PlatformCompany) => {
  const left = daysLeft(c.trialEndsAt);
  if (c.status === 'trial' && left !== null && left <= 0) return { label: 'Trial ended', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (c.status === 'trial') return { label: `Trial · ${left}d left`, cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (c.status === 'active') {
    const paidLeft = daysLeft(c.paidUntil);
    if (paidLeft !== null && paidLeft < 0) return { label: 'Payment overdue', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
    return { label: 'Active', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }
  if (c.status === 'suspended') return { label: 'Suspended', cls: 'bg-slate-200 text-slate-700 border-slate-300' };
  return { label: c.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
};

export const PlatformAdminView: React.FC<Props> = ({ currentUser, onLogout, onToast }) => {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'suspended'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.platformOverview());
    } catch (err) {
      onToast('error', 'Could not load companies', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const companies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.companies || []).filter((c) => {
      const left = daysLeft(c.trialEndsAt);
      if (filter === 'trial' && !(c.status === 'trial' && (left ?? 1) > 0)) return false;
      if (filter === 'expired' && !(c.status === 'trial' && (left ?? 1) <= 0)) return false;
      if (filter === 'active' && c.status !== 'active') return false;
      if (filter === 'suspended' && c.status !== 'suspended') return false;
      if (!q) return true;
      return [c.name, c.slug, c.owner?.email, c.owner?.name, c.phone].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [data, search, filter]);

  const update = async (c: PlatformCompany, change: Parameters<typeof api.platformUpdateCompany>[1], msg: string) => {
    setBusyId(c.id);
    try {
      await api.platformUpdateCompany(c.id, change);
      onToast('success', c.name, msg);
      await load();
    } catch (err) {
      onToast('error', 'Update failed', err instanceof Error ? err.message : '');
    } finally {
      setBusyId(null);
    }
  };

  const resetOwner = async (c: PlatformCompany) => {
    if (!window.confirm(`Send a new temporary password to the owner of ${c.name}${c.owner ? ` (${c.owner.email})` : ''}?`)) return;
    setBusyId(c.id);
    try {
      const r = await api.platformResetOwner(c.id);
      if (r.temporaryPassword) setCredential({ email: r.data.email, password: r.temporaryPassword });
      else onToast('success', 'Password sent', `A new temporary password was emailed to ${r.data.email}.`);
    } catch (err) {
      onToast('error', 'Could not reset', err instanceof Error ? err.message : '');
    } finally {
      setBusyId(null);
    }
  };

  const s = data?.stats;
  const cards = [
    { label: 'Companies', value: s?.totalCompanies ?? '—', icon: Building2, cls: 'from-blue-500 to-indigo-600' },
    { label: 'Paying', value: s?.activePaid ?? '—', icon: Wallet, cls: 'from-emerald-500 to-teal-600' },
    { label: 'On trial', value: s?.onTrial ?? '—', icon: Clock, cls: 'from-amber-400 to-orange-500' },
    { label: 'Trial ended', value: s?.trialExpired ?? '—', icon: AlertTriangle, cls: 'from-rose-500 to-pink-600' },
    { label: 'Employees (all)', value: s?.totalEmployees ?? '—', icon: Users, cls: 'from-violet-500 to-fuchsia-600' },
    { label: 'Monthly revenue', value: s ? taka(s.monthlyRevenueBdt) : '—', icon: Wallet, cls: 'from-sky-500 to-cyan-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-fuchsia-50/40">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-fuchsia-600 text-white flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900">Attendra · Owner Panel</h1>
              <p className="text-[11px] text-slate-500">{currentUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white text-xs font-extrabold cursor-pointer">
              <Plus className="w-4 h-4" /> New company
            </button>
            <button onClick={onLogout} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${c.cls} text-white flex items-center justify-center mb-2`}>
                <c.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-slate-900">{c.value}</p>
              <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, owner, email, phone…" className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-1 text-xs font-bold overflow-x-auto">
              {(['all', 'trial', 'expired', 'active', 'suspended'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap cursor-pointer ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {f === 'expired' ? 'Trial ended' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2.5">Company</th>
                  <th className="text-left px-4 py-2.5">Owner</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-left px-4 py-2.5">Employees</th>
                  <th className="text-left px-4 py-2.5">Last active</th>
                  <th className="text-right px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => {
                  const badge = statusBadge(c);
                  const busy = busyId === c.id;
                  return (
                    <tr key={c.id} className={busy ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-500">code: <span className="font-mono">{c.slug}</span> · since {fmtDate(c.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800">{c.owner?.name || '—'}</p>
                        <p className="text-[11px] text-slate-500">{c.owner?.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                        {c.status === 'active' && c.paidUntil && <p className="text-[11px] text-slate-500 mt-1">paid until {fmtDate(c.paidUntil)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={c.plan}
                          disabled={busy}
                          onChange={(e) => update(c, { plan: e.target.value }, `Plan changed to ${data?.plans[e.target.value]?.name}`)}
                          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                        >
                          {(Object.entries(data?.plans || {}) as [string, PlatformOverview['plans'][string]][]).map(([k, p]) => (
                            <option key={k} value={k}>{p.name} ({p.maxEmployees})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{c.employeeCount} / {c.maxEmployees}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.lastActiveAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button disabled={busy} onClick={() => update(c, { status: 'active', extendPaidDays: 30 }, 'Activated / extended by 30 days')} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer">
                            +30 days paid
                          </button>
                          {c.status === 'trial' && (
                            <button disabled={busy} onClick={() => update(c, { extendTrialDays: 7 }, 'Trial extended by 7 days')} className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold cursor-pointer">
                              +7 trial
                            </button>
                          )}
                          {c.status !== 'suspended' ? (
                            <button
                              disabled={busy}
                              onClick={() => window.confirm(`Suspend ${c.name}? Everyone in this company will be signed out.`) && update(c, { status: 'suspended' }, 'Suspended')}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" /> Suspend
                            </button>
                          ) : (
                            <button disabled={busy} onClick={() => update(c, { status: 'active' }, 'Reactivated')} className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer">
                              Reactivate
                            </button>
                          )}
                          <button disabled={busy} onClick={() => resetOwner(c)} className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer" title="Send the owner a new temporary password">
                            <KeyRound className="w-3 h-3" /> Owner login
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!companies.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      {loading ? 'Loading…' : 'No companies match.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showCreate && data && (
        <CreateCompanyModal
          plans={data.plans}
          onClose={() => setShowCreate(false)}
          onCreated={async (cred, name) => {
            setShowCreate(false);
            if (cred) setCredential(cred);
            else onToast('success', 'Company created', `${name} is ready. Login details were emailed to the owner.`);
            await load();
          }}
          onError={(m) => onToast('error', 'Could not create company', m)}
        />
      )}

      {credential && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h2 className="font-extrabold text-slate-900">Share these login details</h2>
            <p className="text-xs text-slate-500">The email could not be sent, so give these to the company owner yourself. They will be asked to change the password on first sign-in.</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm space-y-1 font-mono">
              <p>{credential.email}</p>
              <p className="font-bold">{credential.password}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard?.writeText(`${credential.email}\n${credential.password}`); onToast('info', 'Copied', 'Login details copied.'); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button onClick={() => setCredential(null)} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateCompanyModal: React.FC<{
  plans: PlatformOverview['plans'];
  onClose: () => void;
  onCreated: (cred: { email: string; password: string } | null, name: string) => void;
  onError: (msg: string) => void;
}> = ({ plans, onClose, onCreated, onError }) => {
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('trial');
  const [busy, setBusy] = useState(false);
  const input = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.platformCreateCompany({ companyName, ownerName, ownerEmail, phone, plan });
      onCreated(r.temporaryPassword ? { email: ownerEmail.trim().toLowerCase(), password: r.temporaryPassword } : null, companyName);
    } catch (err) {
      onError(err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900">New company</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <input className={input} placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        <input className={input} placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        <input className={input} type="email" placeholder="Owner email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
        <input className={input} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className={input} value={plan} onChange={(e) => setPlan(e.target.value)}>
          {(Object.entries(plans) as [string, PlatformOverview['plans'][string]][]).map(([k, p]) => (
            <option key={k} value={k}>{p.name} — up to {p.maxEmployees} employees{p.priceBdt ? ` — ${taka(p.priceBdt)}/month` : ''}</option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500">A temporary password is emailed to the owner. Paid plans start with 30 days.</p>
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white text-sm font-extrabold disabled:opacity-60 cursor-pointer">
          {busy ? 'Creating…' : 'Create company'}
        </button>
      </form>
    </div>
  );
};
