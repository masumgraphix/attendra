import { JSONFilePreset } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export const JWT_SECRET = process.env.JWT_SECRET || 'attendra_saas_jwt_secret_2026_key';

let pgPool: pg.Pool | null = null;
let pgInitPromise: Promise<void> | null = null;

export const initPgDatabase = async (poolOverride?: pg.Pool): Promise<void> => {
  const pool = poolOverride || getPgPool();
  if (!pool) return;

  if (pgInitPromise) return pgInitPromise;

  pgInitPromise = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'employee',
          employee_id VARCHAR(64),
          status VARCHAR(20) DEFAULT 'active',
          avatar TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE TABLE IF NOT EXISTS employees (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          manager_id VARCHAR(64),
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          join_date VARCHAR(20),
          avatar TEXT,
          salary NUMERIC(12, 2) DEFAULT 0,
          leave_balances JSONB DEFAULT '{"casual": 10, "sick": 14, "annual": 15}'::jsonb,
          monthly_late_count INT DEFAULT 0,
          salary_deduction_days INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
        CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
        CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

        CREATE TABLE IF NOT EXISTS attendance (
          id VARCHAR(64) PRIMARY KEY,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255),
          employee_avatar TEXT,
          department VARCHAR(255),
          date VARCHAR(20) NOT NULL,
          check_in VARCHAR(20),
          check_out VARCHAR(20),
          status VARCHAR(50) NOT NULL,
          method VARCHAR(50),
          location VARCHAR(255),
          is_overtime BOOLEAN DEFAULT FALSE,
          hours_worked NUMERIC(5,2) DEFAULT 0,
          late_minutes NUMERIC(6,2) DEFAULT 0,
          early_exit_minutes NUMERIC(6,2) DEFAULT 0,
          reason TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

        CREATE TABLE IF NOT EXISTS leave_requests (
          id VARCHAR(64) PRIMARY KEY,
          employee_id VARCHAR(64) NOT NULL,
          type VARCHAR(50) NOT NULL,
          start_date VARCHAR(20) NOT NULL,
          end_date VARCHAR(20) NOT NULL,
          days NUMERIC(5,1) DEFAULT 1,
          reason TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          applied_on VARCHAR(20),
          approved_by VARCHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON leave_requests(employee_id, status);

        CREATE TABLE IF NOT EXISTS leave_policies (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(20) NOT NULL,
          total_days INT NOT NULL,
          carry_forward BOOLEAN DEFAULT FALSE,
          max_carry_forward_days INT DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS announcements (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'medium',
          target_department VARCHAR(255) DEFAULT 'all',
          date VARCHAR(20),
          author VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS holidays (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          date VARCHAR(20) NOT NULL,
          type VARCHAR(50) DEFAULT 'national'
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          timestamp VARCHAR(50) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          details TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_name);

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          timestamp VARCHAR(50) NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          type VARCHAR(50) DEFAULT 'info'
        );

        CREATE TABLE IF NOT EXISTS registration_requests (
          id VARCHAR(64) PRIMARY KEY,
          employee_id VARCHAR(64),
          employee_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          designation VARCHAR(255),
          dob VARCHAR(50),
          nid_number VARCHAR(100),
          requested_role VARCHAR(50),
          status VARCHAR(20) DEFAULT 'pending',
          requested_at VARCHAR(50)
        );
        ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS employee_id VARCHAR(64);
        ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
        ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS dob VARCHAR(50);
        ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS nid_number VARCHAR(100);

        ALTER TABLE employees ADD COLUMN IF NOT EXISTS dob VARCHAR(50);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS nid_number VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS location VARCHAR(255);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift VARCHAR(255);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);

        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS employee_avatar TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS department VARCHAR(255);
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes NUMERIC(6,2) DEFAULT 0;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_exit_minutes NUMERIC(6,2) DEFAULT 0;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS reason TEXT;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;

        CREATE TABLE IF NOT EXISTS late_penalty_rule (
          id INT PRIMARY KEY DEFAULT 1,
          threshold INT DEFAULT 3,
          deduction_days INT DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          email VARCHAR(255) PRIMARY KEY,
          code VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS departments (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          head_name VARCHAR(255),
          head_avatar TEXT,
          color VARCHAR(50) DEFAULT '#2563EB',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const userCheck = await pool.query(`SELECT COUNT(*) FROM users`);
      if (parseInt(userCheck.rows[0].count, 10) === 0) {
        console.log('🌱 Auto-seeding PostgreSQL database tables with initial accounts...');
        const superAdminPassHash = await bcrypt.hash('superadmin', 10);
        const adminPassHash = await bcrypt.hash('admin', 10);
        const empPassHash = await bcrypt.hash('password123', 10);

        await pool.query(`
          INSERT INTO users (id, email, password_hash, name, role, employee_id, status, avatar)
          VALUES
            ('USR-001', 'jhumatahmina@gmail.com', $1, 'Jhuma Tahmina', 'super_admin', 'DG-1008', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
            ('USR-002', 'kamrul89ster@gmail.com', $2, 'Kamrul Ster', 'admin', 'DG-1001', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
            ('USR-003', 'masum@attendra.io', $3, 'Md Masum Bellal', 'employee', 'DG-1002', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
            ('USR-004', 'nabil@attendra.io', $3, 'Nabil', 'employee', 'DG-1003', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200')
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            status = EXCLUDED.status;
        `, [superAdminPassHash, adminPassHash, empPassHash]);

        await pool.query(`
          INSERT INTO employees (id, name, role, department, manager_id, email, phone, status, join_date, avatar, salary, leave_balances, monthly_late_count, salary_deduction_days)
          VALUES
            ('DG-1008', 'Jhuma Tahmina', 'Chief Executive Officer', 'Executive', NULL, 'jhumatahmina@gmail.com', '+880 1711-000888', 'active', '2021-01-01', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 250000, '{"casual": 10, "sick": 14, "annual": 20}', 0, 0),
            ('DG-1001', 'Kamrul Ster', 'HR Manager', 'Human Resources', 'DG-1008', 'kamrul89ster@gmail.com', '+880 1711-000111', 'active', '2023-01-15', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 85000, '{"casual": 8, "sick": 10, "annual": 14}', 1, 0),
            ('DG-1002', 'Md Masum Bellal', 'Senior Software Engineer', 'Engineering', 'DG-1001', 'masum@attendra.io', '+880 1711-000222', 'active', '2022-06-01', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 110000, '{"casual": 5, "sick": 12, "annual": 10}', 4, 1),
            ('DG-1003', 'Nabil', 'UI/UX Designer', 'Design', 'DG-1001', 'nabil@attendra.io', '+880 1711-000333', 'active', '2023-09-10', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 75000, '{"casual": 10, "sick": 14, "annual": 15}', 0, 0)
          ON CONFLICT (id) DO UPDATE SET
            salary = EXCLUDED.salary,
            manager_id = EXCLUDED.manager_id;
        `);

        await pool.query(`
          INSERT INTO attendance (id, employee_id, date, check_in, status, method, location, is_overtime, hours_worked)
          VALUES
            ('ATT-001', 'DG-1002', '2026-08-01', '09:35 AM', 'late', 'fingerprint', 'Main HQ', false, 8.5),
            ('ATT-002', 'DG-1001', '2026-08-01', '08:55 AM', 'present', 'face_recognition', 'Main HQ', false, 8.8)
          ON CONFLICT (id) DO NOTHING;
        `);

        await pool.query(`
          INSERT INTO leave_policies (id, name, code, total_days, carry_forward, max_carry_forward_days)
          VALUES
            ('LP-01', 'Casual Leave', 'CL', 10, false, 0),
            ('LP-02', 'Sick Leave', 'SL', 14, false, 0),
            ('LP-03', 'Annual Leave', 'AL', 15, true, 5)
          ON CONFLICT (id) DO NOTHING;
        `);

        await pool.query(`
          INSERT INTO late_penalty_rule (id, threshold, deduction_days)
          VALUES (1, 3, 1)
          ON CONFLICT (id) DO UPDATE SET threshold = 3, deduction_days = 1;
        `);

        await pool.query(`
          INSERT INTO departments (id, name, description, head_name, head_avatar, color)
          VALUES
            ('DEP-101', 'Executive', 'C-Suite Executive Leadership & Board Management', 'Jhuma Tahmina', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', '#7C3AED'),
            ('DEP-102', 'Human Resources', 'People Operations, Recruitment & Employee Welfare', 'Kamrul Ster', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', '#2563EB'),
            ('DEP-103', 'Engineering', 'Software Engineering, Infrastructure & Cloud Ops', 'Md Masum Bellal', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', '#059669'),
            ('DEP-104', 'Design', 'Product UI/UX Design, Branding & Graphic Assets', 'Nabil', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', '#DB2777')
          ON CONFLICT (name) DO NOTHING;
        `);
      }
    } catch (err) {
      console.error('❌ Error initializing PostgreSQL database schema:', err);
      pgInitPromise = null;
    }
  })();

  return pgInitPromise;
};

export const getPgPool = (): pg.Pool | null => {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    initPgDatabase(pgPool).catch((err) => {
      console.error('Failed async PG init:', err);
    });
  }
  return pgPool;
};

