/**
 * Platform owner (you) — manage every company on Attendra.
 * Only users with role = 'platform_admin' reach these routes.
 */
import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { query, tx } from '../db.js';
import { generatePassword, newId, signSupportToken, clientIp } from '../auth.js';
import { createCompany, EmailTakenError, publicCompany } from '../company.js';
import { sendCompanyCreatedEmail } from '../email.js';
import { plans, savePlatformSetting, refreshPlatformSettings, type Plan } from '../platformSettings.js';
import { audit } from '../records.js';

export const platformRouter = Router();

platformRouter.use('/platform', async (_req, _res, next) => {
  try { await refreshPlatformSettings(); next(); } catch (err) { next(err); }
});

const COMPANY_STATS_SQL = `
  SELECT c.*,
    (SELECT COUNT(*)::int FROM records r WHERE r.company_id = c.id AND r.collection = 'employees'
       AND COALESCE(r.data->>'status','active') <> 'inactive') AS employee_count,
    (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS user_count,
    (SELECT MAX(u.last_login_at) FROM users u WHERE u.company_id = c.id) AS last_active_at,
    (SELECT json_build_object('name', u.name, 'email', u.email) FROM users u
       WHERE u.company_id = c.id AND u.role = 'super_admin' ORDER BY u.created_at LIMIT 1) AS owner,
    (SELECT COALESCE(SUM(p.amount_bdt), 0)::float FROM payments p WHERE p.company_id = c.id) AS total_paid
  FROM companies c`;

const toCompany = (row: any) => ({
  ...publicCompany(row),
  employeeCount: row.employee_count,
  userCount: row.user_count,
  lastActiveAt: row.last_active_at,
  owner: row.owner,
  totalPaid: row.total_paid,
  notes: row.owner_notes || '',
});

const toPayment = (p: any) => ({
  id: p.id,
  receiptNo: Number(p.receipt_no),
  companyId: p.company_id,
  companyName: p.company_name,
  amountBdt: Number(p.amount_bdt),
  method: p.method,
  trxId: p.trx_id,
  plan: p.plan,
  planName: plans()[p.plan]?.name || p.plan,
  months: p.months,
  periodFrom: p.period_from,
  periodTo: p.period_to,
  note: p.note,
  recordedBy: p.recorded_by,
  paidAt: p.paid_at,
});

// ---------------------------------------------------------------------------
// Overview: stats, companies, monthly series for charts
// ---------------------------------------------------------------------------

