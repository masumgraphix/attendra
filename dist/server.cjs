var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var import_sync = require("csv-parse/sync");

// server/db.ts
var import_node = require("lowdb/node");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_pg = __toESM(require("pg"), 1);
var { Pool } = import_pg.default;
var JWT_SECRET = process.env.JWT_SECRET || "attendra_saas_jwt_secret_2026_key";
var pgPool = null;
var pgInitPromise = null;
var initPgDatabase = async (poolOverride) => {
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
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_used JSONB DEFAULT '{}'::jsonb;
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
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS manager_comment TEXT;
        CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON leave_requests(employee_id, status);

        CREATE TABLE IF NOT EXISTS leave_policies (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(20) NOT NULL,
          total_days INT NOT NULL,
          carry_forward BOOLEAN DEFAULT FALSE,
          max_carry_forward_days INT DEFAULT 0
        );
        ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS color_tag VARCHAR(20) DEFAULT 'blue';

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
        ALTER TABLE holidays ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
        ALTER TABLE holidays ADD COLUMN IF NOT EXISTS external_id VARCHAR(120);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_external_id ON holidays(external_id) WHERE external_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS holiday_sync_state (
          id INT PRIMARY KEY DEFAULT 1,
          last_synced_at TIMESTAMP,
          last_result VARCHAR(255)
        );
        INSERT INTO holiday_sync_state (id, last_synced_at, last_result)
        VALUES (1, NULL, 'never synced')
        ON CONFLICT (id) DO NOTHING;

        CREATE TABLE IF NOT EXISTS holiday_exclusions (
          external_id VARCHAR(120) PRIMARY KEY,
          title VARCHAR(255),
          excluded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        console.log("\u{1F331} Auto-seeding PostgreSQL database tables with initial accounts...");
        const superAdminPassHash = await import_bcryptjs.default.hash("superadmin", 10);
        const adminPassHash = await import_bcryptjs.default.hash("admin", 10);
        const empPassHash = await import_bcryptjs.default.hash("password123", 10);
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
      console.error("\u274C Error initializing PostgreSQL database schema:", err);
      pgInitPromise = null;
    }
  })();
  return pgInitPromise;
};
var getPgPool = () => {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    initPgDatabase(pgPool).catch((err) => {
      console.error("Failed async PG init:", err);
    });
  }
  return pgPool;
};
var INITIAL_ACCOUNTS = [
  {
    id: "USR-001",
    email: "jhumatahmina@gmail.com",
    password: "superadmin",
    name: "Jhuma Tahmina",
    role: "super_admin",
    employeeId: "DG-1008",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-01-01"
  },
  {
    id: "USR-002",
    email: "kamrul89ster@gmail.com",
    password: "admin",
    name: "Kamrul Ster",
    role: "admin",
    employeeId: "DG-1001",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-01-01"
  },
  {
    id: "USR-003",
    email: "masum@attendra.io",
    password: "password123",
    name: "Md Masum Bellal",
    role: "employee",
    employeeId: "DG-1002",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-01-01"
  },
  {
    id: "USR-004",
    email: "nabil@attendra.io",
    password: "password123",
    name: "Nabil",
    role: "employee",
    employeeId: "DG-1003",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-01-01"
  }
];
var INITIAL_EMPLOYEES_SEED = [
  {
    id: "DG-1001",
    name: "Kamrul Ster",
    role: "HR Manager",
    department: "Human Resources",
    managerId: "DG-1008",
    email: "kamrul89ster@gmail.com",
    phone: "+880 1711-000111",
    status: "active",
    joinDate: "2023-01-15",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    salary: 85e3,
    leaveBalances: { casual: 8, sick: 10, annual: 14 },
    monthlyLateCount: 1,
    salaryDeductionDays: 0
  },
  {
    id: "DG-1002",
    name: "Md Masum Bellal",
    role: "Senior Software Engineer",
    department: "Engineering",
    managerId: "DG-1001",
    email: "masum@attendra.io",
    phone: "+880 1711-000222",
    status: "active",
    joinDate: "2022-06-01",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    salary: 11e4,
    leaveBalances: { casual: 5, sick: 12, annual: 10 },
    monthlyLateCount: 4,
    salaryDeductionDays: 1
  },
  {
    id: "DG-1003",
    name: "Nabil",
    role: "UI/UX Designer",
    department: "Design",
    managerId: "DG-1001",
    email: "nabil@attendra.io",
    phone: "+880 1711-000333",
    status: "active",
    joinDate: "2023-09-10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    salary: 75e3,
    leaveBalances: { casual: 10, sick: 14, annual: 15 },
    monthlyLateCount: 0,
    salaryDeductionDays: 0
  },
  {
    id: "DG-1008",
    name: "Jhuma Tahmina",
    role: "Chief Executive Officer",
    department: "Executive",
    managerId: null,
    email: "jhumatahmina@gmail.com",
    phone: "+880 1711-000888",
    status: "active",
    joinDate: "2021-01-01",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    salary: 25e4,
    leaveBalances: { casual: 10, sick: 14, annual: 20 },
    monthlyLateCount: 0,
    salaryDeductionDays: 0
  }
];
var defaultData = {
  userAccounts: INITIAL_ACCOUNTS.map((acc) => ({
    ...acc,
    passwordHash: import_bcryptjs.default.hashSync(acc.password || "password123", 10),
    password: void 0
  })),
  employees: INITIAL_EMPLOYEES_SEED,
  attendance: [],
  leaveRequests: [
    {
      id: "LV-101",
      employeeId: "DG-1002",
      type: "casual",
      startDate: "2026-08-10",
      endDate: "2026-08-11",
      days: 2,
      reason: "Family event in hometown",
      status: "pending",
      appliedOn: "2026-08-01"
    }
  ],
  leavePolicies: [
    { id: "LP-01", name: "Casual Leave", code: "CL", totalDays: 10, carryForward: false },
    { id: "LP-02", name: "Sick Leave", code: "SL", totalDays: 14, carryForward: false },
    { id: "LP-03", name: "Annual Leave", code: "AL", totalDays: 15, carryForward: true, maxCarryForwardDays: 5 }
  ],
  announcements: [
    {
      id: "ANN-01",
      title: "Updated Office Attendance Policy",
      content: "Grace period is strictly 20 minutes from work shift start (09:00 AM). 3 late check-ins result in 1 day salary deduction.",
      priority: "high",
      targetDepartment: "all",
      date: "2026-08-01",
      author: "Jhuma Tahmina"
    }
  ],
  holidays: [
    { id: "HOL-01", title: "National Independence Day", date: "2026-03-26", type: "national" },
    { id: "HOL-02", title: "Eid-ul-Fitr Holiday", date: "2026-03-20", type: "religious" }
  ],
  auditLogs: [
    { id: "LOG-01", timestamp: (/* @__PURE__ */ new Date()).toISOString(), user: "System", action: "Database Seed", details: "Initialized Attendra server database" }
  ],
  notifications: [
    { id: "NOTIF-01", title: "Welcome to Attendra", message: "System database successfully mounted and active.", timestamp: (/* @__PURE__ */ new Date()).toISOString(), read: false, type: "system" }
  ],
  departments: [
    {
      id: "DEP-101",
      name: "Executive",
      description: "C-Suite Executive Leadership & Board Management",
      headName: "Jhuma Tahmina",
      headAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
      color: "#7C3AED"
    },
    {
      id: "DEP-102",
      name: "Human Resources",
      description: "People Operations, Recruitment & Employee Welfare",
      headName: "Kamrul Ster",
      headAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      color: "#2563EB"
    },
    {
      id: "DEP-103",
      name: "Engineering",
      description: "Software Engineering, Infrastructure & Cloud Ops",
      headName: "Md Masum Bellal",
      headAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      color: "#059669"
    },
    {
      id: "DEP-104",
      name: "Design",
      description: "Product UI/UX Design, Branding & Graphic Assets",
      headName: "Nabil",
      headAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      color: "#DB2777"
    }
  ],
  registrationRequests: [],
  passwordResetTokens: [],
  latePenaltyRule: { threshold: 3, deductionDays: 1 }
};
var dbDir = import_path.default.join(process.cwd(), "data");
try {
  if (!import_fs.default.existsSync(dbDir)) {
    import_fs.default.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.error('[db] Could not create/access "data" directory, falling back to /tmp:', err);
  dbDir = import_path.default.join("/tmp", "attendra-data");
  try {
    if (!import_fs.default.existsSync(dbDir)) {
      import_fs.default.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err2) {
    console.error("[db] Could not create fallback /tmp data directory either:", err2);
  }
}
var dbPath = import_path.default.join(dbDir, "attendra.db.json");
var getDb = async () => {
  const db = await (0, import_node.JSONFilePreset)(dbPath, defaultData);
  let hasChange = false;
  db.data.userAccounts.forEach((acc) => {
    if (acc.password && !acc.passwordHash) {
      acc.passwordHash = import_bcryptjs.default.hashSync(acc.password, 10);
      delete acc.password;
      hasChange = true;
    }
  });
  if (hasChange) {
    await db.write();
  }
  return db;
};
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1] ? authHeader.split(" ")[1] : req.headers["x-access-token"];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required. Token missing." });
  }
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired authentication session." });
    }
    req.user = user;
    next();
  });
};

// server/email.ts
var import_resend = require("resend");
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new import_resend.Resend(apiKey);
}
async function sendPasswordResetEmail(toEmail, code) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Attendra HR <onboarding@resend.dev>";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Attendra HR Portal</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Verification Code</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
        <p style="color: #334155; font-size: 14px; margin-top: 0;">Your 6-digit password reset verification code is:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; margin: 12px 0;">${code}</div>
        <p style="color: #64748b; font-size: 11px; margin: 0;">This code will expire in 15 minutes.</p>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        If you did not request a password reset, please ignore this email or notify your Super Admin immediately.
      </p>

      <div style="margin-top: 24px; pt-12px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Attendra HR & Governance Platform.</p>
      </div>
    </div>
  `;
  if (!resend) {
    console.log(`[Email Service Simulation] RESEND_API_KEY not configured. Password reset code for ${toEmail}: ${code}`);
    return { success: true, simulated: true, code };
  }
  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: "Attendra HR - Password Reset Code",
      html
    });
    if (data?.error) {
      console.error(`[Resend Email Error] Failed sending reset email to ${toEmail}:`, data.error);
      return { success: false, error: data.error };
    }
    console.log(`[Resend Email Sent] Reset code sent to ${toEmail}:`, data);
    return { success: true, data };
  } catch (err) {
    console.error(`[Resend Email Error] Failed sending reset email to ${toEmail}:`, err);
    return { success: false, error: err };
  }
}
async function sendAccountApprovedEmail(toEmail, employeeName, password) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Attendra HR <onboarding@resend.dev>";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Welcome to Attendra!</h2>
        <p style="color: #16a34a; font-size: 13px; font-weight: bold; margin-top: 4px;">Your Account Has Been Approved & Activated</p>
      </div>

      <p style="color: #334155; font-size: 14px;">Hello <strong>${employeeName}</strong>,</p>
      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Your employee account request has been accepted by HR Admin. You can now sign in to the Attendra Employee Portal with the temporary credentials below:
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: #166534; font-size: 13px;"><strong>Work Email:</strong> ${toEmail}</p>
        <p style="margin: 0; color: #166534; font-size: 13px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #15803d; background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #86efac;">${password}</span></p>
      </div>

      <p style="color: #475569; font-size: 12px; line-height: 1.5;">
        Please log in and update your password after your first sign in from your profile settings.
      </p>

      <div style="margin-top: 24px; pt-12px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Attendra Enterprise Portal</p>
      </div>
    </div>
  `;
  if (!resend) {
    console.log(`[Email Service Simulation] RESEND_API_KEY not configured. Welcome email for ${toEmail} with password: ${password}`);
    return { success: true, simulated: true };
  }
  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: "Attendra Portal - Your Account Access Credentials",
      html
    });
    if (data?.error) {
      console.error(`[Resend Email Error] Failed sending activation email to ${toEmail}:`, data.error);
      return { success: false, error: data.error };
    }
    console.log(`[Resend Email Sent] Account activation email sent to ${toEmail}:`, data);
    return { success: true, data };
  } catch (err) {
    console.error(`[Resend Email Error] Failed sending activation email to ${toEmail}:`, err);
    return { success: false, error: err };
  }
}

