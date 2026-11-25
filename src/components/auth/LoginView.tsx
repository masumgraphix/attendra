import React, { useState } from 'react';
import {
  Clock, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Building2, User, Phone, ArrowLeft, KeyRound, UserPlus, Sparkles,
} from 'lucide-react';
import { api, SessionResponse } from '../../services/api';

interface LoginViewProps {
  onSession: (session: SessionResponse, isNewCompany: boolean) => void | Promise<void>;
}

type Mode = 'login' | 'signup' | 'request';

const inputCls =
  'w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <label className="block">
    <span className="text-xs font-bold text-slate-700">{label}</span>
    <div className="relative mt-1">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      {children}
    </div>
  </label>
);

const ErrorBox: React.FC<{ msg: string }> = ({ msg }) =>
  msg ? (
    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2" role="alert">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{msg}</span>
    </div>
  ) : null;

export const LoginView: React.FC<LoginViewProps> = ({ onSession }) => {
  const initialMode: Mode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('signup') ? 'signup' : 'login';
  const initialCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('company') || '' : '';
  const [mode, setMode] = useState<Mode>(initialCode ? 'request' : initialMode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // request access
  const [companyCode, setCompanyCode] = useState(initialCode);
  const [companyFound, setCompanyFound] = useState<string>('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regSent, setRegSent] = useState('');

  // forgot password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'done'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
  };

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const session = await api.login(email.trim(), password);
      await onSession(session, false);
    });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    run(async () => {
      const session = await api.signup({ companyName: companyName.trim(), name: ownerName.trim(), email: email.trim(), password, phone: phone.trim() });
      await onSession(session, true);
    });
  };

  const checkCompanyCode = async () => {
    setCompanyFound('');
    if (!companyCode.trim()) return;
    try {
      const c = await api.lookupCompany(companyCode);
      setCompanyFound(c.name);
    } catch {
      setCompanyFound('');
      setError('No company found with this code. Please check with your HR admin.');
    }
  };

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await api.requestAccess({
        companyCode: companyCode.trim(),
        employeeName: regName.trim(),
        email: regEmail.trim(),
        employeeId: regEmployeeId.trim() || undefined,
        department: regDepartment.trim(),
        designation: regDesignation.trim(),
      });
      setRegSent(r.companyName);
    });
  };

  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotBusy(true);
    try {
      await api.forgotPassword(forgotEmail.trim());
      setForgotStep('code');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setForgotBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (resetPassword.length < 8) return setForgotError('Password must be at least 8 characters.');
    setForgotBusy(true);
    try {
      await api.resetPassword(forgotEmail.trim(), resetCode.trim(), resetPassword);
      setForgotStep('done');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setForgotBusy(false);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotStep('email');
    setResetCode('');
    setResetPassword('');
    setForgotError('');
  };

  const passwordInput = (autoComplete: string) => (
    <Field icon={<Lock className="w-4 h-4" />} label="Password">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
        autoComplete={autoComplete}
        className={`${inputCls} pr-10`}
        required
      />
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'}>
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </Field>
  );

  const submitBtn = (label: string) => (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/30 hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
    >
      {busy ? 'Please wait…' : label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-fuchsia-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">
            <Clock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Attendra</h1>
          <p className="text-xs text-slate-500 font-medium">
            {mode === 'login' && 'Attendance, leave & HR for your whole team'}
            {mode === 'signup' && 'Start your 14-day free trial — no card needed'}
            {mode === 'request' && 'Ask your company admin for access'}
          </p>
        </div>

        {mode !== 'request' && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button type="button" onClick={() => switchMode('login')} className={`py-2 rounded-xl transition cursor-pointer ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => switchMode('signup')} className={`py-2 rounded-xl transition cursor-pointer ${mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              Create company
            </button>
          </div>
        )}

        <ErrorBox msg={error} />

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field icon={<Mail className="w-4 h-4" />} label="Work email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="username" className={inputCls} required />
            </Field>
            {passwordInput('current-password')}
            <div className="flex justify-end">
              <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                Forgot password?
              </button>
            </div>
            {submitBtn('Sign in')}
            <button type="button" onClick={() => switchMode('request')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <UserPlus className="w-4 h-4" /> I'm an employee — request access
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <Field icon={<Building2 className="w-4 h-4" />} label="Company name">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Masum Graphix Ltd." className={inputCls} required />
            </Field>
            <Field icon={<User className="w-4 h-4" />} label="Your name">
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Full name" autoComplete="name" className={inputCls} required />
            </Field>
            <Field icon={<Mail className="w-4 h-4" />} label="Work email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" className={inputCls} required />
            </Field>
            <Field icon={<Phone className="w-4 h-4" />} label="Phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" autoComplete="tel" className={inputCls} />
            </Field>
            {passwordInput('new-password')}
            {submitBtn('Start free trial')}
            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> You become the Super Admin of your company.
            </p>
          </form>
        )}

        {mode === 'request' && !regSent && (
          <form onSubmit={handleRequest} className="space-y-4">
            <Field icon={<Building2 className="w-4 h-4" />} label="Company code (ask your HR admin)">
              <input
                value={companyCode}
                onChange={(e) => { setCompanyCode(e.target.value); setCompanyFound(''); }}
                onBlur={checkCompanyCode}
                placeholder="e.g. masum-graphix"
                className={inputCls}
                required
              />
            </Field>
            {companyFound && (
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 -mt-2">
                <CheckCircle2 className="w-4 h-4" /> {companyFound}
              </p>
            )}
            <Field icon={<User className="w-4 h-4" />} label="Your full name">
              <input value={regName} onChange={(e) => setRegName(e.target.value)} className={inputCls} autoComplete="name" required />
            </Field>
            <Field icon={<Mail className="w-4 h-4" />} label="Work email">
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} autoComplete="email" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={<Building2 className="w-4 h-4" />} label="Department">
                <input value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)} className={inputCls} />
              </Field>
              <Field icon={<User className="w-4 h-4" />} label="Designation">
                <input value={regDesignation} onChange={(e) => setRegDesignation(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field icon={<KeyRound className="w-4 h-4" />} label="Employee ID (optional)">
              <input value={regEmployeeId} onChange={(e) => setRegEmployeeId(e.target.value)} className={inputCls} />
            </Field>
            {submitBtn('Send request')}
            <button type="button" onClick={() => switchMode('login')} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          </form>
        )}

        {mode === 'request' && regSent && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-900">Request sent to {regSent}</p>
            <p className="text-xs text-slate-500">When an admin approves it, your login details will be emailed to <strong>{regEmail}</strong>.</p>
            <button type="button" onClick={() => { setRegSent(''); switchMode('login'); }} className="text-xs font-bold text-blue-600 cursor-pointer">
              Back to sign in
            </button>
          </div>
        )}
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">Reset your password</h2>
            <ErrorBox msg={forgotError} />
            {forgotStep === 'email' && (
              <form onSubmit={sendResetCode} className="space-y-4">
                <Field icon={<Mail className="w-4 h-4" />} label="Your account email">
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className={inputCls} required />
                </Field>
                <button type="submit" disabled={forgotBusy} className="w-full py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
                  {forgotBusy ? 'Sending…' : 'Send 6-digit code'}
                </button>
              </form>
            )}
            {forgotStep === 'code' && (
              <form onSubmit={submitReset} className="space-y-4">
                <p className="text-xs text-slate-500">If an account exists for <strong>{forgotEmail}</strong>, we emailed a 6-digit code. It expires in 15 minutes.</p>
                <Field icon={<KeyRound className="w-4 h-4" />} label="6-digit code">
                  <input inputMode="numeric" value={resetCode} onChange={(e) => setResetCode(e.target.value)} className={inputCls} maxLength={6} required />
                </Field>
                <Field icon={<Lock className="w-4 h-4" />} label="New password">
                  <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className={inputCls} autoComplete="new-password" minLength={8} required />
                </Field>
                <button type="submit" disabled={forgotBusy} className="w-full py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
                  {forgotBusy ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            )}
            {forgotStep === 'done' && (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Password updated</p>
                <p className="text-xs text-slate-500">You can sign in with your new password now.</p>
              </div>
            )}
            <button type="button" onClick={closeForgot} className="w-full text-xs font-bold text-slate-500 cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
