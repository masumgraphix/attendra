import { Router } from 'express';
import { query } from '../db.js';
import { rateLimit, clientIp, newId } from '../auth.js';
import * as db from '../records.js';

export const publicRouter = Router();

/** An employee asks to join their company. Needs the company code (slug). */
publicRouter.post('/registration-requests', async (req, res, next) => {
  try {
    const b = req.body || {};
    const code = String(b.companyCode || '').trim().toLowerCase();
    const email = String(b.email || '').trim().toLowerCase();
    const name = String(b.employeeName || '').trim();
    if (!code) return res.status(400).json({ success: false, message: 'Please enter your company code (ask your HR admin).' });
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter your name and a valid email.' });
    }
    if (!(await rateLimit(`register:${clientIp(req)}`, 10, 3600))) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    const c = await query(`SELECT id, name FROM companies WHERE slug = $1 AND status IN ('trial','active')`, [code]);
    const company = c.rows[0];
    if (!company) return res.status(404).json({ success: false, message: 'No company found with this code. Please check with your HR admin.' });

    const taken = await query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (taken.rowCount) return res.status(409).json({ success: false, message: 'An account with this email already exists. Please sign in instead.' });

    const pending = await query(
      `SELECT 1 FROM records WHERE company_id = $1 AND collection = 'registrationRequests' AND lower(data->>'email') = $2 AND data->>'status' = 'pending'`,
      [company.id, email]
    );
    if (pending.rowCount) return res.status(409).json({ success: false, message: 'A request for this email is already waiting for approval.' });

    const doc = await db.put(company.id, 'registrationRequests', {
      id: newId('reg'),
      employeeId: String(b.employeeId || '').trim().slice(0, 40) || undefined,
      employeeName: name.slice(0, 120),
      email,
      department: String(b.department || '').trim().slice(0, 80),
      designation: String(b.designation || '').trim().slice(0, 80),
      dob: String(b.dob || '').slice(0, 20) || undefined,
      nidNumber: String(b.nidNumber || '').trim().slice(0, 30) || undefined,
      requestedRole: 'employee',
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
    });
    await db.put(company.id, 'notifications', {
      id: newId('not'),
      type: 'system',
      title: 'New access request',
      message: `${doc.employeeName} (${doc.designation || 'Employee'}${doc.department ? ', ' + doc.department : ''}) asked to join. Review it in Settings.`,
      time: new Date().toISOString(),
      read: false,
    });
    await db.audit(company.id, { actor: doc.employeeName, actorRole: 'candidate', action: 'Requested account access', target: email, ip: clientIp(req), status: 'warning' });
    res.json({ success: true, data: { id: doc.id, companyName: company.name } });
  } catch (err) {
    next(err);
  }
});
