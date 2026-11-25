/**
 * Postgres access + versioned migrations.
 *
 * Multi-tenant model: every company's data is isolated by `company_id`.
 *  - `companies`  — one row per customer company (tenant)
 *  - `users`      — login accounts; company_id is NULL only for platform admins
 *  - `records`    — all company-scoped documents (employees, attendance, leave, …)
 *                   keyed by (company_id, collection, id) with the document in JSONB
 *
 * There is intentionally NO local-file fallback: on serverless hosts a file
 * store silently loses data between requests. Postgres is required.
 */
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool => {
  if (!pool) {
    // Tolerate common copy-paste wrappers: DATABASE_URL='…', psql '…', quotes, spaces.
    const raw = String(process.env.DATABASE_URL || '').trim();
    const match = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
    const url = match ? match[0] : '';
    if (!url) {
      throw new Error('DATABASE_URL is missing or is not a postgresql:// connection string.');
    }
    const isLocal = /@(localhost|127\.0\.0\.1)|host=\/|sslmode=disable/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
};

export const query = async <T = any>(sql: string, params: any[] = []): Promise<pg.QueryResult<T & pg.QueryResultRow>> => {
  await ensureMigrated();
  return getPool().query(sql, params);
};

/** Run fn inside a transaction on one client. */
export const tx = async <T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  await ensureMigrated();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------------------
// Migrations — append only. Never edit a migration that has shipped.
// ---------------------------------------------------------------------------

const MIGRATION_LOCK_ID = 918273646;

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_multi_tenant_core',
    sql: `
      -- Keep the single-company tables from v1/v2 around (renamed) so nothing is lost.
      DO $$
      DECLARE t text;
      BEGIN
        FOREACH t IN ARRAY ARRAY['users','employees','attendance','leave_requests','leave_policies',
          'announcements','holidays','holiday_sync_state','holiday_exclusions','audit_logs',
          'notifications','registration_requests','late_penalty_rule','password_reset_tokens',
          'departments','attendra_schema_meta']
        LOOP
          IF to_regclass('public.' || t) IS NOT NULL AND to_regclass('public.legacy_' || t) IS NULL THEN
            EXECUTE format('ALTER TABLE %I RENAME TO %I', t, 'legacy_' || t);
          END IF;
        END LOOP;
      END $$;

      CREATE TABLE companies (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        slug            TEXT NOT NULL UNIQUE,
        status          TEXT NOT NULL DEFAULT 'trial',   -- trial | active | suspended | cancelled
        plan            TEXT NOT NULL DEFAULT 'trial',
        max_employees   INT  NOT NULL DEFAULT 25,
        trial_ends_at   TIMESTAMPTZ,
        paid_until      TIMESTAMPTZ,
        phone           TEXT,
        settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE users (
        id                   TEXT PRIMARY KEY,
        company_id           TEXT REFERENCES companies(id) ON DELETE CASCADE,
        email                TEXT NOT NULL UNIQUE,
        password_hash        TEXT NOT NULL,
        name                 TEXT NOT NULL,
        role                 TEXT NOT NULL DEFAULT 'employee', -- platform_admin | super_admin | admin | employee
        employee_id          TEXT,
        status               TEXT NOT NULL DEFAULT 'active',
        avatar               TEXT,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        token_version        INT NOT NULL DEFAULT 0,
        last_login_at        TIMESTAMPTZ,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (email = lower(email)),
        CHECK ((role = 'platform_admin') = (company_id IS NULL))
      );
      CREATE INDEX idx_users_company ON users(company_id);

      CREATE TABLE records (
        company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        collection  TEXT NOT NULL,
        id          TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (company_id, collection, id)
      );
      CREATE INDEX idx_records_employee ON records(company_id, collection, (data->>'employeeId'));
      CREATE INDEX idx_records_date ON records(company_id, collection, (data->>'date'));
      CREATE INDEX idx_records_created ON records(company_id, collection, created_at DESC);

      CREATE TABLE password_reset_tokens (
        email       TEXT PRIMARY KEY,
        code_hash   TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        attempts    INT NOT NULL DEFAULT 0
      );

      CREATE TABLE rate_limits (
        key          TEXT PRIMARY KEY,
        hits         INT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL
      );
    `,
  },
  {
    id: '002_import_legacy_single_company',
    sql: `
      -- If the old single-company tables exist, move them into a "default" company
      -- so existing logins keep working after the upgrade.
      DO $$
      BEGIN
        -- (nested IFs: PL/pgSQL only plans a statement when it is reached)
        IF to_regclass('public.legacy_users') IS NULL THEN RETURN; END IF;
        IF EXISTS (SELECT 1 FROM legacy_users) THEN

          INSERT INTO companies (id, name, slug, status, plan, max_employees, trial_ends_at)
          VALUES ('cmp_default', 'My Company', 'my-company', 'active', 'business', 500, NULL)
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO users (id, company_id, email, password_hash, name, role, employee_id, status, avatar)
          SELECT 'usr_' || md5(lower(email)), 'cmp_default', lower(email), password_hash, name,
                 CASE WHEN role IN ('super_admin','admin','employee') THEN role ELSE 'employee' END,
                 employee_id, COALESCE(status,'active'), avatar
          FROM legacy_users
          ON CONFLICT (email) DO NOTHING;

          IF to_regclass('public.legacy_employees') IS NOT NULL THEN
            INSERT INTO records (company_id, collection, id, data)
            SELECT 'cmp_default', 'employees', id, jsonb_strip_nulls(jsonb_build_object(
              'id', id, 'name', name, 'role', role, 'designation', COALESCE(designation, role),
              'department', department, 'email', lower(email), 'phone', COALESCE(phone,''),
              'avatar', COALESCE(avatar,''), 'status', COALESCE(status,'active'),
              'employmentType', COALESCE(employment_type,'full_time'), 'location', COALESCE(location,''),
              'joinDate', join_date, 'shift', COALESCE(shift,''), 'manager', COALESCE(manager_name, manager_id, ''),
              'salary', salary, 'leaveBalance', COALESCE(leave_balances, '{}'::jsonb),
              'leaveUsed', COALESCE(leave_used, '{}'::jsonb), 'dob', dob, 'nidNumber', nid_number,
              'address', address, 'bloodGroup', blood_group))
            FROM legacy_employees
            ON CONFLICT DO NOTHING;
          END IF;

          IF to_regclass('public.legacy_departments') IS NOT NULL THEN
            INSERT INTO records (company_id, collection, id, data)
            SELECT 'cmp_default', 'departments', id, jsonb_strip_nulls(jsonb_build_object(
              'id', id, 'name', name, 'description', description, 'headName', head_name,
              'headAvatar', head_avatar, 'color', color))
            FROM legacy_departments ON CONFLICT DO NOTHING;
          END IF;

          IF to_regclass('public.legacy_leave_policies') IS NOT NULL THEN
            INSERT INTO records (company_id, collection, id, data)
            SELECT 'cmp_default', 'leavePolicies', id, jsonb_build_object(
              'id', id, 'name', name, 'yearlyQuota', total_days, 'colorTag', COALESCE(color_tag, 'blue'))
            FROM legacy_leave_policies ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END $$;
    `,
  },
];

