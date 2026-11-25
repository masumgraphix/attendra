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
  OfficeShiftSettings,
  Company,
  CompanyAccess,
  AIInsightData,
} from '../types';
import { LatePenaltyRule } from '../utils/salaryDeduction';

const TOKEN_KEY = 'attendra_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

/** Fired when the server says the session is gone (expired, password changed, deactivated…). */
export const SESSION_EXPIRED_EVENT = 'attendra:session-expired';
/** Fired when the company's trial/subscription no longer allows access. */
export const COMPANY_BLOCKED_EVENT = 'attendra:company-blocked';

export class ApiError extends Error {
  status: number;
  code?: string;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

async function request<T = any>(url: string, options: RequestInit = {}, raw = false): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your internet connection.', 0, null);
  }
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    if (response.status === 401 && token && !url.startsWith('/api/auth/login')) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    if (response.status === 402 && json.code === 'COMPANY_BLOCKED') {
      window.dispatchEvent(new CustomEvent(COMPANY_BLOCKED_EVENT, { detail: json.message }));
    }
    throw new ApiError(json.message || `Request failed (${response.status})`, response.status, json);
  }
  if (raw) return json as T;
  return (json.data !== undefined ? json.data : json) as T;
}

const body = (data: unknown) => JSON.stringify(data);

export interface SessionResponse {
  success: boolean;
  token?: string;
  account: UserAccount;
  company: Company | null;
  companyAccess: CompanyAccess;
  broadcast?: Broadcast | null;
  supportMode?: boolean;
}

export interface CreatedAccountResponse {
  data: UserAccount;
  alreadyExisted?: boolean;
  emailSent: boolean;
  emailSimulated: boolean;
  temporaryPassword?: string;
}

