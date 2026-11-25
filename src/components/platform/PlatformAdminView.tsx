import React, { useEffect, useState } from 'react';
import {
  Clock, Plus, LogOut, RefreshCw, X, Copy, LayoutDashboard, Building2, Wallet, Tags, Megaphone, Bell,
} from 'lucide-react';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { UserAccount } from '../../types';
import { api, Payment, PlatformOverview } from '../../services/api';
import { fmtDate, taka, METHOD_LABEL, Toast } from './shared';
import { DashboardTab } from './DashboardTab';
import { CompaniesTab, PaymentsTab, PlansTab, BroadcastTab } from './PlatformTabs';
import { CompanyDrawer } from './CompanyDrawer';
import { ReceiptView } from './ReceiptView';
import { initialsAvatar } from '../../utils/avatar';

interface Props {
  currentUser: UserAccount;
  onLogout: () => void;
  onToast: Toast;
  onSupportLogin: (companyId: string, companyName: string) => void;
}

export type Tab = 'dashboard' | 'companies' | 'payments' | 'plans' | 'broadcast';

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'plans', label: 'Plans & prices', icon: Tags },
  { id: 'broadcast', label: 'Announcement', icon: Megaphone },
];

const ACCENT = '#5b5ef4';

export const PlatformAdminView: React.FC<Props> = ({ currentUser, onLogout, onToast, onSupportLogin }) => {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, pays] = await Promise.all([api.platformOverview(), api.platformPayments()]);
      setData(ov);
      setPayments(pays);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      onToast('error', 'Could not load data', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const firstName = currentUser.name === 'Platform Owner' ? 'Owner' : currentUser.name.split(' ')[0];
  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateRest = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const signupSeries = (data?.monthly || []).slice(-6).map((m) => ({
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' }),
    signups: m.signups,
  }));
  const thisMonthSignups = signupSeries[signupSeries.length - 1]?.signups ?? 0;
  const pendingCalls = (data?.companies || []).filter((c) => {
    const end = c.status === 'trial' ? c.trialEndsAt : c.paidUntil;
    if (!end || c.status === 'suspended' || c.status === 'cancelled') return false;
    const left = (new Date(end).getTime() - Date.now()) / 86400_000;
    return left <= 7 && left >= -14;
  }).length;

  return (
    <div className="min-h-screen bg-[#e8eafd] p-2 sm:p-5 lg:p-8" style={{ fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif' }}>
      <div className="max-w-[1500px] mx-auto bg-[#f5f6ff] rounded-[32px] p-2.5 sm:p-4 flex gap-4 shadow-[0_30px_80px_-20px_rgba(91,94,244,0.25)] min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="hidden md:flex w-[84px] lg:w-[220px] shrink-0 rounded-[26px] flex-col py-6 px-3 text-white" style={{ background: `linear-gradient(180deg, ${ACCENT} 0%, #6d70f6 100%)` }}>
          <div className="flex items-center gap-2.5 px-2 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="hidden lg:block leading-tight">
              <p className="font-bold text-base">Attendra</p>
              <p className="text-[11px] text-white/70">Owner panel</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.label}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition cursor-pointer ${tab === t.id ? 'bg-white text-[#5b5ef4] shadow-lg shadow-indigo-900/10' : 'text-white/80 hover:bg-white/10'}`}
              >
                <t.icon className="w-5 h-5 shrink-0 mx-auto lg:mx-0" />
                <span className="hidden lg:inline">{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto">
            <button onClick={onLogout} title="Sign out" className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-white/80 hover:bg-white/10 cursor-pointer">
              <LogOut className="w-5 h-5 shrink-0 mx-auto lg:mx-0" />
              <span className="hidden lg:inline">Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-1 sm:px-2 py-2">
          <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{TABS.find((t) => t.id === tab)?.label}</h1>
              <p className="text-xs text-slate-500"><span className="font-semibold text-[#5b5ef4]">{weekday},</span> {dateRest}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="w-10 h-10 rounded-full bg-white text-slate-500 hover:text-[#5b5ef4] flex items-center justify-center shadow-sm cursor-pointer" aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 h-10 rounded-full text-white text-sm font-medium shadow-lg shadow-indigo-500/30 cursor-pointer" style={{ background: ACCENT }}>
                <Plus className="w-4 h-4" /> New company
              </button>
              <button onClick={onLogout} className="md:hidden w-10 h-10 rounded-full bg-white text-slate-500 flex items-center justify-center shadow-sm cursor-pointer" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Mobile tabs */}
          <nav className="md:hidden flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${tab === t.id ? 'text-white' : 'bg-white text-slate-600'}`} style={tab === t.id ? { background: ACCENT } : undefined}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </nav>

          {!data ? (
            <p className="text-sm text-slate-500 py-20 text-center">{loading ? 'Loading…' : 'Could not load data.'}</p>
          ) : (
            <>
              {tab === 'dashboard' && <DashboardTab data={data} ownerName={firstName} onOpenCompany={setOpenCompanyId} onGoTo={setTab} />}
              {tab === 'companies' && <CompaniesTab data={data} onOpen={setOpenCompanyId} />}
              {tab === 'payments' && <PaymentsTab payments={payments} onReceipt={setReceiptId} onOpenCompany={setOpenCompanyId} />}
              {tab === 'plans' && <PlansTab key={refreshKey} data={data} onSaved={load} onToast={onToast} />}
              {tab === 'broadcast' && <BroadcastTab onToast={onToast} />}
            </>
          )}
        </main>

        {/* Right column */}
        <aside className="hidden xl:flex w-[300px] shrink-0 bg-white rounded-[26px] p-6 flex-col gap-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">My profile</h2>
            <button onClick={() => setTab('dashboard')} className="relative text-slate-400 hover:text-[#5b5ef4] cursor-pointer" aria-label={`${pendingCalls} companies to follow up`}>
              <Bell className="w-5 h-5" />
              {pendingCalls > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{pendingCalls}</span>}
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 112 112" className="absolute inset-0" aria-hidden="true">
                <circle cx="56" cy="56" r="52" fill="none" stroke="#eceefe" strokeWidth="4" />
                <circle cx="56" cy="56" r="52" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeDasharray="230 400" transform="rotate(-90 56 56)" />
                <circle cx="8" cy="40" r="3" fill="#ff6b8b" /><circle cx="104" cy="30" r="3" fill="#38c6d9" /><circle cx="100" cy="92" r="3" fill={ACCENT} />
              </svg>
              <img src={initialsAvatar(firstName)} alt="" className="absolute inset-3 w-[88px] h-[88px] rounded-full" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">{firstName}</p>
            <p className="text-xs text-slate-500 truncate max-w-full">{currentUser.email}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Recent payments</h3>
              <button onClick={() => setTab('payments')} className="text-xs font-medium text-[#5b5ef4] cursor-pointer">View all</button>
            </div>
            {(payments || []).slice(0, 4).map((p) => (
              <button key={p.id} onClick={() => setReceiptId(p.id)} className="w-full flex items-center gap-3 py-2.5 text-left cursor-pointer group">
                <img src={initialsAvatar(p.companyName)} alt="" className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-[#5b5ef4]">{p.companyName}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(p.paidAt)} · {METHOD_LABEL[p.method] || p.method}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">+{taka(p.amountBdt)}</span>
              </button>
            ))}
            {payments && !payments.length && <p className="text-xs text-slate-500">No payments yet.</p>}
          </div>

          <div className="mt-auto rounded-[24px] p-5 text-white" style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, #7c7ff7 100%)` }}>
            <p className="text-sm font-medium text-white/80">New companies</p>
            <p className="text-2xl font-semibold">{thisMonthSignups} <span className="text-xs font-normal text-white/70">this month</span></p>
            <div className="h-24 -mx-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupSeries} margin={{ top: 8, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.75)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [v, 'Signups']} />
                  <Line type="monotone" dataKey="signups" stroke="#ffffff" strokeWidth={2} dot={{ r: 4, fill: '#ff6b8b', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>
      </div>

      {openCompanyId && data && (
        <CompanyDrawer
          companyId={openCompanyId}
          plans={data.plans}
          onClose={() => setOpenCompanyId(null)}
          onChanged={load}
          onToast={onToast}
          onShowReceipt={setReceiptId}
          onCredential={setCredential}
          onSupportLogin={onSupportLogin}
        />
      )}

      {receiptId && <ReceiptView paymentId={receiptId} onClose={() => setReceiptId(null)} />}

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
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full space-y-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <h2 className="font-semibold text-slate-900">Share these login details</h2>
            <p className="text-xs text-slate-500">The email could not be sent, so give these to the company owner yourself. They will be asked to change the password on first sign-in.</p>
            <div className="bg-[#f0f1ff] rounded-2xl p-4 text-sm space-y-1 font-mono">
              <p>{credential.email}</p>
              <p className="font-bold">{credential.password}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard?.writeText(`${credential.email}\n${credential.password}`); onToast('info', 'Copied', 'Login details copied.'); }}
                className="flex-1 py-2.5 rounded-full bg-[#f0f1ff] text-[#5b5ef4] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button onClick={() => setCredential(null)} className="flex-1 py-2.5 rounded-full text-white text-xs font-semibold cursor-pointer" style={{ background: ACCENT }}>Done</button>
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
  const input = 'w-full px-4 py-2.5 text-sm bg-[#f5f6ff] rounded-2xl border border-transparent focus:outline-none focus:border-[#5b5ef4] focus:bg-white';

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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-[28px] p-6 max-w-md w-full space-y-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-900">New company</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
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
        <p className="text-[11px] text-slate-500">A temporary password is emailed to the owner. Paid plans start with one month — record the payment from the company page.</p>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-full text-white text-sm font-semibold disabled:opacity-60 shadow-lg shadow-indigo-500/30 cursor-pointer" style={{ background: ACCENT }}>
          {busy ? 'Creating…' : 'Create company'}
        </button>
      </form>
    </div>
  );
};
