import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus, Employee, UserRole } from '../../types';
import {
  Search,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employees?: Employee[];
  onSelectEmployee: (empId: string) => void;
  onOpenManualCorrection?: (recordId?: string) => void;
  onExportCSV: () => void;
  currentUserRole?: UserRole;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  employees = [],
  onSelectEmployee,
  onOpenManualCorrection,
  onExportCSV,
  currentUserRole,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Helper function to format date into "Today", "Yesterday", or "01 August 2026"
  const getFormattedDateLabel = (dateStr: string) => {
    if (!dateStr) return '—';

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (monthNames[monthIdx]) {
        return `${day} ${monthNames[monthIdx]} ${year}`;
      }
    }

    return dateStr;
  };

  // 1. Match each attendance record with an existing real employee in the employees table
  const findEmp = (r: AttendanceRecord) => {
    return employees.find(
      (e) =>
        e.id === r.employeeId ||
        e.id === r.employeeId?.replace('EMP-', '') ||
        (e.email && r.employeeId && e.email.toLowerCase() === r.employeeId.toLowerCase()) ||
        (e.name && r.employeeName && e.name.toLowerCase() === r.employeeName.toLowerCase())
    );
  };

  // Filter out records that do NOT match an active/real employee
  const validRecords = records.filter((r) => {
    if (employees.length === 0) return true;
    const emp = findEmp(r);
    return !!emp;
  });

  // 2. Filter records based on toolbar filters
  const filteredRecords = validRecords.filter((r) => {
    const emp = findEmp(r);

    const empName = emp ? emp.name : (r.employeeName || '');
    const empDept = emp ? emp.department : (r.department || '');
    const empIdStr = emp ? emp.id : (r.employeeId || '');

    const s = search.toLowerCase();
    const matchesSearch =
      empName.toLowerCase().includes(s) ||
      empDept.toLowerCase().includes(s) ||
      empIdStr.toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDept =
      departmentFilter === 'all' ||
      empDept === departmentFilter;
    const matchesDate = dateFilter === 'all' || r.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesDate;
  });

  // 3. Sorting: Newest date ("Today") at the top, then "Yesterday", then older dates descending
  filteredRecords.sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (b.entryTime || '').localeCompare(a.entryTime || '');
  });

  // Extract unique dates for date filter dropdown
  const uniqueDates: string[] = Array.from(
    new Set<string>(validRecords.map((r) => r.date))
  )
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  // Extract available departments for department dropdown
  const availableDepartments: string[] = Array.from(
    new Set<string>(employees.map((e) => e.department).filter(Boolean))
  );

  const getStatusBadge = (status: AttendanceStatus | string) => {
    switch (status) {
      case 'present':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            On-Time
          </span>
        );
      case 'grace_period':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            Grace Period
          </span>
        );
      case 'late':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            Late Entry
          </span>
        );
      case 'wfh':
      case 'remote':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
            Remote WFH
          </span>
        );
      case 'on_leave':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
            On Leave
          </span>
        );
      case 'absent':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
            Absent
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Top Filter & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Live Attendance Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified entry and exit audit timestamps
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter employee or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {getFormattedDateLabel(d)} ({d})
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-b border-slate-100">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'present', label: 'On-Time' },
          { id: 'grace_period', label: 'Grace Period' },
          { id: 'late', label: 'Late Entries' },
          { id: 'wfh', label: 'Remote WFH' },
          { id: 'on_leave', label: 'On Leave' },
          { id: 'absent', label: 'Absent' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container - Exactly 7 Columns */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="py-3.5 px-4 text-left">Employee Name</th>
              <th className="py-3.5 px-4 text-left">Date</th>
              <th className="py-3.5 px-4 text-left">Department</th>
              <th className="py-3.5 px-4 text-left">Entry Time</th>
              <th className="py-3.5 px-4 text-left">Exit Time</th>
              <th className="py-3.5 px-4 text-left">Work Hours</th>
              <th className="py-3.5 px-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => {
                const emp = findEmp(rec);

                const employeeName = emp ? emp.name : rec.employeeName;
                const employeeAvatar = emp ? emp.avatar : rec.employeeAvatar;
                const employeeDept = emp ? emp.department : (rec.department || 'General');
                const employeeId = emp ? emp.id : rec.employeeId;

                const hasCheckedOut = !!rec.exitTime && rec.exitTime !== '-';

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* 1. Employee Name */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectEmployee(employeeId)}
                        className="flex items-center gap-3 text-left hover:opacity-80 group cursor-pointer"
                      >
                        <img
                          src={employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                          alt={employeeName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200/60"
                        />
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {employeeName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">{employeeId}</p>
                        </div>
                      </button>
                    </td>

                    {/* 2. Date */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl text-xs font-bold">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {getFormattedDateLabel(rec.date)}
                      </span>
                    </td>

                    {/* 3. Department */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{employeeDept}</span>
                    </td>

                    {/* 4. Entry Time */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {rec.entryTime || '—'}
                    </td>

                    {/* 5. Exit Time */}
                    <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">
                      {hasCheckedOut ? (
                        <span className="text-slate-800 font-bold">{rec.exitTime}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                          Active Shift
                        </span>
                      )}
                    </td>

                    {/* 6. Work Hours */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {hasCheckedOut ? (
                        <span className="font-extrabold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                          {rec.workHours ? `${rec.workHours} hrs` : '8.0 hrs'}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-xs">In Progress</span>
                      )}
                    </td>

                    {/* 7. Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(rec.status)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <p className="font-extrabold text-sm text-slate-800">No attendance records found.</p>
                  <p className="text-xs text-slate-400 mt-1">No matching logs exist for the selected filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
        <span>Showing {filteredRecords.length} records</span>
        <div className="flex items-center gap-2">
          <button type="button" className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-900 px-2">Page 1 of 1</span>
          <button type="button" className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
