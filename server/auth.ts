import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { query } from './db.js';
import { refreshPlatformSettings } from './platformSettings.js';

export type Role = 'platform_admin' | 'super_admin' | 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  employeeId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      company?: CompanyRow;
      /** Platform admin id when the owner is using "support login" for this company. */
      impersonatedBy?: string;
    }
  }
}

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  max_employees: number;
  trial_ends_at: string | null;
  paid_until: string | null;
  phone: string | null;
  settings: any;
  created_at: string;
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return 'attendra-local-dev-secret-not-for-production';
};

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;

export const signToken = (u: { id: string; tokenVersion: number }) =>
  jwt.sign({ sub: u.id, v: u.tokenVersion }, getJwtSecret(), { expiresIn: '7d' });

/** Short-lived token that lets the platform owner see a company exactly as its Super Admin does. */
export const signSupportToken = (u: { id: string; tokenVersion: number }, platformAdminId: string) =>
  jwt.sign({ sub: u.id, v: u.tokenVersion, imp: platformAdminId }, getJwtSecret(), { expiresIn: '1h' });

export const publicUser = (row: any) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  employeeId: row.employee_id || undefined,
  companyId: row.company_id || null,
  status: row.status,
  avatar: row.avatar || undefined,
  mustChangePassword: !!row.must_change_password,
  createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : undefined,
});

/** Company access state used to block the app when a trial ends or a company is suspended. */
export const companyAccess = (c: CompanyRow | null | undefined): { ok: boolean; reason?: string } => {
  if (!c) return { ok: false, reason: 'Company not found.' };
  if (c.status === 'suspended') return { ok: false, reason: 'This company account has been suspended. Please contact Attendra support.' };
  if (c.status === 'cancelled') return { ok: false, reason: 'This company account has been cancelled.' };
  if (c.status === 'trial' && c.trial_ends_at && new Date(c.trial_ends_at).getTime() < Date.now()) {
    return { ok: false, reason: 'Your free trial has ended. Please choose a plan to continue using Attendra.' };
  }
  if (c.status === 'active' && c.paid_until && new Date(c.paid_until).getTime() < Date.now() - 3 * 86400_000) {
    return { ok: false, reason: 'Your subscription has expired. Please renew to continue using Attendra.' };
  }
  return { ok: true };
};

/**
 * Verifies the bearer token, reloads the user from the DB on every request
 * (so deactivation / role changes / password resets take effect immediately),
 * and attaches req.user and req.company.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Please sign in.' });

  let payload: any;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
  }

  try {
    await refreshPlatformSettings();
    if (payload.imp) {
      const p = await query(`SELECT 1 FROM users WHERE id = $1 AND role = 'platform_admin' AND status = 'active'`, [payload.imp]);
      if (!p.rowCount) return res.status(401).json({ success: false, message: 'Support session is no longer valid.' });
    }
    const r = await query(
      `SELECT u.*, row_to_json(c.*) AS company
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    const row = r.rows[0];
    if (!row || row.status !== 'active' || row.token_version !== payload.v) {
      return res.status(401).json({ success: false, message: 'Your session is no longer valid. Please sign in again.' });
    }
    req.impersonatedBy = payload.imp || undefined;
    req.user = {
      id: row.id,
      email: row.email,
      // Every audit line written during a support session says so.
      name: payload.imp ? `${row.name} (via Attendra support)` : row.name,
      role: row.role,
      companyId: row.company_id,
      employeeId: row.employee_id,
    };
    req.company = row.company || undefined;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to do this.' });
  }
  next();
};

/** Requires a company user whose company currently has access (trial/subscription valid). */
export const requireCompany = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.companyId || !req.company) {
    return res.status(403).json({ success: false, message: 'This action requires a company account.' });
  }
  const access = companyAccess(req.company);
  if (!access.ok) {
    return res.status(402).json({ success: false, code: 'COMPANY_BLOCKED', message: access.reason });
  }
  next();
};

export const isAdmin = (req: Request) => req.user?.role === 'admin' || req.user?.role === 'super_admin';

/**
 * Fixed-window rate limiter stored in Postgres (works across serverless instances).
 * Returns true if the call is allowed.
 */
export const rateLimit = async (key: string, max: number, windowSeconds: number): Promise<boolean> => {
  const r = await query(
    `INSERT INTO rate_limits (key, hits, window_start) VALUES ($1, 1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN 1 ELSE rate_limits.hits + 1 END,
       window_start = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN NOW() ELSE rate_limits.window_start END
     RETURNING hits`,
    [key, windowSeconds]
  );
  return r.rows[0].hits <= max;
};

export const clientIp = (req: Request) =>
  (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown');

export const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};

export const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'company';
