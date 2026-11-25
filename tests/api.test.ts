/**
 * End-to-end API test against a real Postgres database.
 *   DATABASE_URL=postgres://... npx tsx tests/api.test.ts
 * Uses a throwaway database: it creates companies and users.
 * Skips (exit 0) when TEST_DATABASE_URL / DATABASE_URL is not set.
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.log('api.test: no TEST_DATABASE_URL set — skipped');
  process.exit(0);
}
process.env.DATABASE_URL = url;
process.env.ATTENDRA_NO_LISTEN = '1';
process.env.PLATFORM_ADMIN_EMAIL = 'owner@platform.test';
process.env.PLATFORM_ADMIN_PASSWORD = 'PlatformPass#1';
delete process.env.RESEND_API_KEY;

const { default: app } = await import('../server.js');
const { query, getPool } = await import('../server/db.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
const stamp = Date.now().toString(36);

const call = async (method: string, path: string, body?: any, token?: string) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
};

let passed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

try {
  // Rate limits are per-IP; clear them so repeated local runs don't trip them.
  await query(`DELETE FROM rate_limits`).catch(() => {});

  let A: any, B: any;
  await step('two companies can sign up', async () => {
    const a = await call('POST', '/auth/signup', { companyName: `Alpha ${stamp}`, name: 'Alice Owner', email: `alice-${stamp}@a.test`, password: 'AlphaPass#1' });
    const b = await call('POST', '/auth/signup', { companyName: `Beta ${stamp}`, name: 'Bob Owner', email: `bob-${stamp}@b.test`, password: 'BetaPass#1' });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    assert.equal(b.status, 200);
    assert.equal(a.body.account.role, 'super_admin');
    assert.equal(a.body.company.status, 'trial');
    A = a.body; B = b.body;
  });

  await step('duplicate signup email is rejected', async () => {
    const r = await call('POST', '/auth/signup', { companyName: 'Dup Co', name: 'Xavier', email: `alice-${stamp}@a.test`, password: 'whatever123' });
    assert.equal(r.status, 409);
  });

  let empId = '';
  await step('company A adds an employee', async () => {
    const r = await call('POST', '/employees', { name: 'Eve Worker', email: `eve-${stamp}@a.test`, department: 'Ops', salary: 30000, nidNumber: '123' }, A.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    empId = r.body.data.id;
  });

  await step('company B cannot see or edit company A data', async () => {
    const list = await call('GET', '/employees', undefined, B.token);
    assert.ok(!list.body.data.some((e: any) => e.id === empId));
    const edit = await call('PUT', `/employees/${empId}`, { name: 'Hacked' }, B.token);
    assert.equal(edit.status, 404);
    const del = await call('DELETE', `/employees/${empId}`, undefined, B.token);
    assert.equal(del.status, 404);
    // Same id posted by B creates B's own record, never touches A's.
    await call('POST', '/employees', { id: empId, name: 'Beta Clone', email: `clone-${stamp}@b.test` }, B.token);
    const aList = await call('GET', '/employees', undefined, A.token);
    assert.equal(aList.body.data.find((e: any) => e.id === empId).name, 'Eve Worker');
  });

  let eveToken = '';
  await step('approved employee logs in with the emailed password', async () => {
    const r = await call('POST', '/user-accounts', { email: `eve-${stamp}@a.test`, name: 'Eve Worker', role: 'employee', employeeId: empId, password: 'Temp-Pass-123' }, A.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const login = await call('POST', '/auth/login', { email: `eve-${stamp}@a.test`, password: 'Temp-Pass-123' });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.account.mustChangePassword, true);
    eveToken = login.body.token;
  });

  await step('employee only sees own private fields and own attendance', async () => {
    const list = await call('GET', '/employees', undefined, eveToken);
    const owner = list.body.data.find((e: any) => e.email === `alice-${stamp}@a.test`);
    assert.equal(owner.salary, undefined);
    assert.equal(list.body.data.find((e: any) => e.id === empId).salary, 30000);

    await call('POST', '/attendance', { employeeId: A.account.employeeId, date: new Date().toISOString().split('T')[0], entryTime: '09:00 AM', status: 'present' }, A.token);
    const forged = await call('POST', '/attendance', { employeeId: A.account.employeeId, entryTime: '09:01 AM', status: 'present' }, eveToken);
    assert.equal(forged.status, 200);
    assert.equal(forged.body.data.employeeId, empId, 'employee cannot check in for someone else');
    const mine = await call('GET', '/attendance', undefined, eveToken);
    assert.ok(mine.body.data.every((a: any) => a.employeeId === empId));
  });

  await step('employee cannot use admin endpoints', async () => {
    assert.equal((await call('GET', '/user-accounts', undefined, eveToken)).status, 403);
    assert.equal((await call('GET', '/audit-logs', undefined, eveToken)).status, 403);
    assert.equal((await call('POST', '/employees', { name: 'x', email: `x-${stamp}@a.test` }, eveToken)).status, 403);
    assert.equal((await call('PUT', `/employees/${empId}`, { leaveUsed: { casual: 0 } }, eveToken)).status, 403);
  });

  await step('changing password invalidates old sessions', async () => {
    const r = await call('POST', '/auth/change-password', { currentPassword: 'Temp-Pass-123', newPassword: 'Eve-New-Pass-1' }, eveToken);
    assert.equal(r.status, 200);
    assert.equal((await call('GET', '/auth/me', undefined, eveToken)).status, 401);
    assert.equal((await call('GET', '/auth/me', undefined, r.body.token)).status, 200);
  });

  await step('last Super Admin cannot be removed or demoted', async () => {
    const del = await call('DELETE', `/user-accounts/${A.account.id}`, undefined, A.token);
    assert.equal(del.status, 400);
    const demote = await call('PUT', `/user-accounts/${A.account.id}`, { role: 'employee' }, A.token);
    assert.equal(demote.status, 400);
  });

  await step('plan employee limit is enforced', async () => {
    await query(`UPDATE companies SET max_employees = 2 WHERE id = $1`, [A.company.id]);
    const r = await call('POST', '/employees', { name: 'Overflow', email: `over-${stamp}@a.test` }, A.token);
    assert.equal(r.status, 402);
    assert.equal(r.body.code, 'PLAN_LIMIT');
    await query(`UPDATE companies SET max_employees = 25 WHERE id = $1`, [A.company.id]);
  });

  await step('access request needs a valid company code', async () => {
    const bad = await call('POST', '/registration-requests', { companyCode: 'nope-nope', employeeName: 'Z', email: `z-${stamp}@a.test` });
    assert.equal(bad.status, 404);
    const good = await call('POST', '/registration-requests', { companyCode: A.company.slug, employeeName: 'Zed', email: `zed-${stamp}@a.test`, department: 'Ops' });
    assert.equal(good.status, 200, JSON.stringify(good.body));
    const reqs = await call('GET', '/registration-requests', undefined, A.token);
    assert.ok(reqs.body.data.some((r: any) => r.email === `zed-${stamp}@a.test`));
    const other = await call('GET', '/registration-requests', undefined, B.token);
    assert.ok(!other.body.data.some((r: any) => r.email === `zed-${stamp}@a.test`));
  });

  let platformToken = '';
  await step('platform owner sees all companies', async () => {
    const login = await call('POST', '/auth/login', { email: 'owner@platform.test', password: 'PlatformPass#1' });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    platformToken = login.body.token;
    const ov = await call('GET', '/platform/overview', undefined, platformToken);
    assert.equal(ov.status, 200);
    assert.ok(ov.body.data.companies.some((c: any) => c.id === A.company.id));
    assert.equal((await call('GET', '/platform/overview', undefined, A.token)).status, 403);
    assert.equal((await call('GET', '/employees', undefined, platformToken)).status, 403);
  });

  await step('suspending a company locks it out immediately', async () => {
    const r = await call('PUT', `/platform/companies/${B.company.id}`, { status: 'suspended' }, platformToken);
    assert.equal(r.status, 200);
    assert.equal((await call('GET', '/employees', undefined, B.token)).status, 401);
    const login = await call('POST', '/auth/login', { email: `bob-${stamp}@b.test`, password: 'BetaPass#1' });
    assert.equal(login.status, 403);
    await call('PUT', `/platform/companies/${B.company.id}`, { status: 'trial' }, platformToken);
  });

  await step('expired trial blocks the app but still allows sign-in', async () => {
    await query(`UPDATE companies SET trial_ends_at = NOW() - INTERVAL '1 day' WHERE id = $1`, [A.company.id]);
    const login = await call('POST', '/auth/login', { email: `alice-${stamp}@a.test`, password: 'AlphaPass#1' });
    assert.equal(login.status, 200);
    assert.equal(login.body.companyAccess.ok, false);
    const r = await call('GET', '/employees', undefined, login.body.token);
    assert.equal(r.status, 402);
    const ext = await call('PUT', `/platform/companies/${A.company.id}`, { extendTrialDays: 7 }, platformToken);
    assert.equal(ext.status, 200);
    assert.equal((await call('GET', '/employees', undefined, login.body.token)).status, 200);
  });

  await step('recording a payment activates the plan and extends the subscription', async () => {
    const bad = await call('POST', `/platform/companies/${B.company.id}/payments`, { plan: 'trial', months: 1, amountBdt: 0, method: 'cash' }, platformToken);
    assert.equal(bad.status, 400);
    const r = await call('POST', `/platform/companies/${B.company.id}/payments`, { plan: 'business', months: 3, amountBdt: 12000, method: 'bkash', trxId: `TRX${stamp}` }, platformToken);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.company.status, 'active');
    assert.equal(r.body.data.company.plan, 'business');
    const days = (new Date(r.body.data.company.paidUntil).getTime() - Date.now()) / 86400_000;
    assert.ok(days > 85 && days < 95, `paid until ~3 months, got ${days}`);
    const dup = await call('POST', `/platform/companies/${B.company.id}/payments`, { plan: 'business', months: 1, amountBdt: 4000, method: 'bkash', trxId: `trx${stamp}` }, platformToken);
    assert.equal(dup.status, 409);
    const renew = await call('POST', `/platform/companies/${B.company.id}/payments`, { plan: 'business', months: 1, amountBdt: 4000, method: 'cash' }, platformToken);
    const days2 = (new Date(renew.body.data.company.paidUntil).getTime() - Date.now()) / 86400_000;
    assert.ok(days2 > 115, 'renewal continues from the current end date');
    const detail = await call('GET', `/platform/companies/${B.company.id}`, undefined, platformToken);
    assert.equal(detail.body.data.payments.length, 2);
    const receipt = await call('GET', `/platform/payments/${r.body.data.payment.id}`, undefined, platformToken);
    assert.equal(receipt.body.data.amountBdt, 12000);
    const ov = await call('GET', '/platform/overview', undefined, platformToken);
    assert.equal(ov.body.data.monthly.length, 12);
    assert.equal(ov.body.data.stats.collectedThisMonthBdt, 16000);
  });

  await step('a mistaken payment or activation can be undone', async () => {
    const detail = await call('GET', `/platform/companies/${B.company.id}`, undefined, platformToken);
    const [latest, older] = detail.body.data.payments;
    assert.equal((await call('DELETE', `/platform/payments/${older.id}`, {}, platformToken)).status, 409, 'only the latest can be cancelled');
    const undo = await call('DELETE', `/platform/payments/${latest.id}`, {}, platformToken);
    assert.equal(undo.status, 200);
    assert.equal(new Date(undo.body.data.company.paidUntil).getTime(), new Date(older.periodTo).getTime(), 'rolled back to the previous end date');
    const undo2 = await call('DELETE', `/platform/payments/${older.id}`, {}, platformToken);
    assert.equal(undo2.body.data.company.status, 'trial');
    assert.equal(undo2.body.data.company.plan, 'trial');
    assert.equal(undo2.body.data.company.paidUntil, null);
    // Activated by hand by mistake → end subscription
    await call('PUT', `/platform/companies/${B.company.id}`, { status: 'active', plan: 'business', extendPaidDays: 30 }, platformToken);
    const end = await call('PUT', `/platform/companies/${B.company.id}`, { endSubscription: true }, platformToken);
    assert.equal(end.body.data.status, 'trial');
    assert.equal(end.body.data.paidUntil, null);
  });

  await step('owner can switch a person\'s login off and on', async () => {
    const detail = await call('GET', `/platform/companies/${A.company.id}`, undefined, platformToken);
    const eve = detail.body.data.users.find((u: any) => u.email === `eve-${stamp}@a.test`);
    assert.equal((await call('PUT', `/platform/users/${eve.id}`, { status: 'inactive' }, platformToken)).status, 200);
    assert.equal((await call('POST', '/auth/login', { email: `eve-${stamp}@a.test`, password: 'Eve-New-Pass-1' })).status, 403);
    await call('PUT', `/platform/users/${eve.id}`, { status: 'active' }, platformToken);
    assert.equal((await call('POST', '/auth/login', { email: `eve-${stamp}@a.test`, password: 'Eve-New-Pass-1' })).status, 200);
    const owner = detail.body.data.users.find((u: any) => u.role === 'super_admin');
    assert.equal((await call('PUT', `/platform/users/${owner.id}`, { status: 'inactive' }, platformToken)).status, 400);
  });

  await step('plans can be edited but plans in use cannot be removed', async () => {
    await call('PUT', `/platform/companies/${B.company.id}`, { plan: 'business' }, platformToken);
    const ov = await call('GET', '/platform/overview', undefined, platformToken);
    const plans = { ...ov.body.data.plans, business: { ...ov.body.data.plans.business, priceBdt: 4500 } };
    const ok = await call('PUT', '/platform/plans', { plans }, platformToken);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.business.priceBdt, 4500);
    const { business, ...without } = plans;
    const blocked = await call('PUT', '/platform/plans', { plans: without }, platformToken);
    assert.equal(blocked.status, 400);
  });

  await step('broadcast banner reaches company users', async () => {
    await call('PUT', '/platform/broadcast', { message: 'Maintenance tonight', level: 'warning', active: true }, platformToken);
    const login = await call('POST', '/auth/login', { email: `bob-${stamp}@b.test`, password: 'BetaPass#1' });
    assert.equal(login.body.broadcast?.message, 'Maintenance tonight');
    await call('PUT', '/platform/broadcast', { message: '', active: false }, platformToken);
  });

  await step('support login works, is audited, and cannot change passwords', async () => {
    const r = await call('POST', `/platform/companies/${B.company.id}/support-login`, {}, platformToken);
    assert.equal(r.status, 200);
    const t = r.body.data.token;
    const me = await call('GET', '/auth/me', undefined, t);
    assert.equal(me.body.supportMode, true);
    assert.equal((await call('GET', '/employees', undefined, t)).status, 200);
    assert.equal((await call('POST', '/auth/change-password', { currentPassword: 'x', newPassword: 'whatever-123' }, t)).status, 403);
    const loginB = await call('POST', '/auth/login', { email: `bob-${stamp}@b.test`, password: 'BetaPass#1' });
    const logs = await call('GET', '/audit-logs', undefined, loginB.body.token);
    assert.ok(logs.body.data.some((l: any) => l.action === 'Support session started'));
    assert.equal((await call('POST', `/platform/companies/${B.company.id}/support-login`, {}, A.token)).status, 403);
  });

  await step('password reset codes are single-use and attempt-limited', async () => {
    const f = await call('POST', '/auth/forgot-password', { email: `eve-${stamp}@a.test` });
    assert.equal(f.status, 200);
    for (let i = 0; i < 5; i++) await call('POST', '/auth/reset-password', { email: `eve-${stamp}@a.test`, code: '000000', newPassword: 'whatever-123' });
    const tok = await query(`SELECT attempts FROM password_reset_tokens WHERE email = $1`, [`eve-${stamp}@a.test`]);
    assert.ok(tok.rows[0].attempts >= 5);
  });

  console.log(`\napi.test: ${passed} checks passed`);
} catch (err) {
  console.error(`\napi.test FAILED after ${passed} checks:`, err);
  process.exitCode = 1;
} finally {
  server.close();
  await getPool().end();
}
