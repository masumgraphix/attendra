import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import {
  requireAuth, signToken, publicUser, rateLimit, clientIp, hashCode, newId, companyAccess, getJwtSecret,
} from '../auth.js';
import { createCompany, EmailTakenError, publicCompany, TRIAL_DAYS } from '../company.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../email.js';
import { audit } from '../records.js';
import { refreshPlatformSettings, activeBroadcast } from '../platformSettings.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

const tooMany = (res: any) =>
  res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });

/** Creates the platform owner account from env vars the first time (only if none exists). */
let platformBootstrapped = false;
const ensurePlatformAdmin = async () => {
  if (platformBootstrapped) return;
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PLATFORM_ADMIN_PASSWORD || '');
  if (email && password.length >= MIN_PASSWORD) {
    const exists = await query(`SELECT 1 FROM users WHERE role = 'platform_admin' AND status = 'active' LIMIT 1`);
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(password, 10);
      await query(
        `INSERT INTO users (id, company_id, email, password_hash, name, role, status)
         VALUES ($1, NULL, $2, $3, 'Platform Owner', 'platform_admin', 'active')
         ON CONFLICT (email) DO NOTHING`,
        [newId('usr'), email, hash]
      );
      console.log(`[bootstrap] platform admin created for ${email}`);
    }
  }
  platformBootstrapped = true;
};

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    await ensurePlatformAdmin();
    await refreshPlatformSettings();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

    if (!(await rateLimit(`login:${clientIp(req)}`, 30, 600)) || !(await rateLimit(`login-email:${email}`, 10, 600))) {
      return tooMany(res);
    }

    const r = await query(
      `SELECT u.*, row_to_json(c.*) AS company FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.email = $1`,
      [email]
    );
    const row = r.rows[0];

    if (!row) {
      // Tell the user if their access request is still waiting for approval.
      const pending = await query(
        `SELECT 1 FROM records WHERE collection = 'registrationRequests' AND lower(data->>'email') = $1 AND data->>'status' = 'pending' LIMIT 1`,
        [email]
      );
      if (pending.rowCount) {
        return res.status(403).json({ success: false, message: 'Your access request is still waiting for admin approval.' });
      }
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    const ok = await bcrypt.compare(password.trim(), row.password_hash) || await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Incorrect email or password.' });

    if (row.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Please contact your HR admin.' });
    }

    if (row.company && row.company.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This company account has been suspended. Please contact Attendra support.' });
    }

    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [row.id]);
    const token = signToken({ id: row.id, tokenVersion: row.token_version });
    const access = companyAccess(row.company);
    return res.json({
      success: true,
      token,
      account: publicUser(row),
      company: publicCompany(row.company),
      companyAccess: row.company ? access : { ok: true },
      broadcast: row.company ? activeBroadcast() : null,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM users WHERE id = $1`, [req.user!.id]);
    return res.json({
      success: true,
      account: publicUser(r.rows[0]),
      company: publicCompany(req.company),
      companyAccess: req.company ? companyAccess(req.company) : { ok: true },
      broadcast: req.company ? activeBroadcast() : null,
      supportMode: !!req.impersonatedBy,
    });
  } catch (err) {
    next(err);
  }
});

/** Self-service company signup → 14-day trial, owner becomes Super Admin. */
authRouter.post('/auth/signup', async (req, res, next) => {
  try {
    const companyName = String(req.body?.companyName || '').trim();
    const ownerName = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '').trim();

    if (companyName.length < 2 || companyName.length > 120) return res.status(400).json({ success: false, message: 'Please enter your company name.' });
    if (ownerName.length < 2) return res.status(400).json({ success: false, message: 'Please enter your name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD} characters.` });

    if (!(await rateLimit(`signup:${clientIp(req)}`, 5, 3600))) return tooMany(res);
    await refreshPlatformSettings();
    getJwtSecret(); // fail before creating anything if the server is misconfigured

    const { company, userId } = await createCompany({ companyName, ownerName, ownerEmail: email, password, phone });
    const u = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    await audit(company.id, { actor: ownerName, actorRole: 'super_admin', action: 'Company workspace created', target: companyName, ip: clientIp(req) });
    sendWelcomeEmail(email, ownerName, companyName, TRIAL_DAYS).catch(() => {});

    return res.json({
      success: true,
      token: signToken({ id: userId, tokenVersion: 0 }),
      account: publicUser(u.rows[0]),
      company: publicCompany(company),
      companyAccess: { ok: true },
    });
  } catch (err) {
    if (err instanceof EmailTakenError) return res.status(409).json({ success: false, message: err.message });
    next(err);
  }
});

