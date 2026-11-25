import React, { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, Wallet, Clock, AlertTriangle, Users, PhoneCall, MessageCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { PlatformOverview, PlatformCompany } from '../../services/api';
import { companyState, daysLeft, fmtDate, taka, whatsappLink } from './shared';
import { WelcomeIllustration } from './Illustration';
import type { Tab } from './PlatformAdminView';

const ACCENT = '#5b5ef4';
const BLUE = '#257de0';
const ORANGE = '#f47230';
const GRID = '#eef0f6';
const AXIS = '#8a8fa3';
const CARD = 'bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,94,244,0.06)]';

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
};
const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-IN'));

interface Props {
  data: PlatformOverview;
  ownerName: string;
  onOpenCompany: (id: string) => void;
  onGoTo: (tab: Tab) => void;
}

export const DashboardTab: React.FC<Props> = ({ data, ownerName, onOpenCompany, onGoTo }) => {
  const s = data.stats;
  const cards = [
    { label: 'Monthly revenue', value: taka(s.monthlyRevenueBdt), icon: TrendingUp, tile: 'bg-[#5b5ef4]' },
    { label: 'Collected this month', value: taka(s.collectedThisMonthBdt), icon: Wallet, tile: 'bg-[#38c6d9]' },
    { label: 'Companies', value: s.totalCompanies, icon: Building2, tile: 'bg-[#4f8cff]' },
    { label: 'On free trial', value: s.onTrial, icon: Clock, tile: 'bg-[#f5a623]' },
    { label: 'Trial ended', value: s.trialExpired, icon: AlertTriangle, tile: 'bg-[#ff6b8b]' },
    { label: 'Employees (all)', value: s.totalEmployees, icon: Users, tile: 'bg-[#8b5cf6]' },
  ];

  const chartData = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const hasRevenue = chartData.some((m) => m.revenue > 0);
  const hasSignups = chartData.some((m) => m.signups > 0 || m.conversions > 0);

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
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-[28px] text-white px-6 sm:px-10 py-8 min-h-[180px] flex items-center" style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #7c7ff7 100%)` }}>
        <div className="absolute -right-10 -bottom-16 w-56 h-56 rounded-full border-[18px] border-white/10" aria-hidden />
        <div className="absolute right-40 -top-10 w-24 h-24 rounded-full bg-white/10" aria-hidden />
        <div className="relative z-10 max-w-md">
          <h2 className="text-2xl sm:text-3xl font-light">Welcome, <span className="font-semibold">{ownerName}</span></h2>
          <p className="mt-1 text-sm text-white/80">
            {callList.length
              ? `${callList.length} compan${callList.length === 1 ? 'y needs' : 'ies need'} a follow-up this week.`
              : 'Everything looks good today. Have a great day!'}
          </p>
          <button onClick={() => onGoTo('companies')} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#5b5ef4] text-sm font-semibold shadow-lg shadow-indigo-900/20 cursor-pointer">
            View companies <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <WelcomeIllustration className="hidden sm:block absolute right-4 lg:right-10 bottom-0 w-[230px] lg:w-[260px]" />
      </section>

      {/* Report */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Report</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
          {cards.map((c) => (
            <div key={c.label} className={`${CARD} p-4 flex flex-col items-center text-center`}>
              <div className={`w-12 h-12 rounded-2xl ${c.tile} text-white flex items-center justify-center mb-3 shadow-lg shadow-slate-900/10`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="text-[11px] text-slate-400">{c.label}</p>
              <p className="text-xl font-semibold text-slate-900 mt-0.5">{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call list */}
      <section className={CARD}>
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#fff0f3] text-[#ff6b8b] flex items-center justify-center"><PhoneCall className="w-4 h-4" /></span>
            Call this week
          </h3>
          <span className="text-xs text-slate-400">{callList.length} compan{callList.length === 1 ? 'y' : 'ies'}</span>
        </div>
        {callList.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nobody needs a call right now. 🎉</p>
        ) : (
          <ul className="px-2 pb-2">
            {callList.map(({ c, reason, urgency }) => {
              const wa = whatsappLink(c.phone, `Assalamu alaikum! Attendra থেকে বলছি — ${c.name}-এর subscription নিয়ে কথা বলতে চাই।`);
              return (
                <li key={c.id} className="px-3 py-3 rounded-2xl hover:bg-[#f5f6ff] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button onClick={() => onOpenCompany(c.id)} className="text-left cursor-pointer flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgency === 0 ? 'bg-rose-500' : urgency === 1 ? 'bg-amber-500' : 'bg-sky-500'}`} aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{c.name}</span>
                      <span className="block text-xs text-slate-500">{reason}{c.owner?.name ? ` · ${c.owner.name}` : ''}{c.phone ? ` · ${c.phone}` : ''}</span>
                    </span>
                  </button>
                  <div className="flex gap-2 pl-5 sm:pl-0">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#e9f9ef] text-emerald-700 text-xs font-semibold">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#f0f1ff] text-[#5b5ef4] text-xs font-semibold">
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                    <button onClick={() => onOpenCompany(c.id)} className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer">Open</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Charts */}
      <section className="grid 2xl:grid-cols-2 gap-4">
        <div className={`${CARD} p-5`}>
          <h3 className="text-base font-semibold text-slate-900">Money collected</h3>
          <p className="text-xs text-slate-400 mb-3">Recorded payments per month, last 12 months</p>
          {hasRevenue ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={ACCENT} stopOpacity={0.18} />
                      <stop offset="1" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip
                    cursor={{ stroke: ACCENT, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 30px rgba(91,94,244,0.15)', fontSize: 12 }}
                    formatter={(v: number) => [taka(v), 'Collected']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} fill="url(#rev-fill)" dot={false} activeDot={{ r: 5, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="h-60 flex items-center justify-center text-sm text-slate-400 bg-[#f7f8ff] rounded-2xl">No payments recorded yet.</p>
          )}
        </div>

        <div className={`${CARD} p-5`}>
          <h3 className="text-base font-semibold text-slate-900">New companies vs. first payments</h3>
          <p className="text-xs text-slate-400 mb-3">Signups each month, and companies that paid for the first time</p>
          {hasSignups ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip cursor={{ fill: '#f5f6ff' }} contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 30px rgba(91,94,244,0.15)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: '#191919' }}>{value}</span>} />
                  <Bar dataKey="signups" name="New signups" fill={BLUE} maxBarSize={16} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversions" name="First payments" fill={ORANGE} maxBarSize={16} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="h-60 flex items-center justify-center text-sm text-slate-400 bg-[#f7f8ff] rounded-2xl">No signups yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};
