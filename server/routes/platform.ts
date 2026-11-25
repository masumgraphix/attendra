/**
 * Platform owner (you) — manage every company on Attendra.
 * Only users with role = 'platform_admin' reach these routes.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { generatePassword, newId } from '../auth.js';
import { createCompany, EmailTakenError, PLANS, publicCompany } from '../company.js';
import { sendCompanyCreatedEmail } from '../email.js';

export const platformRouter = Router();

platformRouter.get('/platform/overview', async (_req, res, next) => {
  try {
    const r = await query(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM records r WHERE r.company_id = c.id AND r.collection = 'employees'
           AND COALESCE(r.data->>'status','active') <> 'inactive') AS employee_count,
        (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS user_count,
        (SELECT MAX(u.last_login_at) FROM users u WHERE u.company_id = c.id) AS last_active_at,
        (SELECT json_build_object('name', u.name, 'email', u.email) FROM users u
           WHERE u.company_id = c.id AND u.role = 'super_admin' ORDER BY u.created_at LIMIT 1) AS owner
      FROM companies c ORDER BY c.created_at DESC`);
    const companies = r.rows.map((row) => ({
      ...publicCompany(row),
      employeeCount: row.employee_count,
      userCount: row.user_count,
      lastActiveAt: row.last_active_at,
      owner: row.owner,
    }));
    const now = Date.now();
    const stats = {
      totalCompanies: companies.length,
      activePaid: companies.filter((c) => c.status === 'active').length,
      onTrial: companies.filter((c) => c.status === 'trial' && (!c.trialEndsAt || new Date(c.trialEndsAt).getTime() > now)).length,
      trialExpired: companies.filter((c) => c.status === 'trial' && c.trialEndsAt && new Date(c.trialEndsAt).getTime() <= now).length,
      suspended: companies.filter((c) => c.status === 'suspended').length,
      totalEmployees: companies.reduce((s, c) => s + (c.employeeCount || 0), 0),
      monthlyRevenueBdt: companies.filter((c) => c.status === 'active').reduce((s, c) => s + (PLANS[c.plan]?.priceBdt || 0), 0),
    };
    res.json({ success: true, data: { stats, companies, plans: PLANS } });
  } catch (err) { next(err); }
});

platformRouter.post('/platform/companies', async (req, res, next) => {
  try {
    const companyName = String(req.body?.companyName || '').trim();
    const ownerName = String(req.body?.ownerName || '').trim();
    const ownerEmail = String(req.body?.ownerEmail || '').trim().toLowerCase();
    const plan = PLANS[req.body?.plan] ? req.body.plan : 'trial';
    if (!companyName || !ownerName || !ownerEmail) {
      return res.status(400).json({ success: false, message: 'Company name, owner name and owner email are required.' });
    }
    const password = generatePassword();
    const { company } = await createCompany({
      companyName, ownerName, ownerEmail, password, phone: req.body?.phone,
      plan, status: plan === 'trial' ? 'trial' : 'active', mustChangePassword: true,
    });
    if (plan !== 'trial') {
      await query(`UPDATE companies SET paid_until = NOW() + INTERVAL '30 days' WHERE id = $1`, [company.id]);
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

/** Change plan / status / extend trial or subscription. */
platformRouter.put('/platform/companies/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const sets: string[] = [];
    const params: any[] = [req.params.id];
    const add = (sql: string, v: any) => { params.push(v); sets.push(sql.replace('?', `$${params.length}`)); };

    if (b.status && ['trial', 'active', 'suspended', 'cancelled'].includes(b.status)) add('status = ?', b.status);
    if (b.plan && PLANS[b.plan]) {
      add('plan = ?', b.plan);
      add('max_employees = ?', Number(b.maxEmployees) || PLANS[b.plan].maxEmployees);
    } else if (b.maxEmployees) {
      add('max_employees = ?', Math.max(1, Number(b.maxEmployees)));
    }
    if (b.extendTrialDays) add(`trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + make_interval(days => ?)`, Number(b.extendTrialDays));
    if (b.extendPaidDays) add(`paid_until = GREATEST(COALESCE(paid_until, NOW()), NOW()) + make_interval(days => ?)`, Number(b.extendPaidDays));
    if (b.name) add('name = ?', String(b.name).trim());
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
