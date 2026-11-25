import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle, LogOut } from 'lucide-react';
import { UserAccount } from '../../types';
import { api, setAuthToken } from '../../services/api';

interface Props {
  currentUser: UserAccount;
  onDone: (account: UserAccount) => void;
  onLogout: () => void;
}

/** Shown after signing in with a temporary password: a new password is required before continuing. */
export const ForcePasswordChangeView: React.FC<Props> = ({ currentUser, onDone, onLogout }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('Your new password must be at least 8 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    if (next === current) return setError('Please choose a password different from the temporary one.');
    setBusy(true);
    try {
      const res = await api.changePassword(current, next);
      setAuthToken(res.token);
      onDone(res.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Choose a new password</h1>
            <p className="text-xs text-slate-500">Hi {currentUser.name}, you signed in with a temporary password.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold text-slate-700">Temporary password (from your email)</span>
          <input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} className={`${input} mt-1`} autoComplete="current-password" required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">New password</span>
          <input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} className={`${input} mt-1`} autoComplete="new-password" minLength={8} required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">Confirm new password</span>
          <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${input} mt-1`} autoComplete="new-password" required />
        </label>
        <button type="button" onClick={() => setShow(!show)} className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 cursor-pointer">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {show ? 'Hide' : 'Show'} passwords
        </button>

        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/20 disabled:opacity-60 cursor-pointer">
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
        <button type="button" onClick={onLogout} className="w-full text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </form>
    </div>
  );
};
