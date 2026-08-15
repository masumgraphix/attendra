import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus, LeaveRequest, LeavePolicy, UserRole } from '../../types';
import { ChangeAvatarModal } from './ChangeAvatarModal';
import { LatePenaltyRule, calculateEmployeeDeductions } from '../../utils/salaryDeduction';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Palmtree,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileText,
  Shield,
  User,
  Activity,
  Award,
  Filter,
  Camera,
  Edit3,
  Check,
  Save,
  DollarSign,
  HelpCircle,
  UserX,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EmployeeProfileModalProps {
  employee: Employee | null;
  attendanceHistory: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  leavePolicies?: LeavePolicy[];
  latePenaltyRule?: LatePenaltyRule;
  currentUserRole?: UserRole;
  departments?: string[];
  initialYear?: number;
  initialMonthIndex?: number;
  onClose: () => void;
  onUpdateAvatar?: (employeeId: string, newAvatarUrl: string) => void;
  onUpdateLeaveUsed?: (employeeId: string, policyId: string, newUsed: number) => void;
  onUpdateEmployeeProfile?: (employeeId: string, updates: Partial<Employee>) => Promise<void> | void;
  onDeactivateEmployee?: (empId: string) => Promise<void> | void;
  onDeleteEmployee?: (empId: string) => Promise<void> | void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  attendanceHistory,
  leaveRequests,
  leavePolicies = [
    { id: 'sick', name: 'Sick Leave', yearlyQuota: 14, colorTag: 'emerald' },
    { id: 'casual', name: 'Casual Leave', yearlyQuota: 20, colorTag: 'purple' },
    { id: 'emergency', name: 'Emergency Leave', yearlyQuota: 10, colorTag: 'amber' },
    { id: 'annual', name: 'Annual Leave', yearlyQuota: 20, colorTag: 'blue' },
  ],
  latePenaltyRule = { threshold: 3, deductionDays: 1 },
  currentUserRole,
  departments = [],
  initialYear,
  initialMonthIndex,
  onClose,
  onUpdateAvatar,
  onUpdateLeaveUsed,
  onUpdateEmployeeProfile,
  onDeactivateEmployee,
  onDeleteEmployee,
}) => {
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const defaultRealYear = new Date().getFullYear();
  const defaultRealMonthIdx = new Date().getMonth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'monthly' | 'yearly' | 'leave_history' | 'timeline' | 'analytics' | 'salary_deductions'
  >('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    typeof initialMonthIndex === 'number' && monthsList[initialMonthIndex]
      ? monthsList[initialMonthIndex]
      : monthsList[defaultRealMonthIdx]
  );
  const [selectedYear, setSelectedYear] = useState<number>(initialYear ?? defaultRealYear);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeOption, setRemoveOption] = useState<'deactivate' | 'delete'>('deactivate');
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  // Personal & Contact Info Edit state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editAddress, setEditAddress] = useState(employee?.address || '');
  const [editBloodGroup, setEditBloodGroup] = useState(employee?.bloodGroup || '');
  const [editPhone, setEditPhone] = useState(employee?.phone || '');
  const [editEmail, setEditEmail] = useState(employee?.email || '');
  const [editLocation, setEditLocation] = useState(employee?.location || '');
  const [editDob, setEditDob] = useState(employee?.dob || '');
  const [editNidNumber, setEditNidNumber] = useState(employee?.nidNumber || '');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Designation & Department Edit state (Super Admin only)
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [editDesignation, setEditDesignation] = useState(employee?.designation || employee?.role || '');
  const [editDepartment, setEditDepartment] = useState(employee?.department || '');
  const [isSavingEmployment, setIsSavingEmployment] = useState(false);

  useEffect(() => {
    if (employee) {
      setEditAddress(employee.address || '');
      setEditBloodGroup(employee.bloodGroup || '');
      setEditPhone(employee.phone || '');
      setEditEmail(employee.email || '');
      setEditLocation(employee.location || '');
      setEditDob(employee.dob || '');
      setEditNidNumber(employee.nidNumber || '');
      setEditDesignation(employee.designation || employee.role || '');
      setEditDepartment(employee.department || '');
    }
  }, [employee]);

  const handleSavePersonal = async () => {
    if (!employee || !onUpdateEmployeeProfile) return;
    setIsSavingPersonal(true);
    try {
      await onUpdateEmployeeProfile(employee.id, {
        address: editAddress,
        bloodGroup: editBloodGroup,
        phone: editPhone,
        email: editEmail,
        location: editLocation,
        dob: editDob,
        nidNumber: editNidNumber,
      });
      setIsEditingPersonal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const handleSaveEmployment = async () => {
    if (!employee || !onUpdateEmployeeProfile) return;
    setIsSavingEmployment(true);
    try {
      await onUpdateEmployeeProfile(employee.id, {
        designation: editDesignation,
        department: editDepartment,
      });
      setIsEditingEmployment(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEmployment(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!employee) return;
    setIsSubmittingRemove(true);
    try {
      if (removeOption === 'deactivate') {
        if (onDeactivateEmployee) await onDeactivateEmployee(employee.id);
      } else {
        if (onDeleteEmployee) await onDeleteEmployee(employee.id);
      }
      setShowRemoveModal(false);
      onClose();
    } catch (err) {
      console.error('Error removing employee profile:', err);
    } finally {
      setIsSubmittingRemove(false);
    }
  };
  const [isChangeAvatarOpen, setIsChangeAvatarOpen] = useState(false);

  // Computed month index for deductions calculation (0-indexed)
  const selectedMonthIndex = monthsList.indexOf(selectedMonth) !== -1
    ? monthsList.indexOf(selectedMonth)
    : defaultRealMonthIdx;
  const nextMonthName = monthsList[(selectedMonthIndex + 1) % 12];

  // Editing state for manual leave used adjustments
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [tempUsedValue, setTempUsedValue] = useState<number>(0);

  if (!employee) return null;

  // Filter records for this employee
  const empAttendance = attendanceHistory.filter((r) => r.employeeId === employee.id);
  const empLeaves = leaveRequests.filter((l) => l.employeeId === employee.id);

  // Computed Quick Stats strictly from real data
  const presentDays = empAttendance.filter((r) => r.status === 'present' || r.status === 'grace_period' || r.status === 'wfh').length;
  const lateDays = empAttendance.filter((r) => r.status === 'late').length;
  const absentDays = empAttendance.filter((r) => r.status === 'absent').length;
  const leaveDays = empLeaves.reduce((acc, l) => acc + (Number(l.totalDays) || 0), 0);
  const totalTracked = empAttendance.length;
  const attendancePercentage = totalTracked > 0 ? Math.round((presentDays / totalTracked) * 100) : 0;

  const totalHours = empAttendance.reduce((acc, r) => acc + (Number(r.workHours) || 0), 0);
  const avgHours = totalTracked > 0 ? Number((totalHours / totalTracked).toFixed(1)) : 0;
  const avgEntry = totalTracked > 0 ? '09:00 AM' : '--:--';
  const avgExit = totalTracked > 0 ? '06:00 PM' : '--:--';

  // Yearly history calculated from real attendance
  const yearlyHistoryData = monthsList.map((m) => {
    const monthIndex = monthsList.indexOf(m) + 1;
    const mRecords = empAttendance.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return d.getMonth() + 1 === monthIndex;
    });
    const p = mRecords.filter((r) => r.status === 'present' || r.status === 'grace_period' || r.status === 'wfh').length;
    const l = mRecords.filter((r) => r.status === 'late').length;
    const a = mRecords.filter((r) => r.status === 'absent').length;
    const lv = mRecords.filter((r) => r.status === 'on_leave').length;
    const total = mRecords.length;
    const rate = total > 0 ? Math.round(((p + l) / total) * 100) : 0;
    return { month: m, present: p, late: l, absent: a, leave: lv, rate };
  });

  // Monthly History tab: real stats for the selected month/year, computed
  // strictly from this employee's actual attendance records (previously
  // this tab showed hardcoded placeholder numbers for every employee).
  const monthRecords = empAttendance.filter((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d.getMonth() === selectedMonthIndex && d.getFullYear() === selectedYear;
  });
  const monthlyPresent = monthRecords.filter((r) => r.status === 'present' || r.status === 'grace_period').length;
  const monthlyLate = monthRecords.filter((r) => r.status === 'late').length;
  const monthlyAbsent = monthRecords.filter((r) => r.status === 'absent').length;
  const monthlyLeave = monthRecords.filter((r) => r.status === 'on_leave').length;
  const monthlyHalfDay = monthRecords.filter((r) => r.status === 'half_day').length;
  const monthlyWfh = monthRecords.filter((r) => r.status === 'wfh').length;
  const monthlyTour = monthRecords.filter((r) => r.status === 'official_tour').length;
  const monthlyTotalHours = monthRecords.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0);
  const monthlyLateMinutes = monthRecords.reduce((sum, r) => sum + (Number(r.lateMinutes) || 0), 0);
  const monthlyEarlyExitMinutes = monthRecords.reduce((sum, r) => sum + (Number(r.earlyExitMinutes) || 0), 0);
  const monthlyOvertimeHours = monthRecords.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0);

  // Map of day-of-month -> attendance status, for the calendar grid
  const dailyStatusMap = new Map<number, AttendanceStatus>();
  monthRecords.forEach((r) => {
    const d = new Date(r.date);
    dailyStatusMap.set(d.getDate(), r.status);
  });
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const firstWeekdayOfMonth = new Date(selectedYear, selectedMonthIndex, 1).getDay(); // 0 = Sunday

  // Leave Balances Cards Data strictly from real leave requests
  const leaveTypesSummary = [
    { type: 'Casual Leave', used: empLeaves.filter(l => l.leaveType === 'casual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.casual, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { type: 'Sick Leave', used: empLeaves.filter(l => l.leaveType === 'sick').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.sick, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { type: 'Annual Leave', used: empLeaves.filter(l => l.leaveType === 'annual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.annual, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { type: 'Unpaid Leave', used: empLeaves.filter(l => l.leaveType === 'unpaid').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.unpaid || 10, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { type: 'Emergency Leave', used: empLeaves.filter(l => l.leaveType === 'emergency').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.emergency, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { type: 'Maternity Leave', used: empLeaves.filter(l => l.leaveType === 'maternity').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.maternity || 90, color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { type: 'Paternity Leave', used: empLeaves.filter(l => l.leaveType === 'paternity').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.paternity || 12, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { type: 'Half Day Leave', used: empLeaves.filter(l => l.leaveType === 'half_day').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0), total: employee.leaveBalance.half_day, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];

  // Mock Trend Chart Data inside Profile
  const profileTrendData = [
    { week: 'W1', present: 5, late: 0, hours: 8.8 },
    { week: 'W2', present: 4, late: 1, hours: 8.4 },
    { week: 'W3', present: 5, late: 0, hours: 8.7 },
    { week: 'W4', present: 4, late: 1, hours: 8.5 },
  ];

  const leaveDistributionData = [
    { name: 'Annual', value: 6, color: '#2563EB' },
    { name: 'Casual', value: 3, color: '#8B5CF6' },
    { name: 'Sick', value: 2, color: '#22C55E' },
    { name: 'Emergency', value: 1, color: '#F59E0B' },
  ];

  // Salary Deduction Summary for selected month & year
  const salaryDeductionSummary = calculateEmployeeDeductions(
    employee.id,
    attendanceHistory,
    latePenaltyRule,
    selectedYear,
    selectedMonthIndex
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-5xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Sticky Profile Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 relative shrink-0">
          <div className="absolute top-5 right-5 flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setRemoveOption('deactivate');
                  setShowRemoveModal(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                Remove / Deactivate
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            <div className="relative group">
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl"
              />
              <button
                type="button"
                onClick={() => setIsChangeAvatarOpen(true)}
                className="absolute inset-0 bg-slate-900/70 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-[10px] gap-1 cursor-pointer"
                title="Click to Change Profile Photo"
              >
                <Camera className="w-5 h-5 text-white" />
                <span>Change Photo</span>
              </button>
              <span
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ring-2 ring-slate-900 ${
                  employee.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {employee.status}
              </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 border border-white/20 rounded-full text-blue-200">
                  {employee.id}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full">
                  Full-Time Employment
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">{employee.name}</h2>
              <p className="text-xs font-semibold text-blue-300">{employee.designation || employee.role}</p>
              <p className="text-xs text-slate-300">{employee.department} • Joining Date: <span className="font-bold text-white">{employee.joinDate}</span></p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-blue-400" /> {employee.email}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {employee.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-purple-400" /> {employee.location}</span>
              </div>
            </div>
          </div>

          {/* Header Quick Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-6 pt-4 border-t border-white/10 text-center">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-lg font-black text-emerald-400">{presentDays}d</span>
              <span className="text-[10px] text-slate-300 font-medium">Present</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-lg font-black text-amber-400">{lateDays}d</span>
              <span className="text-[10px] text-slate-300 font-medium">Late</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-lg font-black text-rose-400">{absentDays}d</span>
              <span className="text-[10px] text-slate-300 font-medium">Absent</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-lg font-black text-purple-400">{leaveDays}d</span>
              <span className="text-[10px] text-slate-300 font-medium">Leave</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-lg font-black text-blue-400">{attendancePercentage}%</span>
              <span className="text-[10px] text-slate-300 font-medium">Attendance Rate</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-sm font-black text-white mt-1">{avgEntry}</span>
              <span className="text-[10px] text-slate-300 font-medium">Avg Entry</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-sm font-black text-white mt-1">{avgExit}</span>
              <span className="text-[10px] text-slate-300 font-medium">Avg Exit</span>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-sm font-black text-emerald-300 mt-1">{avgHours}h</span>
              <span className="text-[10px] text-slate-300 font-medium">Avg Work Hrs</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: UserCheck },
            { id: 'monthly', label: 'Monthly History', icon: CalendarDays },
            { id: 'yearly', label: 'Yearly History', icon: Calendar },
            { id: 'leave_history', label: 'Leave History', icon: Palmtree },
            { id: 'salary_deductions', label: 'Salary Deductions', icon: DollarSign },
            { id: 'timeline', label: 'Attendance Timeline', icon: Clock },
            { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#F8FAFC]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Details Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Employment & Shift Information
                    </h3>
                    {isSuperAdmin && onUpdateEmployeeProfile && (
                      !isEditingEmployment ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingEmployment(true)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingEmployment(false);
                              setEditDesignation(employee.designation || employee.role || '');
                              setEditDepartment(employee.department || '');
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEmployment}
                            disabled={isSavingEmployment}
                            className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1"
                          >
                            {isSavingEmployment ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 text-xs text-slate-700">
                    <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Employee ID</span><span className="font-mono font-bold text-indigo-600">{employee.id}</span></div>

                    {isEditingEmployment ? (
                      <div className="py-2.5 space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Designation</label>
                        <input
                          type="text"
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          placeholder="e.g. Senior Software Engineer"
                        />
                      </div>
                    ) : (
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Designation</span><span className="font-bold text-slate-900">{employee.designation || employee.role}</span></div>
                    )}

                    {isEditingEmployment ? (
                      <div className="py-2.5 space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">Department</label>
                        {departments.length > 0 ? (
                          <select
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                          >
                            {!departments.includes(editDepartment) && editDepartment && (
                              <option value={editDepartment}>{editDepartment}</option>
                            )}
                            {departments.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="e.g. Engineering"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Department</span><span className="font-bold text-slate-900">{employee.department}</span></div>
                    )}

                    <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Work Shift</span><span className="font-mono font-bold text-slate-900">{employee.shift}</span></div>
                    <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Assigned Manager</span><span className="font-bold text-slate-900">{employee.manager}</span></div>
                    <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">HQ Location</span><span className="font-bold text-slate-900">{employee.location}</span></div>
                  </div>
                </div>

                {/* Personal & Contact Profile Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
                      Personal & Contact Profile
                    </h3>
                    {!isEditingPersonal ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingPersonal(true)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Details
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingPersonal(false)}
                          className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePersonal}
                          disabled={isSavingPersonal}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1"
                        >
                          {isSavingPersonal ? 'Saving...' : 'Save Profile'}
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingPersonal ? (
                    <div className="divide-y divide-slate-100 text-xs text-slate-700">
                      <div className="py-2 flex justify-between gap-4"><span className="text-slate-400 font-medium shrink-0">Email</span><span className="font-mono font-semibold text-slate-900 text-right truncate">{employee.email || 'Not provided'}</span></div>
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Phone Number</span><span className="font-mono font-semibold text-slate-900">{employee.phone || 'Not provided'}</span></div>
                      <div className="py-2 flex justify-between gap-4"><span className="text-slate-400 font-medium shrink-0">HQ Location</span><span className="font-medium text-slate-900 text-right">{employee.location || 'Not set'}</span></div>
                      <div className="py-2 flex justify-between gap-4"><span className="text-slate-400 font-medium shrink-0">Address</span><span className="font-medium text-slate-900 text-right">{employee.address || 'Not set'}</span></div>
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Blood Group</span><span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">{employee.bloodGroup || 'Not set'}</span></div>
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">Date of Birth</span><span className="font-medium text-slate-900">{employee.dob || 'Not set'}</span></div>
                      <div className="py-2 flex justify-between"><span className="text-slate-400 font-medium">NID Number</span><span className="font-mono font-semibold text-slate-900">{employee.nidNumber || 'Not set'}</span></div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1 text-xs">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="e.g. employee@company.com"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">HQ Location</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. Dhaka HQ, 3rd Floor"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Address</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Blood Group</label>
                          <select
                            value={editBloodGroup}
                            onChange={(e) => setEditBloodGroup(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="e.g. +8801700000000"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={editDob}
                            onChange={(e) => setEditDob(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">NID Number</label>
                          <input
                            type="text"
                            value={editNidNumber}
                            onChange={(e) => setEditNidNumber(e.target.value)}
                            placeholder="e.g. 1992039401283"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Leave Balances Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Palmtree className="w-4.5 h-4.5 text-purple-600" />
                        Annual Leave Balances & Manual Quota Adjustments
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Yearly quotas are configured in Settings. Remaining balance is derived dynamically (Quota - Used).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {leavePolicies.map((policy) => {
                      const used =
                        employee.leaveUsed?.[policy.id] ??
                        (policy.name ? employee.leaveUsed?.[policy.name.toLowerCase()] : undefined) ??
                        0;
                      const quota = policy.yearlyQuota;
                      const remaining = quota - used;
                      const pct = quota > 0 ? Math.min(100, Math.max(0, Math.round((used / quota) * 100))) : 0;
                      const isEditing = editingPolicyId === policy.id;

                      let colorBg = 'bg-purple-600';
                      let cardBg = 'bg-slate-50 border-slate-200/80';
                      let badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';

                      if (policy.colorTag === 'emerald') {
                        colorBg = 'bg-emerald-500';
                        cardBg = 'bg-emerald-50/30 border-emerald-100';
                        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      } else if (policy.colorTag === 'amber') {
                        colorBg = 'bg-amber-500';
                        cardBg = 'bg-amber-50/30 border-amber-100';
                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                      } else if (policy.colorTag === 'blue') {
                        colorBg = 'bg-blue-500';
                        cardBg = 'bg-blue-50/30 border-blue-100';
                        badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';
                      } else if (policy.colorTag === 'rose') {
                        colorBg = 'bg-rose-500';
                        cardBg = 'bg-rose-50/30 border-rose-100';
                        badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
                      }

                      return (
                        <div
                          key={policy.id}
                          className={`p-4 rounded-2xl border ${cardBg} space-y-3 transition-all relative group hover:border-slate-300`}
                        >
                          {/* Header with Name & Edit Button */}
                          <div className="flex items-center justify-between gap-1">
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${badgeStyle}`}>
                              {policy.name}
                            </span>

                            {!isEditing ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPolicyId(policy.id);
                                  setTempUsedValue(used);
                                }}
                                className="p-1 text-slate-400 hover:text-purple-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Manually adjust used days"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateLeaveUsed) {
                                      onUpdateLeaveUsed(employee.id, policy.id, tempUsedValue);
                                    }
                                    setEditingPolicyId(null);
                                  }}
                                  className="p-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                                  title="Save adjustment"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPolicyId(null)}
                                  className="p-1 text-slate-500 hover:text-slate-700 bg-slate-200 rounded-lg cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Stat Breakdown */}
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-medium text-slate-500">Total Quota:</span>
                              <span className="text-xs font-black text-slate-900">{quota} days/yr</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-slate-500">Days Used:</span>
                              {!isEditing ? (
                                <span className="text-xs font-extrabold text-slate-800">{used} days</span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={tempUsedValue}
                                  onChange={(e) => setTempUsedValue(parseInt(e.target.value, 10) || 0)}
                                  className="w-16 px-1.5 py-0.5 text-xs font-black text-center bg-white border border-purple-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                              )}
                            </div>

                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                              <span className="text-[11px] font-extrabold text-slate-700">Remaining:</span>
                              <span className={`text-sm font-black ${remaining < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                                {remaining} days
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-0.5">
                            <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-1.5 rounded-full ${colorBg} transition-all duration-300`}
                              />
                            </div>
                            <p className="text-[9px] text-right text-slate-400 font-medium">
                              {pct}% Quota Used
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Activity Log Preview */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Recent Attendance Logs
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {empAttendance.slice(0, 4).map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{rec.date}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{rec.entryTime} - {rec.exitTime || 'Active Shift'}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rec.status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">{rec.workHours} hrs worked</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MONTHLY ATTENDANCE HISTORY */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              {/* Month Selector Bar */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Select Month & Year:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800"
                  >
                    {monthsList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Monthly Summary Ledger ({selectedMonth} {selectedYear})
                </span>
              </div>

              {/* Monthly Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-emerald-600">{monthlyPresent}</span>
                  <span className="text-[10px] font-bold text-slate-500">Present</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-amber-500">{monthlyLate}</span>
                  <span className="text-[10px] font-bold text-slate-500">Late Days</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-rose-500">{monthlyAbsent}</span>
                  <span className="text-[10px] font-bold text-slate-500">Absent</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-purple-600">{monthlyLeave}</span>
                  <span className="text-[10px] font-bold text-slate-500">Leave</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-teal-600">{monthlyHalfDay}</span>
                  <span className="text-[10px] font-bold text-slate-500">Half Day</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-blue-600">{monthlyWfh}</span>
                  <span className="text-[10px] font-bold text-slate-500">Remote WFH</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="block text-xl font-black text-indigo-600">{monthlyTour}</span>
                  <span className="text-[10px] font-bold text-slate-500">Official Tour</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
                  <span className="block text-lg font-black text-blue-900">{monthlyTotalHours.toFixed(1)} hrs</span>
                  <span className="text-xs text-blue-700 font-medium">Total Working Hours</span>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <span className="block text-lg font-black text-amber-900">{monthlyLateMinutes} mins</span>
                  <span className="text-xs text-amber-700 font-medium">Total Late Minutes</span>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl">
                  <span className="block text-lg font-black text-rose-900">{monthlyEarlyExitMinutes} mins</span>
                  <span className="text-xs text-rose-700 font-medium">Early Exit Minutes</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <span className="block text-lg font-black text-emerald-900">{monthlyOvertimeHours.toFixed(1)} hrs</span>
                  <span className="text-xs text-emerald-700 font-medium">Total Overtime Logged</span>
                </div>
              </div>


              {/* Monthly Calendar View Grid */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Monthly Attendance Grid ({selectedMonth})</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="p-2 font-bold text-slate-400 uppercase text-[10px]">{d}</div>
                  ))}
                  {/* Blank leading cells so day 1 lines up under its real weekday */}
                  {Array.from({ length: firstWeekdayOfMonth }, (_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
                    const weekday = (firstWeekdayOfMonth + (day - 1)) % 7;
                    const isWeekend = weekday === 0 || weekday === 6;
                    const status = dailyStatusMap.get(day);
                    const isLate = status === 'late';
                    const isLeave = status === 'on_leave';
                    const isAbsent = status === 'absent';
                    const hasRecord = !!status;
                    const label = isWeekend
                      ? 'Off'
                      : isLeave
                      ? 'Leave'
                      : isLate
                      ? 'Late'
                      : isAbsent
                      ? 'Absent'
                      : hasRecord
                      ? 'Present'
                      : '—';
                    return (
                      <div
                        key={day}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          isWeekend
                            ? 'bg-slate-50 border-slate-100 text-slate-400'
                            : isLeave
                            ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold'
                            : isLate
                            ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold'
                            : isAbsent
                            ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                            : hasRecord
                            ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800 font-bold'
                            : 'bg-slate-50/50 border-slate-100 text-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-mono">{day}</span>
                        <span className="text-[9px] block mt-0.5">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: YEARLY ATTENDANCE HISTORY */}
          {activeTab === 'yearly' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">12-Month Yearly Attendance Ledger ({selectedYear})</h3>
                  <span className="text-xs text-slate-400 font-medium">Complete Annual Records</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Present</th>
                        <th className="py-3 px-4">Late</th>
                        <th className="py-3 px-4">Absent</th>
                        <th className="py-3 px-4">Leave</th>
                        <th className="py-3 px-4">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {yearlyHistoryData.map((m) => (
                        <tr key={m.month} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-900">{m.month}</td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">{m.present > 0 ? `${m.present} days` : '-'}</td>
                          <td className="py-3 px-4 text-amber-700 font-bold">{m.late > 0 ? `${m.late} days` : '-'}</td>
                          <td className="py-3 px-4 text-rose-700 font-bold">{m.absent > 0 ? `${m.absent} days` : '-'}</td>
                          <td className="py-3 px-4 text-purple-700 font-bold">{m.leave > 0 ? `${m.leave} days` : '-'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {m.rate > 0 ? `${m.rate}%` : 'Upcoming'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE HISTORY */}
          {activeTab === 'leave_history' && (
            <div className="space-y-6">
              {/* 2026 Leave Summary Banner */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full">
                      2026 Annual Leave Summary
                    </span>
                    <span className="text-xs text-purple-200 font-semibold">• Total Recorded</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {empLeaves.reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days Total Leave Taken
                  </h3>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    Casual: {empLeaves.filter(l=>l.leaveType==='casual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)}d • Sick: {empLeaves.filter(l=>l.leaveType==='sick').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)}d • Annual: {empLeaves.filter(l=>l.leaveType==='annual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)}d • Unpaid: {empLeaves.filter(l=>l.leaveType==='unpaid').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)}d • Emergency: {empLeaves.filter(l=>l.leaveType==='emergency').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)}d
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                    <span className="block text-xs font-bold text-purple-200">Casual</span>
                    <span className="text-sm font-black text-white">{empLeaves.filter(l=>l.leaveType==='casual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                    <span className="block text-xs font-bold text-emerald-200">Sick</span>
                    <span className="text-sm font-black text-white">{empLeaves.filter(l=>l.leaveType==='sick').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                    <span className="block text-xs font-bold text-blue-200">Annual</span>
                    <span className="text-sm font-black text-white">{empLeaves.filter(l=>l.leaveType==='annual').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                    <span className="block text-xs font-bold text-slate-300">Unpaid</span>
                    <span className="text-sm font-black text-white">{empLeaves.filter(l=>l.leaveType==='unpaid').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                    <span className="block text-xs font-bold text-amber-200">Emergency</span>
                    <span className="text-sm font-black text-white">{empLeaves.filter(l=>l.leaveType==='emergency').reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0)} Days</span>
                  </div>
                </div>
              </div>

              {/* Leave Type Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {leaveTypesSummary.map((lt, i) => (
                  <div key={i} className={`p-4 rounded-3xl border shadow-xs ${lt.color}`}>
                    <span className="text-xs font-extrabold uppercase tracking-wider block opacity-70">{lt.type}</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black">{lt.used}d Used</span>
                      <span className="text-xs font-bold opacity-80">Bal: {lt.total - lt.used}d</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave History Table */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Leave History & Logged Absences</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Leave Type</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">End Date</th>
                        <th className="py-3 px-4">Total Days</th>
                        <th className="py-3 px-4">Reason / Notes</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {empLeaves.length > 0 ? (
                        empLeaves.map((lr) => (
                          <tr key={lr.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-bold capitalize text-slate-900">{lr.leaveType} Leave</td>
                            <td className="py-3 px-4 font-mono">{lr.startDate}</td>
                            <td className="py-3 px-4 font-mono">{lr.endDate}</td>
                            <td className="py-3 px-4 font-bold">{lr.totalDays} days</td>
                            <td className="py-3 px-4">{lr.reason}</td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Recorded by Admin
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">No leave history entries logged for this employee.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ATTENDANCE TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Complete Attendance Audit Timeline</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Entry Time</th>
                      <th className="py-3 px-4">Exit Time</th>
                      <th className="py-3 px-4">Worked Hours</th>
                      <th className="py-3 px-4">Late Mins</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {empAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900">{rec.date}</td>
                        <td className="py-3 px-4 font-mono">{rec.entryTime}</td>
                        <td className="py-3 px-4 font-mono">{rec.exitTime || 'Active'}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{rec.workHours} hrs</td>
                        <td className="py-3 px-4 font-semibold text-amber-600">{rec.lateMinutes ? `${rec.lateMinutes}m` : '0m'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{rec.notes || rec.reason || 'Recorded by Administrator'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ANALYTICS INSIDE PROFILE */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Attendance Trend</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profileTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="present" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Working Hours Trend */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Working Hours Trend</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profileTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="hours" fill="#22C55E" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Leave Distribution Chart */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Leave Distribution Breakdown</h4>
                <div className="flex items-center justify-around h-48">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leaveDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                          {leaveDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs">
                    {leaveDistributionData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-semibold text-slate-700">{d.name}:</span>
                        <span className="font-bold text-slate-900">{d.value} days</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SALARY DEDUCTIONS SUMMARY */}
          {activeTab === 'salary_deductions' && (
            <div className="space-y-6 animate-fade-in">
              {/* Period Selector Bar */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Audit Period:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {monthsList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
                  {selectedMonth} {selectedYear} Payroll Deductions
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Total Late Check-ins ({selectedMonth.slice(0, 3)} {selectedYear})
                  </span>
                  <p className="text-2xl font-black text-amber-600">
                    {salaryDeductionSummary.totalLateCount} Lates
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    Clock-ins past 09:20 AM grace limit
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-rose-200/80 shadow-xs space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500">
                    Total Salary Days Deducted
                  </span>
                  <p className="text-2xl font-black text-rose-700">
                    {salaryDeductionSummary.totalDeductionDays} Day{salaryDeductionSummary.totalDeductionDays !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    Applied against {selectedMonth} {selectedYear} payroll
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-blue-200/80 shadow-xs space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                    Active Penalty Rule (N, X)
                  </span>
                  <p className="text-xl font-extrabold text-slate-900">
                    {latePenaltyRule.threshold} Lates = {latePenaltyRule.deductionDays} Day Off
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    Calculated weekly (Sat–Thu, Fri holiday)
                  </p>
                </div>
              </div>

              {/* Weekly Breakdown Table */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4.5 h-4.5 text-rose-600" />
                      Weekly Late & Salary Deduction Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Weekly audit window (Saturday through Thursday) for {employee.name}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-slate-100 text-slate-700">
                    {selectedMonth} {selectedYear}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                        <th className="py-3 px-4">Business Week #</th>
                        <th className="py-3 px-4">Date Range (Sat – Thu)</th>
                        <th className="py-3 px-4 text-center">Late Check-ins</th>
                        <th className="py-3 px-4 text-center">Salary Days Deducted</th>
                        <th className="py-3 px-4 text-right">Rule Execution Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {salaryDeductionSummary.weeklyBreakdown.map((week) => (
                        <tr key={week.weekNumber} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-slate-900">
                            Week {week.weekNumber}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {week.label}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-700">
                            {week.lateCount} lates
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                                week.deductionDays > 0
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {week.deductionDays} Day{week.deductionDays !== 1 ? 's' : ''} Deducted
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-semibold">
                            {week.deductionDays > 0
                              ? `Triggered (${latePenaltyRule.threshold} lates reached)`
                              : week.lateCount > 0
                              ? `Below threshold (${week.lateCount}/${latePenaltyRule.threshold})`
                              : 'Perfect attendance'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-extrabold">
                        <td colSpan={2} className="py-3 px-4 rounded-bl-xl">
                          {selectedMonth} {selectedYear} Cumulative Totals:
                        </td>
                        <td className="py-3 px-4 text-center text-amber-300">
                          {salaryDeductionSummary.totalLateCount} Total Lates
                        </td>
                        <td className="py-3 px-4 text-center text-rose-300">
                          {salaryDeductionSummary.totalDeductionDays} Total Deduction Days
                        </td>
                        <td className="py-3 px-4 text-right rounded-br-xl text-xs text-slate-300">
                          No carry-over to {nextMonthName}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Calculation Method & Governance:</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Salary deduction is calculated as <code className="bg-slate-200 px-1 rounded font-bold">floor(weekly_late_count / {latePenaltyRule.threshold}) * {latePenaltyRule.deductionDays}</code> for each Saturday–Thursday cycle. Weekly lates reset to 0 at the start of each Friday holiday.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Attendra Administrator System • Immutable HR Record
            </span>
            {onUpdateAvatar && (
              <button
                type="button"
                onClick={() => setIsChangeAvatarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-all border border-blue-200/80"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                Change Profile Photo
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-2xl transition-colors"
          >
            Close Employee Profile
          </button>
        </div>
      </div>

      {isChangeAvatarOpen && onUpdateAvatar && (
        <ChangeAvatarModal
          isOpen={isChangeAvatarOpen}
          onClose={() => setIsChangeAvatarOpen(false)}
          employee={employee}
          onUpdateAvatar={onUpdateAvatar}
        />
      )}

      {/* Remove / Deactivate Employee Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${removeOption === 'deactivate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  {removeOption === 'deactivate' ? <UserX className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Remove Employee Profile</h3>
                  <p className="text-xs text-slate-500 font-medium">Select removal scope for this account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Summary Card */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-white"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">{employee.name}</h4>
                <p className="text-[11px] text-slate-500 truncate">{employee.designation || employee.role} • {employee.department}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{employee.email}</p>
              </div>
            </div>

            {/* Action Option Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Select Action:
              </label>

              {/* Option (a) Deactivate */}
              <div
                onClick={() => setRemoveOption('deactivate')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  removeOption === 'deactivate'
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                }`}
              >
                <input
                  type="radio"
                  name="removeOptModal"
                  checked={removeOption === 'deactivate'}
                  onChange={() => setRemoveOption('deactivate')}
                  className="mt-0.5 accent-amber-600 cursor-pointer"
                />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    (a) Deactivate Employee (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Hides profile from Employee Directory and revokes portal login immediately. Attendance logs, leave records, and salary history are permanently preserved for audit compliance.
                  </p>
                </div>
              </div>

              {/* Option (b) Permanently Delete */}
              <div
                onClick={() => setRemoveOption('delete')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  removeOption === 'delete'
                    ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                }`}
              >
                <input
                  type="radio"
                  name="removeOptModal"
                  checked={removeOption === 'delete'}
                  onChange={() => setRemoveOption('delete')}
                  className="mt-0.5 accent-rose-600 cursor-pointer"
                />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    (b) Permanently Delete
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Completely removes employee profile and login account from the database. Use only for accidental entries or test profiles.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRemove}
                onClick={handleConfirmRemove}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  removeOption === 'deactivate'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                {isSubmittingRemove ? (
                  'Processing...'
                ) : removeOption === 'deactivate' ? (
                  <>
                    <UserX className="w-4 h-4" />
                    Deactivate Employee
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