let migratePromise: Promise<void> | null = null;

export const ensureMigrated = (): Promise<void> => {
  if (!migratePromise) {
    migratePromise = runMigrations().catch((err) => {
      migratePromise = null; // retry on next request
      throw err;
    });
  }
  return migratePromise;
};

const runMigrations = async () => {
  const p = getPool();
  // Fast path: everything already applied (avoids taking locks on every cold start).
  try {
    const done = await p.query(`SELECT id FROM schema_migrations`);
    const applied = new Set(done.rows.map((r) => r.id));
    if (MIGRATIONS.every((m) => applied.has(m.id))) return;
  } catch {
    /* table does not exist yet */
  }

  const client = await p.connect();
  try {
    await client.query(`SET statement_timeout = '120s'`);
    await client.query(`SELECT pg_advisory_lock($1)`, [MIGRATION_LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const done = await client.query(`SELECT id FROM schema_migrations`);
    const applied = new Set(done.rows.map((r) => r.id));
    for (const m of MIGRATIONS) {
      if (applied.has(m.id)) continue;
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [m.id]);
        await client.query('COMMIT');
        console.log(`[db] applied migration ${m.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[db] migration ${m.id} failed`, err);
        throw err;
      }
    }
  } finally {
    await client.query(`SELECT pg_advisory_unlock($1)`, [MIGRATION_LOCK_ID]).catch(() => {});
    await client.query(`RESET statement_timeout`).catch(() => {});
    client.release();
  }
};