export interface DatabaseSchema {
  userAccounts: any[];
  employees: any[];
  departments: any[];
  attendance: any[];
  leaveRequests: any[];
  leavePolicies: any[];
  announcements: any[];
  holidays: any[];
  auditLogs: any[];
  notifications: any[];
  registrationRequests: any[];
  passwordResetTokens: any[];
  latePenaltyRule: { threshold: number; deductionDays: number };
}

// Initial Seed Data
const INITIAL_ACCOUNTS = [
  {
    id: 'USR-001',
    email: 'jhumatahmina@gmail.com',
    password: 'superadmin',
    name: 'Jhuma Tahmina',
    role: 'super_admin',
    employeeId: 'DG-1008',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-01',
  },
  {
    id: 'USR-002',
    email: 'kamrul89ster@gmail.com',
    password: 'admin',
    name: 'Kamrul Ster',
    role: 'admin',
    employeeId: 'DG-1001',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-01',
  },
  {
    id: 'USR-003',
    email: 'masum@attendra.io',
    password: 'password123',
    name: 'Md Masum Bellal',
    role: 'employee',
    employeeId: 'DG-1002',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-01',
  },
  {
    id: 'USR-004',
    email: 'nabil@attendra.io',
    password: 'password123',
    name: 'Nabil',
    role: 'employee',
    employeeId: 'DG-1003',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-01',
  },
];

