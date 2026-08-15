import {
  getSatToThuWeeksForMonth,
  calculateEmployeeDeductions,
  LatePenaltyRule,
  parseTimeToMinutes,
  formatMinutesTo12H,
} from './salaryDeduction';
import { AttendanceRecord } from '../types';

console.log('--- Testing Saturday-Thursday Week Calculation Fix ---');

// 1. Test getSatToThuWeeksForMonth for August 2026 (year 2026, monthIndex 7)
const augustWeeks = getSatToThuWeeksForMonth(2026, 7);
console.log('\nAugust 2026 Weeks:');
augustWeeks.forEach((w) => {
  console.log(`  Week ${w.weekNumber}: ${w.startDate} to ${w.endDate} | Label: "${w.label}"`);
});

const lastWeek = augustWeeks[augustWeeks.length - 1];
if (lastWeek.startDate === '2026-08-29' && lastWeek.endDate === '2026-09-03') {
  console.log('✅ PASS: Week 5 correctly spans into next month (2026-08-29 to 2026-09-03)');
} else {
  console.error('❌ FAIL: Week 5 dates incorrect:', lastWeek);
  process.exit(1);
}

// 2. Test deduction calculation spanning across month boundary
// An employee has 2 late arrivals on Aug 29–31 (Sat-Mon) and 2 more late arrivals on Sep 1–3 (Tue-Thu) of the SAME real work week
const mockRecords: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    employeeAvatar: '',
    department: 'Engineering',
    date: '2026-08-29',
    entryTime: '09:35 AM',
    exitTime: '06:00 PM',
    workHours: 8,
    overtimeHours: 0,
    status: 'late',
    locationType: 'Office HQ',
    verificationMethod: 'FaceID Biometric',
  },
  {
    id: '2',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    employeeAvatar: '',
    department: 'Engineering',
    date: '2026-08-31',
    entryTime: '09:40 AM',
    exitTime: '06:00 PM',
    workHours: 8,
    overtimeHours: 0,
    status: 'late',
    locationType: 'Office HQ',
    verificationMethod: 'FaceID Biometric',
  },
  {
    id: '3',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    employeeAvatar: '',
    department: 'Engineering',
    date: '2026-09-01',
    entryTime: '09:25 AM',
    exitTime: '06:00 PM',
    workHours: 8,
    overtimeHours: 0,
    status: 'late',
    locationType: 'Office HQ',
    verificationMethod: 'FaceID Biometric',
  },
  {
    id: '4',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    employeeAvatar: '',
    department: 'Engineering',
    date: '2026-09-03',
    entryTime: '09:30 AM',
    exitTime: '06:00 PM',
    workHours: 8,
    overtimeHours: 0,
    status: 'late',
    locationType: 'Office HQ',
    verificationMethod: 'FaceID Biometric',
  },
];

const rule: LatePenaltyRule = { threshold: 3, deductionDays: 1 };
const summary = calculateEmployeeDeductions('EMP001', mockRecords, rule, 2026, 7);

console.log('\nDeduction Summary for August 2026:');
console.log(`  Total Late Count: ${summary.totalLateCount}`);
console.log(`  Total Deduction Days: ${summary.totalDeductionDays}`);
summary.weeklyBreakdown.forEach((wb) => {
  console.log(`  ${wb.label}: Late Count = ${wb.lateCount}, Deduction Days = ${wb.deductionDays}`);
});

if (summary.totalLateCount === 4 && summary.totalDeductionDays === 1) {
  console.log('✅ PASS: Total late count is 4 and deduction days is 1 (floor(4/3)*1 = 1)');
} else {
  console.error('❌ FAIL: Expected 4 lates and 1 deduction day, got:', summary);
  process.exit(1);
}

// 3. Test parseTimeToMinutes and formatMinutesTo12H
console.log('\nTesting parseTimeToMinutes and formatMinutesTo12H:');
const t1 = parseTimeToMinutes('08:52 AM'); // 532
const t2 = parseTimeToMinutes('05:05 PM'); // 1025
const formatted1 = formatMinutesTo12H(532);
const formatted2 = formatMinutesTo12H(1025);

if (t1 === 532 && t2 === 1025 && formatted1 === '08:52 AM' && formatted2 === '05:05 PM') {
  console.log('✅ PASS: Time parsing and formatting works correctly!');
} else {
  console.error('❌ FAIL: Time parsing or formatting mismatch:', { t1, t2, formatted1, formatted2 });
  process.exit(1);
}

console.log('\nAll unit test scenarios passed successfully!');