export const api = {
  // ---- Session -----------------------------------------------------------
  login: (email: string, password: string) =>
    request<SessionResponse>('/api/auth/login', { method: 'POST', body: body({ email, password }) }, true),
  signup: (data: { companyName: string; name: string; email: string; password: string; phone?: string }) =>
    request<SessionResponse>('/api/auth/signup', { method: 'POST', body: body(data) }, true),
  async getSession(): Promise<SessionResponse | null> {
    if (!getAuthToken()) return null;
    try {
      return await request<SessionResponse>('/api/auth/me', {}, true);
    } catch {
      return null;
    }
  },
  forgotPassword: (email: string) =>
    request<{ message: string; simulated?: boolean }>('/api/auth/forgot-password', { method: 'POST', body: body({ email }) }, true),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: body({ email, code, newPassword }) }, true),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ token: string; account: UserAccount }>('/api/auth/change-password', { method: 'POST', body: body({ currentPassword, newPassword }) }, true),
  lookupCompany: (code: string) => request<{ name: string; slug: string; logo?: string }>(`/api/public/company/${encodeURIComponent(code.trim().toLowerCase())}`),
  requestAccess: (req: Partial<RegistrationRequest> & { companyCode: string }) =>
    request<{ id: string; companyName: string }>('/api/registration-requests', { method: 'POST', body: body(req) }),

  // ---- Company -----------------------------------------------------------
  getCompany: () => request<Company>('/api/company'),
  updateCompany: (data: { name?: string; phone?: string; settings?: Partial<Company['settings']> }) =>
    request<Company>('/api/company', { method: 'PUT', body: body(data) }),
  updateShiftSettings: (settings: OfficeShiftSettings) =>
    request<OfficeShiftSettings>('/api/company/shift-settings', { method: 'PUT', body: body(settings) }),

  // ---- Departments -------------------------------------------------------
  getDepartments: () => request<Department[]>('/api/departments'),
  createDepartment: (dept: Partial<Department>) => request<Department>('/api/departments', { method: 'POST', body: body(dept) }),
  deleteDepartment: (id: string) => request<{ id: string }>(`/api/departments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ---- Employees ---------------------------------------------------------
  getEmployees: () => request<Employee[]>('/api/employees'),
  createEmployee: (emp: Employee) => request<Employee>('/api/employees', { method: 'POST', body: body(emp) }),
  updateEmployee: (id: string, emp: Partial<Employee>) => request<Employee>(`/api/employees/${id}`, { method: 'PUT', body: body(emp) }),
  deactivateEmployee: (id: string) => request<{ id: string }>(`/api/employees/${id}/deactivate`, { method: 'POST' }),
  deleteEmployee: (id: string) => request<{ id: string }>(`/api/employees/${id}`, { method: 'DELETE' }),
  importEmployeesCSV: (csvContent: string) =>
    request<{ success: boolean; message: string; importedCount: number; updatedCount: number; errors: string[]; data: Employee[] }>(
      '/api/employees/import',
      { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csvContent },
      true
    ),

  // ---- Attendance --------------------------------------------------------
  getAttendance: () => request<AttendanceRecord[]>('/api/attendance'),
  createAttendance: (rec: AttendanceRecord) => request<AttendanceRecord>('/api/attendance', { method: 'POST', body: body(rec) }),
  updateAttendance: (id: string, rec: Partial<AttendanceRecord>) => request<AttendanceRecord>(`/api/attendance/${id}`, { method: 'PUT', body: body(rec) }),
  deleteAttendance: (id: string) => request<{ deletedRecord: AttendanceRecord; auditLog: AuditLog }>(`/api/attendance/${id}`, { method: 'DELETE' }),

  // ---- Leave -------------------------------------------------------------
  getLeaveRequests: () => request<LeaveRequest[]>('/api/leave-requests'),
  createLeaveRequest: (req: LeaveRequest) => request<LeaveRequest>('/api/leave-requests', { method: 'POST', body: body(req) }),
  updateLeaveRequest: (id: string, req: Partial<LeaveRequest>) => request<LeaveRequest>(`/api/leave-requests/${id}`, { method: 'PUT', body: body(req) }),
  deleteLeaveRequest: (id: string) => request<{ id: string }>(`/api/leave-requests/${id}`, { method: 'DELETE' }),
  getLeavePolicies: () => request<LeavePolicy[]>('/api/leave-policies'),
  updateLeavePolicies: (policies: LeavePolicy[]) => request<LeavePolicy[]>('/api/leave-policies', { method: 'PUT', body: body(policies) }),

  // ---- Announcements, holidays ------------------------------------------
  getAnnouncements: () => request<Announcement[]>('/api/announcements'),
  createAnnouncement: (ann: Announcement) => request<Announcement>('/api/announcements', { method: 'POST', body: body(ann) }),
  deleteAnnouncement: (id: string) => request<{ id: string }>(`/api/announcements/${id}`, { method: 'DELETE' }),
  getHolidays: () => request<CompanyHoliday[]>('/api/holidays'),
  createHoliday: (hol: CompanyHoliday) => request<CompanyHoliday>('/api/holidays', { method: 'POST', body: body(hol) }),
  updateHoliday: (id: string, hol: Partial<CompanyHoliday>) => request<CompanyHoliday>(`/api/holidays/${id}`, { method: 'PUT', body: body(hol) }),
  deleteHoliday: (id: string) => request<{ id: string }>(`/api/holidays/${id}`, { method: 'DELETE' }),
  syncHolidays: () => request<CompanyHoliday[]>('/api/holidays/sync', { method: 'POST' }),

  // ---- Audit & notifications --------------------------------------------
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),
  createAuditLog: (log: AuditLog) => request<AuditLog>('/api/audit-logs', { method: 'POST', body: body(log) }),
  getNotifications: () => request<NotificationItem[]>('/api/notifications'),
  createNotification: (notif: NotificationItem) => request<NotificationItem>('/api/notifications', { method: 'POST', body: body(notif) }),
  markNotificationsRead: () => request<NotificationItem[]>('/api/notifications/read-all', { method: 'PUT' }),
  markNotificationRead: (id: string) => request<{ id: string; read: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // ---- User accounts & access requests ----------------------------------
  getUserAccounts: () => request<UserAccount[]>('/api/user-accounts'),
  createUserAccount: (acc: Partial<UserAccount> & { password?: string }) =>
    request<CreatedAccountResponse>('/api/user-accounts', { method: 'POST', body: body(acc) }, true),
  updateUserAccount: (id: string, acc: Partial<UserAccount>) => request<UserAccount>(`/api/user-accounts/${id}`, { method: 'PUT', body: body(acc) }),
  deleteUserAccount: (id: string) => request<{ id: string }>(`/api/user-accounts/${id}`, { method: 'DELETE' }),
  getRegistrationRequests: () => request<RegistrationRequest[]>('/api/registration-requests'),
  updateRegistrationRequest: (id: string, req: Partial<RegistrationRequest>) =>
    request<RegistrationRequest>(`/api/registration-requests/${id}`, { method: 'PUT', body: body(req) }),
  deleteRegistrationRequest: (id: string) => request<{ id: string }>(`/api/registration-requests/${id}`, { method: 'DELETE' }),

  // ---- Rules, AI ---------------------------------------------------------
  getLatePenaltyRule: () => request<LatePenaltyRule>('/api/late-penalty-rule'),
  updateLatePenaltyRule: (rule: LatePenaltyRule) => request<LatePenaltyRule>('/api/late-penalty-rule', { method: 'PUT', body: body(rule) }),
  getAIInsights: (payload: unknown) => request<AIInsightData>('/api/ai/insights', { method: 'POST', body: body(payload) }),

  // ---- Platform owner ----------------------------------------------------
  platformOverview: () => request<PlatformOverview>('/api/platform/overview'),
  platformCreateCompany: (data: { companyName: string; ownerName: string; ownerEmail: string; phone?: string; plan: string }) =>
    request<{ data: Company; emailSent: boolean; temporaryPassword?: string }>('/api/platform/companies', { method: 'POST', body: body(data) }, true),
  platformUpdateCompany: (
    id: string,
    data: { status?: string; plan?: string; maxEmployees?: number; extendTrialDays?: number; extendPaidDays?: number; notes?: string; phone?: string; name?: string; endSubscription?: boolean }
  ) => request<Company>(`/api/platform/companies/${id}`, { method: 'PUT', body: body(data) }),
  platformCompany: (id: string) => request<PlatformCompanyDetail>(`/api/platform/companies/${id}`),
  platformRecordPayment: (id: string, data: { plan: string; months: number; amountBdt: number; method: string; trxId?: string; note?: string; paidAt?: string }) =>
    request<{ payment: Payment; company: Company }>(`/api/platform/companies/${id}/payments`, { method: 'POST', body: body(data) }),
  platformCancelPayment: (id: string, reason?: string) =>
    request<{ company: Company }>(`/api/platform/payments/${id}`, { method: 'DELETE', body: body({ reason }) }),
  platformSetUserStatus: (id: string, status: 'active' | 'inactive') =>
    request<{ id: string; status: string }>(`/api/platform/users/${id}`, { method: 'PUT', body: body({ status }) }),
  platformPayments: () => request<Payment[]>('/api/platform/payments'),
  platformPayment: (id: string) => request<Payment & { companySlug: string; companyPhone: string | null; owner: { name: string; email: string } | null }>(`/api/platform/payments/${id}`),
  platformSavePlans: (plans: PlatformOverview['plans']) => request<PlatformOverview['plans']>('/api/platform/plans', { method: 'PUT', body: body({ plans }) }),
  platformGetBroadcast: () => request<Broadcast | null>('/api/platform/broadcast'),
  platformSaveBroadcast: (data: { message: string; level: Broadcast['level']; active: boolean }) =>
    request<Broadcast>('/api/platform/broadcast', { method: 'PUT', body: body(data) }),
  platformSupportLogin: (id: string) => request<{ token: string }>(`/api/platform/companies/${id}/support-login`, { method: 'POST', body: body({}) }),
  platformResetOwner: (id: string, email?: string) =>
    request<{ data: { email: string }; emailSent: boolean; temporaryPassword?: string }>(`/api/platform/companies/${id}/reset-owner`, { method: 'POST', body: body({ email }) }, true),
};

export interface PlatformCompany extends Company {
  employeeCount: number;
  userCount: number;
  lastActiveAt: string | null;
  owner: { name: string; email: string } | null;
  totalPaid: number;
  notes: string;
  priceBdt: number;
}

export interface Payment {
  id: string;
  receiptNo: number;
  companyId: string;
  companyName: string;
  amountBdt: number;
  method: string;
  trxId: string | null;
  plan: string;
  planName: string;
  months: number;
  periodFrom: string;
  periodTo: string;
  note: string | null;
  recordedBy: string | null;
  paidAt: string;
}

export interface PlatformCompanyDetail {
  company: PlatformCompany;
  users: { id: string; name: string; email: string; role: string; status: string; lastLoginAt: string | null; createdAt: string }[];
  payments: Payment[];
  usage: { attendance_30d: number; leave_30d: number; active_days_30d: number };
}

export interface Broadcast {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'success';
  active: boolean;
  updatedAt: string;
}

export interface PlatformOverview {
  stats: {
    totalCompanies: number;
    activePaid: number;
    onTrial: number;
    trialExpired: number;
    suspended: number;
    totalEmployees: number;
    monthlyRevenueBdt: number;
    collectedThisMonthBdt: number;
  };
  companies: PlatformCompany[];
  monthly: { month: string; revenue: number; signups: number; conversions: number }[];
  plans: Record<string, { name: string; maxEmployees: number; priceBdt: number }>;
}