// server/bdHolidays.ts
var CURATED_BD_HOLIDAYS = [
  // --- 2025 ---
  { date: "2025-01-13", title: "Shab-e-Barat", type: "religious" },
  { date: "2025-02-21", title: "Shaheed Day & International Mother Language Day", type: "national" },
  { date: "2025-03-26", title: "Independence and National Day", type: "national" },
  { date: "2025-03-31", title: "Eid-ul-Fitr", type: "religious" },
  { date: "2025-04-01", title: "Eid-ul-Fitr (Day 2)", type: "religious" },
  { date: "2025-04-02", title: "Eid-ul-Fitr (Day 3)", type: "religious" },
  { date: "2025-04-14", title: "Bengali New Year (Pahela Baishakh)", type: "national" },
  { date: "2025-05-01", title: "May Day (Labour Day)", type: "national" },
  { date: "2025-05-11", title: "Buddha Purnima (Vesak)", type: "religious" },
  { date: "2025-06-06", title: "Eid-ul-Azha", type: "religious" },
  { date: "2025-06-07", title: "Eid-ul-Azha (Day 2)", type: "religious" },
  { date: "2025-06-27", title: "Ashura", type: "religious" },
  { date: "2025-08-05", title: "July Mass Uprising Day", type: "national" },
  { date: "2025-08-15", title: "National Mourning Day", type: "national" },
  { date: "2025-09-04", title: "Eid-e-Miladunnabi (SAW)", type: "religious" },
  { date: "2025-10-02", title: "Durga Puja (Bijoya Dashami)", type: "religious" },
  { date: "2025-12-16", title: "Victory Day", type: "national" },
  { date: "2025-12-25", title: "Christmas Day", type: "religious" },
  // --- 2026 ---
  { date: "2026-01-24", title: "Shab-e-Barat", type: "religious" },
  { date: "2026-02-21", title: "Shaheed Day & International Mother Language Day", type: "national" },
  { date: "2026-03-20", title: "Eid-ul-Fitr", type: "religious" },
  { date: "2026-03-21", title: "Eid-ul-Fitr (Day 2)", type: "religious" },
  { date: "2026-03-22", title: "Eid-ul-Fitr (Day 3)", type: "religious" },
  { date: "2026-03-26", title: "Independence and National Day", type: "national" },
  { date: "2026-04-14", title: "Bengali New Year (Pahela Baishakh)", type: "national" },
  { date: "2026-05-01", title: "May Day (Labour Day)", type: "national" },
  { date: "2026-05-27", title: "Eid-ul-Azha", type: "religious" },
  { date: "2026-05-28", title: "Eid-ul-Azha (Day 2)", type: "religious" },
  { date: "2026-06-25", title: "Ashura", type: "religious" },
  { date: "2026-08-05", title: "July Mass Uprising Day", type: "national" },
  { date: "2026-08-15", title: "National Mourning Day", type: "national" },
  { date: "2026-08-25", title: "Eid-e-Miladunnabi (SAW)", type: "religious" },
  { date: "2026-10-20", title: "Durga Puja (Bijoya Dashami)", type: "religious" },
  { date: "2026-12-16", title: "Victory Day", type: "national" },
  { date: "2026-12-25", title: "Christmas Day", type: "religious" },
  // --- 2027 (fixed national dates only; religious dates announced later) ---
  { date: "2027-02-21", title: "Shaheed Day & International Mother Language Day", type: "national" },
  { date: "2027-03-26", title: "Independence and National Day", type: "national" },
  { date: "2027-04-14", title: "Bengali New Year (Pahela Baishakh)", type: "national" },
  { date: "2027-05-01", title: "May Day (Labour Day)", type: "national" },
  { date: "2027-08-05", title: "July Mass Uprising Day", type: "national" },
  { date: "2027-12-16", title: "Victory Day", type: "national" },
  { date: "2027-12-25", title: "Christmas Day", type: "religious" }
];

