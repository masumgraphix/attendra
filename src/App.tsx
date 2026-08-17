import React, { useState, useEffect, useMemo } from 'react';
import {
  NavSection,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  Department,
  Announcement,
  CompanyHoliday,
  AuditLog,
  NotificationItem,
  AIInsightData,
  ToastMessage,
  AttendanceStatus,
  LeaveType,
  LeavePolicy,
  UserAccount,
  UserRole,
  RegistrationRequest,
  OfficeShiftSettings,
} from './types';
import { LatePenaltyRule } from './utils/salaryDeduction';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToLocalStorage,
  clearAttendraLocalStorage,
} from './utils/storage';
import { api, getAuthToken, setAuthToken } from './services/api';
import {
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_DEPARTMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_HOLIDAYS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_LEAVE_POLICIES,
  INITIAL_USER_ACCOUNTS,
  INITIAL_REGISTRATION_REQUESTS,
} from './data/mockData';

// Auth Components
import { LoginView } from './components/auth/LoginView';

// Layout & View Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatCards } from './components/dashboard/StatCards';
import { AttendanceTrendChart } from './components/dashboard/AttendanceTrendChart';
import { AttendanceDoughnut } from './components/dashboard/AttendanceDoughnut';
import { QuickActions } from './components/dashboard/QuickActions';
import { TodayAlerts } from './components/dashboard/TodayAlerts';
import { AnnouncementsWidget } from './components/dashboard/AnnouncementsWidget';
import { UpcomingLeaveCard } from './components/dashboard/UpcomingLeaveCard';
import { PendingJoinRequestsCard } from './components/dashboard/PendingJoinRequestsCard';
import { EmployeeCheckInWidget } from './components/dashboard/EmployeeCheckInWidget';
import { AttendanceTable } from './components/attendance/AttendanceTable';
import { EmployeeDirectory } from './components/employees/EmployeeDirectory';
import { LeaveManagement } from './components/leave/LeaveManagement';
import { DepartmentGrid } from './components/departments/DepartmentGrid';
import { CalendarView } from './components/calendar/CalendarView';
import { ReportBuilder } from './components/reports/ReportBuilder';
import { AnalyticsAIView } from './components/analytics/AnalyticsAIView';
import { HolidaysView } from './components/holidays/HolidaysView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditLogsView } from './components/audit/AuditLogsView';

// Modals & Profile Views
import { ClockInModal } from './components/modals/ClockInModal';
import { ApplyLeaveModal } from './components/modals/ApplyLeaveModal';
import { AddEmployeeModal } from './components/modals/AddEmployeeModal';
import { ManualCorrectionModal } from './components/modals/ManualCorrectionModal';
import { EmployeeProfileModal } from './components/modals/EmployeeProfileModal';
import { CreateAnnouncementModal } from './components/modals/CreateAnnouncementModal';
import { NotificationDetailModal } from './components/modals/NotificationDetailModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { ToastContainer } from './components/common/Toast';

function parseTimeStringToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function calculateWorkHours(entryTime: string, exitTime: string | null) {
  if (!exitTime) return { workHours: 0, overtimeHours: 0 };
  const entryMins = parseTimeStringToMinutes(entryTime);
  const exitMins = parseTimeStringToMinutes(exitTime);

  if (entryMins === null || exitMins === null || exitMins <= entryMins) {
    return { workHours: 8, overtimeHours: 0 };
  }

  const diffMins = exitMins - entryMins;
  const workHours = Number((diffMins / 60).toFixed(1));
  const overtimeHours = workHours > 8 ? Number((workHours - 8).toFixed(1)) : 0;
  return { workHours, overtimeHours };
}

function calculateLeaveDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

