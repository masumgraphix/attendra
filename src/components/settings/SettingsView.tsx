import React, { useEffect, useState } from 'react';
import { Settings, Clock, MapPin, Save, Palmtree, Plus, Trash2, AlertTriangle, X, Check, Lock, ShieldCheck, Users, DollarSign, HelpCircle, RotateCcw, KeyRound } from 'lucide-react';
import { LeavePolicy, Employee, UserAccount, UserRole, RegistrationRequest, OfficeShiftSettings } from '../../types';
import { LatePenaltyRule } from '../../utils/salaryDeduction';
import { UserAccountsView } from './UserAccountsView';
import { ChangePasswordCard } from '../auth/ChangePasswordCard';

interface SettingsViewProps {
  leavePolicies?: LeavePolicy[];
  employees?: Employee[];
  userAccounts?: UserAccount[];
  registrationRequests?: RegistrationRequest[];
  latePenaltyRule?: LatePenaltyRule;
  shiftSettings?: OfficeShiftSettings;
  currentUserRole?: UserRole;
  currentUserId?: string;
  currentUser?: UserAccount;
  onSaveSettings: (updatedPolicies?: LeavePolicy[]) => void;
  onUpdateLatePenaltyRule?: (rule: LatePenaltyRule) => void;
  onUpdateShiftSettings?: (settings: OfficeShiftSettings) => void;
  onCreateAccount?: (newAcc: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateAccount?: (account: UserAccount) => void;
  onDeleteAccount?: (accountId: string) => void;
  onAcceptRegistration?: (req: RegistrationRequest, generatedPassword: string) => void;
  onRejectRegistration?: (reqId: string) => void;
  onResetToDemoData?: () => void;
  onPasswordChanged?: (updatedUser: UserAccount) => void;
}

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', text: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', text: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', text: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500', text: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-500', text: 'text-slate-700', badgeBg: 'bg-slate-50 border-slate-200' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  leavePolicies = [],
  employees = [],
  userAccounts = [],
  registrationRequests = [],
  latePenaltyRule = { threshold: 3, deductionDays: 1 },
  shiftSettings = {
    officeStartTime: '09:00',
    lateThresholdTime: '09:20',
    officeEndTime: '17:00',
    weeklyOff: 'Friday',
    workDays: 'Saturday to Thursday',
    enableGeofence: true,
    ipWhitelist: '192.168.1.0/24, 10.0.4.0/16',
  },
  currentUserRole = 'super_admin',
  currentUserId = '',
  currentUser,
  onSaveSettings,
  onUpdateLatePenaltyRule,
  onUpdateShiftSettings,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAcceptRegistration,
  onRejectRegistration,
  onResetToDemoData,
  onPasswordChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'leave_policy' | 'user_accounts' | 'change_password'>('system');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const [officeStartTime, setOfficeStartTime] = useState(shiftSettings?.officeStartTime || '09:00');
  const [lateThresholdTime, setLateThresholdTime] = useState(shiftSettings?.lateThresholdTime || '09:20');
  const [workEnd, setWorkEnd] = useState(shiftSettings?.officeEndTime || '17:00');
  const [weeklyOff, setWeeklyOff] = useState(shiftSettings?.weeklyOff || 'Friday');
  const [workDays, setWorkDays] = useState(shiftSettings?.workDays || 'Saturday to Thursday');
  const [enableGeofence, setEnableGeofence] = useState(shiftSettings?.enableGeofence ?? true);
  const [ipWhitelist, setIpWhitelist] = useState(shiftSettings?.ipWhitelist || '192.168.1.0/24, 10.0.4.0/16');

  // Late Penalty Rule State
  const [penaltyThreshold, setPenaltyThreshold] = useState<number>(latePenaltyRule?.threshold ?? 3);
  const [penaltyDeductionDays, setPenaltyDeductionDays] = useState<number>(latePenaltyRule?.deductionDays ?? 1);

  // Leave Policies Local State
  const [policies, setPolicies] = useState<LeavePolicy[]>(leavePolicies ?? []);

  // Re-sync when server data arrives after this component mounted; otherwise
  // edits made during the async load get overwritten by stale local state.
  useEffect(() => {
    setPolicies(leavePolicies ?? []);
  }, [leavePolicies]);

