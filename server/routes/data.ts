/**
 * Company-scoped CRUD for every dataset the app uses. Every handler runs after
 * requireAuth + requireCompany, so req.user.companyId is always the caller's
 * own company and can never be overridden from the request body.
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireRole, isAdmin, clientIp, newId, generatePassword, publicUser, rateLimit } from '../auth.js';
import * as db from '../records.js';
import { publicCompany, withDefaults } from '../company.js';
import { sendAccountApprovedEmail } from '../email.js';
import { getHolidays, syncGovernmentHolidays } from '../holidays.js';

export const dataRouter = Router();

const cid = (req: Request) => req.user!.companyId!;
const adminOnly = requireRole('admin', 'super_admin');
const superOnly = requireRole('super_admin');
const actor = (req: Request) => ({ actor: req.user!.name, actorRole: req.user!.role, ip: clientIp(req) });

const ok = (res: Response, data: any, extra: object = {}) => res.json({ success: true, data, ...extra });
const notFound = (res: Response, what = 'Record') => res.status(404).json({ success: false, message: `${what} not found.` });
const forbidden = (res: Response, message = 'You do not have permission to do this.') => res.status(403).json({ success: false, message });

const myEmployeeId = (req: Request) => req.user!.employeeId || '';

// ---------------------------------------------------------------------------
// Company profile & settings
// ---------------------------------------------------------------------------

dataRouter.get('/company', (req, res) => ok(res, publicCompany(req.company)));

dataRouter.put('/company', superOnly, async (req, res, next) => {
  try {
    const name = req.body?.name !== undefined ? String(req.body.name).trim().slice(0, 120) : undefined;
    const phone = req.body?.phone !== undefined ? String(req.body.phone).trim().slice(0, 40) : undefined;
    const settings = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : undefined;
    const current = withDefaults(req.company!.settings);
    const merged = settings
      ? withDefaults({
          ...current,
          ...settings,
          shift: { ...current.shift, ...(settings.shift || {}) },
          latePenaltyRule: { ...current.latePenaltyRule, ...(settings.latePenaltyRule || {}) },
        })
      : current;
    const r = await query(
      `UPDATE companies SET name = COALESCE($2, name), phone = COALESCE($3, phone), settings = $4 WHERE id = $1 RETURNING *`,
      [cid(req), name || null, phone ?? null, merged]
    );
    await db.audit(cid(req), { ...actor(req), action: 'Company settings updated' });
    ok(res, publicCompany(r.rows[0]));
  } catch (err) { next(err); }
});

// Shift settings are edited by Admins too (kept as its own endpoint for that reason).
dataRouter.put('/company/shift-settings', adminOnly, async (req, res, next) => {
  try {
    const current = withDefaults(req.company!.settings);
    const shift = { ...current.shift, ...(req.body || {}) };
    const r = await query(`UPDATE companies SET settings = settings || jsonb_build_object('shift', $2::jsonb) WHERE id = $1 RETURNING *`, [cid(req), shift]);
    ok(res, withDefaults(r.rows[0].settings).shift);
  } catch (err) { next(err); }
});

dataRouter.get('/late-penalty-rule', (req, res) => ok(res, withDefaults(req.company!.settings).latePenaltyRule));

dataRouter.put('/late-penalty-rule', adminOnly, async (req, res, next) => {
  try {
    const rule = {
      threshold: Math.max(1, Math.min(31, Number(req.body?.threshold) || 3)),
      deductionDays: Math.max(0, Math.min(31, Number(req.body?.deductionDays) || 1)),
    };
    await query(`UPDATE companies SET settings = settings || jsonb_build_object('latePenaltyRule', $2::jsonb) WHERE id = $1`, [cid(req), rule]);
    ok(res, rule);
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

const PRIVATE_EMPLOYEE_FIELDS = ['salary', 'nidNumber', 'dob', 'address', 'bloodGroup', 'leaveBalance', 'leaveUsed', 'monthlyLateCount', 'salaryDeductionDays'];
const EMPLOYEE_SELF_EDITABLE = ['phone', 'address', 'bloodGroup', 'avatar', 'dob'];

const redactEmployee = (e: any) => {
  const copy = { ...e };
  for (const f of PRIVATE_EMPLOYEE_FIELDS) delete copy[f];
  return copy;
};

dataRouter.get('/employees', async (req, res, next) => {
  try {
    const all = await db.list(cid(req), 'employees');
    all.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (isAdmin(req)) return ok(res, all);
    const me = myEmployeeId(req);
    ok(res, all.map((e) => (e.id === me ? e : redactEmployee(e))));
  } catch (err) { next(err); }
});

const enforceEmployeeLimit = async (req: Request, res: Response, incomingId?: string) => {
  if (incomingId && (await db.get(cid(req), 'employees', incomingId))) return true; // update, not a new seat
  const active = await db.count(cid(req), 'employees', `AND COALESCE(data->>'status','active') <> 'inactive'`);
  if (active >= req.company!.max_employees) {
    res.status(402).json({
      success: false,
      code: 'PLAN_LIMIT',
      message: `Your plan allows up to ${req.company!.max_employees} active employees. Please upgrade your plan to add more.`,
    });
    return false;
  }
  return true;
};

dataRouter.post('/employees', adminOnly, async (req, res, next) => {
  try {
    const emp = req.body || {};
    if (!emp.name || !emp.email) return res.status(400).json({ success: false, message: 'Employee name and email are required.' });
    emp.email = String(emp.email).trim().toLowerCase();
    const dup = await query(
      `SELECT id FROM records WHERE company_id = $1 AND collection = 'employees' AND lower(data->>'email') = $2 AND id <> $3`,
      [cid(req), emp.email, String(emp.id || '')]
    );
    if (dup.rowCount) return res.status(409).json({ success: false, message: 'Another employee already uses this email.' });
    if (emp.id) {
      const sameId = await db.get(cid(req), 'employees', String(emp.id));
      if (sameId && String(sameId.email || '').toLowerCase() !== emp.email) {
        return res.status(409).json({ success: false, message: `Employee ID ${emp.id} is already used by ${sameId.name}. Please use a different ID.` });
      }
    }
    if (!(await enforceEmployeeLimit(req, res, emp.id))) return;
    const saved = await db.put(cid(req), 'employees', { status: 'active', leaveUsed: {}, ...emp });
    ok(res, saved);
  } catch (err) { next(err); }
});

dataRouter.put('/employees/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    let updates = { ...(req.body || {}) };
    if (!isAdmin(req)) {
      if (id !== myEmployeeId(req)) return forbidden(res, 'You can only update your own profile.');
      const blocked = Object.keys(updates).filter((k) => !EMPLOYEE_SELF_EDITABLE.includes(k) && k !== 'id');
      if (blocked.some((k) => k === 'leaveUsed' || k === 'leaveBalance')) {
        return forbidden(res, 'Leave quota adjustments require an Admin or Super Admin.');
      }
      updates = Object.fromEntries(Object.entries(updates).filter(([k]) => EMPLOYEE_SELF_EDITABLE.includes(k)));
    }
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    const saved = await db.patch(cid(req), 'employees', id, updates);
    if (!saved) return notFound(res, 'Employee');
    if (updates.avatar !== undefined) {
      await query(`UPDATE users SET avatar = $3 WHERE company_id = $1 AND employee_id = $2`, [cid(req), id, updates.avatar]);
    }
    ok(res, saved);
  } catch (err) { next(err); }
});

dataRouter.post('/employees/:id/deactivate', adminOnly, async (req, res, next) => {
  try {
    const saved = await db.patch(cid(req), 'employees', req.params.id, { status: 'inactive' });
    if (!saved) return notFound(res, 'Employee');
    await query(`UPDATE users SET status = 'inactive', token_version = token_version + 1 WHERE company_id = $1 AND employee_id = $2 AND role <> 'super_admin'`, [cid(req), req.params.id]);
    await db.audit(cid(req), { ...actor(req), action: 'Employee deactivated', target: `${saved.name} (${saved.id})`, status: 'warning' });
    ok(res, { id: req.params.id });
  } catch (err) { next(err); }
});

dataRouter.delete('/employees/:id', adminOnly, async (req, res, next) => {
  try {
    const owner = await query(`SELECT 1 FROM users WHERE company_id = $1 AND employee_id = $2 AND role = 'super_admin'`, [cid(req), req.params.id]);
    if (owner.rowCount) return res.status(400).json({ success: false, message: 'This employee is a Super Admin. Remove their Super Admin role first.' });
    const removed = await db.remove(cid(req), 'employees', req.params.id);
    if (!removed) return notFound(res, 'Employee');
    await query(`DELETE FROM users WHERE company_id = $1 AND employee_id = $2`, [cid(req), req.params.id]);
    await db.audit(cid(req), { ...actor(req), action: 'Employee deleted', target: `${removed.name} (${removed.id})`, status: 'warning' });
    ok(res, { id: req.params.id });
  } catch (err) { next(err); }
});

// CSV / JSON bulk import
dataRouter.post('/employees/import', adminOnly, async (req, res, next) => {
  try {
    const { parse } = await import('csv-parse/sync');
    let rows: any[] = [];
    if (typeof req.body === 'string') {
      rows = parse(req.body, { columns: true, skip_empty_lines: true, trim: true });
    } else if (Array.isArray(req.body?.records)) {
      rows = req.body.records;
    }
    if (!rows.length) return res.status(400).json({ success: false, message: 'No employee rows found in the file.' });

    const pick = (r: any, ...keys: string[]) => {
      for (const k of keys) if (r[k] !== undefined && String(r[k]).trim() !== '') return String(r[k]).trim();
      return '';
    };
    const existing = await db.list(cid(req), 'employees');
    const byEmail = new Map(existing.map((e) => [String(e.email || '').toLowerCase(), e]));
    let activeCount = existing.filter((e) => e.status !== 'inactive').length;

    let importedCount = 0, updatedCount = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const email = pick(r, 'email', 'Email').toLowerCase();
      const name = pick(r, 'name', 'Name');
      if (!email || !name) { errors.push(`Row ${i + 2}: name and email are required.`); continue; }
      const prev = byEmail.get(email);
      if (!prev && activeCount >= req.company!.max_employees) {
        errors.push(`Row ${i + 2}: plan limit of ${req.company!.max_employees} employees reached.`);
        continue;
      }
      const doc = {
        ...(prev || { leaveUsed: {}, leaveBalance: {}, avatar: '' }),
        id: prev?.id || pick(r, 'id', 'ID', 'employeeId') || undefined,
        name,
        email,
        role: pick(r, 'role', 'Role', 'designation') || prev?.role || 'Staff',
        designation: pick(r, 'designation', 'Designation', 'role', 'Role') || prev?.designation || 'Staff',
        department: pick(r, 'department', 'Department') || prev?.department || 'General',
        phone: pick(r, 'phone', 'Phone') || prev?.phone || '',
        status: pick(r, 'status', 'Status') || prev?.status || 'active',
        joinDate: pick(r, 'join_date', 'joinDate', 'JoinDate') || prev?.joinDate || new Date().toISOString().split('T')[0],
        salary: Number(pick(r, 'salary', 'Salary')) || prev?.salary || 0,
        employmentType: pick(r, 'employment_type', 'employmentType') || prev?.employmentType || 'full_time',
        location: pick(r, 'location', 'Location') || prev?.location || '',
        shift: pick(r, 'shift', 'Shift') || prev?.shift || 'General',
        manager: pick(r, 'manager', 'Manager') || prev?.manager || '',
      };
      await db.put(cid(req), 'employees', doc);
      if (prev) updatedCount++; else { importedCount++; activeCount++; }
    }
    await db.audit(cid(req), { ...actor(req), action: 'Employees imported', newValue: `${importedCount} added, ${updatedCount} updated` });
    res.json({ success: true, message: `Imported ${importedCount}, updated ${updatedCount}.`, importedCount, updatedCount, errors, data: await db.list(cid(req), 'employees') });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

const EMPLOYEE_ATTENDANCE_UPDATABLE = ['exitTime', 'workHours', 'overtimeHours', 'notes', 'earlyExitMinutes'];

dataRouter.get('/attendance', async (req, res, next) => {
  try {
    const opts: any = { orderBy: 'date', limit: Number(req.query.limit) || 5000 };
    if (!isAdmin(req)) opts.employeeId = myEmployeeId(req) || '__none__';
    ok(res, await db.list(cid(req), 'attendance', opts));
  } catch (err) { next(err); }
});

dataRouter.post('/attendance', async (req, res, next) => {
  try {
    const rec = { ...(req.body || {}) };
    if (!isAdmin(req)) {
      const me = myEmployeeId(req);
      if (!me) return forbidden(res, 'Your account is not linked to an employee profile.');
      rec.employeeId = me;
      const today = new Date().toISOString().split('T')[0];
      if (rec.date && rec.date !== today) return forbidden(res, 'You can only check in for today.');
      rec.date = today;
      if (rec.id && (await db.get(cid(req), 'attendance', rec.id))) return forbidden(res, 'This record already exists.');
    }
    if (!rec.employeeId || !rec.date) return res.status(400).json({ success: false, message: 'Employee and date are required.' });
    ok(res, await db.put(cid(req), 'attendance', rec));
  } catch (err) { next(err); }
});

dataRouter.put('/attendance/:id', async (req, res, next) => {
  try {
    const existing = await db.get(cid(req), 'attendance', req.params.id);
    if (!existing) return notFound(res, 'Attendance record');
    let updates = { ...(req.body || {}) };
    if (!isAdmin(req)) {
      if (existing.employeeId !== myEmployeeId(req)) return forbidden(res);
      updates = Object.fromEntries(Object.entries(updates).filter(([k]) => EMPLOYEE_ATTENDANCE_UPDATABLE.includes(k)));
    }
    delete updates.employeeId;
    ok(res, await db.patch(cid(req), 'attendance', req.params.id, updates));
  } catch (err) { next(err); }
});

dataRouter.delete('/attendance/:id', adminOnly, async (req, res, next) => {
  try {
    const removed = await db.remove(cid(req), 'attendance', req.params.id);
    if (!removed) return notFound(res, 'Attendance record');
    const auditLog = {
      id: newId('aud'),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: req.user!.name,
      actorRole: req.user!.role,
      action: 'Attendance Record Deleted',
      target: `${removed.employeeName || 'Unknown'} (${removed.employeeId || 'unknown'})`,
      oldValue: `Date: ${removed.date || '—'}, Entry: ${removed.entryTime || '—'}, Exit: ${removed.exitTime || 'None'}, Status: ${removed.status || '—'}`,
      newValue: 'Record Removed',
      reason: 'Incorrect entry deleted by administrator.',
      ipAddress: clientIp(req),
      status: 'warning',
    };
    await db.put(cid(req), 'auditLogs', auditLog);
    ok(res, { deletedRecord: removed, auditLog });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Leave requests & policies
// ---------------------------------------------------------------------------

dataRouter.get('/leave-requests', async (req, res, next) => {
  try {
    const opts: any = {};
    if (!isAdmin(req)) opts.employeeId = myEmployeeId(req) || '__none__';
    ok(res, await db.list(cid(req), 'leaveRequests', opts));
  } catch (err) { next(err); }
});

dataRouter.post('/leave-requests', async (req, res, next) => {
  try {
    const lv = { ...(req.body || {}) };
    if (!isAdmin(req)) {
      lv.employeeId = myEmployeeId(req);
      lv.status = 'pending';
      if (lv.id && (await db.get(cid(req), 'leaveRequests', lv.id))) return forbidden(res, 'This request already exists.');
    }
    if (!lv.employeeId) return res.status(400).json({ success: false, message: 'Employee is required.' });
    ok(res, await db.put(cid(req), 'leaveRequests', lv));
  } catch (err) { next(err); }
});

dataRouter.put('/leave-requests/:id', async (req, res, next) => {
  try {
    const existing = await db.get(cid(req), 'leaveRequests', req.params.id);
    if (!existing) return notFound(res, 'Leave request');
    const updates = { ...(req.body || {}) };
    if (!isAdmin(req)) {
      if (existing.employeeId !== myEmployeeId(req) || existing.status !== 'pending') return forbidden(res);
      delete updates.status;
      delete updates.managerComment;
    }
    delete updates.employeeId;
    ok(res, await db.patch(cid(req), 'leaveRequests', req.params.id, updates));
  } catch (err) { next(err); }
});

dataRouter.delete('/leave-requests/:id', async (req, res, next) => {
  try {
    const existing = await db.get(cid(req), 'leaveRequests', req.params.id);
    if (!existing) return notFound(res, 'Leave request');
    if (!isAdmin(req) && (existing.employeeId !== myEmployeeId(req) || existing.status !== 'pending')) return forbidden(res);
    await db.remove(cid(req), 'leaveRequests', req.params.id);
    ok(res, { id: req.params.id });
  } catch (err) { next(err); }
});

dataRouter.get('/leave-policies', async (req, res, next) => {
  try { ok(res, (await db.list(cid(req), 'leavePolicies')).reverse()); } catch (err) { next(err); }
});

dataRouter.put('/leave-policies', adminOnly, async (req, res, next) => {
  try {
    const policies = Array.isArray(req.body) ? req.body : [];
    if (!policies.length) return res.status(400).json({ success: false, message: 'At least one leave policy is required.' });
    const saved = await db.replaceAll(cid(req), 'leavePolicies', policies.slice(0, 50));
    await db.audit(cid(req), { ...actor(req), action: 'Leave policies updated', newValue: saved.map((p) => `${p.name}: ${p.yearlyQuota}`).join(', ') });
    ok(res, saved);
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Departments, announcements, notifications, audit logs
// ---------------------------------------------------------------------------

dataRouter.get('/departments', async (req, res, next) => {
  try { ok(res, (await db.list(cid(req), 'departments')).reverse()); } catch (err) { next(err); }
});

dataRouter.post('/departments', adminOnly, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });
    const dup = await query(
      `SELECT 1 FROM records WHERE company_id = $1 AND collection = 'departments' AND lower(data->>'name') = lower($2) AND id <> $3`,
      [cid(req), name, String(req.body?.id || '')]
    );
    if (dup.rowCount) return res.status(409).json({ success: false, message: 'A department with this name already exists.' });
    ok(res, await db.put(cid(req), 'departments', { ...req.body, name }));
  } catch (err) { next(err); }
});

dataRouter.delete('/departments/:id', adminOnly, async (req, res, next) => {
  try {
    let removed = await db.remove(cid(req), 'departments', req.params.id);
    if (!removed) {
      // The UI sometimes deletes by name.
      const r = await query(
        `DELETE FROM records WHERE company_id = $1 AND collection = 'departments' AND lower(data->>'name') = lower($2) RETURNING data`,
        [cid(req), req.params.id]
      );
      removed = r.rows[0]?.data;
    }
    ok(res, { id: req.params.id });
  } catch (err) { next(err); }
});

dataRouter.get('/announcements', async (req, res, next) => {
  try { ok(res, await db.list(cid(req), 'announcements')); } catch (err) { next(err); }
});
dataRouter.post('/announcements', adminOnly, async (req, res, next) => {
  try { ok(res, await db.put(cid(req), 'announcements', { ...req.body, author: req.body?.author || req.user!.name })); } catch (err) { next(err); }
});
dataRouter.delete('/announcements/:id', adminOnly, async (req, res, next) => {
  try { await db.remove(cid(req), 'announcements', req.params.id); ok(res, { id: req.params.id }); } catch (err) { next(err); }
});

dataRouter.get('/notifications', async (req, res, next) => {
  try { ok(res, await db.list(cid(req), 'notifications', { limit: 200 })); } catch (err) { next(err); }
});
dataRouter.post('/notifications', async (req, res, next) => {
  try {
    if (!(await rateLimit(`notif:${req.user!.id}`, 60, 3600))) return res.status(429).json({ success: false, message: 'Too many notifications.' });
    ok(res, await db.put(cid(req), 'notifications', { read: false, ...req.body }));
  } catch (err) { next(err); }
});
dataRouter.put('/notifications/read-all', async (req, res, next) => {
  try {
    await query(`UPDATE records SET data = data || '{"read":true}'::jsonb WHERE company_id = $1 AND collection = 'notifications'`, [cid(req)]);
    ok(res, await db.list(cid(req), 'notifications', { limit: 200 }));
  } catch (err) { next(err); }
});
dataRouter.put('/notifications/:id/read', async (req, res, next) => {
  try { await db.patch(cid(req), 'notifications', req.params.id, { read: true }); ok(res, { id: req.params.id, read: true }); } catch (err) { next(err); }
});

dataRouter.get('/audit-logs', superOnly, async (req, res, next) => {
  try { ok(res, await db.list(cid(req), 'auditLogs', { limit: 2000 })); } catch (err) { next(err); }
});
// The UI writes its own descriptive log lines; the server stamps who/where so they can't be forged.
dataRouter.post('/audit-logs', async (req, res, next) => {
  try {
    if (!(await rateLimit(`audit:${req.user!.id}`, 120, 3600))) return res.status(429).json({ success: false, message: 'Too many requests.' });
    const log = {
      ...req.body,
      administrator: req.user!.name,
      actorRole: req.user!.role,
      ipAddress: clientIp(req),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    ok(res, await db.put(cid(req), 'auditLogs', log));
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

dataRouter.get('/holidays', async (req, res, next) => {
  try { ok(res, await getHolidays(req.company!)); } catch (err) { next(err); }
});
dataRouter.post('/holidays/sync', adminOnly, async (req, res, next) => {
  try {
    const result = await syncGovernmentHolidays(req.company!);
    res.json({
      success: true,
      message: `Government holidays synced (${result.added} added, ${result.updated} refreshed, ${result.skipped} skipped).`,
      result,
      data: await db.list(cid(req), 'holidays'),
    });
  } catch (err) { next(err); }
});
dataRouter.post('/holidays', adminOnly, async (req, res, next) => {
  try {
    const { title, date } = req.body || {};
    if (!title || !date) return res.status(400).json({ success: false, message: 'Holiday title and date are required.' });
    const all = await db.list(cid(req), 'holidays');
    if (all.some((h) => h.date === date && String(h.title).toLowerCase() === String(title).toLowerCase())) {
      return res.status(409).json({ success: false, message: 'This holiday already exists on the same date.' });
    }
    ok(res, await db.put(cid(req), 'holidays', { ...req.body, source: 'manual', externalId: undefined }));
  } catch (err) { next(err); }
});
dataRouter.put('/holidays/:id', adminOnly, async (req, res, next) => {
  try {
    const existing = await db.get(cid(req), 'holidays', req.params.id);
    if (!existing) return notFound(res, 'Holiday');
    if (existing.source === 'government' && existing.externalId) {
      // An edited government holiday becomes manual and is never overwritten by a later sync.
      await db.put(cid(req), 'holidayExclusions', { id: existing.externalId, title: existing.title });
    }
    ok(res, await db.put(cid(req), 'holidays', { ...existing, ...req.body, id: existing.id, source: 'manual', externalId: undefined }));
  } catch (err) { next(err); }
});
dataRouter.delete('/holidays/:id', adminOnly, async (req, res, next) => {
  try {
    const removed = await db.remove(cid(req), 'holidays', req.params.id);
    if (removed?.source === 'government' && removed.externalId) {
      await db.put(cid(req), 'holidayExclusions', { id: removed.externalId, title: removed.title });
    }
    ok(res, { id: req.params.id });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// User accounts (logins) — company scoped
// ---------------------------------------------------------------------------

const lastActiveSuperAdmin = async (companyId: string, userId: string) => {
  const t = await query(`SELECT role, status FROM users WHERE id = $1 AND company_id = $2`, [userId, companyId]);
  if (t.rows[0]?.role !== 'super_admin') return false;
  const others = await query(
    `SELECT COUNT(*)::int AS n FROM users WHERE company_id = $1 AND role = 'super_admin' AND status = 'active' AND id <> $2`,
    [companyId, userId]
  );
  return others.rows[0].n === 0;
};
const LAST_SUPER_ADMIN_MSG = 'This is the only active Super Admin. Make someone else Super Admin first.';
const COMPANY_ROLES = ['super_admin', 'admin', 'employee'];

dataRouter.get('/user-accounts', adminOnly, async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM users WHERE company_id = $1 ORDER BY name`, [cid(req)]);
    ok(res, r.rows.map(publicUser));
  } catch (err) { next(err); }
});

/**
 * Creates (or re-activates) a login. The emailed password is always the one
 * stored — the account is saved first and the email is sent only afterwards.
 */
