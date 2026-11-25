import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, Wallet, Clock, AlertTriangle, Users, PhoneCall, MessageCircle, TrendingUp } from 'lucide-react';
import { PlatformOverview, PlatformCompany } from '../../services/api';
import { companyState, daysLeft, fmtDate, taka, whatsappLink } from './shared';

const BLUE = '#257de0';
const ORANGE = '#f47230';
const GRID = '#eef0f3';
const AXIS = '#666666';

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
};

const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-IN'));

interface Props {
  data: PlatformOverview;
  onOpenCompany: (id: string) => void;
}

export const DashboardTab: React.FC<Props> = ({ data, onOpenCompany }) => {
  const s = data.stats;
  const cards = [
    { label: 'Expected monthly revenue', value: taka(s.monthlyRevenueBdt), sub: `${s.activePaid} paying companies`, icon: TrendingUp, cls: 'from-sky-500 to-cyan-600' },
    { label: 'Collected this month', value: taka(s.collectedThisMonthBdt), sub: 'from recorded payments', icon: Wallet, cls: 'from-emerald-500 to-teal-600' },
    { label: 'Companies', value: s.totalCompanies, sub: `${s.suspended} suspended`, icon: Building2, cls: 'from-blue-500 to-indigo-600' },
    { label: 'On free trial', value: s.onTrial, sub: 'trial still running', icon: Clock, cls: 'from-amber-400 to-orange-500' },
    { label: 'Trial ended', value: s.trialExpired, sub: 'not paid yet', icon: AlertTriangle, cls: 'from-rose-500 to-pink-600' },
    { label: 'Employees (all)', value: s.totalEmployees, sub: 'across every company', icon: Users, cls: 'from-violet-500 to-fuchsia-600' },
  ];

  const chartData = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const hasRevenue = chartData.some((m) => m.revenue > 0);
  const hasSignups = chartData.some((m) => m.signups > 0 || m.conversions > 0);

  // Who to call this week: trials ending ≤7 days / ended in the last 14, renewals due ≤7 days / overdue.
  const callList = useMemo(() => {
    const rows: { c: PlatformCompany; reason: string; urgency: number }[] = [];
    for (const c of data.companies) {
      const st = companyState(c);
      if (c.status === 'trial') {
        const left = daysLeft(c.trialEndsAt);
        if (left === null) continue;
        if (left <= 0 && left >= -14) rows.push({ c, reason: `Trial ended ${-left === 0 ? 'today' : `${-left}d ago`} — offer a plan`, urgency: 0 });
        else if (left > 0 && left <= 7) rows.push({ c, reason: `Trial ends in ${left}d (${fmtDate(c.trialEndsAt)})`, urgency: 1 });
      } else if (st.key === 'overdue') {
        rows.push({ c, reason: `Payment overdue since ${fmtDate(c.paidUntil)}`, urgency: 0 });
      } else if (st.key === 'renewal_due') {
        rows.push({ c, reason: `Renewal due ${fmtDate(c.paidUntil)}`, urgency: 2 });
      }
    }
    return rows.sort((a, b) => a.urgency - b.urgency);
  }, [data.companies]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${c.cls} text-white flex items-center justify-center mb-2`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-700">{c.label}</p>
            <p className="text-[10px] text-slate-500">{c.sub}</p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><PhoneCall className="w-4 h-4 text-rose-500" /> Call this week</h3>
          <span className="text-xs text-slate-500">{callList.length} compan{callList.length === 1 ? 'y' : 'ies'}</span>
        </div>
        {callList.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nobody needs a call right now. 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {callList.map(({ c, reason, urgency }) => {
              const wa = whatsappLink(c.phone, `Assalamu alaikum! Attendra থেকে বলছি — ${c.name}-এর subscription নিয়ে কথা বলতে চাই।`);
              return (
                <li key={c.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button onClick={() => onOpenCompany(c.id)} className="text-left cursor-pointer">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${urgency === 0 ? 'bg-rose-500' : urgency === 1 ? 'bg-amber-500' : 'bg-sky-500'}`} aria-hidden />
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500">{reason} · {c.owner?.name || ''} {c.phone ? `· ${c.phone}` : ''}</p>
                  </button>
                  <div className="flex gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold">
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                    <button onClick={() => onOpenCompany(c.id)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Open</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-slate-900">Money collected per month</h3>
          <p className="text-xs text-slate-500 mb-3">From recorded payments, last 12 months</p>
          {hasRevenue ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip cursor={{ fill: '#f5f7fa' }} formatter={(v: number) => [taka(v), 'Collected']} />
                  <Bar dataKey="revenue" name="Collected" fill={BLUE} maxBarSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="h-56 flex items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-2xl">No payments recorded yet.</p>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-slate-900">New companies vs. first payments</h3>
          <p className="text-xs text-slate-500 mb-3">Signups each month, and companies that paid for the first time</p>
          {hasSignups ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip cursor={{ fill: '#f5f7fa' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: '#191919' }}>{value}</span>} />
                  <Bar dataKey="signups" name="New signups" fill={BLUE} maxBarSize={18} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" name="First payments" fill={ORANGE} maxBarSize={18} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="h-56 flex items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-2xl">No signups yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};
