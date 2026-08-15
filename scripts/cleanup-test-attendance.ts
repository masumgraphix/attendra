import dotenv from 'dotenv';
import { getPgPool, getDb, initPgDatabase } from '../server/db.js';

dotenv.config();

async function cleanupTestAttendance() {
  console.log('🧹 Starting cleanup for orphan/test attendance records...');

  const pool = getPgPool();
  let totalDeleted = 0;

  if (pool) {
    try {
      await initPgDatabase(pool);

      // Fetch all existing employee IDs
      const empRes = await pool.query('SELECT id FROM employees');
      const validEmpIds = new Set(empRes.rows.map((r: any) => String(r.id)));
      console.log(`📊 Found ${validEmpIds.size} active employees in PostgreSQL database.`);

      // Fetch all attendance records
      const attRes = await pool.query('SELECT id, employee_id FROM attendance');
      const orphanIds: string[] = [];

      attRes.rows.forEach((r: any) => {
        if (!validEmpIds.has(String(r.employee_id))) {
          orphanIds.push(r.id);
        }
      });

      console.log(`📋 Total attendance records checked: ${attRes.rows.length}`);
      console.log(`⚠️ Found ${orphanIds.length} orphan attendance records with invalid/deleted employee IDs.`);

      if (orphanIds.length > 0) {
        await pool.query('DELETE FROM attendance WHERE id = ANY($1::text[])', [orphanIds]);
        console.log(`✅ Deleted ${orphanIds.length} orphan attendance records from PostgreSQL database.`);
        totalDeleted += orphanIds.length;
      } else {
        console.log('✨ No orphan attendance records found in PostgreSQL database.');
      }
    } catch (err) {
      console.error('❌ Error during PostgreSQL attendance cleanup:', err);
    }
  }

  // Also clean up lowdb JSON storage if used
  try {
    const db = await getDb();
    if (db.data.attendance && db.data.employees) {
      const validEmpIdsJson = new Set((db.data.employees || []).map((e: any) => String(e.id)));
      const initialCount = db.data.attendance.length;

      const orphanRecords = db.data.attendance.filter(
        (att: any) => !validEmpIdsJson.has(String(att.employeeId || att.employee_id))
      );

      if (orphanRecords.length > 0) {
        db.data.attendance = db.data.attendance.filter(
          (att: any) => validEmpIdsJson.has(String(att.employeeId || att.employee_id))
        );
        await db.write();
        console.log(`✅ Cleaned up ${orphanRecords.length} orphan attendance records from JSON database (Before: ${initialCount}, After: ${db.data.attendance.length}).`);
        totalDeleted += orphanRecords.length;
      } else {
        console.log('✨ No orphan attendance records found in JSON database.');
      }
    }
  } catch (err) {
    console.error('❌ Error during JSON database cleanup:', err);
  }

  console.log(`🎉 Attendance cleanup complete. Total removed orphan records: ${totalDeleted}`);
  process.exit(0);
}

cleanupTestAttendance();