dataRouter.post('/user-accounts', adminOnly, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    if (!email || !name) return res.status(400).json({ success: false, message: 'Name and email are required.' });
    let role = COMPANY_ROLES.includes(req.body?.role) ? req.body.role : 'employee';
    if (role === 'super_admin' && req.user!.role !== 'super_admin') role = 'employee';
    const rawPassword = String(req.body?.password || '').trim() || generatePassword();
    if (rawPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    const hash = await bcrypt.hash(rawPassword, 10);

    const existing = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (existing.rows[0] && existing.rows[0].company_id !== cid(req)) {
      return res.status(409).json({ success: false, message: 'This email is already registered with another company on Attendra.' });
    }

    const r = await query(
      `INSERT INTO users (id, company_id, email, password_hash, name, role, employee_id, status, avatar, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,TRUE)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role,
         employee_id = COALESCE(EXCLUDED.employee_id, users.employee_id), status = 'active',
         avatar = COALESCE(NULLIF(EXCLUDED.avatar,''), users.avatar), must_change_password = TRUE,
         token_version = users.token_version + 1
       RETURNING *, (xmax <> 0) AS was_update`,
      [newId('usr'), cid(req), email, hash, name, role, req.body?.employeeId || null, req.body?.avatar || '']
    );
    const row = r.rows[0];
    const emailResult = await sendAccountApprovedEmail(email, name, rawPassword, req.company!.name);
    await db.audit(cid(req), { ...actor(req), action: 'User account created', target: `${name} (${email})`, newValue: role });
    res.json({
      success: true,
      data: publicUser(row),
      alreadyExisted: !!row.was_update,
      emailSent: emailResult.success && !emailResult.simulated,
      emailSimulated: !!emailResult.simulated,
      // Shown to the admin only when the email could not be delivered.
      temporaryPassword: emailResult.success && !emailResult.simulated ? undefined : rawPassword,
    });
  } catch (err) { next(err); }
});

