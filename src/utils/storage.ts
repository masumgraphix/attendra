/**
 * LOCAL STORAGE PERSISTENCE NOTICE:
 * Note: localStorage is per-browser / per-device storage only.
 * It does NOT sync data between different employees' devices or across phones/desktops.
 * A real shared backend database (e.g., PostgreSQL / Firestore) is still required before this app
 * is usable by multiple real employees across different devices.
 * This client-side persistence layer serves as a temporary bridge for prototyping & testing continuity.
 */

export const STORAGE_KEYS = {
  EMPLOYEES: 'attendra_employees',
  ATTENDANCE: 'attendra_attendance',
  LEAVE_REQUESTS: 'attendra_leaveRequests',
  LEAVE_POLICIES: 'attendra_leavePolicies',
  ANNOUNCEMENTS: 'attendra_announcements',
  HOLIDAYS: 'attendra_holidays',
  AUDIT_LOGS: 'attendra_auditLogs',
  NOTIFICATIONS: 'attendra_notifications',
  USER_ACCOUNTS: 'attendra_userAccounts',
  REGISTRATION_REQUESTS: 'attendra_registrationRequests',
  DEPARTMENTS: 'attendra_departments',
  LATE_PENALTY_RULE: 'attendra_latePenaltyRule',
  OFFICE_SHIFT_SETTINGS: 'attendra_officeShiftSettings',
  SESSION_USER_ID: 'attendra_session_userId',
  ACTIVE_SECTION: 'attendra_active_section',
} as const;

/**
 * Safely loads data from localStorage.
 * If data exists and is valid JSON, returns parsed value.
 * Otherwise falls back to provided default mock data and writes default mock data into localStorage.
 */
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed !== undefined && parsed !== null) {
        return parsed as T;
      }
    }
  } catch (err) {
    console.warn(`[LocalStorage] Failed to parse stored item for key "${key}", falling back to mock data:`, err);
  }

  // Fallback & seed localStorage if missing or corrupt
  saveToLocalStorage(key, fallback);
  return fallback;
}

/**
 * Safely saves a value to localStorage with quota-exceeded handling.
 */
export function saveToLocalStorage<T>(key: string, value: T, onQuotaExceeded?: () => void): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[LocalStorage] Quota exceeded or error saving key "${key}":`, err);
    if (onQuotaExceeded) {
      onQuotaExceeded();
    }
    return false;
  }
}

/**
 * Clears all `attendra_` keys from localStorage.
 */
export function clearAttendraLocalStorage(): void {
  try {
    Object.keys(STORAGE_KEYS).forEach((k) => {
      localStorage.removeItem(STORAGE_KEYS[k as keyof typeof STORAGE_KEYS]);
    });
    // Also clean up any other key starting with "attendra_"
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendra_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error('[LocalStorage] Error clearing attendra keys:', err);
  }
}
