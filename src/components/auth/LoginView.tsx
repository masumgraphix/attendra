import React, { useState } from 'react';
import { UserAccount, Employee, RegistrationRequest } from '../../types';
import {
  Clock,
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  UserPlus,
  BadgeCheck,
  X,
  FileCheck2,
} from 'lucide-react';

interface LoginViewProps {
  accounts: UserAccount[];
  employees: Employee[];
  registrationRequests: RegistrationRequest[];
  onLoginSuccess: (account: UserAccount, token?: string) => void;
  onRequestRegistration: (req: {
    employeeName: string;
    employeeId: string;
    email: string;
    department: string;
    designation: string;
    dob: string;
    nidNumber: string;
    requestedRole: 'employee';
  }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  accounts = [],
  employees = [],
  registrationRequests = [],
  onLoginSuccess,
  onRequestRegistration,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'done'>('email');
  const [forgotError, setForgotError] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  // Registration Request Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regDesignation, setRegDesignation] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regNidNumber, setRegNidNumber] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  /**
   * PROTOTYPE AUTHENTICATION WARNING:
   * Client-side auth and mock account records are designed for local prototyping/previews ONLY.
   * In a production application, passwords must NEVER be validated or stored in client JS bundles.
   * Authentication MUST be performed against a secure backend service using salted password hashes
   * (e.g., bcrypt/argon2) with HTTP-only session tokens or JWTs.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your work email.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMsg(result.message || 'Authentication failed. Please check your credentials.');
        return;
      }

      if (result.token) {
        localStorage.setItem('attendra_auth_token', result.token);
      }