const INITIAL_EMPLOYEES_SEED = [
  {
    id: 'DG-1001',
    name: 'Kamrul Ster',
    role: 'HR Manager',
    department: 'Human Resources',
    managerId: 'DG-1008',
    email: 'kamrul89ster@gmail.com',
    phone: '+880 1711-000111',
    status: 'active',
    joinDate: '2023-01-15',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    salary: 85000,
    leaveBalances: { casual: 8, sick: 10, annual: 14 },
    monthlyLateCount: 1,
    salaryDeductionDays: 0,
  },
  {
    id: 'DG-1002',
    name: 'Md Masum Bellal',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    managerId: 'DG-1001',
    email: 'masum@attendra.io',
    phone: '+880 1711-000222',
    status: 'active',
    joinDate: '2022-06-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    salary: 110000,
    leaveBalances: { casual: 5, sick: 12, annual: 10 },
    monthlyLateCount: 4,
    salaryDeductionDays: 1,
  },
  {
    id: 'DG-1003',
    name: 'Nabil',
    role: 'UI/UX Designer',
    department: 'Design',
    managerId: 'DG-1001',
    email: 'nabil@attendra.io',
    phone: '+880 1711-000333',
    status: 'active',
    joinDate: '2023-09-10',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    salary: 75000,
    leaveBalances: { casual: 10, sick: 14, annual: 15 },
    monthlyLateCount: 0,
    salaryDeductionDays: 0,
  },
  {
    id: 'DG-1008',
    name: 'Jhuma Tahmina',
    role: 'Chief Executive Officer',
    department: 'Executive',
    managerId: null,
    email: 'jhumatahmina@gmail.com',
    phone: '+880 1711-000888',
    status: 'active',
    joinDate: '2021-01-01',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    salary: 250000,
    leaveBalances: { casual: 10, sick: 14, annual: 20 },
    monthlyLateCount: 0,
    salaryDeductionDays: 0,
  }
];

