/**
 * Company-scoped document store. Every function takes companyId first so a
 * query can never touch another company's data by accident.
 */
import { query } from './db.js';
import { newId } from './auth.js';

export type Collection =
  | 'employees'
  | 'attendance'
  | 'leaveRequests'
  | 'leavePolicies'
  | 'announcements'
  | 'holidays'
  | 'holidayExclusions'
  | 'auditLogs'
  | 'notifications'
  | 'registrationRequests'
  | 'departments';

const ID_PREFIX: Record<Collection, string> = {
  employees: 'emp',
  attendance: 'att',
  leaveRequests: 'lv',
  leavePolicies: 'lp',
  announcements: 'ann',
  holidays: 'hol',
  holidayExclusions: 'hx',
  auditLogs: 'aud',
  notifications: 'not',
  registrationRequests: 'reg',
  departments: 'dep',
};

const cleanId = (id: unknown) => {
  const s = typeof id === 'string' ? id.trim() : '';
  return s && s.length <= 100 && /^[\w.\-:]+$/.test(s) ? s : '';
};

export const list = async (
  companyId: string,
  collection: Collection,
  opts: { employeeId?: string; limit?: number; orderBy?: 'created' | 'date' } = {}
): Promise<any[]> => {
  const params: any[] = [companyId, collection];
  let where = `company_id = $1 AND collection = $2`;
  if (opts.employeeId) {
    params.push(opts.employeeId);
    where += ` AND data->>'employeeId' = $${params.length}`;
  }
  const order = opts.orderBy === 'date' ? `data->>'date' DESC NULLS LAST, created_at DESC` : `created_at DESC`;
  const limit = opts.limit ? ` LIMIT ${Math.min(Math.max(1, Math.floor(opts.limit)), 20000)}` : '';
  const r = await query(`SELECT data FROM records WHERE ${where} ORDER BY ${order}${limit}`, params);
  return r.rows.map((row) => row.data);
};

export const get = async (companyId: string, collection: Collection, id: string): Promise<any | null> => {
  const r = await query(`SELECT data FROM records WHERE company_id = $1 AND collection = $2 AND id = $3`, [companyId, collection, id]);
  return r.rows[0]?.data ?? null;
};

export const count = async (companyId: string, collection: Collection, where = '', params: any[] = []): Promise<number> => {
  const r = await query(
    `SELECT COUNT(*)::int AS n FROM records WHERE company_id = $1 AND collection = $2 ${where}`,
    [companyId, collection, ...params]
  );
  return r.rows[0].n;
};

/** Insert or fully replace a document. Returns the stored document. */
export const put = async (companyId: string, collection: Collection, doc: any): Promise<any> => {
  const id = cleanId(doc?.id) || newId(ID_PREFIX[collection]);
  const data = { ...doc, id };
  delete (data as any).companyId;
  await query(
    `INSERT INTO records (company_id, collection, id, data) VALUES ($1, $2, $3, $4)
     ON CONFLICT (company_id, collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [companyId, collection, id, data]
  );
  return data;
};

/** Shallow-merge fields into an existing document. Returns null if it doesn't exist. */
export const patch = async (companyId: string, collection: Collection, id: string, fields: any): Promise<any | null> => {
  const clean = { ...fields };
  delete clean.id;
  delete clean.companyId;
  const r = await query(
    `UPDATE records SET data = data || $4::jsonb, updated_at = NOW()
     WHERE company_id = $1 AND collection = $2 AND id = $3 RETURNING data`,
    [companyId, collection, id, clean]
  );
  return r.rows[0]?.data ?? null;
};

export const remove = async (companyId: string, collection: Collection, id: string): Promise<any | null> => {
  const r = await query(
    `DELETE FROM records WHERE company_id = $1 AND collection = $2 AND id = $3 RETURNING data`,
    [companyId, collection, id]
  );
  return r.rows[0]?.data ?? null;
};

export const replaceAll = async (companyId: string, collection: Collection, docs: any[]): Promise<any[]> => {
  await query(`DELETE FROM records WHERE company_id = $1 AND collection = $2`, [companyId, collection]);
  const out: any[] = [];
  for (const d of docs) out.push(await put(companyId, collection, d));
  return out;
};

export const audit = async (
  companyId: string,
  entry: { actor: string; actorRole: string; action: string; target?: string; oldValue?: string; newValue?: string; reason?: string; ip?: string; status?: 'success' | 'warning' | 'security_flag' }
) => {
  try {
    await put(companyId, 'auditLogs', {
      id: newId('aud'),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: entry.actor,
      actorRole: entry.actorRole,
      action: entry.action,
      target: entry.target || '',
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason,
      ipAddress: entry.ip,
      status: entry.status || 'success',
    });
  } catch (err) {
    console.error('audit log write failed', err);
  }
};