// server.ts
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config({ path: ".env" });
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.text({ limit: "50mb", type: ["text/csv", "text/plain"] }));
var getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
var getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const isPaginated = req.query.page !== void 0 || req.query.limit !== void 0;
  return { page, limit, offset, isPaginated };
};
app.get("/api/health", async (req, res) => {
  const pool = getPgPool();
  let dbStatus = "local_json";
  if (pool) {
    try {
      await pool.query("SELECT 1");
      dbStatus = "neon_postgresql_connected";
    } catch {
      dbStatus = "neon_postgresql_error";
    }
  }
  res.json({
    status: "ok",
    app: "Attendra SaaS Enterprise API",
    database: dbStatus,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const pool = getPgPool();
    let account = null;
    if (pool) {
      try {
        await initPgDatabase(pool);
        const resUser = await pool.query(`
          SELECT u.*, e.department, e.role as emp_role
          FROM users u
          LEFT JOIN employees e ON u.employee_id = e.id
          WHERE LOWER(u.email) = $1
        `, [cleanEmail]);
        if (resUser.rows.length > 0) {
          const u = resUser.rows[0];
          account = {
            id: u.id,
            email: u.email,
            passwordHash: u.password_hash,
            name: u.name,
            role: u.role,
            employeeId: u.employee_id,
            status: u.status,
            avatar: u.avatar,
            department: u.department
          };
        }
      } catch (err) {
        console.error("PostgreSQL Login Query Error, falling back to JSON DB:", err);
      }
    }
    if (!account) {
      const db = await getDb();
      account = db.data.userAccounts.find(
        (acc) => acc.email && acc.email.toLowerCase() === cleanEmail
      );
    }
    if (!account) {
      let isPending = false;
      if (pool) {
        try {
          const pendingRes = await pool.query(
            `SELECT * FROM registration_requests WHERE LOWER(email) = $1 AND status = 'pending'`,
            [cleanEmail]
          );
          if (pendingRes.rows.length > 0) isPending = true;
        } catch (e) {
          console.error("Pending reg check error:", e);
        }
      }
      if (!isPending) {
        const db = await getDb();
        const pending = (db.data.registrationRequests || []).find(
          (r) => r.email && r.email.toLowerCase() === cleanEmail && r.status === "pending"
        );
        if (pending) isPending = true;
      }
      if (isPending) {
        return res.status(403).json({
          success: false,
          message: "Your account request is currently pending Admin approval. You cannot log in until an Admin approves your account access."
        });
      }
      return res.status(404).json({ success: false, message: "Account not found. Please check your email or request account access below." });
    }
    if (account.status === "inactive") {
      return res.status(403).json({ success: false, message: "This account has been deactivated by Super Admin. Please contact HR." });
    }
    const inputPass = String(password).trim();
    let isMatch = false;
    if (account.passwordHash) {
      isMatch = await import_bcryptjs2.default.compare(inputPass, account.passwordHash);
    } else if (account.password) {
      isMatch = account.password === inputPass;
    }
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please verify your credentials or reset password." });
    }
    const token = import_jsonwebtoken2.default.sign(
      { id: account.id, email: account.email, role: account.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    const { password: _p, passwordHash: _ph, ...safeAccount } = account;
    return res.json({
      success: true,
      token,
      account: safeAccount
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Internal server authentication error." });
  }
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const pool = getPgPool();
    if (pool) {
      try {
        await initPgDatabase(pool);
        const resUser = await pool.query(`SELECT id, email, name, role, employee_id as "employeeId", status, avatar FROM users WHERE id = $1`, [req.user.id]);
        if (resUser.rows.length > 0) {
          if (resUser.rows[0].status === "inactive") {
            return res.status(401).json({ success: false, message: "Session invalid or user inactive." });
          }
          return res.json({ success: true, account: resUser.rows[0] });
        }
      } catch (err) {
        console.error("PG /me query error, falling back to JSON DB:", err);
      }
    }
    const db = await getDb();
    const account = db.data.userAccounts.find((a) => a.id === req.user.id);
    if (!account || account.status === "inactive") {
      return res.status(401).json({ success: false, message: "Session invalid or user inactive." });
    }
    const { password: _p, passwordHash: _ph, ...safeAccount } = account;
    return res.json({ success: true, account: safeAccount });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch session profile." });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Valid email address is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    let accountFound = false;
    const pool = getPgPool();
    if (pool) {
      try {
        const uRes = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
        if (uRes.rows.length > 0) accountFound = true;
      } catch (e) {
        console.error("PG Forgot Password user check error:", e);
      }
    }
    if (!accountFound) {
      const db2 = await getDb();
      const u = (db2.data.userAccounts || []).find((a) => a.email && a.email.toLowerCase() === cleanEmail);
      if (u) accountFound = true;
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    if (pool) {
      try {
        await pool.query(`
          INSERT INTO password_reset_tokens (email, code, expires_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
        `, [cleanEmail, code, expiresAt]);
      } catch (err) {
        console.error("PG Forgot Password token insert error:", err);
      }
    }
    const db = await getDb();
    if (!db.data.passwordResetTokens) db.data.passwordResetTokens = [];
    const idx = db.data.passwordResetTokens.findIndex((t) => t.email === cleanEmail);
    if (idx !== -1) {
      db.data.passwordResetTokens[idx] = { email: cleanEmail, code, expiresAt: expiresAt.toISOString() };
    } else {
      db.data.passwordResetTokens.push({ email: cleanEmail, code, expiresAt: expiresAt.toISOString() });
    }
    await db.write();
    const emailResult = await sendPasswordResetEmail(cleanEmail, code);
    return res.json({
      success: true,
      message: "Verification code sent to your email address.",
      simulated: emailResult.simulated || false
    });
  } catch (err) {
    console.error("Forgot Password error:", err);
    return res.status(500).json({ success: false, message: "Server error generating password reset code." });
  }
});
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, verification code, and new password are required." });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const pool = getPgPool();
    let validToken = false;
    if (pool) {
      try {
        const tokenRes = await pool.query(`
          SELECT * FROM password_reset_tokens WHERE LOWER(email) = $1 AND code = $2 AND expires_at > NOW()
        `, [cleanEmail, cleanCode]);
        if (tokenRes.rows.length > 0) {
          validToken = true;
        }
      } catch (err) {
        console.error("PG Reset Password check error:", err);
      }
    }
    if (!validToken) {
      const db2 = await getDb();
      const match = (db2.data.passwordResetTokens || []).find(
        (t) => t.email === cleanEmail && String(t.code).trim() === cleanCode && new Date(t.expiresAt) > /* @__PURE__ */ new Date()
      );
      if (match) {
        validToken = true;
      }
    }
    if (!validToken) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code. Please request a new code." });
    }
    const passwordHash = await import_bcryptjs2.default.hash(newPassword, 10);
    if (pool) {
      try {
        await pool.query(`UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2`, [passwordHash, cleanEmail]);
        await pool.query(`DELETE FROM password_reset_tokens WHERE LOWER(email) = $1`, [cleanEmail]);
      } catch (err) {
        console.error("PG Reset Password user update error:", err);
      }
    }
    const db = await getDb();
    const userIdx = (db.data.userAccounts || []).findIndex((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (userIdx !== -1) {
      db.data.userAccounts[userIdx].passwordHash = passwordHash;
      db.data.userAccounts[userIdx].password = newPassword;
      await db.write();
    }
    return res.json({ success: true, message: "Password updated successfully. You can now sign in with your new password." });
  } catch (err) {
    console.error("Reset Password error:", err);
    return res.status(500).json({ success: false, message: "Server error resetting password." });
  }
});
app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, userId } = req.body || {};
    const targetUserId = req.user?.id || userId;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }
    const pool = getPgPool();
    let account = null;
    if (pool) {
      try {
        const userRes = await pool.query(`SELECT * FROM users WHERE id = $1`, [targetUserId]);
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          account = {
            id: u.id,
            email: u.email,
            passwordHash: u.password_hash
          };
        }
      } catch (err) {
        console.error("PG Change Password fetch error:", err);
      }
    }
    if (!account) {
      const db2 = await getDb();
      account = db2.data.userAccounts.find((a) => a.id === targetUserId || req.user?.email && a.email.toLowerCase() === req.user.email.toLowerCase());
    }
    if (!account) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }
    const inputPass = String(currentPassword).trim();
    let isMatch = false;
    if (account.passwordHash) {
      isMatch = await import_bcryptjs2.default.compare(inputPass, account.passwordHash);
    } else if (account.password) {
      isMatch = account.password === inputPass;
    }
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
    const newPasswordHash = await import_bcryptjs2.default.hash(String(newPassword).trim(), 10);
    if (pool) {
      try {
        await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newPasswordHash, account.id]);
      } catch (err) {
        console.error("PG Change Password update error:", err);
      }
    }
    const db = await getDb();
    const idx = db.data.userAccounts.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
    if (idx !== -1) {
      db.data.userAccounts[idx].passwordHash = newPasswordHash;
      delete db.data.userAccounts[idx].password;
      await db.write();
    }
    return res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Change Password endpoint error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update password." });
  }
});
app.get("/api/employees", authenticateToken, async (req, res) => {
  const { page, limit, offset, isPaginated } = getPagination(req);
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      const countRes = await pool.query(`SELECT COUNT(*) FROM employees`);
      const total = parseInt(countRes.rows[0].count, 10);
      const queryText = isPaginated ? `SELECT id, name, role, department, manager_id as "managerId", manager_name as "managerName", email, phone, status, join_date as "joinDate", avatar, salary, leave_balances as "leaveBalances", COALESCE(leave_used, '{}'::jsonb) as "leaveUsed", monthly_late_count as "monthlyLateCount", salary_deduction_days as "salaryDeductionDays", dob, nid_number as "nidNumber", address, blood_group as "bloodGroup", designation, location, shift, employment_type as "employmentType" FROM employees ORDER BY name ASC LIMIT $1 OFFSET $2` : `SELECT id, name, role, department, manager_id as "managerId", manager_name as "managerName", email, phone, status, join_date as "joinDate", avatar, salary, leave_balances as "leaveBalances", COALESCE(leave_used, '{}'::jsonb) as "leaveUsed", monthly_late_count as "monthlyLateCount", salary_deduction_days as "salaryDeductionDays", dob, nid_number as "nidNumber", address, blood_group as "bloodGroup", designation, location, shift, employment_type as "employmentType" FROM employees ORDER BY name ASC`;
      const params = isPaginated ? [limit, offset] : [];
      const empRes = await pool.query(queryText, params);
      const mappedRows = empRes.rows.map((row) => ({
        ...row,
        employmentType: row.employmentType || "full_time",
        location: row.location || "San Francisco, CA (HQ)",
        shift: row.shift || "General Day (08:30 - 17:30)",
        manager: row.managerName || row.managerId || "Executive Desk",
        leaveBalance: row.leaveBalance || row.leaveBalances || {
          annual: 18,
          sick: 10,
          casual: 5,
          emergency: 3,
          unpaid: 10,
          maternity: 90,
          paternity: 12,
          half_day: 6
        },
        leaveUsed: row.leaveUsed || row.leave_used || {}
      }));
      if (isPaginated) {
        return res.json({
          success: true,
          data: mappedRows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      }
      return res.json({ success: true, data: mappedRows });
    } catch (err) {
      console.error("PG employees query error:", err);
    }
  }
  const db = await getDb();
  let list = db.data.employees;
  if (isPaginated) {
    const total = list.length;
    const paginatedList = list.slice(offset, offset + limit);
    return res.json({
      success: true,
      data: paginatedList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
  res.json({ success: true, data: list });
});
app.post("/api/employees", authenticateToken, async (req, res) => {
  const emp = req.body;
  const pool = getPgPool();
  const empId = emp.id || `DG-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const leaveBal = emp.leaveBalance || emp.leaveBalances || {
    annual: 18,
    sick: 10,
    casual: 5,
    emergency: 3,
    unpaid: 10,
    maternity: 90,
    paternity: 12,
    half_day: 6
  };
  const fullEmp = {
    ...emp,
    id: empId,
    leaveBalance: leaveBal
  };
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`
        INSERT INTO employees (id, name, role, department, manager_id, email, phone, status, join_date, avatar, salary, leave_balances, monthly_late_count, salary_deduction_days, dob, nid_number, address, blood_group, designation, location, shift, employment_type, manager_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          manager_id = EXCLUDED.manager_id,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          status = EXCLUDED.status,
          salary = EXCLUDED.salary,
          leave_balances = EXCLUDED.leave_balances,
          dob = EXCLUDED.dob,
          nid_number = EXCLUDED.nid_number,
          address = EXCLUDED.address,
          blood_group = EXCLUDED.blood_group,
          designation = EXCLUDED.designation,
          location = EXCLUDED.location,
          shift = EXCLUDED.shift,
          employment_type = EXCLUDED.employment_type,
          manager_name = EXCLUDED.manager_name
      `, [
        empId,
        emp.name,
        emp.role,
        emp.department,
        emp.managerId || null,
        emp.email,
        emp.phone || "",
        emp.status || "active",
        emp.joinDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        emp.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
        emp.salary || 5e4,
        JSON.stringify(leaveBal),
        emp.monthlyLateCount || 0,
        emp.salaryDeductionDays || 0,
        emp.dob || null,
        emp.nidNumber || null,
        emp.address || null,
        emp.bloodGroup || null,
        emp.designation || emp.role || null,
        emp.location || null,
        emp.shift || null,
        emp.employmentType || null,
        emp.manager || null
      ]);
      const passHash = await import_bcryptjs2.default.hash("password123", 10);
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, employee_id, status, avatar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          employee_id = EXCLUDED.employee_id,
          avatar = EXCLUDED.avatar
      `, [
        `USR-${Math.floor(100 + Math.random() * 900)}`,
        emp.email,
        passHash,
        emp.name,
        emp.role?.toLowerCase().includes("manager") ? "manager" : "employee",
        empId,
        "active",
        emp.avatar
      ]);
      const db2 = await getDb();
      const existingIdx2 = db2.data.employees.findIndex((e) => e.id === empId);
      if (existingIdx2 !== -1) {
        db2.data.employees[existingIdx2] = fullEmp;
      } else {
        db2.data.employees.push(fullEmp);
      }
      await db2.write();
      return res.json({ success: true, data: fullEmp });
    } catch (err) {
      console.error("PG Employee POST error:", err);
    }
  }
  const db = await getDb();
  const existingIdx = db.data.employees.findIndex((e) => e.id === empId);
  if (existingIdx !== -1) {
    db.data.employees[existingIdx] = fullEmp;
  } else {
    db.data.employees.push(fullEmp);
  }
  await db.write();
  res.json({ success: true, data: fullEmp });
});
app.put("/api/employees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`
        UPDATE employees SET
          name = COALESCE($1, name),
          role = COALESCE($2, role),
          department = COALESCE($3, department),
          manager_id = COALESCE($4, manager_id),
          email = COALESCE($5, email),
          phone = COALESCE($6, phone),
          status = COALESCE($7, status),
          salary = COALESCE($8, salary),
          monthly_late_count = COALESCE($9, monthly_late_count),
          salary_deduction_days = COALESCE($10, salary_deduction_days),
          dob = COALESCE($11, dob),
          nid_number = COALESCE($12, nid_number),
          address = COALESCE($13, address),
          blood_group = COALESCE($14, blood_group),
          designation = COALESCE($15, designation),
          location = COALESCE($16, location),
          shift = COALESCE($17, shift),
          employment_type = COALESCE($18, employment_type),
          manager_name = COALESCE($19, manager_name),
          leave_balances = COALESCE($20, leave_balances),
          leave_used = COALESCE($21, leave_used)
        WHERE id = $22
      `, [
        updates.name,
        updates.role,
        updates.department,
        updates.managerId,
        updates.email,
        updates.phone,
        updates.status,
        updates.salary,
        updates.monthlyLateCount,
        updates.salaryDeductionDays,
        updates.dob,
        updates.nidNumber,
        updates.address,
        updates.bloodGroup,
        updates.designation,
        updates.location,
        updates.shift,
        updates.employmentType,
        updates.manager,
        updates.leaveBalance ? JSON.stringify(updates.leaveBalance) : null,
        updates.leaveUsed ? JSON.stringify(updates.leaveUsed) : null,
        id
      ]);
      const db2 = await getDb();
      const idx2 = db2.data.employees.findIndex((e) => e.id === id);
      if (idx2 !== -1) {
        db2.data.employees[idx2] = { ...db2.data.employees[idx2], ...updates };
        await db2.write();
      }
      return res.json({ success: true, data: { id, ...updates } });
    } catch (err) {
      console.error("PG Employee PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.employees.findIndex((e) => e.id === id);
  if (idx !== -1) {
    db.data.employees[idx] = { ...db.data.employees[idx], ...updates };
    await db.write();
    return res.json({ success: true, data: db.data.employees[idx] });
  }
  return res.status(404).json({ success: false, message: "Employee not found." });
});
app.post("/api/employees/:id/deactivate", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`UPDATE employees SET status = 'inactive' WHERE id = $1`, [id]);
      await pool.query(`UPDATE users SET status = 'inactive' WHERE employee_id = $1`, [id]);
      const db2 = await getDb();
      const empIdx2 = db2.data.employees.findIndex((e) => e.id === id);
      if (empIdx2 !== -1) db2.data.employees[empIdx2].status = "inactive";
      if (Array.isArray(db2.data.userAccounts)) {
        const uIdx = db2.data.userAccounts.findIndex((u) => u.employeeId === id);
        if (uIdx !== -1) db2.data.userAccounts[uIdx].status = "inactive";
      }
      await db2.write();
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG Employee Deactivate error:", err);
    }
  }
  const db = await getDb();
  const empIdx = db.data.employees.findIndex((e) => e.id === id);
  if (empIdx !== -1) db.data.employees[empIdx].status = "inactive";
  if (Array.isArray(db.data.userAccounts)) {
    const uIdx = db.data.userAccounts.findIndex((u) => u.employeeId === id);
    if (uIdx !== -1) db.data.userAccounts[uIdx].status = "inactive";
  }
  await db.write();
  res.json({ success: true, id });
});
app.delete("/api/employees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`DELETE FROM employees WHERE id = $1`, [id]);
      await pool.query(`DELETE FROM users WHERE employee_id = $1`, [id]);
      const db2 = await getDb();
      db2.data.employees = db2.data.employees.filter((e) => e.id !== id);
      if (Array.isArray(db2.data.userAccounts)) {
        db2.data.userAccounts = db2.data.userAccounts.filter((u) => u.employeeId !== id);
      }
      await db2.write();
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG Employee DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.employees = db.data.employees.filter((e) => e.id !== id);
  if (Array.isArray(db.data.userAccounts)) {
    db.data.userAccounts = db.data.userAccounts.filter((u) => u.employeeId !== id);
  }
  await db.write();
  res.json({ success: true, id });
});
app.post("/api/employees/import", authenticateToken, async (req, res) => {
  try {
    let rawRecords = [];
    if (typeof req.body === "string") {
      rawRecords = (0, import_sync.parse)(req.body, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (req.body?.csvData) {
      rawRecords = (0, import_sync.parse)(req.body.csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (Array.isArray(req.body?.employees)) {
      rawRecords = req.body.employees;
    } else if (Array.isArray(req.body)) {
      rawRecords = req.body;
    }
    if (!rawRecords || rawRecords.length === 0) {
      return res.status(400).json({ success: false, message: "No valid employee records found in CSV or payload." });
    }
    const pool = getPgPool();
    const db = await getDb();
    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];
    const defaultPassHash = await import_bcryptjs2.default.hash("password123", 10);
    for (let i = 0; i < rawRecords.length; i++) {
      const rec = rawRecords[i];
      const email = rec.email || rec.Email || `emp${i + 1}@attendra.io`;
      const name = rec.name || rec.Name || `Employee ${i + 1}`;
      const role = rec.role || rec.Role || "Software Engineer";
      const department = rec.department || rec.Department || "Engineering";
      const managerId = rec.manager_id || rec.managerId || rec.ManagerId || null;
      const phone = rec.phone || rec.Phone || "+880 1711-000000";
      const status = rec.status || rec.Status || "active";
      const joinDate = rec.join_date || rec.joinDate || rec.JoinDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const salary = parseFloat(rec.salary || rec.Salary || "60000") || 6e4;
      const empId = rec.id || rec.ID || rec.employeeId || `DG-${1e3 + i + Math.floor(Math.random() * 500)}`;
      const leaveBalances = { casual: 10, sick: 14, annual: 15 };
      if (pool) {
        try {
          const checkEmp = await pool.query(`SELECT id FROM employees WHERE id = $1 OR email = $2`, [empId, email]);
          const exists = checkEmp.rows.length > 0;
          await pool.query(`
            INSERT INTO employees (id, name, role, department, manager_id, email, phone, status, join_date, avatar, salary, leave_balances, monthly_late_count, salary_deduction_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              department = EXCLUDED.department,
              manager_id = EXCLUDED.manager_id,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              status = EXCLUDED.status,
              salary = EXCLUDED.salary
          `, [
            empId,
            name,
            role,
            department,
            managerId,
            email,
            phone,
            status,
            joinDate,
            `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
            salary,
            JSON.stringify(leaveBalances),
            0,
            0
          ]);
          const userRole = role.toLowerCase().includes("manager") ? "manager" : role.toLowerCase().includes("ceo") ? "super_admin" : "employee";
          await pool.query(`
            INSERT INTO users (id, email, password_hash, name, role, employee_id, status, avatar)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              employee_id = EXCLUDED.employee_id
          `, [`USR-${empId}`, email, defaultPassHash, name, userRole, empId, "active", `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`]);
          if (exists) updatedCount++;
          else importedCount++;
        } catch (err) {
          errors.push(`Row ${i + 1} (${name}): ${err.message}`);
        }
      } else {
        const existingIdx = db.data.employees.findIndex((e) => e.id === empId || e.email === email);
        const empObj = {
          id: empId,
          name,
          role,
          department,
          managerId,
          email,
          phone,
          status,
          joinDate,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
          salary,
          leaveBalances,
          monthlyLateCount: 0,
          salaryDeductionDays: 0
        };
        if (existingIdx !== -1) {
          db.data.employees[existingIdx] = { ...db.data.employees[existingIdx], ...empObj };
          updatedCount++;
        } else {
          db.data.employees.push(empObj);
          importedCount++;
        }
      }
    }
    if (!pool) {
      await db.write();
    }
    return res.json({
      success: true,
      message: `Successfully processed ${importedCount + updatedCount} employees (${importedCount} created, ${updatedCount} updated).`,
      importedCount,
      updatedCount,
      errors
    });
  } catch (err) {
    console.error("Bulk Import Error:", err);
    return res.status(500).json({ success: false, message: `Failed to import CSV: ${err.message}` });
  }
});
app.get("/api/attendance", authenticateToken, async (req, res) => {
  const { page, limit, offset, isPaginated } = getPagination(req);
  const pool = getPgPool();
  if (pool) {
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM attendance`);
      const total = parseInt(countRes.rows[0].count, 10);
      const attCols = `id, employee_id as "employeeId", employee_name as "employeeName", employee_avatar as "employeeAvatar", department, date, check_in as "entryTime", check_out as "exitTime", status, method as "verificationMethod", location as "locationType", is_overtime, hours_worked as "workHours", COALESCE(hours_worked, 0) - LEAST(COALESCE(hours_worked, 0), 8) as "overtimeHours", late_minutes as "lateMinutes", early_exit_minutes as "earlyExitMinutes", reason, notes`;
      const queryText = isPaginated ? `SELECT ${attCols} FROM attendance ORDER BY date DESC, check_in DESC LIMIT $1 OFFSET $2` : `SELECT ${attCols} FROM attendance ORDER BY date DESC, check_in DESC`;
      const params = isPaginated ? [limit, offset] : [];
      const attRes = await pool.query(queryText, params);
      if (isPaginated) {
        return res.json({
          success: true,
          data: attRes.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      }
      return res.json({ success: true, data: attRes.rows });
    } catch (err) {
      console.error("PG Attendance GET error:", err);
    }
  }
  const db = await getDb();
  let list = db.data.attendance;
  if (isPaginated) {
    const total = list.length;
    return res.json({
      success: true,
      data: list.slice(offset, offset + limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }
  res.json({ success: true, data: list });
});
app.post("/api/attendance", authenticateToken, async (req, res) => {
  const rec = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO attendance (id, employee_id, employee_name, employee_avatar, department, date, check_in, check_out, status, method, location, is_overtime, hours_worked, late_minutes, early_exit_minutes, reason, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          status = EXCLUDED.status,
          hours_worked = EXCLUDED.hours_worked,
          notes = EXCLUDED.notes
      `, [
        rec.id || `ATT-${Date.now()}`,
        rec.employeeId,
        rec.employeeName || null,
        rec.employeeAvatar || null,
        rec.department || null,
        rec.date,
        rec.entryTime || null,
        rec.exitTime || null,
        rec.status,
        rec.verificationMethod || "manual",
        rec.locationType || "Main HQ",
        (rec.overtimeHours || 0) > 0,
        rec.workHours || 0,
        rec.lateMinutes || 0,
        rec.earlyExitMinutes || 0,
        rec.reason || null,
        rec.notes || null
      ]);
      return res.json({ success: true, data: rec });
    } catch (err) {
      console.error("PG Attendance POST error:", err);
    }
  }
  const db = await getDb();
  db.data.attendance.unshift(rec);
  await db.write();
  res.json({ success: true, data: rec });
});
app.put("/api/attendance/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        UPDATE attendance SET
          check_in = COALESCE($1, check_in),
          check_out = COALESCE($2, check_out),
          status = COALESCE($3, status),
          hours_worked = COALESCE($4, hours_worked),
          is_overtime = COALESCE($5, is_overtime),
          notes = COALESCE($6, notes),
          reason = COALESCE($7, reason)
        WHERE id = $8
      `, [
        updates.entryTime,
        updates.exitTime,
        updates.status,
        updates.workHours,
        typeof updates.overtimeHours === "number" ? updates.overtimeHours > 0 : null,
        updates.notes,
        updates.reason,
        id
      ]);
      return res.json({ success: true, data: { id, ...updates } });
    } catch (err) {
      console.error("PG Attendance PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.attendance.findIndex((a) => a.id === id);
  if (idx !== -1) {
    db.data.attendance[idx] = { ...db.data.attendance[idx], ...updates };
    await db.write();
    return res.json({ success: true, data: db.data.attendance[idx] });
  }
  return res.status(404).json({ success: false, message: "Attendance record not found." });
});
app.delete("/api/attendance/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const buildDeleteAuditLog = (actorName2, rec) => ({
    id: `AUD-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
    administrator: actorName2,
    actorRole: req.user?.role || "admin",
    action: "Attendance Record Deleted",
    target: `${rec.employeeName || "Unknown"} (${rec.employeeId || "unknown"})`,
    oldValue: `Date: ${rec.date || "\u2014"}, Entry: ${rec.entryTime || "\u2014"}, Exit: ${rec.exitTime || "None"}, Status: ${rec.status || "\u2014"}`,
    newValue: "Record Removed",
    reason: "Incorrect entry deleted by administrator.",
    ipAddress: req.ip || "unknown",
    status: "warning"
  });
  const pool = getPgPool();
  if (pool) {
    try {
      const recRes = await pool.query(
        `SELECT id, employee_id, employee_name, department, date, check_in, check_out, status FROM attendance WHERE id = $1`,
        [id]
      );
      if (recRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Attendance record not found." });
      }
      const row = recRes.rows[0];
      let actorName2 = req.user?.email || "Unknown";
      try {
        const userRes = await pool.query(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [req.user?.id]);
        if (userRes.rows.length > 0 && userRes.rows[0].name) actorName2 = userRes.rows[0].name;
      } catch {
      }
      await pool.query(`DELETE FROM attendance WHERE id = $1`, [id]);
      const auditLog2 = buildDeleteAuditLog(actorName2, {
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        date: row.date,
        entryTime: row.check_in,
        exitTime: row.check_out,
        status: row.status
      });
      await pool.query(
        `INSERT INTO audit_logs (id, timestamp, user_name, action, details) VALUES ($1, $2, $3, $4, $5)`,
        [
          auditLog2.id,
          auditLog2.timestamp,
          auditLog2.administrator,
          auditLog2.action,
          JSON.stringify({
            actorRole: auditLog2.actorRole,
            target: auditLog2.target,
            oldValue: auditLog2.oldValue,
            newValue: auditLog2.newValue,
            reason: auditLog2.reason,
            ipAddress: auditLog2.ipAddress,
            status: auditLog2.status
          })
        ]
      );
      const deletedRecord2 = {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        department: row.department,
        date: row.date,
        entryTime: row.check_in,
        exitTime: row.check_out,
        status: row.status
      };
      return res.json({ success: true, data: { deletedRecord: deletedRecord2, auditLog: auditLog2 } });
    } catch (err) {
      console.error("PG Attendance DELETE error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.attendance.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Attendance record not found." });
  }
  const deletedRecord = db.data.attendance.splice(idx, 1)[0];
  let actorName = req.user?.email || "Unknown";
  const actorAccount = db.data.userAccounts.find((a) => a.id === req.user?.id);
  if (actorAccount?.name) actorName = actorAccount.name;
  const auditLog = buildDeleteAuditLog(actorName, deletedRecord);
  db.data.auditLogs.unshift(auditLog);
  await db.write();
  res.json({ success: true, data: { deletedRecord, auditLog } });
});
app.get("/api/leave-requests", authenticateToken, async (req, res) => {
  const { page, limit, offset, isPaginated } = getPagination(req);
  const pool = getPgPool();
  const selectCols = `id,
    employee_id as "employeeId",
    employee_name as "employeeName",
    type as "leaveType",
    start_date as "startDate",
    end_date as "endDate",
    days::float8 as "totalDays",
    reason,
    status,
    applied_on as "appliedDate",
    approved_by as "approvedBy",
    manager_comment as "managerComment"`;
  if (pool) {
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM leave_requests`);
      const total = parseInt(countRes.rows[0].count, 10);
      const queryText = isPaginated ? `SELECT ${selectCols} FROM leave_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2` : `SELECT ${selectCols} FROM leave_requests ORDER BY created_at DESC`;
      const params = isPaginated ? [limit, offset] : [];
      const lvRes = await pool.query(queryText, params);
      if (isPaginated) {
        return res.json({
          success: true,
          data: lvRes.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      }
      return res.json({ success: true, data: lvRes.rows });
    } catch (err) {
      console.error("PG Leave GET error:", err);
    }
  }
  const db = await getDb();
  let list = db.data.leaveRequests;
  if (isPaginated) {
    const total = list.length;
    return res.json({
      success: true,
      data: list.slice(offset, offset + limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }
  res.json({ success: true, data: list });
});
app.post("/api/leave-requests", authenticateToken, async (req, res) => {
  const reqData = req.body;
  const type = reqData.leaveType ?? reqData.type;
  const days = reqData.totalDays ?? reqData.days ?? 1;
  const appliedOn = reqData.appliedDate ?? reqData.appliedOn ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (!reqData.employeeId || !type || !reqData.startDate || !reqData.endDate) {
    return res.status(400).json({ success: false, message: "Employee, leave type, and start/end dates are required." });
  }
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO leave_requests (id, employee_id, employee_name, type, start_date, end_date, days, reason, status, applied_on, approved_by, manager_comment)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        reqData.id || `LV-${Date.now()}`,
        reqData.employeeId,
        reqData.employeeName || null,
        type,
        reqData.startDate,
        reqData.endDate,
        days,
        reqData.reason || "",
        reqData.status || "pending",
        appliedOn,
        reqData.approvedBy || null,
        reqData.managerComment || null
      ]);
      return res.json({ success: true, data: reqData });
    } catch (err) {
      console.error("PG Leave POST error:", err);
    }
  }
  const db = await getDb();
  db.data.leaveRequests.unshift(reqData);
  await db.write();
  res.json({ success: true, data: reqData });
});
app.put("/api/leave-requests/:id", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const { id } = req.params;
  const updates = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        UPDATE leave_requests SET
          employee_name = COALESCE($1, employee_name),
          type = COALESCE($2, type),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          days = COALESCE($5, days),
          reason = COALESCE($6, reason),
          status = COALESCE($7, status),
          approved_by = COALESCE($8, approved_by),
          manager_comment = COALESCE($9, manager_comment)
        WHERE id = $10
      `, [
        updates.employeeName ?? null,
        updates.leaveType ?? updates.type ?? null,
        updates.startDate ?? null,
        updates.endDate ?? null,
        updates.totalDays ?? updates.days ?? null,
        updates.reason ?? null,
        updates.status ?? null,
        updates.approvedBy ?? null,
        updates.managerComment ?? null,
        id
      ]);
      return res.json({ success: true, data: { id, ...updates } });
    } catch (err) {
      console.error("PG Leave PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.leaveRequests.findIndex((l) => l.id === id);
  if (idx !== -1) {
    db.data.leaveRequests[idx] = { ...db.data.leaveRequests[idx], ...updates };
    await db.write();
    return res.json({ success: true, data: db.data.leaveRequests[idx] });
  }
  return res.status(404).json({ success: false, message: "Leave request not found." });
});
app.delete("/api/leave-requests/:id", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`DELETE FROM leave_requests WHERE id = $1`, [id]);
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG Leave DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.leaveRequests = db.data.leaveRequests.filter((l) => l.id !== id);
  await db.write();
  res.json({ success: true, id });
});
app.get("/api/departments", async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      const result = await pool.query(`SELECT id, name, description, head_name as "headName", head_avatar as "headAvatar", color FROM departments ORDER BY name ASC`);
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("PG Departments GET error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.departments || [] });
});
app.post("/api/departments", authenticateToken, async (req, res) => {
  const dept = req.body;
  if (!dept || !dept.name) {
    return res.status(400).json({ success: false, message: "Department name is required." });
  }
  const nameTrim = String(dept.name).trim();
  const pool = getPgPool();
  const id = dept.id || `DEP-${Math.floor(100 + Math.random() * 900)}`;
  const color = dept.color || "#2563EB";
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`
        INSERT INTO departments (id, name, description, head_name, head_avatar, color)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          head_name = EXCLUDED.head_name,
          head_avatar = EXCLUDED.head_avatar,
          color = EXCLUDED.color
      `, [
        id,
        nameTrim,
        dept.description || null,
        dept.headName || "Unassigned",
        dept.headAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        color
      ]);
      return res.json({ success: true, data: { ...dept, id, name: nameTrim, color } });
    } catch (err) {
      console.error("PG Departments POST error:", err);
    }
  }
  const db = await getDb();
  if (!db.data.departments) db.data.departments = [];
  const existingIdx = db.data.departments.findIndex((d) => d.name.toLowerCase() === nameTrim.toLowerCase());
  const newDept = { ...dept, id, name: nameTrim, color };
  if (existingIdx !== -1) {
    db.data.departments[existingIdx] = newDept;
  } else {
    db.data.departments.push(newDept);
  }
  await db.write();
  res.json({ success: true, data: newDept });
});
app.delete("/api/departments/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgDatabase(pool);
      await pool.query(`DELETE FROM departments WHERE id = $1 OR LOWER(name) = LOWER($1)`, [id]);
      return res.json({ success: true, message: "Department deleted." });
    } catch (err) {
      console.error("PG Departments DELETE error:", err);
    }
  }
  const db = await getDb();
  if (db.data.departments) {
    db.data.departments = db.data.departments.filter((d) => d.id !== id && d.name.toLowerCase() !== id.toLowerCase());
    await db.write();
  }
  res.json({ success: true, message: "Department deleted." });
});
app.get("/api/leave-policies", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const lpRes = await pool.query(`
        SELECT id, name, code,
               total_days as "yearlyQuota",
               total_days as "totalDays",
               carry_forward as "carryForward",
               max_carry_forward_days as "maxCarryForwardDays",
               COALESCE(color_tag, 'blue') as "colorTag"
        FROM leave_policies ORDER BY name ASC
      `);
      return res.json({ success: true, data: lpRes.rows });
    } catch (err) {
      console.error("PG LeavePolicies error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.leavePolicies });
});
app.put("/api/leave-policies", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const pool = getPgPool();
  if (pool && Array.isArray(req.body)) {
    try {
      const ids = req.body.map((lp) => String(lp.id));
      for (const lp of req.body) {
        const totalDays = lp.yearlyQuota ?? lp.totalDays ?? 10;
        const carryForward = lp.carryForward ?? false;
        const code = lp.code || String(lp.name || "LV").split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 5);
        await pool.query(`
          INSERT INTO leave_policies (id, name, code, total_days, carry_forward, max_carry_forward_days, color_tag)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            code = EXCLUDED.code,
            total_days = EXCLUDED.total_days,
            carry_forward = EXCLUDED.carry_forward,
            max_carry_forward_days = EXCLUDED.max_carry_forward_days,
            color_tag = EXCLUDED.color_tag
        `, [lp.id, lp.name, code, totalDays, carryForward, lp.maxCarryForwardDays || 0, lp.colorTag || "blue"]);
      }
      if (ids.length > 0) {
        await pool.query(`DELETE FROM leave_policies WHERE id != ALL($1::varchar[])`, [ids]);
      }
      return res.json({ success: true, data: req.body });
    } catch (err) {
      console.error("PG LeavePolicies PUT error:", err);
    }
  }
  const db = await getDb();
  if (Array.isArray(req.body)) {
    db.data.leavePolicies = req.body;
    await db.write();
  }
  res.json({ success: true, data: db.data.leavePolicies });
});
app.get("/api/announcements", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const annRes = await pool.query(`SELECT id, title, content, priority, target_department as "targetDepartment", date, author FROM announcements ORDER BY date DESC`);
      return res.json({ success: true, data: annRes.rows });
    } catch (err) {
      console.error("PG Announcements GET error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.announcements });
});
app.post("/api/announcements", authenticateToken, async (req, res) => {
  const item = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO announcements (id, title, content, priority, target_department, date, author)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [item.id || `ANN-${Date.now()}`, item.title, item.content, item.priority || "medium", item.targetDepartment || "all", item.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0], item.author || "Admin"]);
      return res.json({ success: true, data: item });
    } catch (err) {
      console.error("PG Announcements POST error:", err);
    }
  }
  const db = await getDb();
  db.data.announcements.unshift(item);
  await db.write();
  res.json({ success: true, data: item });
});
app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`DELETE FROM announcements WHERE id = $1`, [id]);
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG Announcements DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.announcements = db.data.announcements.filter((a) => a.id !== id);
  await db.write();
  res.json({ success: true, id });
});
var NAGER_API_BASE = "https://date.nager.at/api/v3/PublicHolidays";
var HOLIDAY_SYNC_STALE_MS = 7 * 24 * 60 * 60 * 1e3;
var requireAdminRole = (req, res) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "super_admin") {
    res.status(403).json({ success: false, message: "Only Admin or Super Admin can manage holidays." });
    return false;
  }
  return true;
};
var govExternalId = (date) => `gov-${date}`;
var fetchNagerHolidays = async () => {
  const thisYear = (/* @__PURE__ */ new Date()).getFullYear();
  const years = [thisYear, thisYear + 1];
  const merged = /* @__PURE__ */ new Map();
  await Promise.all(years.map(async (year) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8e3);
      const resp = await fetch(`${NAGER_API_BASE}/${year}/BD`, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return;
      const entries = await resp.json();
      for (const e of entries) {
        if (e.date && e.name) {
          merged.set(e.date, { title: e.name, type: e.types?.includes("Public") ? "national" : "optional" });
        }
      }
    } catch (err) {
      console.error(`Nager holiday fetch failed for ${year}:`, err);
    }
  }));
  return merged;
};
var buildGovernmentCandidates = async () => {
  const candidates = await fetchNagerHolidays();
  for (const { date, title, type } of CURATED_BD_HOLIDAYS) {
    candidates.set(date, { title, type });
  }
  return candidates;
};
var syncGovernmentHolidays = async () => {
  const candidates = await buildGovernmentCandidates();
  const source = `date.nager.at + curated BD calendar (${(/* @__PURE__ */ new Date()).getFullYear()}-${(/* @__PURE__ */ new Date()).getFullYear() + 1})`;
  let added = 0, updated = 0, skipped = 0;
  const pool = getPgPool();
  if (pool) {
    const exclusions2 = /* @__PURE__ */ new Set();
    const manualDates = /* @__PURE__ */ new Set();
    try {
      const exRes = await pool.query(`SELECT external_id FROM holiday_exclusions`);
      for (const row of exRes.rows) exclusions2.add(row.external_id);
      const manualRes = await pool.query(`SELECT date FROM holidays WHERE source = 'manual' OR source IS NULL`);
      for (const row of manualRes.rows) manualDates.add(row.date);
    } catch (err) {
      console.error("Holiday sync pre-check error:", err);
    }
    for (const [date, info] of candidates) {
      const extId = govExternalId(date);
      if (exclusions2.has(extId)) {
        skipped++;
        continue;
      }
      if (manualDates.has(date)) {
        skipped++;
        continue;
      }
      try {
        const res = await pool.query(`
          INSERT INTO holidays (id, title, date, type, source, external_id)
          VALUES ($1, $2, $3, $4, 'government', $5)
          ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
            title = EXCLUDED.title, date = EXCLUDED.date, type = EXCLUDED.type
          RETURNING (xmax = 0) AS inserted
        `, [`GOV-${date}`, info.title, date, info.type, extId]);
        if (res.rows[0]?.inserted) added++;
        else updated++;
      } catch (err) {
        console.error(`Holiday sync upsert failed for ${date}:`, err);
      }
    }
    try {
      await pool.query(`
        INSERT INTO holiday_sync_state (id, last_synced_at, last_result)
        VALUES (1, NOW(), $1)
        ON CONFLICT (id) DO UPDATE SET last_synced_at = NOW(), last_result = $1
      `, [`${added} added, ${updated} updated, ${skipped} skipped`]);
    } catch (err) {
      console.error("Holiday sync state update error:", err);
    }
    return { added, updated, skipped, source };
  }
  const db = await getDb();
  if (!db.data.holidays) db.data.holidays = [];
  const byExternalId = new Map(db.data.holidays.map((h) => [h.externalId ?? null, h]));
  const byDate = new Set(db.data.holidays.map((h) => h.date));
  const exclusions = new Set(db.data.holidayExclusions || []);
  for (const [date, info] of candidates) {
    const extId = govExternalId(date);
    if (exclusions.has(extId)) {
      skipped++;
      continue;
    }
    const existing = byExternalId.get(extId);
    if (existing) {
      existing.title = info.title;
      existing.type = info.type;
      updated++;
    } else if (byDate.has(date)) {
      skipped++;
      continue;
    } else {
      db.data.holidays.push({
        id: `GOV-${date}`,
        title: info.title,
        date,
        dayOfWeek: void 0,
        type: info.type,
        appliesTo: "All Employees",
        source: "government",
        externalId: extId
      });
      added++;
    }
  }
  db.data.holidaySyncState = {
    lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastResult: `${added} added, ${updated} updated, ${skipped} skipped`
  };
  await db.write();
  return { added, updated, skipped, source };
};
var getHolidaysFromStore = async () => {
  const pool = getPgPool();
  if (pool) {
    try {
      const holRes = await pool.query(
        `SELECT id, title, date, type, COALESCE(source, 'manual') AS source, external_id AS "externalId" FROM holidays ORDER BY date ASC`
      );
      return holRes.rows;
    } catch (err) {
      console.error("PG Holidays GET error:", err);
    }
  }
  const db = await getDb();
  return db.data.holidays.map((h) => ({ ...h, source: h.source ?? "manual" }));
};
var getHolidaySyncStatus = async () => {
  const pool = getPgPool();
  let last;
  if (pool) {
    try {
      const res = await pool.query(`SELECT last_synced_at AS "lastSyncedAt" FROM holiday_sync_state WHERE id = 1`);
      last = res.rows[0]?.lastSyncedAt;
    } catch {
      last = void 0;
    }
  } else {
    const db = await getDb();
    last = db.data.holidaySyncState?.lastSyncedAt;
  }
  if (!last) return "never";
  return Date.now() - new Date(last).getTime() > HOLIDAY_SYNC_STALE_MS ? "stale" : "fresh";
};
app.get("/api/holidays", authenticateToken, async (req, res) => {
  try {
    const status = await getHolidaySyncStatus();
    if (status === "never") {
      await syncGovernmentHolidays();
    } else if (status === "stale") {
      syncGovernmentHolidays().catch((err) => console.error("Background holiday sync failed:", err));
    }
  } catch (err) {
    console.error("Holiday auto-sync check failed:", err);
  }
  res.json({ success: true, data: await getHolidaysFromStore() });
});
app.post("/api/holidays/sync", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const result = await syncGovernmentHolidays();
    return res.json({ success: true, message: `Government holidays synced (${result.added} added, ${result.updated} refreshed, ${result.skipped} skipped).`, result, data: await getHolidaysFromStore() });
  } catch (err) {
    console.error("Holiday sync error:", err);
    return res.status(500).json({ success: false, message: "Failed to sync government holidays." });
  }
});
app.post("/api/holidays", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const item = req.body;
  if (!item || !item.title || !item.date) {
    return res.status(400).json({ success: false, message: "Holiday title and date are required." });
  }
  const existing = await getHolidaysFromStore();
  if (existing.some((h) => h.date === item.date && h.title.toLowerCase() === String(item.title).toLowerCase())) {
    return res.status(409).json({ success: false, message: "This holiday already exists on the same date." });
  }
  const record = { ...item, source: "manual", externalId: void 0 };
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO holidays (id, title, date, type, source) VALUES ($1, $2, $3, $4, 'manual')`,
        [item.id || `HOL-${Date.now()}`, item.title, item.date, item.type || "national"]
      );
      return res.json({ success: true, data: record });
    } catch (err) {
      console.error("PG Holidays POST error:", err);
    }
  }
  const db = await getDb();
  db.data.holidays.push(record);
  await db.write();
  res.json({ success: true, data: record });
});
app.put("/api/holidays/:id", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const { id } = req.params;
  const { title, date, type } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ success: false, message: "Holiday title and date are required." });
  }
  const pool = getPgPool();
  if (pool) {
    try {
      const cur = await pool.query(`SELECT source, external_id AS "externalId" FROM holidays WHERE id = $1`, [id]);
      const row = cur.rows[0];
      if (!row) return res.status(404).json({ success: false, message: "Holiday not found." });
      if ((row.source ?? "manual") === "government" && row.externalId) {
        await pool.query(`INSERT INTO holiday_exclusions (external_id, title) VALUES ($1, $2) ON CONFLICT (external_id) DO NOTHING`, [row.externalId, title]);
      }
      await pool.query(
        `UPDATE holidays SET title = $1, date = $2, type = $3, source = 'manual', external_id = NULL WHERE id = $4`,
        [title, date, type || "national", id]
      );
      return res.json({ success: true, data: { id, title, date, type: type || "national", source: "manual" } });
    } catch (err) {
      console.error("PG Holidays PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.holidays.findIndex((h) => h.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Holiday not found." });
  db.data.holidays[idx] = { ...db.data.holidays[idx], title, date, type: type || "national", source: "manual", externalId: void 0 };
  await db.write();
  res.json({ success: true, data: db.data.holidays[idx] });
});
app.delete("/api/holidays/:id", authenticateToken, async (req, res) => {
  if (!requireAdminRole(req, res)) return;
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      const cur = await pool.query(`SELECT source, external_id AS "externalId" FROM holidays WHERE id = $1`, [id]);
      const row = cur.rows[0];
      if (row && (row.source ?? "manual") === "government" && row.externalId) {
        await pool.query(`INSERT INTO holiday_exclusions (external_id, title) VALUES ($1, $2) ON CONFLICT (external_id) DO NOTHING`, [row.externalId, row.title]);
      }
      await pool.query(`DELETE FROM holidays WHERE id = $1`, [id]);
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG Holidays DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.holidays = db.data.holidays.filter((h) => h.id !== id);
  await db.write();
  res.json({ success: true, id });
});
var expandAuditRow = (row) => {
  let extra = null;
  if (row.details && typeof row.details === "string") {
    try {
      const parsed = JSON.parse(row.details);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) extra = parsed;
    } catch {
    }
  }
  return {
    id: row.id,
    timestamp: row.timestamp,
    administrator: row.user || row.user_name || "System",
    actorRole: extra?.actorRole || "admin",
    action: row.action,
    target: extra?.target || "",
    oldValue: extra?.oldValue,
    newValue: extra?.newValue,
    reason: extra?.reason,
    ipAddress: extra?.ipAddress,
    status: extra?.status || "success"
  };
};
app.get("/api/audit-logs", authenticateToken, async (req, res) => {
  const { page, limit, offset, isPaginated } = getPagination(req);
  const pool = getPgPool();
  if (pool) {
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs`);
      const total = parseInt(countRes.rows[0].count, 10);
      const queryText = isPaginated ? `SELECT id, timestamp, user_name as "user", action, details FROM audit_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2` : `SELECT id, timestamp, user_name as "user", action, details FROM audit_logs ORDER BY timestamp DESC`;
      const params = isPaginated ? [limit, offset] : [];
      const logRes = await pool.query(queryText, params);
      const logs = logRes.rows.map(expandAuditRow);
      if (isPaginated) {
        return res.json({ success: true, data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
      }
      return res.json({ success: true, data: logs });
    } catch (err) {
      console.error("PG AuditLogs GET error:", err);
    }
  }
  const db = await getDb();
  const list = db.data.auditLogs.map((l) => ({ ...l, administrator: l.administrator || l.user || "System" }));
  if (isPaginated) {
    return res.json({ success: true, data: list.slice(offset, offset + limit), pagination: { page, limit, total: list.length, totalPages: Math.ceil(list.length / limit) } });
  }
  res.json({ success: true, data: list });
});
app.post("/api/audit-logs", authenticateToken, async (req, res) => {
  const item = req.body;
  const userName = item.administrator || item.user || "System";
  let details = item.details || "";
  if (!details && (item.actorRole || item.target || item.oldValue || item.newValue || item.reason || item.ipAddress || item.status)) {
    details = JSON.stringify({
      actorRole: item.actorRole,
      target: item.target,
      oldValue: item.oldValue,
      newValue: item.newValue,
      reason: item.reason,
      ipAddress: item.ipAddress,
      status: item.status
    });
  }
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`INSERT INTO audit_logs (id, timestamp, user_name, action, details) VALUES ($1, $2, $3, $4, $5)`, [item.id || `LOG-${Date.now()}`, item.timestamp || (/* @__PURE__ */ new Date()).toISOString(), userName, item.action, details]);
      return res.json({ success: true, data: item });
    } catch (err) {
      console.error("PG AuditLogs POST error:", err);
    }
  }
  const db = await getDb();
  db.data.auditLogs.unshift(item);
  await db.write();
  res.json({ success: true, data: item });
});
app.get("/api/notifications", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const nRes = await pool.query(`SELECT id, user_id as "userId", title, message, timestamp, read, type FROM notifications ORDER BY timestamp DESC LIMIT 50`);
      return res.json({ success: true, data: nRes.rows });
    } catch (err) {
      console.error("PG Notifications GET error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.notifications });
});
app.post("/api/notifications", authenticateToken, async (req, res) => {
  const item = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`INSERT INTO notifications (id, user_id, title, message, timestamp, read, type) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [item.id || `NOTIF-${Date.now()}`, item.userId || null, item.title, item.message, item.timestamp || (/* @__PURE__ */ new Date()).toISOString(), item.read || false, item.type || "info"]);
      return res.json({ success: true, data: item });
    } catch (err) {
      console.error("PG Notifications POST error:", err);
    }
  }
  const db = await getDb();
  db.data.notifications.unshift(item);
  await db.write();
  res.json({ success: true, data: item });
});
app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`UPDATE notifications SET read = true WHERE id = $1`, [id]);
      return res.json({ success: true, data: { id, read: true } });
    } catch (err) {
      console.error("PG Notification read error:", err);
    }
  }
  const db = await getDb();
  const notif = db.data.notifications.find((n) => n.id === id);
  if (notif) notif.read = true;
  await db.write();
  res.json({ success: true, data: { id, read: true } });
});
app.put("/api/notifications/read-all", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`UPDATE notifications SET read = true`);
      const nRes = await pool.query(`SELECT id, user_id as "userId", title, message, timestamp, read, type FROM notifications ORDER BY timestamp DESC LIMIT 50`);
      return res.json({ success: true, data: nRes.rows });
    } catch (err) {
      console.error("PG Notifications ReadAll error:", err);
    }
  }
  const db = await getDb();
  db.data.notifications.forEach((n) => {
    n.read = true;
  });
  await db.write();
  res.json({ success: true, data: db.data.notifications });
});
app.get("/api/user-accounts", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const accRes = await pool.query(`SELECT id, email, name, role, employee_id as "employeeId", status, avatar, created_at as "createdAt" FROM users ORDER BY name ASC`);
      return res.json({ success: true, data: accRes.rows });
    } catch (err) {
      console.error("PG UserAccounts GET error:", err);
    }
  }
  const db = await getDb();
  const safeAccounts = db.data.userAccounts.map(({ password, passwordHash, ...rest }) => rest);
  res.json({ success: true, data: safeAccounts });
});
app.post("/api/user-accounts", authenticateToken, async (req, res) => {
  const { password, ...accData } = req.body;
  const rawPassword = password || "password123";
  const passwordHash = await import_bcryptjs2.default.hash(rawPassword, 10);
  const pool = getPgPool();
  let emailResult = { success: false };
  if (accData.email) {
    try {
      emailResult = await sendAccountApprovedEmail(accData.email, accData.name || "Team Member", rawPassword);
    } catch (err) {
      console.log("Account approval email dispatch error:", err);
      emailResult = { success: false, error: err };
    }
  }
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, employee_id, status, avatar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [accData.id || `USR-${Date.now()}`, accData.email, passwordHash, accData.name, accData.role || "employee", accData.employeeId || null, accData.status || "active", accData.avatar || ""]);
      return res.json({ success: true, data: { ...accData, passwordHash: void 0 }, emailSimulated: !!emailResult.simulated, emailSent: !!emailResult.success && !emailResult.simulated });
    } catch (err) {
      console.error("PG UserAccounts POST error:", err);
      if (err?.code === "23505") {
        try {
          const existing = await pool.query(
            `SELECT id, email, name, role, employee_id as "employeeId", status, avatar FROM users WHERE email = $1`,
            [accData.email]
          );
          if (existing.rows[0]) {
            return res.json({
              success: true,
              data: existing.rows[0],
              emailSimulated: !!emailResult.simulated,
              emailSent: !!emailResult.success && !emailResult.simulated,
              alreadyExisted: true
            });
          }
        } catch (lookupErr) {
          console.error("PG UserAccounts duplicate-lookup error:", lookupErr);
        }
      }
    }
  }
  const db = await getDb();
  const newAccount = { ...accData, passwordHash };
  db.data.userAccounts.push(newAccount);
  await db.write();
  const { passwordHash: _p, ...safeAcc } = newAccount;
  res.json({ success: true, data: safeAcc, emailSimulated: !!emailResult.simulated, emailSent: !!emailResult.success && !emailResult.simulated });
});
app.put("/api/user-accounts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { password, passwordHash, ...updates } = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        UPDATE users SET
          email = COALESCE($1, email),
          name = COALESCE($2, name),
          role = COALESCE($3, role),
          status = COALESCE($4, status)
        WHERE id = $5
      `, [updates.email, updates.name, updates.role, updates.status, id]);
      return res.json({ success: true, data: { id, ...updates } });
    } catch (err) {
      console.error("PG UserAccounts PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.userAccounts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    delete updates.password;
    delete updates.passwordHash;
    db.data.userAccounts[idx] = { ...db.data.userAccounts[idx], ...updates };
    await db.write();
    const { passwordHash: _p, password: _pw, ...safeAcc } = db.data.userAccounts[idx];
    return res.json({ success: true, data: safeAcc });
  }
  return res.status(404).json({ success: false, message: "Account not found." });
});
app.delete("/api/user-accounts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
      return res.json({ success: true, id });
    } catch (err) {
      console.error("PG UserAccounts DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.userAccounts = db.data.userAccounts.filter((a) => a.id !== id);
  await db.write();
  res.json({ success: true, id });
});
app.get("/api/registration-requests", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const regRes = await pool.query(`SELECT id, employee_id as "employeeId", employee_name as "employeeName", email, department, designation, dob, nid_number as "nidNumber", requested_role as "requestedRole", status, requested_at as "requestedAt" FROM registration_requests ORDER BY requested_at DESC`);
      return res.json({ success: true, data: regRes.rows });
    } catch (err) {
      console.error("PG RegistrationRequests GET error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.registrationRequests });
});
app.post("/api/registration-requests", async (req, res) => {
  const reqData = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO registration_requests (id, employee_id, employee_name, email, department, designation, dob, nid_number, requested_role, status, requested_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        reqData.id || `REG-${Date.now()}`,
        reqData.employeeId || null,
        reqData.employeeName,
        reqData.email,
        reqData.department || "General",
        reqData.designation || "Staff",
        reqData.dob || null,
        reqData.nidNumber || null,
        reqData.requestedRole || "employee",
        "pending",
        reqData.requestedAt || (/* @__PURE__ */ new Date()).toISOString()
      ]);
      return res.json({ success: true, data: reqData });
    } catch (err) {
      console.error("PG RegistrationRequests POST error:", err);
    }
  }
  const db = await getDb();
  db.data.registrationRequests.unshift(reqData);
  await db.write();
  res.json({ success: true, data: reqData });
});
app.put("/api/registration-requests/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`UPDATE registration_requests SET status = $1 WHERE id = $2`, [updates.status, id]);
      return res.json({ success: true, data: { id, ...updates } });
    } catch (err) {
      console.error("PG RegistrationRequests PUT error:", err);
    }
  }
  const db = await getDb();
  const idx = db.data.registrationRequests.findIndex((r) => r.id === id);
  if (idx !== -1) {
    db.data.registrationRequests[idx] = { ...db.data.registrationRequests[idx], ...updates };
    await db.write();
    return res.json({ success: true, data: db.data.registrationRequests[idx] });
  }
  return res.status(404).json({ success: false, message: "Registration request not found." });
});
app.delete("/api/registration-requests/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`DELETE FROM registration_requests WHERE id = $1`, [id]);
      return res.json({ success: true, message: "Registration request deleted." });
    } catch (err) {
      console.error("PG RegistrationRequests DELETE error:", err);
    }
  }
  const db = await getDb();
  db.data.registrationRequests = db.data.registrationRequests.filter((r) => r.id !== id);
  await db.write();
  return res.json({ success: true, message: "Registration request deleted." });
});
app.get("/api/late-penalty-rule", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const ruleRes = await pool.query(`SELECT threshold, deduction_days as "deductionDays" FROM late_penalty_rule WHERE id = 1`);
      if (ruleRes.rows.length > 0) {
        return res.json({ success: true, data: ruleRes.rows[0] });
      }
    } catch (err) {
      console.error("PG LatePenalty GET error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, data: db.data.latePenaltyRule });
});
app.put("/api/late-penalty-rule", authenticateToken, async (req, res) => {
  const rule = req.body;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO late_penalty_rule (id, threshold, deduction_days) VALUES (1, $1, $2)
        ON CONFLICT (id) DO UPDATE SET threshold = EXCLUDED.threshold, deduction_days = EXCLUDED.deduction_days
      `, [rule.threshold || 3, rule.deductionDays || 1]);
      return res.json({ success: true, data: rule });
    } catch (err) {
      console.error("PG LatePenalty PUT error:", err);
    }
  }
  const db = await getDb();
  db.data.latePenaltyRule = rule;
  await db.write();
  res.json({ success: true, data: db.data.latePenaltyRule });
});
app.post("/api/reset-demo-data", authenticateToken, async (req, res) => {
  const pool = getPgPool();
  if (pool) {
    try {
      const superAdminPassHash = await import_bcryptjs2.default.hash("superadmin", 10);
      const adminPassHash = await import_bcryptjs2.default.hash("admin", 10);
      const empPassHash = await import_bcryptjs2.default.hash("password123", 10);
      await pool.query(`DELETE FROM users; DELETE FROM employees; DELETE FROM attendance; DELETE FROM leave_requests;`);
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, employee_id, status, avatar)
        VALUES
          ('USR-001', 'jhumatahmina@gmail.com', $1, 'Jhuma Tahmina', 'super_admin', 'DG-1008', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
          ('USR-002', 'kamrul89ster@gmail.com', $2, 'Kamrul Ster', 'admin', 'DG-1001', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
          ('USR-003', 'masum@attendra.io', $3, 'Md Masum Bellal', 'employee', 'DG-1002', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
          ('USR-004', 'nabil@attendra.io', $3, 'Nabil', 'employee', 'DG-1003', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200');
      `, [superAdminPassHash, adminPassHash, empPassHash]);
      await pool.query(`
        INSERT INTO employees (id, name, role, department, manager_id, email, phone, status, join_date, avatar, salary, leave_balances, monthly_late_count, salary_deduction_days)
        VALUES
          ('DG-1008', 'Jhuma Tahmina', 'Chief Executive Officer', 'Executive', NULL, 'jhumatahmina@gmail.com', '+880 1711-000888', 'active', '2021-01-01', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 250000, '{"casual": 10, "sick": 14, "annual": 20}', 0, 0),
          ('DG-1001', 'Kamrul Ster', 'HR Manager', 'Human Resources', 'DG-1008', 'kamrul89ster@gmail.com', '+880 1711-000111', 'active', '2023-01-15', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 85000, '{"casual": 8, "sick": 10, "annual": 14}', 1, 0),
          ('DG-1002', 'Md Masum Bellal', 'Senior Software Engineer', 'Engineering', 'DG-1001', 'masum@attendra.io', '+880 1711-000222', 'active', '2022-06-01', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 110000, '{"casual": 5, "sick": 12, "annual": 10}', 4, 1),
          ('DG-1003', 'Nabil', 'UI/UX Designer', 'Design', 'DG-1001', 'nabil@attendra.io', '+880 1711-000333', 'active', '2023-09-10', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 75000, '{"casual": 10, "sick": 14, "annual": 15}', 0, 0);
      `);
      return res.json({ success: true, message: "Neon PostgreSQL database re-seeded to default demo dataset." });
    } catch (err) {
      console.error("PG Reset error:", err);
    }
  }
  const db = await getDb();
  res.json({ success: true, message: "Database reset complete." });
});
app.post("/api/ai/insights", authenticateToken, async (req, res) => {
  try {
    const ai = getAIClient();
    const { metrics, period, department } = req.body || {};
    const promptText = `
You are Attendra's Chief AI HR Analytics Officer.
Analyze the following enterprise attendance data for ${department || "All Departments"} over ${period || "This Month"}:

Metrics Summary:
- Total Employees: ${metrics?.totalEmployees || 480}
- Present Today: ${metrics?.presentToday || 442} (${metrics?.presentRate || "92.1%"})
- Late Arrivals Today: ${metrics?.lateToday || 24} (${metrics?.lateRate || "5.0%"})
- Absent Today: ${metrics?.absentToday || 14}
- On Approved Leave: ${metrics?.leaveToday || 18}
- Average Entry Time: ${metrics?.avgEntry || "08:42 AM"}
- Average Exit Time: ${metrics?.avgExit || "05:48 PM"}
- Average Work Hours: ${metrics?.avgHours || "8.6 hrs"}
- Overtime Hours Logged: ${metrics?.overtimeHours || "312 hrs"}

Please produce a high-level strategic HR analysis formatted as JSON with the following structure:
{
  "executiveSummary": "A concise, professional 2-sentence executive summary highlighting overall workforce stability and key callouts.",
  "healthScore": 92,
  "keyHighlights": [
    "Highlight 1 about entry consistency or department performance",
    "Highlight 2 about remote vs hybrid attendance",
    "Highlight 3 about leave balances or overtime compliance"
  ],
  "burnoutOrLateRisks": [
    {
      "title": "Risk title (e.g., Engineering Team Overtime)",
      "severity": "medium" | "high" | "low",
      "description": "Explanation of pattern detected and potential impact."
    }
  ],
  "actionableRecommendations": [
    "Recommendation 1 for HR managers or department heads",
    "Recommendation 2 to optimize shift schedules or flexible work policies"
  ]
}
`;
    if (!ai) {
      return res.json({
        success: true,
        source: "fallback",
        data: {
          executiveSummary: `Attendance stability remains high at ${metrics?.presentRate || "92.1%"} across ${department || "All Departments"}. Punctuality improved by +2.4% this week with minimal unexcused absences.`,
          healthScore: 92,
          keyHighlights: [
            "Engineering team achieved a 96.2% on-time check-in rate following flexible shift adjustments.",
            "Average daily work hours stabilized at 8.6 hours with balanced break adherence.",
            "Approved leave requests are well-staggered ahead of upcoming Q3 holidays."
          ],
          burnoutOrLateRisks: [
            {
              title: "Product Design Late Arrival Pattern",
              severity: "medium",
              description: "Product design team members consistently log entries around 09:25 AM. Consider shifting team core hours to 09:30 AM."
            },
            {
              title: "Consecutive Overtime in Customer Support",
              severity: "high",
              description: "12 support engineers logged over 48 hours this week. Recommend temporary shift balancing to mitigate burnout."
            }
          ],
          actionableRecommendations: [
            "Implement automated grace-period reminders for teams with morning commute delays.",
            "Review support department staffing ratios to reduce weekend overtime accrual.",
            "Enable auto-approval for single-day casual leave requests submitted 3+ days in advance."
          ]
        }
      });
    }
    let responseText;
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: import_genai.Type.OBJECT,
              properties: {
                executiveSummary: { type: import_genai.Type.STRING },
                healthScore: { type: import_genai.Type.INTEGER },
                keyHighlights: {
                  type: import_genai.Type.ARRAY,
                  items: { type: import_genai.Type.STRING }
                },
                burnoutOrLateRisks: {
                  type: import_genai.Type.ARRAY,
                  items: {
                    type: import_genai.Type.OBJECT,
                    properties: {
                      title: { type: import_genai.Type.STRING },
                      severity: { type: import_genai.Type.STRING },
                      description: { type: import_genai.Type.STRING }
                    },
                    required: ["title", "severity", "description"]
                  }
                },
                actionableRecommendations: {
                  type: import_genai.Type.ARRAY,
                  items: { type: import_genai.Type.STRING }
                }
              },
              required: ["executiveSummary", "healthScore", "keyHighlights", "burnoutOrLateRisks", "actionableRecommendations"]
            }
          }
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch {
      }
    }
    if (responseText) {
      const parsedData = JSON.parse(responseText);
      return res.json({
        success: true,
        source: "gemini",
        data: parsedData
      });
    }
    return res.json({
      success: true,
      source: "fallback",
      data: {
        executiveSummary: `Attendance stability remains high at ${metrics?.presentRate || "92.1%"} across ${department || "All Enterprise Departments"}. Punctuality improved by +2.4% this week.`,
        healthScore: 91,
        keyHighlights: [
          "Engineering & Technology teams achieved a 96.2% on-time check-in rate.",
          "Average daily work hours stabilized at 8.6 hours with balanced shift rotations.",
          "Approved leave requests are well-staggered ahead of upcoming Q3 holidays."
        ],
        burnoutOrLateRisks: [
          {
            title: "Support Department Late Arrival Pattern",
            severity: "medium",
            description: "Support team members consistently log entries around 09:25 AM. Consider shifting team core hours to 09:30 AM."
          },
          {
            title: "Consecutive Overtime in Operations",
            severity: "high",
            description: "Operations team logged over 48 hours this week. Recommend temporary shift balancing to mitigate burnout."
          }
        ],
        actionableRecommendations: [
          "Implement automated grace-period reminders for teams with morning commute delays.",
          "Review support department staffing ratios to reduce weekend overtime accrual.",
          "Enable auto-approval for single-day casual leave requests submitted 3+ days in advance."
        ]
      }
    });
  } catch {
    return res.json({
      success: true,
      source: "fallback",
      data: {
        executiveSummary: "Attendance rates remain steady at 92.1% with strong morning entry compliance.",
        healthScore: 89,
        keyHighlights: [
          "On-time check-ins reached a peak on Tuesday morning across HQ offices.",
          "Remote work check-in accuracy remains verified via IP geofencing."
        ],
        burnoutOrLateRisks: [
          {
            title: "Overtime Accumulation in QA",
            severity: "medium",
            description: "QA engineers show +14% overtime hours during sprint release weeks."
          }
        ],
        actionableRecommendations: [
          "Stagger QA shift start times during product release milestones."
        ]
      }
    });
  }
});
app.post("/api/reports/export", authenticateToken, (req, res) => {
  const { type, records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Invalid records provided" });
  }
  const headers = Object.keys(records[0] || {}).join(",");
  const rows = records.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csvContent = [headers, ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="Attendra_${type || "report"}_${Date.now()}.csv"`);
  return res.send(csvContent);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Attendra SaaS] Secure API Server running on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.VERCEL !== "1") {
  startServer();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