platformRouter.get('/platform/overview', async (_req, res, next) => {
  try {
    const r = await query(`${COMPANY_STATS_SQL} ORDER BY c.created_at DESC`);
    const companies = r.rows.map(toCompany);
    const now = Date.now();
    const P = plans();

    const months = await query(`
      WITH m AS (
        SELECT date_trunc('month', NOW()) - make_interval(months => g) AS month FROM generate_series(0, 11) g
      )
      SELECT to_char(m.month, 'YYYY-MM') AS month,
        COALESCE((SELECT SUM(amount_bdt) FROM payments p WHERE date_trunc('month', p.paid_at) = m.month), 0)::float AS revenue,
        (SELECT COUNT(*)::int FROM companies c WHERE date_trunc('month', c.created_at) = m.month) AS signups,
        (SELECT COUNT(DISTINCT company_id)::int FROM payments p WHERE date_trunc('month', p.paid_at) = m.month
           AND NOT EXISTS (SELECT 1 FROM payments e WHERE e.company_id = p.company_id AND e.paid_at < date_trunc('month', p.paid_at))) AS conversions
      FROM m ORDER BY m.month`);

    const paying = companies.filter((c) => c.status === 'active' && (!c.paidUntil || new Date(c.paidUntil).getTime() > now));
    const stats = {
      totalCompanies: companies.length,
      activePaid: paying.length,
      onTrial: companies.filter((c) => c.status === 'trial' && (!c.trialEndsAt || new Date(c.trialEndsAt).getTime() > now)).length,
      trialExpired: companies.filter((c) => c.status === 'trial' && c.trialEndsAt && new Date(c.trialEndsAt).getTime() <= now).length,
      suspended: companies.filter((c) => c.status === 'suspended').length,
      totalEmployees: companies.reduce((s, c) => s + (c.employeeCount || 0), 0),
      monthlyRevenueBdt: paying.reduce((s, c) => s + (P[c.plan]?.priceBdt || 0), 0),
      collectedThisMonthBdt: months.rows[months.rows.length - 1]?.revenue || 0,
    };
    res.json({ success: true, data: { stats, companies, plans: P, monthly: months.rows } });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Company detail, notes, create, update
// ---------------------------------------------------------------------------

platformRouter.get('/platform/companies/:id', async (req, res, next) => {
  try {
    const c = await query(`${COMPANY_STATS_SQL} WHERE c.id = $1`, [req.params.id]);
    if (!c.rowCount) return res.status(404).json({ success: false, message: 'Company not found.' });
    const users = await query(
      `SELECT id, name, email, role, status, last_login_at AS "lastLoginAt", created_at AS "createdAt"
       FROM users WHERE company_id = $1 ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name`,
      [req.params.id]
    );
    const payments = await query(
      `SELECT p.*, c.name AS company_name FROM payments p JOIN companies c ON c.id = p.company_id WHERE p.company_id = $1 ORDER BY p.paid_at DESC`,
      [req.params.id]
    );
    const usage = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM records WHERE company_id = $1 AND collection = 'attendance' AND created_at > NOW() - INTERVAL '30 days') AS attendance_30d,
         (SELECT COUNT(*)::int FROM records WHERE company_id = $1 AND collection = 'leaveRequests' AND created_at > NOW() - INTERVAL '30 days') AS leave_30d,
         (SELECT COUNT(DISTINCT data->>'date')::int FROM records WHERE company_id = $1 AND collection = 'attendance' AND created_at > NOW() - INTERVAL '30 days') AS active_days_30d`,
      [req.params.id]
    );
    res.json({
      success: true,
      data: {
        company: toCompany(c.rows[0]),
        users: users.rows,
        payments: payments.rows.map(toPayment),
        usage: usage.rows[0],
      },
    });
  } catch (err) { next(err); }
});

platformRouter.post('/platform/companies', async (req, res, next) => {
  try {
    const companyName = String(req.body?.companyName || '').trim();
    const ownerName = String(req.body?.ownerName || '').trim();
    const ownerEmail = String(req.body?.ownerEmail || '').trim().toLowerCase();
    const plan = plans()[req.body?.plan] ? req.body.plan : 'trial';
    if (!companyName || !ownerName || !ownerEmail) {
      return res.status(400).json({ success: false, message: 'Company name, owner name and owner email are required.' });
    }
    const password = generatePassword();
    const { company } = await createCompany({
      companyName, ownerName, ownerEmail, password, phone: req.body?.phone,
      plan, status: plan === 'trial' ? 'trial' : 'active', mustChangePassword: true,
    });
    if (plan !== 'trial') {
      await query(`UPDATE companies SET paid_until = NOW() + INTERVAL '1 month' WHERE id = $1`, [company.id]);
    }
    const mail = await sendCompanyCreatedEmail(ownerEmail, ownerName, password, companyName);
    res.json({
      success: true,
      data: publicCompany(company),
      emailSent: mail.success && !mail.simulated,
      temporaryPassword: mail.success && !mail.simulated ? undefined : password,
    });
  } catch (err) {
    if (err instanceof EmailTakenError) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
});

/** Change plan / status / notes / extend trial or subscription. */
platformRouter.put('/platform/companies/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const P = plans();
    const sets: string[] = [];
    const params: any[] = [req.params.id];
    const add = (sql: string, v: any) => { params.push(v); sets.push(sql.replace('?', `$${params.length}`)); };

    if (b.status && ['trial', 'active', 'suspended', 'cancelled'].includes(b.status)) add('status = ?', b.status);
    if (b.plan && P[b.plan]) {
      add('plan = ?', b.plan);
      add('max_employees = ?', Number(b.maxEmployees) || P[b.plan].maxEmployees);
    } else if (b.maxEmployees) {
      add('max_employees = ?', Math.max(1, Number(b.maxEmployees)));
    }
    if (b.extendTrialDays) add(`trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + make_interval(days => ?)`, Number(b.extendTrialDays));
    if (b.extendPaidDays) add(`paid_until = GREATEST(COALESCE(paid_until, NOW()), NOW()) + make_interval(days => ?)`, Number(b.extendPaidDays));
    if (b.name) add('name = ?', String(b.name).trim().slice(0, 120));
    if (b.phone !== undefined) add('phone = ?', String(b.phone).trim().slice(0, 40));
    if (b.notes !== undefined) add('owner_notes = ?', String(b.notes).slice(0, 5000));
    if (!sets.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });

    const r = await query(`UPDATE companies SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'Company not found.' });
    if (b.status === 'suspended' || b.status === 'cancelled') {
      await query(`UPDATE users SET token_version = token_version + 1 WHERE company_id = $1`, [req.params.id]);
    }
    res.json({ success: true, data: publicCompany(r.rows[0]) });
  } catch (err) { next(err); }
});