export default function App() {
  // Core Datasets with localStorage persistence initialization
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, INITIAL_USER_ACCOUNTS)
  );
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.REGISTRATION_REQUESTS, INITIAL_REGISTRATION_REQUESTS)
  );
  const [latePenaltyRule, setLatePenaltyRule] = useState<LatePenaltyRule>(() =>
    loadFromLocalStorage(STORAGE_KEYS.LATE_PENALTY_RULE, { threshold: 3, deductionDays: 1 })
  );
  const [shiftSettings, setShiftSettings] = useState<OfficeShiftSettings>(() =>
    loadFromLocalStorage(STORAGE_KEYS.OFFICE_SHIFT_SETTINGS, {
      officeStartTime: '09:00',
      lateThresholdTime: '09:20',
      officeEndTime: '17:00',
      weeklyOff: 'Friday',
      workDays: 'Saturday to Thursday',
      enableGeofence: true,
      ipWhitelist: '192.168.1.0/24, 10.0.4.0/16',
    })
  );

  const [employees, setEmployees] = useState<Employee[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES)
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.LEAVE_REQUESTS, INITIAL_LEAVE_REQUESTS)
  );
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.LEAVE_POLICIES, INITIAL_LEAVE_POLICIES)
  );
  const [departments, setDepartments] = useState<Department[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS)
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS)
  );
  const [holidays, setHolidays] = useState<CompanyHoliday[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );

  // Authentication State (defaults to null unless session userId exists in userAccounts)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const sessionUserId = loadFromLocalStorage<string | null>(STORAGE_KEYS.SESSION_USER_ID, null);
      if (sessionUserId) {
        const restoredAccounts = loadFromLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, INITIAL_USER_ACCOUNTS);
        const match = restoredAccounts.find((acc) => acc.id === sessionUserId);
        if (match && match.status !== 'inactive') {
          const { password: _p, ...safeAcc } = match;
          return safeAcc as UserAccount;
        }
      }
    } catch (err) {
      console.warn('Error restoring session user from localStorage:', err);
    }
    return null;
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('attendra_auth_token');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (authToken) {
        localStorage.setItem('attendra_auth_token', authToken);
      } else {
        localStorage.removeItem('attendra_auth_token');
      }
    } catch {
      // ignore
    }
  }, [authToken]);

  // Navigation State (restored from localStorage so a refresh keeps the user on the same tab)
  const VALID_NAV_SECTIONS: NavSection[] = [
    'dashboard', 'attendance', 'employees', 'leave', 'departments',
    'calendar', 'reports', 'analytics', 'holidays', 'settings', 'audit_logs',
  ];
  const [activeSection, setActiveSectionState] = useState<NavSection>(() => {
    const saved = loadFromLocalStorage<NavSection>(STORAGE_KEYS.ACTIVE_SECTION, 'dashboard');
    return VALID_NAV_SECTIONS.includes(saved) ? saved : 'dashboard';
  });
  const setActiveSection = (section: NavSection) => {
    setActiveSectionState(section);
    saveToLocalStorage(STORAGE_KEYS.ACTIVE_SECTION, section);
  };

  // Mobile sidebar drawer (hamburger menu). Desktop layout ignores this
  // entirely — it only controls the off-canvas sidebar below the lg breakpoint.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals & Profile State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [selectedCorrectionRecordId, setSelectedCorrectionRecordId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // AI Insights State
  const [aiData, setAiData] = useState<AIInsightData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleQuotaWarning = () => {
    addToast('warning', 'Storage Limit Warning', 'Unable to save changes locally — storage may be full.');
  };

  // Session persistence effect: saves session_userId when currentUser changes
  useEffect(() => {
    if (currentUser) {
      saveToLocalStorage(STORAGE_KEYS.SESSION_USER_ID, currentUser.id, handleQuotaWarning);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.SESSION_USER_ID);
      } catch {
        // ignore
      }
    }
  }, [currentUser]);

  // Keep currentUser synced with userAccounts updates (e.g. role change or deactivation)
  useEffect(() => {
    if (currentUser) {
      const match = userAccounts.find((a) => a.id === currentUser.id);
      if (!match || match.status === 'inactive') {
        setCurrentUser(null);
        addToast('warning', 'Session Terminated', 'Your user account was updated or deactivated.');
      } else if (match.role !== currentUser.role || match.name !== currentUser.name || match.email !== currentUser.email) {
        const { password: _p, ...safeAcc } = match;
        setCurrentUser(safeAcc as UserAccount);
      }
    }
  }, [userAccounts]);

  // Auto-save useEffect per state value
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.EMPLOYEES, employees, handleQuotaWarning); }, [employees]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.ATTENDANCE, attendance, handleQuotaWarning); }, [attendance]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.LEAVE_REQUESTS, leaveRequests, handleQuotaWarning); }, [leaveRequests]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.LEAVE_POLICIES, leavePolicies, handleQuotaWarning); }, [leavePolicies]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, announcements, handleQuotaWarning); }, [announcements]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.HOLIDAYS, holidays, handleQuotaWarning); }, [holidays]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogs, handleQuotaWarning); }, [auditLogs]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.NOTIFICATIONS, notifications, handleQuotaWarning); }, [notifications]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, userAccounts, handleQuotaWarning); }, [userAccounts]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.REGISTRATION_REQUESTS, registrationRequests, handleQuotaWarning); }, [registrationRequests]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.DEPARTMENTS, departments, handleQuotaWarning); }, [departments]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.LATE_PENALTY_RULE, latePenaltyRule, handleQuotaWarning); }, [latePenaltyRule]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.OFFICE_SHIFT_SETTINGS, shiftSettings, handleQuotaWarning); }, [shiftSettings]);

  // Dynamically computed effective departments (combines stored custom departments with active employee departments)
  const effectiveDepartments = useMemo(() => {
    const deptMap = new Map<string, Department>();

    // 1. First add stored departments
    departments.forEach((d) => {
      deptMap.set(d.name.trim().toLowerCase(), d);
    });

    // 2. Include any department present in active employees
    employees.forEach((emp) => {
      if (emp.status === 'active' && emp.department && emp.department.trim()) {
        const key = emp.department.trim().toLowerCase();
        if (!deptMap.has(key)) {
          deptMap.set(key, {
            id: `DEP-${Math.floor(100 + Math.random() * 900)}`,
            name: emp.department.trim(),
            headName: emp.name,
            headAvatar: emp.avatar,
            color: '#2563EB',
          });
        }
      }
    });

    return Array.from(deptMap.values());
  }, [departments, employees]);

  // Employee Portal Punch Handlers
  const handleCheckInPortal = (status: 'present' | 'grace_period' | 'late', checkInTime: string) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const empId = currentUser.employeeId || currentUser.id;

    let emp = employees.find((e) => e.id === empId || e.email === currentUser.email);
    if (!emp) {
      emp = {
        id: empId,
        name: currentUser.name,
        role: currentUser.role === 'super_admin' ? 'Managing Director' : currentUser.role === 'admin' ? 'Administrator' : 'Employee',
        department: 'Administration',
        email: currentUser.email,
        phone: '',
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        status: 'active',
        employmentType: 'full_time',
        location: 'Headquarters',
        joinDate: todayStr,
        shift: 'General Shift (09:00 - 17:00)',
        leaveBalance: { annual: 20, sick: 10, casual: 10, emergency: 5, unpaid: 10, maternity: 0, paternity: 0, half_day: 5 },
        manager: 'Board of Directors'
      };
      setEmployees((prev) => [emp!, ...prev]);
    }

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      date: todayStr,
      entryTime: checkInTime,
      exitTime: null,
      workHours: 0,
      overtimeHours: 0,
      status: status,
      locationType: 'Office HQ',
      verificationMethod: 'Mobile GPS Geofence',
      notes: `Checked in via Employee Portal at ${checkInTime}`,
    };

    setAttendance((prev) => [newRecord, ...prev]);

    api.createAttendance(newRecord).catch((err) => {
      console.error("Failed to persist check-in to database:", err);
    });

    addToast(
      'success',
      'Checked In Successfully!',
      `Check-in recorded at ${checkInTime}. Status: ${status.replace('_', ' ').toUpperCase()}.`
    );
  };

  const handleCheckOutPortal = (checkOutTime: string, hoursWorked: number) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const empId = currentUser.employeeId || currentUser.id;

    // Match the same record the Dashboard widget displays (manually-created
    // entries may be linked by employeeId or only by employee name), and only
    // update a record that is still missing its check-out.
    const existingIdx = attendance.findIndex(
      (a) =>
        a.date === todayStr &&
        !a.exitTime &&
        (a.employeeId === empId ||
          a.employeeId === currentUser.id ||
          (currentUser.employeeId && a.employeeId === currentUser.employeeId) ||
          (a.employeeName && currentUser.name && a.employeeName.toLowerCase() === currentUser.name.toLowerCase()))
    );
    if (existingIdx === -1) {
      addToast('error', 'Check-Out Unavailable', 'No active check-in found for today. A check-in is required before checking out.');
      return;
    }

    const existingRecord = attendance[existingIdx];
    const updatedRecord: AttendanceRecord = {
      ...existingRecord,
      exitTime: checkOutTime,
      workHours: hoursWorked,
      overtimeHours: hoursWorked > 8 ? Number((hoursWorked - 8).toFixed(1)) : 0,
      notes: `${existingRecord.notes || ''} | Checked out at ${checkOutTime} (${hoursWorked} hrs)`,
    };

    setAttendance((prev) => {
      const copy = [...prev];
      copy[existingIdx] = updatedRecord;
      return copy;
    });

    api.updateAttendance(updatedRecord.id, updatedRecord).catch((err) => {
      console.error("Failed to persist check-out to database:", err);
    });

    addToast(
      'success',
      'Checked Out Successfully!',
      `Check-out recorded at ${checkOutTime}. Total Hours Worked: ${hoursWorked} hours.`
    );
  };

  // Load database data from server API
  const loadDatabaseData = async () => {
    try {
      const [
        emps, atts, lvs, pols, anns, hols, logs, notifs, accs, regs, rule, depts
      ] = await Promise.all([
        api.getEmployees().catch((e) => { console.error('[Attendra] Failed to load employees from server:', e); return null; }),
        api.getAttendance().catch((e) => { console.error('[Attendra] Failed to load attendance from server:', e); return null; }),
        api.getLeaveRequests().catch((e) => { console.error('[Attendra] Failed to load leave requests from server:', e); return null; }),
        api.getLeavePolicies().catch((e) => { console.error('[Attendra] Failed to load leave policies from server:', e); return null; }),
        api.getAnnouncements().catch((e) => { console.error('[Attendra] Failed to load announcements from server:', e); return null; }),
        api.getHolidays().catch((e) => { console.error('[Attendra] Failed to load holidays from server:', e); return null; }),
        api.getAuditLogs().catch((e) => { console.error('[Attendra] Failed to load audit logs from server:', e); return null; }),
        api.getNotifications().catch((e) => { console.error('[Attendra] Failed to load notifications from server:', e); return null; }),
        api.getUserAccounts().catch((e) => { console.error('[Attendra] Failed to load user accounts from server:', e); return null; }),
        api.getRegistrationRequests().catch((e) => { console.error('[Attendra] Failed to load registration requests from server:', e); return null; }),
        api.getLatePenaltyRule().catch((e) => { console.error('[Attendra] Failed to load late penalty rule from server:', e); return null; }),
        api.getDepartments().catch((e) => { console.error('[Attendra] Failed to load departments from server:', e); return null; }),
      ]);

      if (emps) setEmployees(emps);
      if (atts) setAttendance(atts);
      if (lvs) setLeaveRequests(lvs);
      if (pols) setLeavePolicies(pols);
      if (anns) setAnnouncements(anns);
      if (hols) setHolidays(hols);
      if (logs) setAuditLogs(logs);
      if (notifs) setNotifications(notifs);
      if (accs) setUserAccounts(accs);
      if (regs) setRegistrationRequests(regs);
      if (rule) setLatePenaltyRule(rule);
      if (depts && depts.length > 0) setDepartments(depts);

      // If the core datasets failed to load, the screen may be showing stale/local/demo
      // data instead of the real database — warn instead of failing silently.
      if (!emps || !atts || !lvs) {
        addToast(
          'error',
          'Could not sync with server database',
          'Showing locally cached data. Some information may be outdated — check your internet connection and reload.'
        );
      }
    } catch (err) {
      console.error('[Attendra] loadDatabaseData failed entirely:', err);
      addToast(
        'error',
        'Could not sync with server database',
        'Showing locally cached data. Some information may be outdated — check your internet connection and reload.'
      );
    }
  };

  // Restore authenticated session from backend JWT token on app boot
  useEffect(() => {
    async function initSession() {
      const token = getAuthToken();
      if (token) {
        try {
          const user = await api.getCurrentUser();
          if (user) {
            setCurrentUser(user);
            await loadDatabaseData();
          } else {
            setAuthToken(null);
            setCurrentUser(null);
          }
        } catch {
          setAuthToken(null);
          setCurrentUser(null);
        }
      }
    }
    initSession();
  }, []);

  const handleResetToDemoData = async () => {
    try {
      await api.resetDemoData();
    } catch {
      // quiet fallback
    }
    clearAttendraLocalStorage();
    setAuthToken(null);
    setCurrentUser(null);
    setActiveSection('dashboard');
    window.location.reload();
  };

  // Route Guarding Enforcement based on role
  const handleSelectSection = (sec: NavSection) => {
    if (!currentUser) return;
    const role = currentUser.role;

    if (role === 'employee') {
      const allowedEmployeeSections: NavSection[] = ['dashboard', 'attendance', 'leave', 'employees'];
      if (!allowedEmployeeSections.includes(sec)) {
        addToast('error', 'Access Restricted', 'Employee accounts are restricted to personal attendance, leave, and profile views.');
        setActiveSection('dashboard');
        return;
      }
    } else if (role === 'admin') {
      if (sec === 'audit_logs') {
        addToast('error', 'Access Restricted', 'System Audit Logs require Super Admin authorization.');
        setActiveSection('dashboard');
        return;
      }
    }

    setActiveSection(sec);
  };

  // Fetch AI Insights from server endpoint
  const fetchAIInsights = async () => {
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'July 2026',
          department: 'All Enterprise Departments',
          metrics: {
            totalEmployees: employees.length,
            presentToday: attendance.filter((a) => a.status === 'present' || a.status === 'grace_period').length,
            presentRate: '92.1%',
            lateToday: attendance.filter((a) => a.status === 'late').length,
            lateRate: '5.0%',
            absentToday: attendance.filter((a) => a.status === 'absent').length,
            leaveToday: attendance.filter((a) => a.status === 'on_leave').length,
            avgEntry: '08:42 AM',
            avgExit: '05:48 PM',
            avgHours: '8.6 hrs',
            overtimeHours: '312 hrs',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiData(data.data);
        addToast('success', 'AI Strategic Analysis Complete', 'Generated latest workforce insights and risk predictions.');
      }
    } catch (err) {
      console.error('Failed to fetch AI Insights', err);
      addToast('error', 'AI Analysis Error', 'Unable to reach backend AI engine. Using cached metrics.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role !== 'employee') {
      fetchAIInsights();
    }
  }, [currentUser]);

  // Account Management Handlers for Super Admin
  const handleCreateUserAccount = (newAccData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newAcc: UserAccount = {
      ...newAccData,
      id: `USR-${Math.floor(7000 + Math.random() * 1000)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUserAccounts((prev) => [newAcc, ...prev]);

    api.createUserAccount(newAcc).catch((err) =>
      console.error('Failed to save user account to server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Created User Account',
      target: `${newAcc.name} (${newAcc.role.toUpperCase()})`,
      oldValue: 'None',
      newValue: `Email: ${newAcc.email}, Role: ${newAcc.role}`,
      reason: 'Super Admin added team access account.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Account Provisioned', `Created ${newAcc.role} account for ${newAcc.name} (${newAcc.email}).`);
  };

  const handleUpdateUserAccount = (updatedAcc: UserAccount) => {
    setUserAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));

    if (currentUser?.id === updatedAcc.id) {
      setCurrentUser(updatedAcc);
    }

    api.updateUserAccount(updatedAcc.id, updatedAcc).catch((err) =>
      console.error('Failed to update user account on server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Updated User Account',
      target: `${updatedAcc.name} (${updatedAcc.email})`,
      oldValue: 'Prior credentials',
      newValue: `Role: ${updatedAcc.role}`,
      reason: 'Super Admin updated account profile.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Account Updated', `Saved profile details for ${updatedAcc.name}.`);
  };

  const handleDeleteUserAccount = (accountId: string) => {
    const target = userAccounts.find((a) => a.id === accountId);
    if (!target) return;

    setUserAccounts((prev) => prev.filter((a) => a.id !== accountId));

    api.deleteUserAccount(accountId).catch((err) =>
      console.error('Failed to delete user account on server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Deleted User Account',
      target: `${target.name} (${target.email})`,
      oldValue: `Role: ${target.role}`,
      newValue: 'Account Revoked',
      reason: 'Super Admin deleted team account.',
      ipAddress: '192.168.1.10',
      status: 'warning',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('info', 'Account Revoked', `Removed login access for ${target.name}.`);
  };

  // Registration Handlers for Employee Self-Registration & Super Admin Approval
  const handleRequestRegistration = (req: {
    employeeName: string;
    employeeId?: string;
    email: string;
    department: string;
    designation: string;
    dob?: string;
    nidNumber?: string;
    requestedRole: 'employee';
  }) => {
    const newReq: RegistrationRequest = {
      id: `REG-${Math.floor(9000 + Math.random() * 1000)}`,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      email: req.email,
      department: req.department,
      designation: req.designation,
      dob: req.dob,
      nidNumber: req.nidNumber,
      requestedRole: req.requestedRole,
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
    };

    setRegistrationRequests((prev) => [newReq, ...prev]);

    api.createRegistrationRequest(newReq).catch((err) => {
      console.error("Failed to save registration request to server DB:", err);
    });

    // Audit log
    const newAudit: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: req.employeeName,
      actorRole: 'Employee Candidate',
      action: 'Requested Account Access',
      target: `${req.employeeName} (${req.designation})`,
      oldValue: 'Unregistered',
      newValue: `Pending Approval for ${req.email}`,
      reason: 'Employee submitted registration request with Department and Designation details.',
      ipAddress: '192.168.1.120',
      status: 'warning',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    // Notification for Super Admin
    const newNotif: NotificationItem = {
      id: `NOT-${Date.now()}`,
      type: 'system',
      title: 'New Employee Registration Request',
      message: `${req.employeeName} (${req.designation}, ${req.department}) requested portal access. Pending Admin review.`,
      time: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    addToast(
      'success',
      'Registration Request Sent',
      `Your account request for ${req.employeeName} has been submitted for Admin approval.`
    );
  };

  const handleAcceptRegistration = async (
    req: RegistrationRequest,
    autoGeneratedPassword: string
  ): Promise<{ emailSent: boolean; emailSimulated: boolean }> => {
    // Update request status
    setRegistrationRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'approved', autoGeneratedPassword } : r))
    );

    // Auto-create department if mentioned in registration request and not already present
    if (req.department && req.department.trim()) {
      const reqDeptName = req.department.trim();
      const exists = departments.some((d) => d.name.toLowerCase() === reqDeptName.toLowerCase());
      if (!exists) {
        const newDept: Department = {
          id: `DEP-${Math.floor(100 + Math.random() * 900)}`,
          name: reqDeptName,
          headName: req.employeeName,
          headAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          color: '#2563EB',
        };
        setDepartments((prev) => [...prev, newDept]);
        api.createDepartment(newDept).catch((err) =>
          console.error("Failed to auto-create department via API:", err)
        );
      }
    }

    const newEmpId = req.employeeId || `DG-${Math.floor(1000 + Math.random() * 9000)}`;

    let emp = employees.find((e) => (e.email || '').toLowerCase() === (req.email || '').toLowerCase() || (req.employeeId && e.id === req.employeeId));

    if (!emp) {
      emp = {
        id: newEmpId,
        name: req.employeeName,
        email: req.email,
        department: req.department || 'Engineering',
        role: req.designation || 'Staff Member',
        designation: req.designation || 'Staff Member',
        dob: req.dob,
        nidNumber: req.nidNumber,
        phone: '+1 (555) 019-2831',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        status: 'active',
        employmentType: 'full_time',
        location: 'Headquarters Office',
        joinDate: new Date().toISOString().split('T')[0],
        shift: 'Morning Regular (09:00 AM - 06:00 PM)',
        leaveBalance: {
          annual: 15,
          sick: 10,
          casual: 5,
          emergency: 3,
          unpaid: 10,
          maternity: 90,
          paternity: 10,
          half_day: 5,
        },
        manager: 'Executive Desk',
      };
      setEmployees((prev) => [...prev, emp!]);
    } else {
      emp = {
        ...emp,
        department: req.department || emp.department,
        designation: req.designation || emp.designation || emp.role,
        role: req.designation || emp.role,
        dob: req.dob || emp.dob,
        nidNumber: req.nidNumber || emp.nidNumber,
      };
      setEmployees((prev) => prev.map((e) => (e.id === emp!.id ? emp! : e)));
    }

    // Sync employee creation/update with server API
    api.createEmployee(emp).catch((err) => console.log('API employee sync fallback:', err));

    // Create corresponding active UserAccount
    const newAccount: UserAccount = {
      id: `USR-${Math.floor(7000 + Math.random() * 1000)}`,
      email: req.email,
      password: autoGeneratedPassword,
      name: req.employeeName,
      role: 'employee',
      employeeId: emp.id,
      status: 'active',
      avatar: emp.avatar,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUserAccounts((prev) => [...prev, newAccount]);

    // Sync user account creation with server API, then check whether the
    // welcome email with the temporary password was actually delivered via
    // Resend or only "simulated" (RESEND_API_KEY not configured on this
    // deployment) so we can tell the admin the truth instead of always
    // claiming it was emailed.
    let emailSent = false;
    let emailSimulated = false;
    try {
      const res = await fetch('/api/user-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ ...newAccount, password: autoGeneratedPassword }),
      });
      const result = await res.json().catch(() => null);
      emailSent = !!result?.emailSent;
      emailSimulated = !!result?.emailSimulated;

      // If the server found this email already existed in the DB (from an
      // earlier attempt) it returns that row's real id instead of inserting
      // a new one. Swap our optimistic local id for the real one so future
      // Delete/Edit calls for this account actually hit the right DB row.
      if (result?.data?.id && result.data.id !== newAccount.id) {
        const realId = result.data.id;
        setUserAccounts((prev) =>
          prev.map((a) => (a.id === newAccount.id ? { ...a, id: realId } : a))
        );
        newAccount.id = realId;
        // Bring the recovered row's fields in line with this approval
        // (it may still hold stale data — e.g. a different employeeId —
        // from whichever earlier attempt originally created it).
        fetch(`/api/user-accounts/${realId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ name: req.employeeName, role: 'employee', status: 'active' }),
        }).catch((err) => console.log('Recovered account sync fallback:', err));
      }

      if (result?.alreadyExisted) {
        addToast(
          'warning',
          'Account Already Existed',
          `An account for ${req.email} was already in the database from a previous attempt (its old id has now been re-linked). If you meant to fully remove it earlier, please double-check the User Accounts list.`
        );
      }

      if (emailSimulated) {
        addToast(
          'warning',
          'Email Not Actually Sent',
          `RESEND_API_KEY is not configured on the server, so no real email went to ${req.email}. Temporary password: ${autoGeneratedPassword} — please share it manually.`
        );
      } else if (emailSent) {
        addToast('success', 'Welcome Email Sent', `Login credentials were emailed to ${req.email}.`);
      } else {
        addToast(
          'warning',
          'Email Delivery Failed',
          `Could not confirm delivery to ${req.email}. Temporary password: ${autoGeneratedPassword} — please share it manually.`
        );
      }
    } catch (err) {
      console.log('API user account sync fallback:', err);
    }

    // Update registration request on server API
    fetch(`/api/registration-requests/${req.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ status: 'approved', autoGeneratedPassword }),
    }).catch((err) => console.log('API request status update fallback:', err));

    // Audit Log
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Approved Account Request & Activated Profile',
      target: `${req.employeeName} (${req.employeeId || emp.id})`,
      oldValue: 'Pending Request',
      newValue: `Active UserAccount created. Temporary password dispatched via email (Masked: ******).`,
      reason: 'Super Admin accepted pending employee portal registration request.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    return { emailSent, emailSimulated };
  };

  const handleRejectRegistration = (reqId: string) => {
    const target = registrationRequests.find((r) => r.id === reqId);
    if (!target) return;

    // Filter out so it vanishes from the pending list and portal UI
    setRegistrationRequests((prev) => prev.filter((r) => r.id !== reqId));

    // Call DELETE API endpoint
    fetch(`/api/registration-requests/${reqId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    }).catch((err) => console.log('API reject request delete fallback:', err));

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Rejected & Vanished Registration Request',
      target: `${target.employeeName} (${target.email})`,
      oldValue: 'Pending Request',
      newValue: 'Rejected & Removed from Portal',
      reason: 'Super Admin rejected pending employee access request.',
      ipAddress: '192.168.1.10',
      status: 'warning',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    addToast('info', 'Request Rejected', `Registration request for ${target.employeeName} was rejected and removed.`);
  };

  // Department Management Handlers
  const handleAddDepartment = (deptData: {
    name: string;
    description?: string;
    headName?: string;
    headAvatar?: string;
    color: string;
  }) => {
    const nameTrim = deptData.name.trim();
    const exists = effectiveDepartments.some(
      (d) => d.name.toLowerCase() === nameTrim.toLowerCase()
    );

    if (exists) {
      addToast('warning', 'Department Exists', `Department "${nameTrim}" already exists.`);
      return;
    }

    const newDept: Department = {
      id: `DEP-${Math.floor(100 + Math.random() * 900)}`,
      name: nameTrim,
      description: deptData.description,
      headName: deptData.headName || 'Unassigned',
      headAvatar:
        deptData.headAvatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      color: deptData.color,
    };

    setDepartments((prev) => [...prev, newDept]);
    api.createDepartment(newDept).catch((err) =>
      console.error('Failed to create department via API:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Created New Department',
      target: nameTrim,
      oldValue: 'N/A',
      newValue: `Created department ${nameTrim}`,
      reason: 'Admin manually added new organizational department.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    addToast('success', 'Department Created', `Department "${nameTrim}" created successfully.`);
  };

  const handleDeleteDepartment = (deptIdOrName: string) => {
    const deptToDelete = effectiveDepartments.find(
      (d) => d.id === deptIdOrName || d.name.toLowerCase() === deptIdOrName.toLowerCase()
    );

    if (!deptToDelete) return;

    // Check if active employees exist in this department
    const activeEmps = employees.filter(
      (e) =>
        e.status === 'active' &&
        e.department &&
        e.department.trim().toLowerCase() === deptToDelete.name.trim().toLowerCase()
    );

    if (activeEmps.length > 0) {
      addToast(
        'error',
        'Cannot Delete Department',
        `"${deptToDelete.name}" has ${activeEmps.length} active employee(s). Reassign or remove employees first.`
      );
      return;
    }

    setDepartments((prev) =>
      prev.filter(
        (d) =>
          d.id !== deptToDelete.id &&
          d.name.toLowerCase() !== deptToDelete.name.toLowerCase()
      )
    );
    api.deleteDepartment(deptToDelete.id).catch((err) =>
      console.error('Failed to delete department via API:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Deleted Department',
      target: deptToDelete.name,
      oldValue: deptToDelete.name,
      newValue: 'Deleted',
      reason: 'Super Admin removed empty department from organization structure.',
      ipAddress: '192.168.1.10',
      status: 'warning',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    addToast(
      'success',
      'Department Deleted',
      `Department "${deptToDelete.name}" was successfully deleted.`
    );
  };

  // Export CSV Handler
  const handleExportCSV = async () => {
    try {
      const recordsToExport = currentUser?.role === 'employee'
        ? attendance.filter((a) => a.employeeId === currentUser.employeeId)
        : attendance;

      const exportData = recordsToExport.map((a) => ({
        ID: a.id,
        Employee: a.employeeName,
        Department: a.department,
        Date: a.date,
        EntryTime: a.entryTime,
        ExitTime: a.exitTime || 'Active Shift',
        WorkHours: a.workHours,
        OvertimeHours: a.overtimeHours,
        Status: a.status,
        Verification: a.verificationMethod,
      }));

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Attendance_Ledger', records: exportData }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendra_Report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      addToast('success', 'CSV Ledger Downloaded', 'Exported attendance log successfully.');
    } catch (err) {
      addToast('error', 'Export Failed', 'Error generating CSV file.');
    }
  };

  // Direct Attendance Entry Handler
  const handleCreateAnnouncement = async (data: {
    title: string;
    content: string;
    category: 'policy' | 'event' | 'holiday' | 'general';
    isPinned: boolean;
  }) => {
    const newAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      title: data.title,
      content: data.content,
      author: currentUser?.name || 'Super Admin',
      authorRole: currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin',
      date: new Date().toISOString().split('T')[0],
      category: data.category,
      isPinned: data.isPinned,
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);

    try {
      await api.createAnnouncement(newAnnouncement);
    } catch (err) {
      console.error('Failed to post announcement to server API:', err);
    }

    // Instantly notify all employee portals
    const newNotification: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `📢 Company Broadcast: ${data.title}`,
      message: data.content,
      time: 'Just now',
      read: false,
      type: 'system',
    };

    setNotifications((prev) => [newNotification, ...prev]);

    addToast(
      'success',
      'Broadcast Sent to All Employees',
      `Announcement "${data.title}" was published and saved to database.`
    );

    // Audit log
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin',
      action: 'Published Company Announcement',
      target: 'All Employees & Staff Portals',
      newValue: data.title,
      status: 'success',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const targetAnn = announcements.find((a) => a.id === id);
    try {
      await api.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      addToast(
        'success',
        'Announcement Deleted',
        `Announcement "${targetAnn?.title || id}" was permanently removed from database.`
      );
      const newLog: AuditLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        administrator: currentUser?.name || 'Super Admin',
        actorRole: currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin',
        action: 'Deleted Company Announcement',
        target: 'Company Broadcasts & Alerts',
        newValue: targetAnn?.title || id,
        status: 'success',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    } catch (err: any) {
      console.error('Failed to delete announcement:', err);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      addToast('warning', 'Removed', `Announcement deleted locally. (${err?.message || 'Updated local state'})`);
    }
  };

  const handleSelectAnnouncement = (ann: Announcement) => {
    setSelectedNotification({
      id: `notif-ann-${ann.id}`,
      title: `📢 ${ann.title}`,
      message: ann.content,
      time: ann.date,
      read: true,
      type: 'system',
    });
  };

  // Direct Attendance Entry Handler
  const handleDirectAttendanceSubmit = (data: {
    employeeId: string;
    date: string;
    entryTime: string;
    exitTime: string;
    status: AttendanceStatus;
    locationType: 'Office HQ' | 'Remote - Home' | 'Client Site' | 'Geofence App' | 'Official Tour';
    reason: string;
    notes: string;
  }) => {
    const emp = employees.find((e) => e.id === data.employeeId);
    if (!emp) return;

    const existingIndex = attendance.findIndex((a) => a.employeeId === emp.id && a.date === data.date);
    const { workHours, overtimeHours } = calculateWorkHours(data.entryTime, data.exitTime);

    const newRecord: AttendanceRecord = {
      id: existingIndex >= 0 ? attendance[existingIndex].id : `ATT-${Math.floor(9000 + Math.random() * 1000)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      date: data.date,
      entryTime: data.entryTime,
      exitTime: data.exitTime || null,
      workHours,
      overtimeHours,
      status: data.status,
      locationType: data.locationType,
      verificationMethod: currentUser?.role === 'employee' ? 'Mobile GPS Geofence' : 'Manual Admin Entry',
      reason: data.reason,
      notes: data.notes || `Recorded by ${currentUser?.name || 'User'}.`,
    };

    if (existingIndex >= 0) {
      setAttendance((prev) => {
        const copy = [...prev];
        copy[existingIndex] = newRecord;
        return copy;
      });
      api.updateAttendance(newRecord.id, newRecord).catch((err) =>
        console.error('Failed to update attendance on server DB:', err)
      );
    } else {
      setAttendance((prev) => [newRecord, ...prev]);
      api.createAttendance(newRecord).catch((err) =>
        console.error('Failed to create attendance on server DB:', err)
      );
    }

    // Create Audit Log
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'User',
      actorRole: currentUser?.role || 'employee',
      action: existingIndex >= 0 ? 'Updated Attendance Entry' : 'Punch Attendance Record',
      target: `${emp.name} (${emp.id})`,
      oldValue: existingIndex >= 0 ? `Prior status: ${attendance[existingIndex].status}` : 'No prior record',
      newValue: `Entry: ${data.entryTime}, Exit: ${data.exitTime || 'None'}, Status: ${data.status}`,
      reason: data.reason || 'User Punch',
      ipAddress: '192.168.1.10',
      status: 'success',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast(
      'success',
      existingIndex >= 0 ? 'Attendance Updated' : 'Attendance Logged',
      data.exitTime
        ? `Saved ${data.status} entry for ${emp.name} (${workHours} hrs logged).`
        : `Saved ${data.status} check-in for ${emp.name}. Check-out pending — the employee can check out from their Dashboard.`
    );
  };

  // Direct Leave Entry Handler
  const handleDirectLeaveSubmit = (data: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
  }) => {
    const emp = employees.find((e) => e.id === data.employeeId);
    if (!emp) return;

    const calculatedDays = calculateLeaveDays(data.startDate, data.endDate);
    const initialLeaveStatus = currentUser?.role === 'employee' ? 'pending' : 'approved';

    const newLeave: LeaveRequest = {
      id: `LR-${Math.floor(3000 + Math.random() * 1000)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: calculatedDays,
      reason: data.reason,
      status: initialLeaveStatus,
      appliedDate: new Date().toISOString().split('T')[0],
      notes: data.notes,
    };

    const updatedList = [newLeave, ...leaveRequests];
    setLeaveRequests(updatedList);

    api.createLeaveRequest(newLeave).catch((err) =>
      console.error('Failed to save leave request to server DB:', err)
    );

    if (initialLeaveStatus === 'approved') {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? { ...e, status: 'on_leave' }
            : e
        )
      );
      // Leave balance now derives from the approved record history.
      recomputeEmployeeLeaveUsed(emp.id, updatedList);
    }

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'User',
      actorRole: currentUser?.role || 'employee',
      action: `Applied ${data.leaveType.toUpperCase()} Leave`,
      target: `${emp.name} (${emp.id})`,
      oldValue: 'Status: Active',
      newValue: `Status: ${initialLeaveStatus.toUpperCase()} (${calculatedDays} days: ${data.startDate} to ${data.endDate})`,
      reason: data.reason,
      ipAddress: '192.168.1.10',
      status: 'success',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast(
      'success',
      initialLeaveStatus === 'approved' ? 'Leave Approved & Logged' : 'Leave Request Submitted',
      `Submitted ${calculatedDays} day(s) ${data.leaveType} leave for ${emp.name}.`
    );
  };

  // Direct Attendance Correction Handler
  const handleDirectCorrectionSubmit = (data: {
    recordId: string;
    entryTime: string;
    exitTime: string;
    status: AttendanceStatus;
    reason: string;
  }) => {
    const targetRec = attendance.find((a) => a.id === data.recordId);
    if (!targetRec) return;

    const { workHours, overtimeHours } = calculateWorkHours(data.entryTime, data.exitTime || null);
    const oldValueStr = `Entry: ${targetRec.entryTime}, Exit: ${targetRec.exitTime || 'Active'}, Status: ${targetRec.status}`;
    const newValueStr = `Entry: ${data.entryTime}, Exit: ${data.exitTime || 'Active (pending check-out)'}, Status: ${data.status}`;

    setAttendance((prev) =>
      prev.map((a) =>
        a.id === data.recordId
          ? {
              ...a,
              entryTime: data.entryTime,
              exitTime: data.exitTime || null,
              workHours,
              overtimeHours,
              status: data.status,
              reason: data.reason,
              notes: `Overridden by ${currentUser?.name}: ${data.reason}`,
            }
          : a
      )
    );

    api.updateAttendance(data.recordId, {
      entryTime: data.entryTime,
      exitTime: data.exitTime || null,
      workHours,
      overtimeHours,
      status: data.status,
      reason: data.reason,
      notes: `Overridden by ${currentUser?.name}: ${data.reason}`,
    }).catch((err) =>
      console.error('Failed to update attendance correction on server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Admin',
      actorRole: currentUser?.role || 'admin',
      action: 'Attendance Override',
      target: `${targetRec.employeeName} (${targetRec.employeeId})`,
      oldValue: oldValueStr,
      newValue: newValueStr,
      reason: data.reason,
      ipAddress: '192.168.1.10',
      status: 'warning',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast(
      'success',
      'Record Corrected',
      data.exitTime
        ? `Updated entry for ${targetRec.employeeName} (${workHours} hrs recalculated).`
        : `Updated check-in for ${targetRec.employeeName}. Check-out still pending.`
    );
  };

  const handleOpenCorrectionModal = (recordId?: string) => {
    if (currentUser.role !== 'super_admin') {
      addToast('error', 'Access Restricted', 'Only Super Admin can manually edit employee attendance records.');
      return;
    }
    setSelectedCorrectionRecordId(recordId || null);
    setIsCorrectionModalOpen(true);
  };

  const handleDeleteAttendanceRecord = async (recordId: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'employee') {
      addToast('error', 'Access Restricted', 'Only administrators can delete attendance records.');
      return;
    }
    const targetRec = attendance.find((a) => a.id === recordId);
    if (!targetRec) return;

    try {
      const result = await api.deleteAttendance(recordId);
      setAttendance((prev) => prev.filter((a) => a.id !== recordId));

      // Prefer the audit entry the server wrote (real identity of the deleter);
      // fall back to a locally-built one if the server didn't return it.
      const serverLog = result?.auditLog;
      const newLog: AuditLog =
        serverLog && serverLog.action
          ? serverLog
          : {
              id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              administrator: currentUser.name,
              actorRole: currentUser.role,
              action: 'Attendance Record Deleted',
              target: `${targetRec.employeeName} (${targetRec.employeeId})`,
              oldValue: `Date: ${targetRec.date}, Entry: ${targetRec.entryTime}, Exit: ${targetRec.exitTime || 'None'}, Status: ${targetRec.status}`,
              newValue: 'Record Removed',
              reason: 'Incorrect entry deleted by administrator.',
              ipAddress: '192.168.1.10',
              status: 'warning',
            };

      setAuditLogs((prev) => [newLog, ...prev]);
      addToast('info', 'Attendance Record Deleted', `Removed entry for ${targetRec.employeeName}. Action logged in Activity History.`);
    } catch (err) {
      console.error('Failed to delete attendance record on server DB:', err);
      addToast('error', 'Delete Failed', 'Could not delete the attendance record from the database. The record was kept — please try again.');
    }
  };

  const handleUpdateEmployeeAvatar = (employeeId: string, newAvatarUrl: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, avatar: newAvatarUrl } : e))
    );

    // Persist the new avatar on the matching login account too (accounts
    // are matched either by an explicit employeeId link, or by id when no
    // separate employeeId is set). This is what survives a page refresh —
    // currentUser is rebuilt from userAccounts/localStorage on load, not
    // from the employees list.
    setUserAccounts((prev) =>
      prev.map((acc) =>
        (acc.employeeId || acc.id) === employeeId ? { ...acc, avatar: newAvatarUrl } : acc
      )
    );

    // Keep the logged-in user's own avatar (header top-right, sidebar
    // footer) in sync immediately when they update their own profile photo.
    setCurrentUser((prev) =>
      prev && (prev.employeeId || prev.id) === employeeId ? { ...prev, avatar: newAvatarUrl } : prev
    );

    setAttendance((prev) =>
      prev.map((a) => (a.employeeId === employeeId ? { ...a, employeeAvatar: newAvatarUrl } : a))
    );

    setLeaveRequests((prev) =>
      prev.map((l) => (l.employeeId === employeeId ? { ...l, employeeAvatar: newAvatarUrl } : l))
    );

    api.updateEmployee(employeeId, { avatar: newAvatarUrl }).catch((err) =>
      console.error('Failed to update employee avatar on server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'User',
      actorRole: currentUser?.role || 'employee',
      action: 'Updated Profile Photo',
      target: `${emp.name} (${emp.id})`,
      oldValue: 'Previous Avatar',
      newValue: 'Updated Profile Photo',
      reason: 'User updated profile picture.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Profile Photo Updated', `${emp.name}'s photo was updated across all records.`);
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, status: 'inactive' } : e))
    );
    setUserAccounts((prev) =>
      prev.map((u) => (u.employeeId === employeeId ? { ...u, status: 'inactive' } : u))
    );

    try {
      await api.deactivateEmployee(employeeId);
    } catch (err: any) {
      console.error('Failed to deactivate employee on server:', err);
    }

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Deactivated Employee',
      target: `${emp.name} (${emp.id})`,
      oldValue: 'active',
      newValue: 'inactive',
      reason: 'Administrator deactivated employee profile and revoked login access.',
      ipAddress: '192.168.1.10',
      status: 'success',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Employee Deactivated', `${emp.name} has been deactivated and login revoked. History retained.`);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setUserAccounts((prev) => prev.filter((u) => u.employeeId !== employeeId));

    try {
      await api.deleteEmployee(employeeId);
    } catch (err: any) {
      console.error('Failed to delete employee on server:', err);
    }

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'Super Admin',
      actorRole: currentUser?.role || 'super_admin',
      action: 'Permanently Deleted Employee',
      target: `${emp.name} (${emp.id})`,
      oldValue: 'active',
      newValue: 'deleted',
      reason: 'Administrator permanently deleted employee record from database.',
      ipAddress: '192.168.1.10',
      status: 'warning',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Employee Deleted', `${emp.name} was permanently removed from database.`);
  };

  const handleAddEmployee = async (empData: Employee) => {
    try {
      const created = await api.createEmployee(empData);
      const newEmp = created || empData;
      setEmployees((prev) => [newEmp, ...prev.filter((e) => e.id !== newEmp.id)]);
      addToast('success', 'Employee Onboarded', `${newEmp.name} added to ${newEmp.department} and saved to database.`);
    } catch (err: any) {
      console.error('Failed to create employee in database:', err);
      setEmployees((prev) => [empData, ...prev.filter((e) => e.id !== empData.id)]);
      addToast('warning', 'Saved Locally', `Added ${empData.name}. (Database sync notice: ${err.message || 'Saved to client state'})`);
    }
  };

  const handleSaveLeavePolicies = async (updatedPolicies?: LeavePolicy[]) => {
    if (updatedPolicies) {
      try {
        await api.updateLeavePolicies(updatedPolicies);
      } catch (err: any) {
        console.error('Failed to update leave policies on server DB:', err);
        addToast('error', 'Save Failed', err?.message || 'Leave policies could not be saved to the database. Changes kept locally only.');
      }
      setLeavePolicies(updatedPolicies);

      const newLog: AuditLog = {
        id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        administrator: currentUser?.name || 'Super Admin',
        actorRole: currentUser?.role || 'super_admin',
        action: 'Updated Leave Policies',
        target: 'Global Leave Policy Settings',
        oldValue: 'Previous Quotas',
        newValue: `${updatedPolicies.length} Active Policies`,
        reason: 'Admin updated global leave quotas and policy settings.',
        ipAddress: '192.168.1.10',
        status: 'success',
      };

      setAuditLogs((prev) => [newLog, ...prev]);
      addToast('success', 'Leave Policies Updated', 'Saved leave quotas and categories system-wide.');
    } else {
      addToast('success', 'Settings Saved', 'Global work shift and grace period updated.');
    }
  };

  const handleUpdateEmployeeLeaveUsed = (employeeId: string, policyId: string, newUsed: number) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const newLeaveUsed = {
      ...(emp.leaveUsed || {}),
      [policyId]: newUsed,
    };

    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id !== employeeId) return e;
        return {
          ...e,
          leaveUsed: newLeaveUsed,
        };
      })
    );

    api.updateEmployee(employeeId, { leaveUsed: newLeaveUsed }).catch((err) =>
      console.error('Failed to update employee leave balance on server DB:', err)
    );

    const newLog: AuditLog = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      administrator: currentUser?.name || 'User',
      actorRole: currentUser?.role || 'admin',
      action: 'Manual Leave Used Override',
      target: `${emp.name} (${emp.id})`,
      oldValue: `Policy ${policyId} Used Days: ${emp.leaveUsed?.[policyId] ?? 0}`,
      newValue: `Policy ${policyId} Used Days: ${newUsed}`,
      reason: 'Manual adjustment of employee leave used days.',
      ipAddress: '192.168.1.10',
      status: 'warning',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    addToast('success', 'Leave Balance Adjusted', `Updated leave used count to ${newUsed} days for ${emp.name}.`);
  };

  /**
   * Derives an employee's used-leave-days per type from their approved leave
   * records for the current year and persists it, so balance always reflects
   * the actual leave history (including admin corrections).
   */
  const recomputeEmployeeLeaveUsed = (employeeId: string, requests: LeaveRequest[]) => {
    const year = String(new Date().getFullYear());
    const usedByType: Record<string, number> = {};
    for (const lr of requests) {
      if (lr.employeeId !== employeeId || lr.status !== 'approved') continue;
      if (!lr.startDate?.startsWith(year)) continue;
      usedByType[lr.leaveType] = (usedByType[lr.leaveType] || 0) + (lr.totalDays || 0);
    }
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, leaveUsed: usedByType } : e))
    );
    api.updateEmployee(employeeId, { leaveUsed: usedByType }).catch((err) =>
      console.error('Failed to persist recomputed leave balance:', err)
    );
  };

  /** Admin adds a past/present leave record directly to an employee's history. */
  const handleAddLeaveRecord = (record: Omit<LeaveRequest, 'id' | 'employeeName' | 'employeeAvatar' | 'department' | 'appliedDate'> & { employeeId: string }) => {
    const emp = employees.find((e) => e.id === record.employeeId);
    const newLeave: LeaveRequest = {
      id: `LV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: record.employeeId,
      employeeName: emp?.name || record.employeeId,
      employeeAvatar: emp?.avatar || '',
      department: emp?.department || '—',
      appliedDate: new Date().toISOString().split('T')[0],
      ...record,
    };
    const updated = [newLeave, ...leaveRequests];
    setLeaveRequests(updated);
    api.createLeaveRequest(newLeave).catch((err) =>
      console.error('Failed to save leave record to server DB:', err)
    );
    recomputeEmployeeLeaveUsed(record.employeeId, updated);
    addToast('success', 'Leave Record Added', `${newLeave.totalDays} day(s) of ${newLeave.leaveType} recorded for ${newLeave.employeeName}.`);
  };

  /** Admin edits/corrects an existing leave record (type, dates, duration, status). */
  const handleEditLeaveRecord = (id: string, updates: Partial<LeaveRequest>) => {
    const existing = leaveRequests.find((l) => l.id === id);
    const updatedList = leaveRequests.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setLeaveRequests(updatedList);
    api.updateLeaveRequest(id, updates).catch((err) =>
      console.error('Failed to update leave record on server DB:', err)
    );
    if (existing) {
      recomputeEmployeeLeaveUsed(existing.employeeId, updatedList);
    }
    addToast('success', 'Leave Record Updated', `Corrections saved for ${existing?.employeeName || 'the employee'}'s leave record.`);
  };

  /** Admin deletes a leave record from an employee's history. */
  const handleDeleteLeaveRecord = (id: string) => {
    const existing = leaveRequests.find((l) => l.id === id);
    const updatedList = leaveRequests.filter((l) => l.id !== id);
    setLeaveRequests(updatedList);
    api.deleteLeaveRequest(id).catch((err) =>
      console.error('Failed to delete leave record on server DB:', err)
    );
    if (existing) {
      recomputeEmployeeLeaveUsed(existing.employeeId, updatedList);
    }
    addToast('warning', 'Leave Record Deleted', `Leave record ${id} removed and balance recalculated.`);
  };

  const handleAddHoliday = (newHoliday: Omit<CompanyHoliday, 'id'>) => {
    const id = `HOL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const fullHoliday: CompanyHoliday = { id, ...newHoliday, source: newHoliday.source ?? 'manual' };
    setHolidays((prev) => [...prev, fullHoliday]);

    api.createHoliday(fullHoliday).catch((err) =>
      console.error('Failed to save holiday to server DB:', err)
    );

    addToast('success', 'Holiday Added', `Added "${newHoliday.title}" to company holiday calendar.`);
  };

  const handleUpdateHoliday = (id: string, updates: Partial<CompanyHoliday>) => {
    setHolidays((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates, source: 'manual', externalId: undefined } : h))
    );

    api.updateHoliday(id, updates).catch((err) =>
      console.error('Failed to update holiday on server DB:', err)
    );

    addToast('success', 'Holiday Updated', `"${updates.title ?? 'Holiday'}" saved. Government entries become custom when edited.`);
  };

  const handleSyncHolidays = async () => {
    try {
      const synced = await api.syncHolidays();
      setHolidays(synced);
      addToast('success', 'Government Holidays Synced', `Fetched the latest Bangladesh government holidays (${synced.filter((h) => h.source === 'government').length} government entries).`);
    } catch (err: any) {
      console.error('Failed to sync government holidays:', err);
      addToast('error', 'Sync Failed', err?.message || 'Could not fetch government holiday data.');
    }
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));

    api.deleteHoliday(id).catch((err) =>
      console.error('Failed to delete holiday from server DB:', err)
    );

    addToast('warning', 'Holiday Deleted', `Holiday entry removed from calendar.`);
  };

  const handleUpdateEmployeeProfile = async (empId: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, ...updates } : e))
    );

    try {
      await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      addToast('success', 'Profile Updated', 'Employee details updated successfully.');
    } catch (err) {
      console.error('Failed to update employee profile:', err);
      addToast('error', 'Update Failed', 'Could not persist profile updates.');
    }
  };

  // When an employee opens "My Profile" (activeSection === 'employees'),
  // skip the directory grid and open their own profile modal directly.
  // NOTE: must stay above the login early-return so hook order is constant.
  useEffect(() => {
    if (currentUser && currentUser.role === 'employee' && activeSection === 'employees') {
      setSelectedEmployeeId(currentUser.employeeId || currentUser.id);
    }
  }, [activeSection, currentUser]);

  // If user is not logged in, display single Login screen
  if (!currentUser) {
    return (
      <LoginView
        accounts={userAccounts}
        employees={employees}
        registrationRequests={registrationRequests}
        onLoginSuccess={(user, token) => {
          if (token) {
            setAuthToken(token);
          }
          setCurrentUser(user);
          loadDatabaseData();
          setActiveSection('dashboard');
          addToast('success', 'Authentication Successful', `Welcome back, ${user.name} (${user.role.toUpperCase()})!`);
        }}
        onRequestRegistration={handleRequestRegistration}
      />
    );
  }

  // Data Scoping by Role
  const isEmployeeRole = currentUser.role === 'employee';
  const myEmpId = currentUser.employeeId || currentUser.id;

  const scopedAttendance = isEmployeeRole
    ? attendance.filter(
        (a) =>
          a.employeeId === myEmpId ||
          a.employeeId === currentUser.id ||
          (currentUser.employeeId && a.employeeId === currentUser.employeeId) ||
          (a.employeeName && currentUser.name && a.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      )
    : attendance;

  const scopedLeaveRequests = isEmployeeRole
    ? leaveRequests.filter(
        (l) =>
          l.employeeId === myEmpId ||
          l.employeeId === currentUser.id ||
          (currentUser.employeeId && l.employeeId === currentUser.employeeId) ||
          (l.employeeName && currentUser.name && l.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      )
    : leaveRequests;

  const scopedEmployees = isEmployeeRole
    ? employees.filter(
        (e) =>
          e.id === myEmpId ||
          e.id === currentUser.id ||
          (currentUser.employeeId && e.id === currentUser.employeeId) ||
          (e.name && currentUser.name && e.name.toLowerCase() === currentUser.name.toLowerCase())
      )
    : employees;

  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeId) || null;

  // Real-time calculation for Dashboard Stat Cards
  const totalEmployeesCount = employees.length || 8;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttendanceRecords = attendance.filter((a) => a.date === todayDateStr);

  const presentCountReal = new Set(
    todayAttendanceRecords
      .filter((a) => a.status === 'present' || a.status === 'grace_period' || a.status === 'remote')
      .map((a) => a.employeeId)
  ).size;

  const lateCountReal = new Set(
    todayAttendanceRecords
      .filter((a) => a.status === 'late')
      .map((a) => a.employeeId)
  ).size;

  const leaveCountReal = new Set(
    leaveRequests
      .filter((l) => l.status === 'approved' && l.startDate <= todayDateStr && l.endDate >= todayDateStr)
      .map((l) => l.employeeId)
  ).size;

  const displayPresentCount = (todayAttendanceRecords.length > 0 || leaveRequests.length > 0)
    ? (presentCountReal + lateCountReal)
    : Math.max(0, totalEmployeesCount - 2);

  const displayLateCount = lateCountReal;

  const displayLeaveCount = (todayAttendanceRecords.length > 0 || leaveRequests.length > 0)
    ? leaveCountReal
    : 2;

  const displayAbsentCount = Math.max(0, totalEmployeesCount - displayPresentCount - displayLeaveCount);

  // Employee personal averages
  const empAvgEntry = scopedAttendance[0]?.entryTime || '09:00 AM';
  const empAvgExit = scopedAttendance[0]?.exitTime || '06:00 PM';
  const empAvgHours = scopedAttendance.length > 0
    ? scopedAttendance.reduce((acc, curr) => acc + (Number(curr.workHours) || 8.0), 0) / scopedAttendance.length
    : 8.0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* Background Soft Pastel Gradient Blobs */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/40 via-blue-100/30 to-indigo-200/20 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-200/30 via-indigo-100/20 to-blue-200/30 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Main Layout Container */}
      <div className="flex min-h-screen max-w-[1700px] mx-auto">
        {/* Left Floating Sidebar (fixed drawer on mobile, static column on lg+) */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          pendingLeavesCount={pendingLeavesCount}
          currentUser={currentUser}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onLogout={() => {
            setAuthToken(null);
            setCurrentUser(null);
            addToast('info', 'Signed Out', 'Your session has ended safely.');
          }}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 px-0 lg:pr-4 lg:pl-1">
          {/* Top Sticky Header */}
          <Header
            currentUser={currentUser}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenClockInModal={() => setIsAttendanceModalOpen(true)}
            onOpenAIInsights={() => {
              if (currentUser.role !== 'employee') {
                handleSelectSection('analytics');
                fetchAIInsights();
              }
            }}
            notifications={notifications}
            onMarkNotificationRead={(id) => {
              setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
              // Persist to server so the read state survives a page reload.
              api.markNotificationRead(id).catch((err) => console.log('Mark notification read fallback:', err));
            }}
            onMarkAllNotificationsRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              api.markNotificationsRead().catch((err) => console.log('Mark all notifications read fallback:', err));
            }}
            onSelectNotification={(notif) => setSelectedNotification(notif)}
            employees={scopedEmployees}
            onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
            onNavigate={handleSelectSection}
            onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
            onLogout={() => {
              setAuthToken(null);
              setCurrentUser(null);
              addToast('info', 'Signed Out', 'Session terminated.');
            }}
          />

          {/* Dynamic Section Renderer */}
          <div className="flex-1 pb-10 px-3 sm:px-2 space-y-6">
            {/* 1. DASHBOARD VIEW */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                {/* Employee Portal Punch Widget */}
                <EmployeeCheckInWidget
                  employeeId={currentUser.employeeId || currentUser.id}
                  employeeName={currentUser.name}
                  todayRecord={todayAttendanceRecords.find(
                    (a) =>
                      a.employeeId === myEmpId ||
                      a.employeeId === currentUser.id ||
                      (currentUser.employeeId && a.employeeId === currentUser.employeeId) ||
                      (a.employeeName && currentUser.name && a.employeeName.toLowerCase() === currentUser.name.toLowerCase())
                  )}
                  shiftSettings={shiftSettings}
                  onCheckIn={handleCheckInPortal}
                  onCheckOut={handleCheckOutPortal}
                />

                {/* Super Admin & Admin: Pending Join Requests Section */}
                {currentUser.role !== 'employee' && (
                  <PendingJoinRequestsCard
                    requests={registrationRequests}
                    onApprove={(req, customPass) =>
                      handleAcceptRegistration(
                        req,
                        customPass || `Pass-${Math.floor(100000 + Math.random() * 900000)}#`
                      )
                    }
                    onReject={handleRejectRegistration}
                    onViewAllRequests={() => handleSelectSection('settings')}
                  />
                )}

                {/* Executive Top Stat Cards */}
                <StatCards
                  presentCount={isEmployeeRole ? (scopedAttendance.length > 0 ? 1 : 0) : displayPresentCount}
                  lateCount={isEmployeeRole ? 0 : displayLateCount}
                  absentCount={isEmployeeRole ? 0 : displayAbsentCount}
                  leaveCount={isEmployeeRole ? (scopedLeaveRequests.some(l => l.status === 'approved') ? 1 : 0) : displayLeaveCount}
                  avgEntry={empAvgEntry}
                  avgExit={empAvgExit}
                  avgHours={empAvgHours}
                  totalEmployees={totalEmployeesCount}
                  isEmployeeView={isEmployeeRole}
                />

                {/* Quick Operational Actions Bar - Hidden for standard employees */}
                {!isEmployeeRole && (
                  <QuickActions
                    onClockIn={() => setIsAttendanceModalOpen(true)}
                    onApplyLeave={() => setIsLeaveModalOpen(true)}
                    onAddEmployee={() => {
                      if (currentUser.role !== 'employee') setIsAddEmployeeModalOpen(true);
                    }}
                    onManualAdjustment={() => {
                      if (currentUser.role !== 'employee') setIsCorrectionModalOpen(true);
                    }}
                    onRunAI={() => {
                      if (currentUser.role !== 'employee') {
                        handleSelectSection('analytics');
                        fetchAIInsights();
                      }
                    }}
                    onExportReport={handleExportCSV}
                  />
                )}

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <AttendanceTrendChart />
                  </div>
                  <div className="lg:col-span-1">
                    <AttendanceDoughnut />
                  </div>
                </div>

                {/* Alerts & Broadcasts Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <TodayAlerts
                    records={attendance}
                    announcements={announcements}
                    currentUserRole={currentUser?.role}
                    onResolveAlert={(id) => addToast('success', 'Alert Acknowledged', `HR Flag ${id} resolved.`)}
                    onSendAlert={() => setIsAnnouncementModalOpen(true)}
                    onSelectAnnouncement={handleSelectAnnouncement}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                  />
                  <AnnouncementsWidget
                    announcements={announcements}
                    currentUserRole={currentUser?.role}
                    onOpenAll={() => addToast('info', 'Broadcasts', 'All announcements loaded.')}
                    onOpenCreateModal={() => setIsAnnouncementModalOpen(true)}
                    onSelectAnnouncement={handleSelectAnnouncement}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                  />
                  <UpcomingLeaveCard
                    leaves={scopedLeaveRequests}
                    onNavigateToLeave={() => handleSelectSection('leave')}
                    onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                  />
                </div>

                {/* Recent Attendance Table */}
                <AttendanceTable
                  records={scopedAttendance}
                  employees={employees}
                  onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                  onOpenManualCorrection={handleOpenCorrectionModal}
                  onExportCSV={handleExportCSV}
                  currentUserRole={currentUser.role}
                  onDeleteRecord={handleDeleteAttendanceRecord}
                />
              </div>
            )}

            {/* 2. ATTENDANCE VIEW */}
            {activeSection === 'attendance' && (
              <div className="animate-fade-in space-y-6">
                <AttendanceTable
                  records={scopedAttendance}
                  employees={employees}
                  onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                  onOpenManualCorrection={handleOpenCorrectionModal}
                  onExportCSV={handleExportCSV}
                  currentUserRole={currentUser.role}
                  onDeleteRecord={handleDeleteAttendanceRecord}
                />
              </div>
            )}

            {/* 3. EMPLOYEES VIEW / PROFILE */}
            {activeSection === 'employees' && currentUser.role === 'employee' ? (
              // Employees don't get the directory grid — "My Profile" opens
              // their own profile modal directly. The modal itself is
              // rendered globally below (driven by selectedEmployeeId), so
              // this branch just renders nothing here and the effect above
              // (or the sidebar click) takes care of opening it.
              null
            ) : activeSection === 'employees' && (
              <div className="animate-fade-in">
                <EmployeeDirectory
                  employees={scopedEmployees}
                  currentUserRole={currentUser?.role}
                  onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                  onAddEmployee={() => {
                    if (currentUser.role !== 'employee') setIsAddEmployeeModalOpen(true);
                  }}
                  onUpdateAvatar={handleUpdateEmployeeAvatar}
                  onRefreshEmployees={loadDatabaseData}
                  onDeactivateEmployee={handleDeactivateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              </div>
            )}

            {/* 4. LEAVE VIEW */}
            {activeSection === 'leave' && (
              <div className="animate-fade-in">
                <LeaveManagement
                  leaveRequests={scopedLeaveRequests}
                  leavePolicies={leavePolicies}
                  currentUserRole={currentUser.role}
                  onApplyLeave={() => setIsLeaveModalOpen(true)}
                  onApproveLeave={(id, comment) => {
                    if (currentUser.role === 'employee') return;
                    const updatedList = leaveRequests.map((l) =>
                      l.id === id
                        ? { ...l, status: 'approved' as const, managerComment: comment || l.managerComment }
                        : l
                    );
                    setLeaveRequests(updatedList);
                    api.updateLeaveRequest(id, {
                      status: 'approved',
                      managerComment: comment,
                    }).catch((err) =>
                      console.error('Failed to update approve leave status on server DB:', err)
                    );
                    const target = leaveRequests.find((l) => l.id === id);
                    if (target) recomputeEmployeeLeaveUsed(target.employeeId, updatedList);
                    addToast('success', 'Leave Approved', `Leave application ${id} approved.`);
                  }}
                  onRejectLeave={(id, comment) => {
                    if (currentUser.role === 'employee') return;
                    const updatedList = leaveRequests.map((l) =>
                      l.id === id
                        ? { ...l, status: 'rejected' as const, managerComment: comment || l.managerComment }
                        : l
                    );
                    setLeaveRequests(updatedList);
                    api.updateLeaveRequest(id, {
                      status: 'rejected',
                      managerComment: comment,
                    }).catch((err) =>
                      console.error('Failed to update reject leave status on server DB:', err)
                    );
                    const target = leaveRequests.find((l) => l.id === id);
                    if (target) recomputeEmployeeLeaveUsed(target.employeeId, updatedList);
                    addToast('warning', 'Leave Rejected', `Leave application ${id} rejected.`);
                  }}
                  onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                  onDeleteLeave={(id) => {
                    if (currentUser.role === 'employee') return;
                    handleDeleteLeaveRecord(id);
                  }}
                />
              </div>
            )}

            {/* 5. DEPARTMENTS VIEW */}
            {activeSection === 'departments' && currentUser.role !== 'employee' && (
              <div className="animate-fade-in">
                <DepartmentGrid
                  departments={effectiveDepartments}
                  employees={scopedEmployees}
                  attendanceRecords={scopedAttendance}
                  currentUserRole={currentUser.role}
                  onAddDepartment={handleAddDepartment}
                  onDeleteDepartment={handleDeleteDepartment}
                />
              </div>
            )}

            {/* 6. CALENDAR VIEW */}
            {activeSection === 'calendar' && currentUser.role !== 'employee' && (
              <div className="animate-fade-in">
                <CalendarView holidays={holidays} leaves={scopedLeaveRequests} onSyncHolidays={handleSyncHolidays} />
              </div>
            )}

            {/* 7. REPORTS VIEW */}
            {activeSection === 'reports' && currentUser.role !== 'employee' && (
              <div className="animate-fade-in">
                <ReportBuilder
                  records={scopedAttendance}
                  employees={scopedEmployees}
                  departments={effectiveDepartments}
                  leaveRequests={scopedLeaveRequests}
                  latePenaltyRule={latePenaltyRule}
                  currentUserRole={currentUser.role}
                  onExportCSV={handleExportCSV}
                />
              </div>
            )}

            {/* 8. ANALYTICS & AI VIEW */}
            {activeSection === 'analytics' && currentUser.role !== 'employee' && (
              <div className="animate-fade-in">
                <AnalyticsAIView
                  aiData={aiData}
                  isLoadingAI={isLoadingAI}
                  onRefreshAI={fetchAIInsights}
                  attendanceHistory={scopedAttendance}
                  employees={scopedEmployees}
                  departments={effectiveDepartments}
                  currentUserRole={currentUser.role}
                />
              </div>
            )}

            {/* 9. HOLIDAYS VIEW */}
            {activeSection === 'holidays' && currentUser.role !== 'employee' && (
              <div className="animate-fade-in">
                <HolidaysView
                  holidays={holidays}
                  currentUserRole={currentUser.role}
                  onAddHoliday={handleAddHoliday}
                  onUpdateHoliday={handleUpdateHoliday}
                  onDeleteHoliday={handleDeleteHoliday}
                  onSyncHolidays={handleSyncHolidays}
                />
              </div>
            )}

            {/* 10. SETTINGS VIEW */}
            {activeSection === 'settings' && (
              <div className="animate-fade-in">
                <SettingsView
                  leavePolicies={leavePolicies}
                  employees={employees}
                  userAccounts={userAccounts}
                  registrationRequests={registrationRequests}
                  latePenaltyRule={latePenaltyRule}
                  shiftSettings={shiftSettings}
                  currentUserRole={currentUser.role}
                  currentUserId={currentUser.id}
                  currentUser={currentUser}
                  onSaveSettings={handleSaveLeavePolicies}
                  onUpdateLatePenaltyRule={(rule) => {
                    setLatePenaltyRule(rule);
                    addToast('success', 'Late Penalty Rule Updated', `Set threshold to ${rule.threshold} lates/week = ${rule.deductionDays} day deduction.`);
                  }}
                  onUpdateShiftSettings={(settings) => {
                    setShiftSettings(settings);
                    addToast('success', 'Shift Settings Saved', `Office Start: ${settings.officeStartTime} | Late Cutoff: ${settings.lateThresholdTime}`);
                  }}
                  onCreateAccount={handleCreateUserAccount}
                  onUpdateAccount={handleUpdateUserAccount}
                  onDeleteAccount={handleDeleteUserAccount}
                  onAcceptRegistration={handleAcceptRegistration}
                  onRejectRegistration={handleRejectRegistration}
                  onResetToDemoData={handleResetToDemoData}
                  onPasswordChanged={(updatedUser) => {
                    setUserAccounts((prev) =>
                      prev.map((acc) => (acc.id === updatedUser.id ? { ...acc, passwordHash: updatedUser.passwordHash } : acc))
                    );
                    if (currentUser && currentUser.id === updatedUser.id) {
                      setCurrentUser((prev) => (prev ? { ...prev, passwordHash: updatedUser.passwordHash } : null));
                    }
                    addToast('success', 'Password Updated', 'Your account password has been changed and securely saved.');
                  }}
                />
              </div>
            )}

            {/* 11. AUDIT LOGS VIEW (Super Admin Only) */}
            {activeSection === 'audit_logs' && currentUser.role === 'super_admin' && (
              <div className="animate-fade-in">
                <AuditLogsView
                  logs={auditLogs}
                  currentUserRole={currentUser.role}
                  onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Global Modals & Employee Profile */}
      <ClockInModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        employees={scopedEmployees}
        onSubmitRecord={handleDirectAttendanceSubmit}
      />

      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={scopedEmployees}
        leavePolicies={leavePolicies}
        onSubmitLeave={handleDirectLeaveSubmit}
      />

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onAddEmployee={handleAddEmployee}
      />

      <ManualCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedCorrectionRecordId(null);
        }}
        employees={scopedEmployees}
        attendanceRecords={scopedAttendance}
        initialRecordId={selectedCorrectionRecordId}
        onSubmitCorrection={handleDirectCorrectionSubmit}
        onDeleteRecord={handleDeleteAttendanceRecord}
      />

      <CreateAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSubmitAnnouncement={handleCreateAnnouncement}
      />

      <NotificationDetailModal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
        announcements={announcements}
      />

      {selectedEmployeeObj && (
        <EmployeeProfileModal
          employee={selectedEmployeeObj}
          attendanceHistory={attendance}
          leaveRequests={leaveRequests}
          leavePolicies={leavePolicies}
          latePenaltyRule={latePenaltyRule}
          currentUserRole={currentUser?.role}
          isOwnProfile={
            !!currentUser &&
            (currentUser.employeeId || currentUser.id) === selectedEmployeeObj.id
          }
          departments={effectiveDepartments.map((d) => d.name)}
          onClose={() => {
            setSelectedEmployeeId(null);
            // If this was the employee's own auto-opened profile (My
            // Profile section), send them back to their dashboard instead
            // of leaving them on 'employees', which would just reopen it.
            if (currentUser && currentUser.role === 'employee' && activeSection === 'employees') {
              handleSelectSection('dashboard');
            }
          }}
          onUpdateAvatar={handleUpdateEmployeeAvatar}
          onUpdateLeaveUsed={handleUpdateEmployeeLeaveUsed}
          onUpdateEmployeeProfile={handleUpdateEmployeeProfile}
          onAddLeaveRecord={
            currentUser?.role === 'employee' ? undefined : handleAddLeaveRecord
          }
          onEditLeaveRecord={
            currentUser?.role === 'employee' ? undefined : handleEditLeaveRecord
          }
          onDeleteLeaveRecord={
            currentUser?.role === 'employee' ? undefined : handleDeleteLeaveRecord
          }
          onDeactivateEmployee={async (empId) => {
            await handleDeactivateEmployee(empId);
            setSelectedEmployeeId(null);
          }}
          onDeleteEmployee={async (empId) => {
            await handleDeleteEmployee(empId);
            setSelectedEmployeeId(null);
          }}
        />
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
        userAccounts={userAccounts}
        authToken={authToken || undefined}
        onPasswordChanged={(updatedUser) => {
          setUserAccounts((prev) =>
            prev.map((acc) => (acc.id === updatedUser.id ? { ...acc, passwordHash: updatedUser.passwordHash } : acc))
          );
          if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser((prev) => (prev ? { ...prev, passwordHash: updatedUser.passwordHash } : null));
          }
          addToast('success', 'Password Updated', 'Your account password has been changed and securely saved.');
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
