import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import path from 'path';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

async function seedDatabase() {
  console.log('🌱 Starting Attendra Database Seeding...');

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log('Connecting to Neon PostgreSQL database...');
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      // 1. Create Tables
      console.log('Creating tables and indexes...');
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
          date VARCHAR(20) NOT NULL,
          check_in VARCHAR(20),
          check_out VARCHAR(20),
          status VARCHAR(50) NOT NULL,
          method VARCHAR(50),
          location VARCHAR(255),
          is_overtime BOOLEAN DEFAULT FALSE,
          hours_worked NUMERIC(5,2) DEFAULT 0,
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
          employee_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          requested_role VARCHAR(50),
          status VARCHAR(20) DEFAULT 'pending',
          requested_at VARCHAR(50)
        );

        CREATE TABLE IF NOT EXISTS late_penalty_rule (
          id INT PRIMARY KEY DEFAULT 1,
          threshold INT DEFAULT 3,
          deduction_days INT DEFAULT 1
        );
      `);

      // 2. Hash Passwords
      const superAdminPassHash = await bcrypt.hash('superadmin', 10);
      const adminPassHash = await bcrypt.hash('admin', 10);
      const empPassHash = await bcrypt.hash('password123', 10);

      // 3. Seed Super Admin & Users
      console.log('Seeding user accounts...');
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

      // 4. Seed Employees
      console.log('Seeding employees hierarchy...');
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

      // 5. Seed Attendance
      console.log('Seeding attendance...');
      await pool.query(`
        INSERT INTO attendance (id, employee_id, date, check_in, status, method, location, is_overtime, hours_worked)
        VALUES
          ('ATT-001', 'DG-1002', '2026-08-01', '09:35 AM', 'late', 'fingerprint', 'Main HQ', false, 8.5),
          ('ATT-002', 'DG-1001', '2026-08-01', '08:55 AM', 'present', 'face_recognition', 'Main HQ', false, 8.8)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 6. Seed Leave Policies
      await pool.query(`
        INSERT INTO leave_policies (id, name, code, total_days, carry_forward, max_carry_forward_days)
        VALUES
          ('LP-01', 'Casual Leave', 'CL', 10, false, 0),
          ('LP-02', 'Sick Leave', 'SL', 14, false, 0),
          ('LP-03', 'Annual Leave', 'AL', 15, true, 5)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 7. Seed Late Penalty Rule
      await pool.query(`
        INSERT INTO late_penalty_rule (id, threshold, deduction_days)
        VALUES (1, 3, 1)
        ON CONFLICT (id) DO UPDATE SET threshold = 3, deduction_days = 1;
      `);

      console.log('✅ Neon PostgreSQL Seeding Completed Successfully!');
      await pool.end();
    } catch (err) {
      console.error('❌ Error seeding Neon PostgreSQL database:', err);
      process.exit(1);
    }
  } else {
    console.log('No DATABASE_URL found in environment. Initializing local JSON fallback...');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log('✅ Local storage environment ready.');
  }
}

seedDatabase();
