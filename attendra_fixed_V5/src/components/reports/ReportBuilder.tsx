import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Employee, Department, LeaveRequest, UserRole } from '../../types';
import {
  LatePenaltyRule,
  calculateEmployeeDeductions,
  isLateEntry,
  parseTimeToMinutes,
  formatMinutesTo12H,
} from '../../utils/salaryDeduction';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  CheckCircle2,
  Sparkles,
  FileText,
  Printer,
  Table,
  CheckSquare,
  Square,
  Users,
  Building2,
  DollarSign,
  AlertCircle,
  ArrowUpDown,
  Search,
} from 'lucide-react';

interface ReportBuilderProps {
  records: AttendanceRecord[];
  employees?: Employee[];
  departments?: Department[];
  leaveRequests?: LeaveRequest[];
  latePenaltyRule?: LatePenaltyRule;
  currentUserRole?: UserRole;
  onExportCSV?: () => void;
}

export type ReportColumnId =
  | 'name'
  | 'employeeId'
  | 'department'
  | 'presentDays'
  | 'absentDays'
  | 'lateCount'
  | 'leaveDays'
  | 'avgEntryTime'
  | 'avgExitTime'
  | 'totalWorkingHours'
  | 'salaryDeductionDays';

interface ColumnOption {
  id: ReportColumnId;
  label: string;
  defaultChecked: boolean;
}