      onLoginSuccess(result.account, result.token);
    } catch {
      // Offline fallback verification (clears raw password string before passing account)
      const account = accounts.find(
        (acc) => (acc.email || '').toLowerCase() === email.trim().toLowerCase()
      );

      if (!account) {
        setErrorMsg('Account not found. Please check your email or request account access below.');
        return;
      }

      if (account.status === 'inactive') {
        setErrorMsg('This account has been deactivated by Super Admin. Please contact HR.');
        return;
      }

      if (account.password && account.password !== password.trim()) {
        setErrorMsg('Incorrect password. Please verify your credentials or reset password.');
        return;
      }

      const { password: _p, ...safeAccount } = account;
      onLoginSuccess(safeAccount as UserAccount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (quickAcc: UserAccount) => {
    setEmail(quickAcc.email);
    setPassword(quickAcc.password || 'password123');
    setErrorMsg('');
    const { password: _p, ...safeAcc } = quickAcc;
    onLoginSuccess(safeAcc as UserAccount);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotError('');
    setIsSendingForgot(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.message || 'Failed to send verification code.');
        return;
      }
      setForgotStep('code');
    } catch {
      setForgotError('Network error. Unable to send verification email.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleResetPasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newResetPassword.trim()) {
      setForgotError('Please enter both the verification code and your new password.');
      return;
    }
    setForgotError('');
    setIsSendingForgot(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: resetCode.trim(),
          newPassword: newResetPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.message || 'Failed to reset password. Please check your verification code.');
        return;
      }
      setForgotStep('done');
    } catch {
      setForgotError('Network error. Unable to complete password reset.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regEmail.trim() || !regEmployeeId.trim() || !regDesignation.trim() || !regDob.trim() || !regNidNumber.trim()) {
      setRegError('Please fill in all required fields including Employee ID, Date of Birth, and NID Number.');
      return;
    }

    let formattedEmpId = regEmployeeId.trim();
    if (/^\d+$/.test(formattedEmpId)) {
      formattedEmpId = `DG-${formattedEmpId}`;
    }

    // Check if account already exists
    const existingAccount = accounts.find(
      (a) => (a.email || '').toLowerCase() === regEmail.trim().toLowerCase()
    );
    if (existingAccount) {
      setRegError(`An account with email "${regEmail.trim()}" is already active. Please sign in directly.`);
      return;
    }

    // Check if request is already pending
    const existingPending = registrationRequests.find(
      (r) => (r.email || '').toLowerCase() === regEmail.trim().toLowerCase() && r.status === 'pending'
    );
    if (existingPending) {
      setRegError(`A registration request for "${regEmail.trim()}" is already pending Super Admin approval.`);
      return;
    }

    onRequestRegistration({
      employeeName: regName.trim(),
      employeeId: formattedEmpId,
      email: regEmail.trim(),
      department: regDepartment,
      designation: regDesignation.trim(),
      dob: regDob,
      nidNumber: regNidNumber.trim(),
      requestedRole: 'employee',
    });

    setRegSuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <Clock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Attendra</h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-blue-100 text-blue-700 rounded-md">
              Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Role-Based Attendance & HR Governance System
          </p>
        </div>

        {/* Quick Switch Test Bar (Internal Testing Only - Disabled in Production) */}
        {import.meta.env.VITE_SHOW_DEMO_LOGIN === 'true' && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
              <span className="flex items-center gap-1 text-purple-700">
                <Sparkles className="w-3.5 h-3.5" />
                Demo Login
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Internal Mode</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {accounts.map((acc) => {
                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                let roleLabel = 'Employee';
                if (acc.role === 'super_admin') {
                  badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                  roleLabel = 'Super Admin';
                } else if (acc.role === 'admin') {
                  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  roleLabel = 'Admin (HR)';
                }

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-xs transition-all text-left text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={acc.avatar} alt={acc.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            Login as {roleLabel}
                          </span>
                          <span className={`px-1.5 py-0.2 text-[8px] font-black rounded-md border shrink-0 ${badgeColor}`}>
                            {acc.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setResetCode('');
                  setNewResetPassword('');
                  setForgotError('');
                  setForgotStep('email');
                  setShowForgotPasswordModal(true);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to Attendra'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Employee Registration Request Action */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2 text-center">
          <p className="text-[11px] font-bold text-indigo-950">
            Have an Employee ID but no account yet?
          </p>
          <button
            type="button"
            onClick={() => {
              setRegName('');
              setRegEmail('');
              setRegDepartment('Engineering');
              setRegDesignation('');
              setRegError('');
              setRegSuccess(false);
              setShowRegisterModal(true);
            }}
            className="w-full py-2 px-3 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-extrabold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Request Account Access</span>
          </button>
        </div>

        <div className="text-center pt-1 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Protected by Attendra Role Governance Framework v2.4
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Reset Password</h3>
                <p className="text-[11px] text-slate-500">Attendra Security Desk</p>
              </div>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-800 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter your registered work email address below. A 6-digit verification code will be sent to your inbox via Resend.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. employee@company.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-60"
                  >
                    {isSendingForgot ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'code' && (
              <form onSubmit={handleResetPasswordConfirm} className="space-y-3">
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] text-blue-900 font-semibold">
                  A 6-digit code was sent to <strong>{forgotEmail}</strong>. Check your inbox and enter the code below along with your new password.
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">6-Digit Verification Code *</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. 849201"
                    maxLength={6}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 tracking-widest text-center"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">New Password *</label>
                  <input
                    type="password"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-60"
                  >
                    {isSendingForgot ? 'Updating Password...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'done' && (
              <div className="space-y-3 text-center py-2 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Password Reset Successful!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your password for <strong className="text-slate-800">{forgotEmail}</strong> has been updated. You can now log in to the portal with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(forgotEmail);
                    setPassword('');
                    setShowForgotPasswordModal(false);
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Employee Account Registration</h3>
                <p className="text-[11px] text-slate-500">Submit your details for Admin verification and account creation</p>
              </div>
            </div>

            {!regSuccess ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-start gap-2 text-xs text-rose-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-[11px] text-amber-900 space-y-1">
                  <span className="font-extrabold flex items-center gap-1 text-amber-900">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
                    Registration Process:
                  </span>
                  <p>
                    Enter your official Name, Work Email, Department, and Job Designation. Admin or Super Admin will review your request and approve your account.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Employee ID * (Format: DG-XXXX)</label>
                  <input
                    type="text"
                    value={regEmployeeId}
                    onChange={(e) => setRegEmployeeId(e.target.value)}
                    placeholder="e.g. DG-2204"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. john@company.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR/Administration">HR/Administration</option>
                      <option value="Finance & Accounts">Finance & Accounts</option>
                      <option value="Operations">Operations</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Legal">Legal</option>
                      <option value="IT">IT</option>
                      <option value="Research & Development">Research & Development</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Designation *</label>
                    <input
                      type="text"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">NID Number *</label>
                    <input
                      type="text"
                      value={regNidNumber}
                      onChange={(e) => setRegNidNumber(e.target.value)}
                      placeholder="e.g. 1992039401283"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                  >
                    Submit Request to Admin
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-center py-2 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Request Dispatched to Admin!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your registration request for <strong className="text-slate-900">{regName}</strong> has been received.
                </p>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left text-xs space-y-1 font-mono text-slate-700">
                  <p><strong>Name:</strong> {regName}</p>
                  <p><strong>Employee ID:</strong> {regEmployeeId}</p>
                  <p><strong>Work Email:</strong> {regEmail}</p>
                  <p><strong>Department:</strong> {regDepartment}</p>
                  <p><strong>Designation:</strong> {regDesignation}</p>
                  <p><strong>Date of Birth:</strong> {regDob}</p>
                  <p><strong>NID Number:</strong> {regNidNumber}</p>
                  <p><strong>Status:</strong> PENDING ADMIN APPROVAL</p>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Once Admin/Super Admin accepts your request, your employee profile will be added and credentials sent to <strong>{regEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

