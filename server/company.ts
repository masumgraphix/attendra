import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { tx, query } from './db.js';
import { newId, slugify } from './auth.js';

export const PLANS: Record<string, { name: string; maxEmployees: number; priceBdt: number }> = {
  trial: { name: 'Free Trial', maxEmployees: 25, priceBdt: 0 },
  starter: { name: 'Starter', maxEmployees: 25, priceBdt: 1500 },
  business: { name: 'Business', maxEmployees: 100, priceBdt: 4000 },
  enterprise: { name: 'Enterprise', maxEmployees: 1000, priceBdt: 12000 },
};

export const TRIAL_DAYS = 14;

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2', '#DC2626', '#4F46E5'];
export const initialsAvatar = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase().replace(/[<>&"]/g, '');
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${AVATAR_COLORS[h % AVATAR_COLORS.length]}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_SETTINGS = {
  timezone: 'Asia/Dhaka',
  country: 'BD',
  currency: 'BDT',
  logoUrl: '',
  shift: {
    officeStartTime: '09:00',
    lateThresholdTime: '09:15',
    officeEndTime: '18:00',
    weeklyOff: 'Friday',
    workDays: 'Saturday to Thursday',
    enableGeofence: false,
    ipWhitelist: '',
  },
  latePenaltyRule: { threshold: 3, deductionDays: 1 },
};

export const DEFAULT_LEAVE_POLICIES = [
  { id: 'casual', name: 'Casual Leave', yearlyQuota: 10, colorTag: 'blue' },
  { id: 'sick', name: 'Sick Leave', yearlyQuota: 14, colorTag: 'rose' },
  { id: 'annual', name: 'Annual Leave', yearlyQuota: 15, colorTag: 'emerald' },
];

/** Settings with defaults filled in, so old companies get new keys automatically. */
export const withDefaults = (settings: any) => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
  shift: { ...DEFAULT_SETTINGS.shift, ...(settings?.shift || {}) },
  latePenaltyRule: { ...DEFAULT_SETTINGS.latePenaltyRule, ...(settings?.latePenaltyRule || {}) },
});

export const publicCompany = (c: any) => {
  if (!c) return null;
  const plan = PLANS[c.plan] || PLANS.trial;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    plan: c.plan,
    planName: plan.name,
    maxEmployees: c.max_employees,
    trialEndsAt: c.trial_ends_at,
    paidUntil: c.paid_until,
    phone: c.phone,
    settings: withDefaults(c.settings),
    createdAt: c.created_at,
  };
};

const uniqueSlug = async (client: pg.PoolClient, name: string) => {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const r = await client.query(`SELECT 1 FROM companies WHERE slug = $1`, [slug]);
    if (!r.rowCount) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
};

export class EmailTakenError extends Error {}

/**
 * Creates a company with its first Super Admin, default leave policies and an
 * employee profile for the owner. Used by self-signup and the platform panel.
 */
export const createCompany = async (input: {
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  phone?: string;
  plan?: string;
  status?: 'trial' | 'active';
  mustChangePassword?: boolean;
}) => {
  const email = input.ownerEmail.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const planKey = PLANS[input.plan || 'trial'] ? input.plan || 'trial' : 'trial';
  const status = input.status || 'trial';

  return tx(async (client) => {
    const taken = await client.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (taken.rowCount) throw new EmailTakenError('An account with this email already exists.');

    const companyId = newId('cmp');
    const slug = await uniqueSlug(client, input.companyName);
    const trialEnds = status === 'trial' ? new Date(Date.now() + TRIAL_DAYS * 86400_000) : null;

    const c = await client.query(
      `INSERT INTO companies (id, name, slug, status, plan, max_employees, trial_ends_at, phone, settings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [companyId, input.companyName.trim(), slug, status, planKey, PLANS[planKey].maxEmployees, trialEnds, input.phone || null, DEFAULT_SETTINGS]
    );

    const employeeId = newId('emp');
    const userId = newId('usr');
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, name, role, employee_id, status, must_change_password, avatar)
       VALUES ($1,$2,$3,$4,$5,'super_admin',$6,'active',$7,$8)`,
      [userId, companyId, email, passwordHash, input.ownerName.trim(), employeeId, !!input.mustChangePassword, initialsAvatar(input.ownerName)]
    );

    const today = new Date().toISOString().split('T')[0];
    const ownerProfile = {
      id: employeeId,
      name: input.ownerName.trim(),
      role: 'Managing Director',
      designation: 'Managing Director',
      department: 'Management',
      email,
      phone: input.phone || '',
      avatar: initialsAvatar(input.ownerName),
      status: 'active',
      employmentType: 'full_time',
      location: 'Head Office',
      joinDate: today,
      shift: 'General',
      manager: '',
      leaveBalance: { casual: 10, sick: 14, annual: 15 },
      leaveUsed: {},
    };
    const insertRecord = (collection: string, doc: any) =>
      client.query(`INSERT INTO records (company_id, collection, id, data) VALUES ($1,$2,$3,$4)`, [companyId, collection, doc.id, doc]);

    await insertRecord('employees', ownerProfile);
    await insertRecord('departments', { id: newId('dep'), name: 'Management', color: '#7C3AED', headName: ownerProfile.name });
    for (const p of DEFAULT_LEAVE_POLICIES) await insertRecord('leavePolicies', p);

    return { company: c.rows[0], userId };
  });
};

export const getCompany = async (id: string) => {
  const r = await query(`SELECT * FROM companies WHERE id = $1`, [id]);
  return r.rows[0] || null;
};
