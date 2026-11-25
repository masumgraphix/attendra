import React, { useEffect, useState } from 'react';
import { Clock, Plus, LogOut, RefreshCw, X, Copy, LayoutDashboard, Building2, Wallet, Tags, Megaphone } from 'lucide-react';
import { UserAccount } from '../../types';
import { api, PlatformOverview } from '../../services/api';
import { taka, Toast } from './shared';
import { DashboardTab } from './DashboardTab';
import { CompaniesTab, PaymentsTab, PlansTab, BroadcastTab } from './PlatformTabs';
import { CompanyDrawer } from './CompanyDrawer';
import { ReceiptView } from './ReceiptView';

interface Props {
  currentUser: UserAccount;
  onLogout: () => void;
  onToast: Toast;
  onSupportLogin: (companyId: string, companyName: string) => void;
}

type Tab = 'dashboard' | 'companies' | 'payments' | 'plans' | 'broadcast';

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'plans', label: 'Plans & prices', icon: Tags },
  { id: 'broadcast', label: 'Announcement', icon: Megaphone },
];

export const PlatformAdminView: React.FC<Props> = ({ currentUser, onLogout, onToast, onSupportLogin }) => {
  const [data, setData] = useState<PlatformOverview | null>(null);
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
      setData(await api.platformOverview());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      onToast('error', 'Could not load data', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-fuchsia-50/40">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900">Attendra · Owner Panel</h1>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white text-xs font-extrabold cursor-pointer">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New company</span>
            </button>
            <button onClick={onLogout} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer ${tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!data ? (
          <p className="text-sm text-slate-500 py-20 text-center">{loading ? 'Loading…' : 'Could not load data.'}</p>
        ) : (
          <>
            {tab === 'dashboard' && <DashboardTab data={data} onOpenCompany={setOpenCompanyId} />}
            {tab === 'companies' && <CompaniesTab data={data} onOpen={setOpenCompanyId} />}
            {tab === 'payments' && <PaymentsTab onReceipt={setReceiptId} onOpenCompany={setOpenCompanyId} onToast={onToast} refreshKey={refreshKey} />}
            {tab === 'plans' && <PlansTab key={refreshKey} data={data} onSaved={load} onToast={onToast} />}
            {tab === 'broadcast' && <BroadcastTab onToast={onToast} />}
          </>
        )}
      </main>

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
        <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-4">
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
