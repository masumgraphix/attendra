import { AttendanceRecord, Employee } from '../types';

export interface LatePenaltyRule {
  threshold: number; // N (default 3)
  deductionDays: number; // X (default 1)
}

export interface WeeklyDeductionBreakdown {
  weekNumber: number;
  startDate: string; // e.g. "2026-08-01"
  endDate: string;   // e.g. "2026-08-06"
  label: string;     // e.g. "Week 1 (Aug 01 - Aug 06)"
  lateCount: number;
  deductionDays: number;
}

export interface MonthlyDeductionSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  weeklyBreakdown: WeeklyDeductionBreakdown[];
  totalLateCount: number;
  totalDeductionDays: number;
}

/**
 * Parses a 12-hour or 24-hour time string into total minutes since midnight.
 * e.g., "08:52 AM" -> 532, "05:05 PM" -> 1025.
 * Returns null if string is empty or invalid.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || timeStr === '--:--') return null;

  const cleanStr = timeStr.trim().toUpperCase();
  let hours = 0;
  let minutes = 0;

  const isPM = cleanStr.includes('PM');
  const isAM = cleanStr.includes('AM');
  const timeOnly = cleanStr.replace(/(AM|PM)/g, '').trim();
  const parts = timeOnly.split(':');

  if (parts.length < 2) return null;

  hours = parseInt(parts[0], 10);
  minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Converts total minutes since midnight back into a 12-hour formatted time string.
 * e.g., 532 -> "08:52 AM", 1025 -> "05:05 PM".
 */
export function formatMinutesTo12H(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '--:--';
  const rounded = Math.round(totalMinutes);
  let h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const hStr = String(h12).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

/**
 * Checks if an entry time is late based on standard 9:00 AM start and 20 min grace.
 * Boundary condition:
 * <= 09:20 AM is Grace Window / On-time (Late = false)
 * >= 09:21 AM is Late Entry (Late = true)
 */
export function isLateEntry(entryTimeStr: string, workStartStr = '09:00', graceMinutes = 20): boolean {
  const totalMinutes = parseTimeToMinutes(entryTimeStr);
  if (totalMinutes === null) return false;

  // Work start minutes (09:00 AM = 540 mins)
  const [startH, startM] = workStartStr.split(':').map((n) => parseInt(n, 10));
  const startTotalMinutes = (startH || 9) * 60 + (startM || 0);

  // Grace cutoff: 9:00 AM + 20 mins = 560 mins (09:20 AM)
  const cutoffMinutes = startTotalMinutes + graceMinutes;

  return totalMinutes > cutoffMinutes;
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Helper to get Saturday-to-Thursday weeks for a given month or date range.
 * Company working week is Saturday to Thursday. Friday is weekly off.
 *
 * If a week's Thursday falls in the following calendar month (e.g., Aug 29 – Sep 03),
 * the week is NOT cut off mid-week. The full week range spanning across both months
 * is used to calculate weekly late counts and salary deductions accurately.
 */
export function getSatToThuWeeksForMonth(year: number, monthIndex: number): { startDate: string; endDate: string; label: string; weekNumber: number }[] {
  const weeks: { startDate: string; endDate: string; label: string; weekNumber: number }[] = [];

  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Find the first Saturday on or before the 1st day of the month.
  // If the 1st is Friday (weekly off), start on Saturday the 2nd.
  let current = new Date(firstDayOfMonth);
  if (current.getDay() === 5) {
    current.setDate(current.getDate() + 1);
  } else if (current.getDay() !== 6) {
    const daysBack = (current.getDay() + 1) % 7;
    current.setDate(current.getDate() - daysBack);
  }

  let weekNum = 1;

  while (current <= lastDayOfMonth) {
    const weekStart = new Date(current);

    // Saturday to Thursday is 5 days addition (Sat + 5 days = Thu)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 5);

    const startStr = formatDateYMD(weekStart);
    const endStr = formatDateYMD(weekEnd);

    const label = `Week ${weekNum} (${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)})`;

    weeks.push({
      weekNumber: weekNum,
      startDate: startStr,
      endDate: endStr,
      label,
    });

    // Advance to next Saturday (Sat + 7 days)
    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

/**
 * Computes weekly salary deduction for a given employee in a month.
 */
export function calculateEmployeeDeductions(
  employeeId: string,
  records: AttendanceRecord[],
  rule: LatePenaltyRule,
  year = 2026,
  monthIndex = 7 // August (0-indexed 7)
): MonthlyDeductionSummary {
  const empRecords = records.filter((r) => r.employeeId === employeeId);
  const weeks = getSatToThuWeeksForMonth(year, monthIndex);

  let totalLateCount = 0;
  let totalDeductionDays = 0;

  const weeklyBreakdown: WeeklyDeductionBreakdown[] = weeks.map((w) => {
    // Filter records in this week range
    const weekRecords = empRecords.filter((r) => r.date >= w.startDate && r.date <= w.endDate);

    // Count lates
    const lateCount = weekRecords.filter(
      (r) => r.status === 'late' || (r.entryTime && isLateEntry(r.entryTime))
    ).length;

    // Deduction formula: floor(lateCount / N) * X
    const deductionDays = rule.threshold > 0 ? Math.floor(lateCount / rule.threshold) * rule.deductionDays : 0;

    totalLateCount += lateCount;
    totalDeductionDays += deductionDays;

    return {
      weekNumber: w.weekNumber,
      startDate: w.startDate,
      endDate: w.endDate,
      label: w.label,
      lateCount,
      deductionDays,
    };
  });

  const empName = empRecords[0]?.employeeName || employeeId;
  const empDept = empRecords[0]?.department || '';

  return {
    employeeId,
    employeeName: empName,
    department: empDept,
    weeklyBreakdown,
    totalLateCount,
    totalDeductionDays,
  };
}

/**
 * Computes monthly deductions across ALL employees.
 */
export function calculateAllEmployeeDeductions(
  employees: Employee[],
  records: AttendanceRecord[],
  rule: LatePenaltyRule,
  year = 2026,
  monthIndex = 7
): MonthlyDeductionSummary[] {
  return employees.map((emp) => calculateEmployeeDeductions(emp.id, records, rule, year, monthIndex));
}