authRouter.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    if (!(await rateLimit(`forgot:${email}`, 3, 900)) || !(await rateLimit(`forgot-ip:${clientIp(req)}`, 10, 900))) return tooMany(res);

    const u = await query(`SELECT id FROM users WHERE email = $1 AND status = 'active'`, [email]);
    let simulated = false;
    if (u.rowCount) {
      const code = String(crypto.randomInt(100000, 1000000));
      await query(
        `INSERT INTO password_reset_tokens (email, code_hash, expires_at, attempts) VALUES ($1, $2, NOW() + INTERVAL '15 minutes', 0)
         ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
        [email, hashCode(code)]
      );
      const result = await sendPasswordResetEmail(email, code);
      simulated = !!result.simulated;
    }
    // Same answer whether or not the account exists (prevents email enumeration).
    return res.json({ success: true, message: 'If an account exists for this email, a 6-digit code has been sent.', simulated });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/reset-password', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!email || !code || !newPassword) return res.status(400).json({ success: false, message: 'Email, code and new password are required.' });
    if (newPassword.length < MIN_PASSWORD) return res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD} characters.` });

    const t = await query(`SELECT * FROM password_reset_tokens WHERE email = $1`, [email]);
    const tok = t.rows[0];
    const invalid = () => res.status(400).json({ success: false, message: 'Invalid or expired code. Please request a new one.' });
    if (!tok || new Date(tok.expires_at).getTime() < Date.now() || tok.attempts >= 5) return invalid();
    if (tok.code_hash !== hashCode(code)) {
      await query(`UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE email = $1`, [email]);
      return invalid();
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE, token_version = token_version + 1 WHERE email = $2`,
      [hash, email]
    );
    await query(`DELETE FROM password_reset_tokens WHERE email = $1`, [email]);
    return res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/change-password', requireAuth, async (req, res, next) => {
  try {
    if (req.impersonatedBy) return res.status(403).json({ success: false, message: 'Passwords cannot be changed during a support session.' });
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    if (newPassword.length < MIN_PASSWORD) return res.status(400).json({ success: false, message: `New password must be at least ${MIN_PASSWORD} characters.` });

    const r = await query(`SELECT * FROM users WHERE id = $1`, [req.user!.id]);
    const row = r.rows[0];
    const ok = await bcrypt.compare(currentPassword, row.password_hash) || await bcrypt.compare(currentPassword.trim(), row.password_hash);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(newPassword, 10);
    const upd = await query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE, token_version = token_version + 1 WHERE id = $2 RETURNING *`,
      [hash, row.id]
    );
    // Password change logs out other devices; hand back a fresh token for this one.
    return res.json({
      success: true,
      message: 'Password updated successfully.',
      token: signToken({ id: row.id, tokenVersion: upd.rows[0].token_version }),
      account: publicUser(upd.rows[0]),
    });
  } catch (err) {
    next(err);
  }
});

/** Public: lets the "request access" form show which company the code belongs to. */
authRouter.get('/public/company/:slug', async (req, res, next) => {
  try {
    const r = await query(`SELECT name, slug, settings->>'logoUrl' AS logo FROM companies WHERE slug = $1 AND status IN ('trial','active')`, [
      String(req.params.slug || '').trim().toLowerCase(),
    ]);
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'No company found with this code.' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    next(err);
  }
});
