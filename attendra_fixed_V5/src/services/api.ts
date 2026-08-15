import {
  Employee,
  Department,
  AttendanceRecord,
  LeaveRequest,
  LeavePolicy,
  Announcement,
  CompanyHoliday,
  AuditLog,
  NotificationItem,
  UserAccount,
  RegistrationRequest,
} from '../types';
import { LatePenaltyRule } from '../utils/salaryDeduction';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('attendra_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('attendra_auth_token', token);
    } else {
      localStorage.removeItem('attendra_auth_token');
    }
  } catch (err) {
    console.error('Error managing auth token in localStorage:', err);
  }
}

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `API request failed with status ${response.status}`);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Session Restore
  async getCurrentUser(): Promise<UserAccount | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        return result.account;
      }
    } catch {
      // quiet fallback
    }
    return null;
  },

  // Departments
  getDepartments: () => authFetch<Department[]>('/api/departments'),
  createDepartment: (dept: Partial<Department>) => authFetch<Department>('/api/departments', { method: 'POST', body: JSON.stringify(dept) }),
  deleteDepartment: (id: string) => authFetch<{ id: string }>(`/api/departments/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => authFetch<Employee[]>('/api/employees'),
  createEmployee: (emp: Employee) => authFetch<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(emp) }),
  updateEmployee: (id: string, emp: Partial<Employee>) => authFetch<Employee>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(emp) }),
  deactivateEmployee: (id: string) => authFetch<{ id: string }>(`/api/employees/${id}/deactivate`, { method: 'POST' }),
  deleteEmployee: (id: string) => authFetch<{ id: string }>(`/api/employees/${id}`, { method: 'DELETE' }),
  importEmployeesCSV: (csvContent: string) => authFetch<{ success: boolean; message: string; importedCount: number; updatedCount: number; errors: string[] }>('/api/employees/import', {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvContent,
  }),

  // Attendance
  getAttendance: () => authFetch<AttendanceRecord[]>('/api/attendance'),
  createAttendance: (rec: AttendanceRecord) => authFetch<AttendanceRecord>('/api/attendance', { method: 'POST', body: JSON.stringify(rec) }),
  updateAttendance: (id: string, rec: Partial<AttendanceRecord>) => authFetch<AttendanceRecord>(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(rec) }),

  // Leave Requests
  getLeaveRequests: () => authFetch<LeaveRequest[]>('/api/leave-requests'),
  createLeaveRequest: (req: LeaveRequest) => authFetch<LeaveRequest>('/api/leave-requests', { method: 'POST', body: JSON.stringify(req) }),
  updateLeaveRequest: (id: string, req: Partial<LeaveRequest>) => authFetch<LeaveRequest>(`/api/leave-requests/${id}`, { method: 'PUT', body: JSON.stringify(req) }),

  // Leave Policies
  getLeavePolicies: () => authFetch<LeavePolicy[]>('/api/leave-policies'),
  updateLeavePolicies: (policies: LeavePolicy[]) => authFetch<LeavePolicy[]>('/api/leave-policies', { method: 'PUT', body: JSON.stringify(policies) }),

  // Announcements
  getAnnouncements: () => authFetch<Announcement[]>('/api/announcements'),
  createAnnouncement: (ann: Announcement) => authFetch<Announcement>('/api/announcements', { method: 'POST', body: JSON.stringify(ann) }),
  deleteAnnouncement: (id: string) => authFetch<{ id: string }>(`/api/announcements/${id}`, { method: 'DELETE' }),

  // Holidays
  getHolidays: () => authFetch<CompanyHoliday[]>('/api/holidays'),
  createHoliday: (hol: CompanyHoliday) => authFetch<CompanyHoliday>('/api/holidays', { method: 'POST', body: JSON.stringify(hol) }),
  deleteHoliday: (id: string) => authFetch<{ id: string }>(`/api/holidays/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => authFetch<AuditLog[]>('/api/audit-logs'),
  createAuditLog: (log: AuditLog) => authFetch<AuditLog>('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),

  // Notifications
  getNotifications: () => authFetch<NotificationItem[]>('/api/notifications'),
  createNotification: (notif: NotificationItem) => authFetch<NotificationItem>('/api/notifications', { method: 'POST', body: JSON.stringify(notif) }),
  markNotificationsRead: () => authFetch<NotificationItem[]>('/api/notifications/read-all', { method: 'PUT' }),
  markNotificationRead: (id: string) => authFetch<{ id: string; read: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // User Accounts
  getUserAccounts: () => authFetch<UserAccount[]>('/api/user-accounts'),
  createUserAccount: (acc: UserAccount) => authFetch<UserAccount>('/api/user-accounts', { method: 'POST', body: JSON.stringify(acc) }),
  updateUserAccount: (id: string, acc: Partial<UserAccount>) => authFetch<UserAccount>(`/api/user-accounts/${id}`, { method: 'PUT', body: JSON.stringify(acc) }),
  deleteUserAccount: (id: string) => authFetch<{ id: string }>(`/api/user-accounts/${id}`, { method: 'DELETE' }),

  // Registration Requests
  getRegistrationRequests: () => authFetch<RegistrationRequest[]>('/api/registration-requests'),
  createRegistrationRequest: (req: RegistrationRequest) => fetch('/api/registration-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }),
  updateRegistrationRequest: (id: string, req: Partial<RegistrationRequest>) => authFetch<RegistrationRequest>(`/api/registration-requests/${id}`, { method: 'PUT', body: JSON.stringify(req) }),

  // Late Penalty Rule
  getLatePenaltyRule: () => authFetch<LatePenaltyRule>('/api/late-penalty-rule'),
  updateLatePenaltyRule: (rule: LatePenaltyRule) => authFetch<LatePenaltyRule>('/api/late-penalty-rule', { method: 'PUT', body: JSON.stringify(rule) }),

  // Reset System to Demo Data
  resetDemoData: () => authFetch<{ success: boolean; message: string }>('/api/reset-demo-data', { method: 'POST' }),
};
