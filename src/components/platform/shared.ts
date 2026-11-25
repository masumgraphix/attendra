import type { PlatformCompany } from '../../services/api';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000) : null);

export const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;

export const METHOD_LABEL: Record<string, string> = {
  bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank: 'Bank transfer', cash: 'Cash', card: 'Card', other: 'Other',
};

/** Bangladesh numbers → wa.me format (01XXXXXXXXX → 8801XXXXXXXXX). */
export const whatsappLink = (phone: string | null | undefined, text: string) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('01') && digits.length === 11) digits = `88${digits}`;
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

export interface CompanyState {
  key: 'trial' | 'trial_ending' | 'trial_ended' | 'active' | 'renewal_due' | 'overdue' | 'suspended' | 'cancelled';
  label: string;
  cls: string;
}

/** One place that decides what state a company is in (used by badges, filters and the call list). */
export const companyState = (c: PlatformCompany): CompanyState => {
  if (c.status === 'suspended') return { key: 'suspended', label: 'Suspended', cls: 'bg-slate-200 text-slate-700 border-slate-300' };
  if (c.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (c.status === 'trial') {
    const left = daysLeft(c.trialEndsAt);
    if (left !== null && left <= 0) return { key: 'trial_ended', label: 'Trial ended', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
    if (left !== null && left <= 3) return { key: 'trial_ending', label: `Trial · ${left}d left`, cls: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { key: 'trial', label: `Trial · ${left ?? '∞'}d left`, cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  const paidLeft = daysLeft(c.paidUntil);
  if (paidLeft !== null && paidLeft < 0) return { key: 'overdue', label: `Overdue ${-paidLeft}d`, cls: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (paidLeft !== null && paidLeft <= 7) return { key: 'renewal_due', label: `Renews in ${paidLeft}d`, cls: 'bg-orange-100 text-orange-800 border-orange-200' };
  return { key: 'active', label: 'Active', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
};

export const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = '﻿' + [keys.map(cell).join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type Toast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