/** Gives a company's Super Admin (owner) a fresh temporary password. */
platformRouter.post('/platform/companies/:id/reset-owner', async (req, res, next) => {
  try {
    const c = await query(`SELECT * FROM companies WHERE id = $1`, [req.params.id]);
    if (!c.rowCount) return res.status(404).json({ success: false, message: 'Company not found.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    const owner = await query(
      email
        ? `SELECT * FROM users WHERE company_id = $1 AND email = $2`
        : `SELECT * FROM users WHERE company_id = $1 AND role = 'super_admin' ORDER BY created_at LIMIT 1`,
      email ? [req.params.id, email] : [req.params.id]
    );
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 10);
    let user = owner.rows[0];
    if (user) {
      await query(
        `UPDATE users SET password_hash = $2, role = 'super_admin', status = 'active', must_change_password = TRUE, token_version = token_version + 1 WHERE id = $1`,
        [user.id, hash]
      );
    } else {
      if (!email) return res.status(400).json({ success: false, message: 'This company has no Super Admin. Provide an email to create one.' });
      const ins = await query(
        `INSERT INTO users (id, company_id, email, password_hash, name, role, status, must_change_password)
         VALUES ($1,$2,$3,$4,$5,'super_admin','active',TRUE) RETURNING *`,
        [newId('usr'), req.params.id, email, hash, String(req.body?.name || 'Company Owner')]
      );
      user = ins.rows[0];
    }
    const mail = await sendCompanyCreatedEmail(user.email, user.name, password, c.rows[0].name);
    res.json({
      success: true,
      data: { email: user.email },
      emailSent: mail.success && !mail.simulated,
      temporaryPassword: mail.success && !mail.simulated ? undefined : password,
    });
  } catch (err) {
    if ((err as any)?.code === '23505') return res.status(409).json({ success: false, message: 'This email is already used by another account.' });
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Payments (manual bKash / Nagad / bank / cash) → extends the subscription
// ---------------------------------------------------------------------------

const METHODS = ['bkash', 'nagad', 'rocket', 'bank', 'cash', 'card', 'other'];

platformRouter.post('/platform/companies/:id/payments', async (req: Request, res, next) => {
  try {
    const b = req.body || {};
    const P = plans();
    const plan = String(b.plan || '');
    const months = Math.floor(Number(b.months));
    const amount = Number(b.amountBdt);
    const method = String(b.method || '').toLowerCase();
    if (!P[plan] || plan === 'trial') return res.status(400).json({ success: false, message: 'Please choose a paid plan.' });
    if (!(months >= 1 && months <= 36)) return res.status(400).json({ success: false, message: 'Months must be between 1 and 36.' });
    if (!(amount >= 0)) return res.status(400).json({ success: false, message: 'Please enter the amount received.' });
    if (!METHODS.includes(method)) return res.status(400).json({ success: false, message: 'Please choose a payment method.' });
    const trxId = String(b.trxId || '').trim().slice(0, 80) || null;
    if (trxId) {
      const dup = await query(`SELECT 1 FROM payments WHERE lower(trx_id) = lower($1) AND method = $2`, [trxId, method]);
      if (dup.rowCount) return res.status(409).json({ success: false, message: 'A payment with this transaction ID is already recorded.' });
    }
    const paidAt = b.paidAt ? new Date(b.paidAt) : new Date();
    if (isNaN(paidAt.getTime())) return res.status(400).json({ success: false, message: 'Invalid payment date.' });

    const actor = await query(`SELECT email FROM users WHERE id = $1`, [req.user!.id]);
    const result = await tx(async (client) => {
      const c = await client.query(`SELECT * FROM companies WHERE id = $1 FOR UPDATE`, [req.params.id]);
      if (!c.rowCount) return null;
      const company = c.rows[0];
      // A renewal continues from the current end date; a lapsed or new subscription starts today.
      const start = company.paid_until && new Date(company.paid_until).getTime() > Date.now() ? new Date(company.paid_until) : new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);
      const ins = await client.query(
        `INSERT INTO payments (id, company_id, amount_bdt, method, trx_id, plan, months, period_from, period_to, note, recorded_by, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [newId('pay'), company.id, amount, method, trxId, plan, months, start, end, String(b.note || '').slice(0, 500) || null, actor.rows[0]?.email, paidAt]
      );
      const upd = await client.query(
        `UPDATE companies SET status = 'active', plan = $2, max_employees = GREATEST(max_employees, $3), paid_until = $4 WHERE id = $1 RETURNING *`,
        [company.id, plan, P[plan].maxEmployees, end]
      );
      return { payment: { ...ins.rows[0], company_name: company.name }, company: upd.rows[0] };
    });
    if (!result) return res.status(404).json({ success: false, message: 'Company not found.' });
    await audit(result.company.id, {
      actor: 'Attendra', actorRole: 'platform', action: 'Subscription payment recorded',
      newValue: `৳${amount} via ${method}${trxId ? ` (${trxId})` : ''} — ${P[plan].name} × ${months} month(s), paid until ${new Date(result.company.paid_until).toISOString().split('T')[0]}`,
    });
    res.json({ success: true, data: { payment: toPayment(result.payment), company: publicCompany(result.company) } });
  } catch (err) { next(err); }
});

platformRouter.get('/platform/payments', async (_req, res, next) => {
  try {
    const r = await query(`SELECT p.*, c.name AS company_name FROM payments p JOIN companies c ON c.id = p.company_id ORDER BY p.paid_at DESC LIMIT 5000`);
    res.json({ success: true, data: r.rows.map(toPayment) });
  } catch (err) { next(err); }
});

platformRouter.get('/platform/payments/:id', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT p.*, c.name AS company_name, c.slug, c.phone,
         (SELECT json_build_object('name', u.name, 'email', u.email) FROM users u WHERE u.company_id = c.id AND u.role = 'super_admin' ORDER BY u.created_at LIMIT 1) AS owner
       FROM payments p JOIN companies c ON c.id = p.company_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'Payment not found.' });
    const row = r.rows[0];
    res.json({ success: true, data: { ...toPayment(row), companySlug: row.slug, companyPhone: row.phone, owner: row.owner } });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Plans & prices, broadcast banner
// ---------------------------------------------------------------------------

platformRouter.put('/platform/plans', async (req, res, next) => {
  try {
    const input = req.body?.plans;
    if (!input || typeof input !== 'object') return res.status(400).json({ success: false, message: 'Plans are required.' });
    const clean: Record<string, Plan> = {};
    for (const [key, raw] of Object.entries<any>(input)) {
      if (!/^[a-z][a-z0-9_-]{1,30}$/.test(key)) return res.status(400).json({ success: false, message: `Invalid plan key "${key}".` });
      const name = String(raw?.name || '').trim().slice(0, 40);
      const maxEmployees = Math.floor(Number(raw?.maxEmployees));
      const priceBdt = Math.max(0, Math.round(Number(raw?.priceBdt) || 0));
      if (!name || !(maxEmployees >= 1 && maxEmployees <= 100000)) {
        return res.status(400).json({ success: false, message: `Plan "${key}" needs a name and an employee limit.` });
      }
      clean[key] = { name, maxEmployees, priceBdt: key === 'trial' ? 0 : priceBdt };
    }
    if (!clean.trial) return res.status(400).json({ success: false, message: 'The Free Trial plan cannot be removed.' });
    const used = await query(`SELECT DISTINCT plan FROM companies`);
    const missing = used.rows.map((r) => r.plan).filter((p) => !clean[p]);
    if (missing.length) return res.status(400).json({ success: false, message: `Plan(s) in use cannot be removed: ${missing.join(', ')}.` });
    const s = await savePlatformSetting('plans', clean);
    res.json({ success: true, data: s.plans });
  } catch (err) { next(err); }
});

platformRouter.get('/platform/broadcast', async (_req, res, next) => {
  try {
    const s = await refreshPlatformSettings(true);
    res.json({ success: true, data: s.broadcast });
  } catch (err) { next(err); }
});

platformRouter.put('/platform/broadcast', async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 300);
    const level = ['info', 'warning', 'success'].includes(req.body?.level) ? req.body.level : 'info';
    const active = !!req.body?.active && !!message;
    const value = { id: newId('bc'), message, level, active, updatedAt: new Date().toISOString() };
    const s = await savePlatformSetting('broadcast', value);
    res.json({ success: true, data: s.broadcast });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Support login — see a company exactly as its Super Admin (1 hour, audited)
// ---------------------------------------------------------------------------

platformRouter.post('/platform/companies/:id/support-login', async (req, res, next) => {
  try {
    const owner = await query(
      `SELECT * FROM users WHERE company_id = $1 AND role = 'super_admin' AND status = 'active' ORDER BY created_at LIMIT 1`,
      [req.params.id]
    );
    const u = owner.rows[0];
    if (!u) return res.status(400).json({ success: false, message: 'This company has no active Super Admin to view as.' });
    await audit(req.params.id, {
      actor: 'Attendra support', actorRole: 'platform', action: 'Support session started',
      target: `Viewing as ${u.name} (${u.email})`, reason: String(req.body?.reason || '').slice(0, 200) || undefined,
      ip: clientIp(req), status: 'security_flag',
    });
    res.json({ success: true, data: { token: signSupportToken({ id: u.id, tokenVersion: u.token_version }, req.user!.id) } });
  } catch (err) { next(err); }
});