dataRouter.put('/user-accounts/:id', adminOnly, async (req, res, next) => {
  try {
    const id = req.params.id;
    const target = await query(`SELECT * FROM users WHERE id = $1 AND company_id = $2`, [id, cid(req)]);
    if (!target.rowCount) return notFound(res, 'Account');
    const u = req.body || {};
    if (u.role !== undefined && !COMPANY_ROLES.includes(u.role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    if ((u.role === 'super_admin' || target.rows[0].role === 'super_admin') && req.user!.role !== 'super_admin' && u.role !== undefined && u.role !== target.rows[0].role) {
      return forbidden(res, 'Only a Super Admin can change Super Admin roles.');
    }
    const demoting = (u.role && u.role !== 'super_admin') || (u.status && u.status !== 'active');
    if (demoting && (await lastActiveSuperAdmin(cid(req), id))) return res.status(400).json({ success: false, message: LAST_SUPER_ADMIN_MSG });
    const email = u.email ? String(u.email).trim().toLowerCase() : null;
    const r = await query(
      `UPDATE users SET email = COALESCE($3::text, email), name = COALESCE($4::text, name), role = COALESCE($5::text, role),
         status = COALESCE($6::text, status),
         token_version = CASE WHEN ($5::text IS NOT NULL AND $5::text <> role) OR ($6::text IS NOT NULL AND $6::text <> status) THEN token_version + 1 ELSE token_version END
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, cid(req), email, u.name ?? null, u.role ?? null, u.status ?? null]
    );
    ok(res, publicUser(r.rows[0]));
  } catch (err) {
    if ((err as any)?.code === '23505') return res.status(409).json({ success: false, message: 'This email is already in use.' });
    next(err);
  }
});

dataRouter.delete('/user-accounts/:id', adminOnly, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (id === req.user!.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    if (await lastActiveSuperAdmin(cid(req), id)) return res.status(400).json({ success: false, message: LAST_SUPER_ADMIN_MSG });
    const target = await query(`SELECT role FROM users WHERE id = $1 AND company_id = $2`, [id, cid(req)]);
    if (target.rows[0]?.role === 'super_admin' && req.user!.role !== 'super_admin') return forbidden(res, 'Only a Super Admin can remove a Super Admin.');
    await query(`DELETE FROM users WHERE id = $1 AND company_id = $2`, [id, cid(req)]);
    ok(res, { id });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Registration (access) requests — admin side. Public creation lives in public.ts
// ---------------------------------------------------------------------------

dataRouter.get('/registration-requests', adminOnly, async (req, res, next) => {
  try { ok(res, await db.list(cid(req), 'registrationRequests')); } catch (err) { next(err); }
});
dataRouter.put('/registration-requests/:id', adminOnly, async (req, res, next) => {
  try {
    const updates = { ...(req.body || {}) };
    delete updates.autoGeneratedPassword; // never store passwords in documents
    const saved = await db.patch(cid(req), 'registrationRequests', req.params.id, updates);
    if (!saved) return notFound(res, 'Request');
    ok(res, saved);
  } catch (err) { next(err); }
});
dataRouter.delete('/registration-requests/:id', adminOnly, async (req, res, next) => {
  try { await db.remove(cid(req), 'registrationRequests', req.params.id); ok(res, { id: req.params.id }); } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

dataRouter.post('/reports/export', adminOnly, (req, res) => {
  const { type, records } = req.body || {};
  if (!Array.isArray(records)) return res.status(400).json({ success: false, message: 'Invalid records provided.' });
  const headerKeys = Object.keys(records[0] || {});
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headerKeys.map(cell).join(','), ...records.map((r: any) => headerKeys.map((k) => cell(r[k])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Attendra_${String(type || 'report').replace(/[^\w-]/g, '')}_${Date.now()}.csv"`);
  res.send('﻿' + csv);
});
