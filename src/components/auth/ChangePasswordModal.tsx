import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ShieldCheck, X } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { UserAccount } from '../../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  userAccounts: UserAccount[];
  onPasswordChanged: (updatedUser: UserAccount) => void;
  authToken?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userAccounts,
  onPasswordChanged,
  authToken,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword.trim()) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try server API call first
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = authToken || localStorage.getItem('attendra_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let apiSuccess = false;
      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            currentPassword: currentPassword.trim(),
            newPassword: newPassword.trim(),
            userId: currentUser.id,
          }),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          apiSuccess = true;
        } else if (resData.message) {
          if (resData.message.toLowerCase().includes('incorrect')) {
            setErrorMsg('Current password is incorrect');
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err) {
        console.log('Server change password API unreachable, falling back to local verification', err);
      }

      // 2. Client-side / local storage fallback validation if API was not triggered or offline
      if (!apiSuccess) {
        // Find current user account in state
        const targetAcc = userAccounts.find((a) => a.id === currentUser.id || a.email.toLowerCase() === currentUser.email.toLowerCase()) || currentUser;

        let passwordValid = false;

        // Verify current password against stored passwordHash or plain password
        if (targetAcc.passwordHash) {
          try {
            passwordValid = bcrypt.compareSync(currentPassword.trim(), targetAcc.passwordHash);
          } catch {
            passwordValid = false;
          }
        } else if (targetAcc.password) {
          passwordValid = targetAcc.password === currentPassword.trim();
        } else {
          // Default initial passwords fallback check
          if (currentUser.role === 'super_admin' && (currentPassword === 'superadmin' || currentPassword === 'password123')) {
            passwordValid = true;
          } else if (currentUser.role === 'admin' && (currentPassword === 'admin' || currentPassword === 'password123')) {
            passwordValid = true;
          } else if (currentPassword === 'password123') {
            passwordValid = true;
          }
        }

        if (!passwordValid) {
          setErrorMsg('Current password is incorrect');
          setIsSubmitting(false);
          return;
        }
      }

      // Hash the new password securely
      const hashedNewPassword = bcrypt.hashSync(newPassword.trim(), 10);

      const updatedUser: UserAccount = {
        ...currentUser,
        passwordHash: hashedNewPassword,
      };

      // Notify parent to save updated password in state & localStorage
      onPasswordChanged(updatedUser);

      setSuccessMsg('Password updated successfully!');
      setErrorMsg('');

      // Clear input fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setIsSubmitting(false);
        handleClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Change Account Password</h3>
              <p className="text-xs text-slate-500">Update security credentials for {currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Chip */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">{currentUser.email}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Current Password */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: New Password */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters long.</p>
          </div>

          {/* Field 3: Confirm New Password */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
