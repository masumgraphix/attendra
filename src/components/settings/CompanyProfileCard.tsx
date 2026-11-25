import React, { useState } from 'react';
import { Building2, Copy, Link2, Save, Crown } from 'lucide-react';
import { Company } from '../../types';
import { api } from '../../services/api';

interface Props {
  company: Company;
  canEdit: boolean;
  onUpdated: (c: Company) => void;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Company name, plan, and the code/invite link employees use to request access. */
export const CompanyProfileCard: React.FC<Props> = ({ company, canEdit, onUpdated }) => {
  const [name, setName] = useState(company.name);
  const [phone, setPhone] = useState(company.phone || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const inviteLink = `${window.location.origin}/?company=${company.slug}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setMsg(`${label} copied`);
    setTimeout(() => setMsg(''), 2000);
  };

  const save = async () => {
    setSaving(true);
    try {
      onUpdated(await api.updateCompany({ name: name.trim(), phone: phone.trim() }));
      setMsg('Saved');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2500);
    }
  };

  const trialLeft = company.trialEndsAt ? Math.ceil((new Date(company.trialEndsAt).getTime() - Date.now()) / 86400_000) : null;

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 border border-indigo-200/70 shadow-xs space-y-4 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" /> Company profile
        </h4>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-indigo-200 text-indigo-700">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          {company.planName} · up to {company.maxEmployees} employees
          {company.status === 'trial' && trialLeft !== null && ` · trial ${trialLeft > 0 ? `${trialLeft} days left` : 'ended'}`}
          {company.status === 'active' && company.paidUntil && ` · paid until ${fmt(company.paidUntil)}`}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Company name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl disabled:bg-slate-50" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl disabled:bg-slate-50" />
        </label>
      </div>

      <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
        <p className="text-xs font-bold text-slate-700">Invite employees</p>
        <p className="text-[11px] text-slate-500">Employees open this link (or enter the company code) to request access. You approve them from the dashboard.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => copy(company.slug, 'Company code')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer">
            <Copy className="w-3.5 h-3.5" /> Code: <span className="font-mono">{company.slug}</span>
          </button>
          <button type="button" onClick={() => copy(inviteLink, 'Invite link')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">
            <Link2 className="w-3.5 h-3.5" /> Copy invite link
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        {canEdit && (
          <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};