const defaultData: DatabaseSchema = {
  userAccounts: INITIAL_ACCOUNTS.map((acc) => ({
    ...acc,
    passwordHash: bcrypt.hashSync(acc.password || 'password123', 10),
    password: undefined,
  })),
  employees: INITIAL_EMPLOYEES_SEED,
  attendance: [],
  leaveRequests: [
    {
      id: 'LV-101',
      employeeId: 'DG-1002',
      type: 'casual',
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      days: 2,
      reason: 'Family event in hometown',
      status: 'pending',
      appliedOn: '2026-08-01',
    }
  ],
  leavePolicies: [
    { id: 'LP-01', name: 'Casual Leave', code: 'CL', totalDays: 10, carryForward: false },
    { id: 'LP-02', name: 'Sick Leave', code: 'SL', totalDays: 14, carryForward: false },
    { id: 'LP-03', name: 'Annual Leave', code: 'AL', totalDays: 15, carryForward: true, maxCarryForwardDays: 5 }
  ],
  announcements: [
    {
      id: 'ANN-01',
      title: 'Updated Office Attendance Policy',
      content: 'Grace period is strictly 20 minutes from work shift start (09:00 AM). 3 late check-ins result in 1 day salary deduction.',
      priority: 'high',
      targetDepartment: 'all',
      date: '2026-08-01',
      author: 'Jhuma Tahmina',
    }
  ],
  holidays: [
    { id: 'HOL-01', title: 'National Independence Day', date: '2026-03-26', type: 'national' },
    { id: 'HOL-02', title: 'Eid-ul-Fitr Holiday', date: '2026-03-20', type: 'religious' }
  ],
  auditLogs: [
    { id: 'LOG-01', timestamp: new Date().toISOString(), user: 'System', action: 'Database Seed', details: 'Initialized Attendra server database' }
  ],
  notifications: [
    { id: 'NOTIF-01', title: 'Welcome to Attendra', message: 'System database successfully mounted and active.', timestamp: new Date().toISOString(), read: false, type: 'system' }
  ],
  departments: [
    {
      id: 'DEP-101',
      name: 'Executive',
      description: 'C-Suite Executive Leadership & Board Management',
      headName: 'Jhuma Tahmina',
      headAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      color: '#7C3AED',
    },
    {
      id: 'DEP-102',
      name: 'Human Resources',
      description: 'People Operations, Recruitment & Employee Welfare',
      headName: 'Kamrul Ster',
      headAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      color: '#2563EB',
    },
    {
      id: 'DEP-103',
      name: 'Engineering',
      description: 'Software Engineering, Infrastructure & Cloud Ops',
      headName: 'Md Masum Bellal',
      headAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      color: '#059669',
    },
    {
      id: 'DEP-104',
      name: 'Design',
      description: 'Product UI/UX Design, Branding & Graphic Assets',
      headName: 'Nabil',
      headAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      color: '#DB2777',
    },
  ],
  registrationRequests: [],
  passwordResetTokens: [],
  latePenaltyRule: { threshold: 3, deductionDays: 1 },
};

// Ensure data directory exists.
// IMPORTANT: On serverless platforms (e.g. Vercel Functions) the filesystem is READ-ONLY
// except for /tmp. Trying to mkdir outside /tmp there throws (EROFS), and since this used
// to run at module load time (before any route ran), it crashed the ENTIRE server on every
// single request — not just requests that needed the local JSON fallback. We now catch that
// and fall back to a writable /tmp path instead, so a missing/read-only "data" folder can
// never take down the whole app. (Postgres, via DATABASE_URL, should be the real datastore
// in production — this local JSON file is only a last-resort fallback.)
let dbDir = path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.error('[db] Could not create/access "data" directory, falling back to /tmp:', err);
  dbDir = path.join('/tmp', 'attendra-data');
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err2) {
    console.error('[db] Could not create fallback /tmp data directory either:', err2);
  }
}

const dbPath = path.join(dbDir, 'attendra.db.json');

// Initialize lowdb instance
export const getDb = async () => {
  const db = await JSONFilePreset<DatabaseSchema>(dbPath, defaultData);
  let hasChange = false;
  db.data.userAccounts.forEach((acc) => {
    if (acc.password && !acc.passwordHash) {
      acc.passwordHash = bcrypt.hashSync(acc.password, 10);
      delete acc.password;
      hasChange = true;
    }
  });
  if (hasChange) {
    await db.write();
  }
  return db;
};

/**
 * Authentication Middleware
 * Checks standard Bearer Token in Authorization header or x-access-token.
 */
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] ? authHeader.split(' ')[1] : req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired authentication session.' });
    }
    req.user = user;
    next();
  });
};