  // Delete Confirmation Modal State
  const [deleteWarningModal, setDeleteWarningModal] = useState<{
    isOpen: boolean;
    policy: LeavePolicy | null;
    affectedCount: number;
    affectedNames: string[];
  }>({
    isOpen: false,
    policy: null,
    affectedCount: 0,
    affectedNames: [],
  });

  const isSuperAdmin = currentUserRole === 'super_admin';
  // Leave policies are managed by Admin AND Super Admin; the remaining
  // governance settings (shift rules, accounts) stay Super Admin only.
  const canEditPolicies = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const handleQuotaChange = (id: string, newQuota: number) => {
    if (!canEditPolicies) return;
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, yearlyQuota: Math.max(0, newQuota) } : p))
    );
  };

  const handleNameChange = (id: string, newName: string) => {
    if (!canEditPolicies) return;
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  const handleColorChange = (id: string, newColor: string) => {
    if (!canEditPolicies) return;
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, colorTag: newColor } : p))
    );
  };

  const handleAddPolicy = () => {
    if (!canEditPolicies) return;
    const newId = `leave_type_${Date.now()}`;
    const newPolicy: LeavePolicy = {
      id: newId,
      name: 'New Custom Leave',
      yearlyQuota: 10,
      colorTag: 'teal',
    };
    setPolicies((prev) => [...prev, newPolicy]);
  };

  const handleInitiateDelete = (policy: LeavePolicy) => {
    if (!canEditPolicies) return;
    const affectedEmps = employees.filter((emp) => {
      const used = emp.leaveUsed?.[policy.id] || 0;
      return used > 0;
    });

    if (affectedEmps.length > 0) {
      setDeleteWarningModal({
        isOpen: true,
        policy,
        affectedCount: affectedEmps.length,
        affectedNames: affectedEmps.map((e) => e.name),
      });
    } else {
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
    }
  };

  const handleConfirmDelete = () => {
    if (deleteWarningModal.policy && canEditPolicies) {
      const targetId = deleteWarningModal.policy.id;
      setPolicies((prev) => prev.filter((p) => p.id !== targetId));
    }
    setDeleteWarningModal({ isOpen: false, policy: null, affectedCount: 0, affectedNames: [] });
  };

  // Saves only the leave policy section — available to Admin and Super Admin.
  const handleSavePolicies = () => {
    if (!canEditPolicies) return;
    onSaveSettings(policies);
  };

  const handleSaveAll = () => {
    if (!isSuperAdmin) return;
    onSaveSettings(policies);
    if (onUpdateLatePenaltyRule) {
      onUpdateLatePenaltyRule({
        threshold: Math.max(1, penaltyThreshold),
        deductionDays: Math.max(1, penaltyDeductionDays),
      });
    }
    if (onUpdateShiftSettings) {
      onUpdateShiftSettings({
        officeStartTime,
        lateThresholdTime,
        officeEndTime: workEnd,
        weeklyOff,
        workDays,
        enableGeofence,
        ipWhitelist,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header & Role Warning */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Settings & Governance Dashboard
              </h3>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md border ${
                isSuperAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isSuperAdmin ? 'Super Admin Mode' : 'Admin (Read Only Settings)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure company shift rules, geofencing, leave quotas, and platform user credentials.
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Admin Role Limitation:</strong> You can view global shift timings, geofencing, and leave policy quotas. Modifying these configurations or managing User Accounts requires <strong>Super Admin</strong> credentials.
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Shift & Geofence Rules
          </button>

          <button
            onClick={() => setActiveTab('leave_policy')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'leave_policy'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            Leave Policy Quotas
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('user_accounts')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'user_accounts'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Users className="w-4 h-4" />
              User Accounts & Roles
            </button>
          )}

          <button
            onClick={() => setActiveTab('change_password')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'change_password'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </div>

      {/* TAB 1: Shift & Geofence */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Shift & Grace Period */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Shift Timing & Grace Window
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Work Schedule Days</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={workDays}
                  onChange={(e) => setWorkDays(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Weekly Off Day</label>
                <select
                  disabled={!isSuperAdmin}
                  value={weeklyOff}
                  onChange={(e) => setWeeklyOff(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="Friday">Friday (Official Weekly Holiday)</option>
                  <option value="Friday & Saturday">Friday & Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Office Start Time (Default: 09:00 AM)</label>
                <input
                  type="time"
                  disabled={!isSuperAdmin}
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold disabled:opacity-75 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Check-in at or before this time = Excellent / On-Time</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Late Threshold Time (Default: 09:20 AM)</label>
                <input
                  type="time"
                  disabled={!isSuperAdmin}
                  value={lateThresholdTime}
                  onChange={(e) => setLateThresholdTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold disabled:opacity-75 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Check-in after this time = Flagged as Late</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">Standard Office End Time (Default: 05:00 PM)</label>
              <input
                type="time"
                disabled={!isSuperAdmin}
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold disabled:opacity-75 disabled:cursor-not-allowed font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Used to calculate missing check-outs if shift ends without employee check-out log.
              </p>
            </div>
          </div>

          {/* Geofencing & Network Security */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              Geofence & IP Security Rules
            </h4>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Enforce GPS Geofence</p>
                <p className="text-[10px] text-slate-400">Require GPS location match within 100 meters of HQ</p>
              </div>
              <input
                type="checkbox"
                disabled={!isSuperAdmin}
                checked={enableGeofence}
                onChange={(e) => setEnableGeofence(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded disabled:opacity-75"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">Office Wi-Fi IP Subnet Whitelist</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Late-based Salary Deduction Rule Card (Super Admin Only) */}
          <div className="p-6 rounded-3xl bg-white border border-rose-200/80 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <DollarSign className="w-5 h-5 stroke-[2.2]" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Attendance Policy — Late Penalty & Salary Deduction Rule
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Automated weekly late calculation engine (Editable by Super Admin)
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Weekly Reset (Sat–Thu)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  Weekly Late Threshold (N Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    disabled={!isSuperAdmin}
                    value={penaltyThreshold}
                    onChange={(e) => setPenaltyThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 disabled:opacity-75"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">Lates / Week</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Number of late check-ins in a single business week (Sat–Thu) required to trigger a deduction.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  Salary Days Deducted (X Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    disabled={!isSuperAdmin}
                    value={penaltyDeductionDays}
                    onChange={(e) => setPenaltyDeductionDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 disabled:opacity-75"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">Days Deducted</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Number of salary days deducted for every {penaltyThreshold} late occurrences in that week.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Rule Governance & Operational Guidelines:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] font-medium text-slate-600">
                <li><strong>Week Definition:</strong> Saturday to Thursday (matches Dailygoods Ltd working week, Friday is official weekly holiday).</li>
                <li><strong>Late Clock-in Definition:</strong> Check-in at <strong>09:21 AM</strong> or later (Arrival Grace Window is 20 mins, covering up to 09:20 AM).</li>
                <li><strong>Weekly Reset:</strong> Deductions formula is <code className="bg-slate-200 px-1 rounded font-bold">floor(weekly_late_count / {penaltyThreshold}) * {penaltyDeductionDays}</code>. Unused lates reset at the end of Thursday and do NOT carry over to the next week.</li>
              </ul>
            </div>
          </div>

          {/* System Reset & Demo Data Card (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="p-6 rounded-3xl bg-rose-50/60 border border-rose-200 shadow-xs space-y-3 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-rose-950 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    Reset to Demo Data
                  </h4>
                  <p className="text-xs text-rose-800/80">
                    Erase all local modifications (employees, attendance logs, leave balances, policy edits, accounts) and restore Attendra to its original demo dataset.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Demo Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Leave Policies */}
      {activeTab === 'leave_policy' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Palmtree className="w-4.5 h-4.5 text-purple-600" />
                Leave Policy Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Set annual quotas and custom categories. Changes automatically update employee balances system-wide.
              </p>
            </div>

            {canEditPolicies && (
              <button
                type="button"
                onClick={handleAddPolicy}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition-all w-fit cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Leave Type
              </button>
            )}
          </div>

          {/* Leave Policies List */}
          <div className="space-y-3">
            {policies.map((policy) => {
              const colorMeta = COLOR_OPTIONS.find((c) => c.id === policy.colorTag) || COLOR_OPTIONS[0];

              return (
                <div
                  key={policy.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl shadow-xs transition-all"
                >
                  {/* Name & Badge Preview */}
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="relative">
                      {canEditPolicies && (
                        <select
                          value={policy.colorTag}
                          onChange={(e) => handleColorChange(policy.id, e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          title="Select Color Tag"
                        >
                          {COLOR_OPTIONS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <div
                        className={`w-7 h-7 rounded-xl ${colorMeta.bg} text-white flex items-center justify-center font-bold text-xs shadow-xs ${
                          canEditPolicies ? 'cursor-pointer ring-2 ring-white' : ''
                        }`}
                        title="Color Badge Tag"
                      >
                        •
                      </div>
                    </div>

                    <input
                      type="text"
                      disabled={!canEditPolicies}
                      value={policy.name}
                      onChange={(e) => handleNameChange(policy.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-85"
                      placeholder="Leave Type Name"
                    />
                  </div>

                  {/* Quota Input & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-500">Yearly Quota:</span>
                      <input
                        type="number"
                        disabled={!canEditPolicies}
                        min={0}
                        value={policy.yearlyQuota}
                        onChange={(e) => handleQuotaChange(policy.id, parseInt(e.target.value, 10) || 0)}
                        className="w-16 text-xs font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-85"
                      />
                      <span className="text-[11px] font-bold text-slate-500">days/yr</span>
                    </div>

                    {canEditPolicies && (
                      <button
                        type="button"
                        onClick={() => handleInitiateDelete(policy)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Leave Type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Footer inside Card */}
          {canEditPolicies && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Active categories: <strong className="text-slate-800">{policies.length}</strong></span>
              <button
                type="button"
                onClick={handleSavePolicies}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Apply Policy Updates
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: User Accounts */}
      {activeTab === 'user_accounts' && isSuperAdmin && (
        <div className="animate-fade-in">
          <UserAccountsView
            accounts={userAccounts}
            employees={employees}
            registrationRequests={registrationRequests}
            onCreateAccount={onCreateAccount || (() => {})}
            onUpdateAccount={onUpdateAccount || (() => {})}
            onDeleteAccount={onDeleteAccount || (() => {})}
            onAcceptRegistration={onAcceptRegistration}
            onRejectRegistration={onRejectRegistration}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      {/* TAB 4: Change Password */}
      {activeTab === 'change_password' && (
        <div className="animate-fade-in">
          <ChangePasswordCard
            currentUser={currentUser}
            userAccounts={userAccounts}
            onPasswordChanged={onPasswordChanged}
          />
        </div>
      )}

      {/* Delete Warning Modal */}
      {deleteWarningModal.isOpen && deleteWarningModal.policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <button
              onClick={() => setDeleteWarningModal({ isOpen: false, policy: null, affectedCount: 0, affectedNames: [] })}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Warning: Used Days Recorded</h4>
                <p className="text-xs text-slate-500">Confirm leave policy deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-extrabold text-rose-700">{deleteWarningModal.affectedCount} employee(s)</span>{' '}
              ({deleteWarningModal.affectedNames.slice(0, 3).join(', ')}
              {deleteWarningModal.affectedNames.length > 3 ? '...' : ''}) currently have recorded used days under{' '}
              <strong className="text-slate-900">{deleteWarningModal.policy.name}</strong>.
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200/80 p-3 rounded-2xl">
              Deleting this policy will remove it from all employee profile balance sheets. Are you sure you want to proceed?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteWarningModal({ isOpen: false, policy: null, affectedCount: 0, affectedNames: [] })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Demo Data Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Reset System to Demo Data?</h4>
                <p className="text-xs text-slate-500">Irreversible Local Cleanup</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              This action will <strong>permanently erase all local changes</strong> (newly created employees, attendance modifications, leave approvals, policy updates, and accounts) stored in this browser and revert to the default demo dataset.
            </p>
            <p className="text-xs text-rose-800 font-medium bg-rose-50 border border-rose-200/80 p-3 rounded-2xl">
              You will be automatically logged out and redirected back to the login screen.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  if (onResetToDemoData) onResetToDemoData();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm & Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