const ALL_COLUMNS: ColumnOption[] = [
  { id: 'name', label: 'Employee Name', defaultChecked: true },
  { id: 'employeeId', label: 'Employee ID', defaultChecked: true },
  { id: 'department', label: 'Department', defaultChecked: true },
  { id: 'presentDays', label: 'Present Days', defaultChecked: true },
  { id: 'absentDays', label: 'Absent Days', defaultChecked: true },
  { id: 'lateCount', label: 'Late Count', defaultChecked: true },
  { id: 'leaveDays', label: 'Leave Days', defaultChecked: true },
  { id: 'avgEntryTime', label: 'Avg Entry Time', defaultChecked: true },
  { id: 'avgExitTime', label: 'Avg Exit Time', defaultChecked: true },
  { id: 'totalWorkingHours', label: 'Total Working Hours', defaultChecked: true },
  { id: 'salaryDeductionDays', label: 'Salary Deduction Days', defaultChecked: true },
];

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  records,
  employees = [],
  departments = [],
  leaveRequests = [],
  latePenaltyRule = { threshold: 3, deductionDays: 1 },
  currentUserRole = 'super_admin',
}) => {
  const [activeTab, setActiveTab] = useState<'custom_builder' | 'salary_deduction_report'>('custom_builder');

  // Filter States
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['all']);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(['all']);
  const [selectedColumns, setSelectedColumns] = useState<ReportColumnId[]>(
    ALL_COLUMNS.map((c) => c.id)
  );

  // Search & Sorting for Preview Table
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('salaryDeductionDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Department List
  const deptOptions = useMemo(() => {
    if (departments.length > 0) return departments.map((d) => d.name);
    return Array.from(new Set(employees.map((e) => e.department)));
  }, [departments, employees]);

  // Handle Dept Checkboxes
  const toggleDept = (dept: string) => {
    if (dept === 'all') {
      setSelectedDepts(['all']);
      return;
    }
    const current = selectedDepts.filter((d) => d !== 'all');
    if (current.includes(dept)) {
      const next = current.filter((d) => d !== dept);
      setSelectedDepts(next.length === 0 ? ['all'] : next);
    } else {
      setSelectedDepts([...current, dept]);
    }
  };

  // Toggle Column selection
  const toggleColumn = (colId: ReportColumnId) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length === 1) return; // keep at least 1
      setSelectedColumns(selectedColumns.filter((c) => c !== colId));
    } else {
      setSelectedColumns([...selectedColumns, colId]);
    }
  };

  // Filtered list of employees based on dept & emp filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept = selectedDepts.includes('all') || selectedDepts.includes(emp.department);
      const matchesEmp = selectedEmpIds.includes('all') || selectedEmpIds.includes(emp.id);
      return matchesDept && matchesEmp;
    });
  }, [employees, selectedDepts, selectedEmpIds]);

  // Calculate compiled rows for Custom Report
  const compiledRows = useMemo(() => {
    const refDate = startDate ? new Date(startDate) : new Date();
    const year = refDate.getFullYear();
    const monthIndex = refDate.getMonth();

    return filteredEmployees.map((emp) => {
      const empRecords = records.filter(
        (r) => r.employeeId === emp.id && r.date >= startDate && r.date <= endDate
      );
      const empLeaves = leaveRequests.filter(
        (l) => l.employeeId === emp.id && l.status === 'approved' && l.startDate >= startDate && l.endDate <= endDate
      );

      const presentDays = empRecords.filter(
        (r) => r.status === 'present' || r.status === 'grace_period' || r.status === 'wfh'
      ).length;
      const absentDays = empRecords.filter((r) => r.status === 'absent').length;
      const lateCount = empRecords.filter(
        (r) => r.status === 'late' || (r.entryTime && isLateEntry(r.entryTime))
      ).length;
      const leaveDays = empLeaves.reduce((acc, l) => acc + l.totalDays, 0);

      const totalWorkingHours = Number(
        empRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(1)
      );

      // Dynamically calculate average entry & exit times from present/worked records
      const validEntryMins: number[] = [];
      const validExitMins: number[] = [];

      empRecords.forEach((r) => {
        if (r.status !== 'absent') {
          if (r.entryTime) {
            const entryMins = parseTimeToMinutes(r.entryTime);
            if (entryMins !== null) validEntryMins.push(entryMins);
          }
          if (r.exitTime) {
            const exitMins = parseTimeToMinutes(r.exitTime);
            if (exitMins !== null) validExitMins.push(exitMins);
          }
        }
      });

      const avgEntryTime = validEntryMins.length > 0
        ? formatMinutesTo12H(validEntryMins.reduce((a, b) => a + b, 0) / validEntryMins.length)
        : '--:--';

      const avgExitTime = validExitMins.length > 0
        ? formatMinutesTo12H(validExitMins.reduce((a, b) => a + b, 0) / validExitMins.length)
        : '--:--';

      // Salary Deduction calculation
      const deductionSummary = calculateEmployeeDeductions(emp.id, records, latePenaltyRule, year, monthIndex);
      const salaryDeductionDays = deductionSummary.totalDeductionDays;

      return {
        employee: emp,
        id: emp.id,
        name: emp.name,
        employeeId: emp.id,
        department: emp.department,
        presentDays,
        absentDays,
        lateCount,
        leaveDays,
        avgEntryTime,
        avgExitTime,
        totalWorkingHours,
        salaryDeductionDays,
      };
    });
  }, [filteredEmployees, records, leaveRequests, startDate, endDate, latePenaltyRule]);

  // Search & Filtered Rows for Preview
  const displayRows = useMemo(() => {
    const s = searchQuery.toLowerCase();
    let result = compiledRows.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(s) ||
        (r.employeeId || '').toLowerCase().includes(s) ||
        (r.department || '').toLowerCase().includes(s)
    );

    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [compiledRows, searchQuery, sortField, sortOrder]);

  // Export CSV Handler
  const handleDownloadCSV = () => {
    const activeCols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.id));
    const headers = activeCols.map((c) => c.label).join(',');

    const rowStrings = displayRows.map((r: any) => {
      return activeCols
        .map((col) => {
          const val = r[col.id];
          return `"${val !== undefined && val !== null ? val : ''}"`;
        })
        .join(',');
    });

    const csvContent = [headers, ...rowStrings].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendra_Custom_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF / Print Handler
  const handlePrintPDF = () => {
    const activeCols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.id));
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHeadersHTML = activeCols
      .map((c) => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f8fafc; font-size: 11px; text-align: left;">${c.label}</th>`)
      .join('');

    const tableRowsHTML = displayRows
      .map((r: any) => {
        const cells = activeCols
          .map(
            (c) => `<td style="border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 11px;">${r[c.id]}</td>`
          )
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendra Executive Attendance & Payroll Audit Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
            h2 { margin-bottom: 4px; font-size: 20px; color: #1e1b4b; }
            p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .header-info { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>Attendra Custom Attendance & Payroll Audit Report</h2>
          <p>Official Workforce Compliance Ledger Generated on ${new Date().toLocaleDateString()}</p>
          <div class="header-info">
            <span>Date Window: ${startDate} to ${endDate}</span>
            <span>Total Staff Audited: ${displayRows.length}</span>
            <span>Late Penalty Threshold: N=${latePenaltyRule.threshold}, X=${latePenaltyRule.deductionDays} day</span>
          </div>
          <table>
            <thead><tr>${tableHeadersHTML}</tr></thead>
            <tbody>${tableRowsHTML}</tbody>
          </table>
          <div class="footer">
            Generated by Attendra Enterprise Suite • Strictly Confidential HR & Accounts Document
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card & Tab Switcher */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Executive Report Builder & Exporter
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build custom attendance ledgers, penalty reports, and multi-column compliance exports.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('custom_builder')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'custom_builder'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            Custom Report Builder
          </button>
          <button
            onClick={() => setActiveTab('salary_deduction_report')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'salary_deduction_report'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Monthly Salary Deduction Report
          </button>
        </div>
      </div>

      {/* TAB 1: Custom Report Builder */}
      {activeTab === 'custom_builder' && (
        <div className="space-y-6">
          {/* Controls Panel: Date, Depts, Employees, Column Selector */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-4 h-4 text-blue-600" />
              Report Scope & Column Controls
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Range Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Date Range (Start – End)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Department Multi-Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Department Filter
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepts.includes('all')}
                      onChange={() => toggleDept('all')}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    All Departments
                  </label>
                  {deptOptions.map((dept) => (
                    <label key={dept} className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(dept)}
                        onChange={() => toggleDept(dept)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      {dept}
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific Employee Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Specific Employee Scope
                </label>
                <select
                  value={selectedEmpIds[0] || 'all'}
                  onChange={(e) => setSelectedEmpIds([e.target.value])}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Employees in Selected Departments</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) — {emp.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 block">
                Select Report Columns to Include ({selectedColumns.length} Selected):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {ALL_COLUMNS.map((col) => {
                  const isChecked = selectedColumns.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleColumn(col.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-left ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{col.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export Actions & Live Preview Table */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  Live Report Preview
                </h4>
                <p className="text-xs text-slate-500">
                  Showing {displayRows.length} employee records for date window {startDate} to {endDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search preview..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-40"
                  />
                </div>

                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  Export Excel / CSV
                </button>

                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
                  Export as PDF
                </button>
              </div>
            </div>

            {/* Live Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                    {ALL_COLUMNS.filter((c) => selectedColumns.includes(c.id)).map((col) => (
                      <th
                        key={col.id}
                        onClick={() => {
                          if (sortField === col.id) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField(col.id);
                            setSortOrder('desc');
                          }
                        }}
                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedColumns.length}
                        className="py-8 text-center text-slate-400 font-semibold"
                      >
                        No employee records found matching current scope.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        {selectedColumns.includes('name') && (
                          <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                            <img
                              src={row.employee.avatar}
                              alt={row.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                            {row.name}
                          </td>
                        )}
                        {selectedColumns.includes('employeeId') && (
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {row.employeeId}
                          </td>
                        )}
                        {selectedColumns.includes('department') && (
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {row.department}
                          </td>
                        )}
                        {selectedColumns.includes('presentDays') && (
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            {row.presentDays} days
                          </td>
                        )}
                        {selectedColumns.includes('absentDays') && (
                          <td className="py-2.5 px-3 font-bold text-rose-600">
                            {row.absentDays} days
                          </td>
                        )}
                        {selectedColumns.includes('lateCount') && (
                          <td className="py-2.5 px-3 font-bold text-amber-700">
                            {row.lateCount} lates
                          </td>
                        )}
                        {selectedColumns.includes('leaveDays') && (
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {row.leaveDays} days
                          </td>
                        )}
                        {selectedColumns.includes('avgEntryTime') && (
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {row.avgEntryTime}
                          </td>
                        )}
                        {selectedColumns.includes('avgExitTime') && (
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {row.avgExitTime}
                          </td>
                        )}
                        {selectedColumns.includes('totalWorkingHours') && (
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {row.totalWorkingHours} hrs
                          </td>
                        )}
                        {selectedColumns.includes('salaryDeductionDays') && (
                          <td className="py-2.5 px-3 font-extrabold text-rose-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                              {row.salaryDeductionDays} days
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Monthly Salary Deduction Report */}
      {activeTab === 'salary_deduction_report' && (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <DollarSign className="w-5 h-5 stroke-[2.2]" />
                </span>
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Monthly Salary Deduction Report (August 2026)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automated weekly late calculation ledger (N={latePenaltyRule.threshold} lates/week = {latePenaltyRule.deductionDays} day deduction). For Accounts payroll reference.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-2xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                Export Deduction CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Employee ID</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-center">Total Late Days</th>
                  <th className="py-3 px-3 text-center">Total Deduction Days</th>
                  <th className="py-3 px-3 text-right">Status / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <img
                        src={row.employee.avatar}
                        alt={row.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      {row.name}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                      {row.employeeId}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {row.department}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-700 text-center">
                      {row.lateCount} lates
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                          row.salaryDeductionDays > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {row.salaryDeductionDays} Day{row.salaryDeductionDays !== 1 ? 's' : ''} Deducted
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] font-medium text-slate-500">
                      {row.salaryDeductionDays > 0
                        ? `Threshold met (${latePenaltyRule.threshold} lates/wk)`
                        : 'No penalty incurred'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
