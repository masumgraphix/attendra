import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RegistrationRequest } from '../../types';
import { UserPlus, Check, X, Clock, Mail, IdCard, ShieldCheck, Sparkles, Send, Lock } from 'lucide-react';

interface PendingJoinRequestsCardProps {
  requests: RegistrationRequest[];
  onApprove: (
    request: RegistrationRequest,
    generatedPassword?: string
  ) => void | Promise<{ emailSent: boolean; emailSimulated: boolean } | void>;
  onReject: (requestId: string) => void;
  onViewAllRequests?: () => void;
}

export const PendingJoinRequestsCard: React.FC<PendingJoinRequestsCardProps> = ({
  requests = [],
  onApprove,
  onReject,
  onViewAllRequests,
}) => {
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const [selectedReqToApprove, setSelectedReqToApprove] = useState<RegistrationRequest | null>(null);
  const [generatedPass, setGeneratedPass] = useState<string>('');
  const [isApprovedSuccess, setIsApprovedSuccess] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [emailResult, setEmailResult] = useState<{ emailSent: boolean; emailSimulated: boolean } | null>(null);

  const handleOpenApproveModal = (req: RegistrationRequest) => {
    // Generate random strong password: Pass-XXXXXX#
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPass = `Pass-${rand}#`;
    setGeneratedPass(tempPass);
    setSelectedReqToApprove(req);
    setIsApprovedSuccess(false);
    setEmailResult(null);
  };

  const handleConfirmApproval = async () => {
    if (!selectedReqToApprove) return;
    setIsApproving(true);
    try {
      const result = await onApprove(selectedReqToApprove, generatedPass);
      setEmailResult(result || null);
    } catch {
      setEmailResult(null);
    } finally {
      setIsApproving(false);
      setIsApprovedSuccess(true);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Pending Join Requests
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white shadow-xs">
                  {pendingRequests.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">Employee account access requests awaiting Super Admin/Admin approval</p>
          </div>
        </div>

        {onViewAllRequests && (
          <button
            onClick={onViewAllRequests}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Manage Accounts →
          </button>
        )}
      </div>

      {pendingRequests.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-extrabold text-slate-800">No Pending Requests</p>
          <p className="text-[11px] text-slate-400">All account requests have been processed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900">{req.employeeName}</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-md">
                    Pending
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-mono">
                  <span className="flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                    <IdCard className="w-3 h-3" />
                    {req.employeeId || 'ID Pending'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {req.email}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">{req.department || 'General'}</span>
                  <span>•</span>
                  <span>{req.designation || 'Employee'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-2.5 h-2.5" />
                    Submitted: {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                <button
                  type="button"
                  onClick={() => handleOpenApproveModal(req)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => onReject(req.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Request Modal — rendered via portal so it isn't trapped inside
          this card's `backdrop-blur` container, which creates its own CSS
          containing block and breaks `position: fixed` centering. */}
      {selectedReqToApprove && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedReqToApprove(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Approve Account Access</h3>
                <p className="text-[11px] text-slate-500">Auto-Generate Credentials & Activate Profile</p>
              </div>
            </div>

            {!isApprovedSuccess ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Employee Name:</span>
                    <span className="font-extrabold text-slate-900">{selectedReqToApprove.employeeName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="font-mono font-bold text-purple-700">{selectedReqToApprove.employeeId || 'Generated'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-800">{selectedReqToApprove.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dept & Role:</span>
                    <span className="font-semibold text-slate-700">{selectedReqToApprove.department || 'General'} • {selectedReqToApprove.designation || 'Staff'}</span>
                  </div>
                  {selectedReqToApprove.dob && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Date of Birth:</span>
                      <span className="font-medium text-slate-800">{selectedReqToApprove.dob}</span>
                    </div>
                  )}
                  {selectedReqToApprove.nidNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">NID Number:</span>
                      <span className="font-mono text-slate-800">{selectedReqToApprove.nidNumber}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Temporary Password Dispatch</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Upon approval, a temporary password will be securely dispatched to <strong className="text-emerald-950 font-mono">{selectedReqToApprove.email}</strong>.
                  </p>
                  <p className="text-[10px] text-emerald-700 italic">
                    For privacy and data security, temporary passwords are sent directly to the employee's email and not displayed in plain text.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedReqToApprove(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApproval}
                    disabled={isApproving}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isApproving ? 'Activating…' : 'Confirm & Activate Account'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-3 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-slate-900">Registration Request Approved</h4>
                  {emailResult?.emailSent ? (
                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-left text-xs text-emerald-900 leading-relaxed font-medium">
                      Account approved. Temporary password has been emailed to <strong className="font-mono font-bold text-emerald-950">{selectedReqToApprove.email}</strong>.
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 leading-relaxed font-medium">
                      Account approved and activated, but the welcome email <strong>could not be confirmed as delivered</strong> to <strong className="font-mono font-bold text-amber-950">{selectedReqToApprove.email}</strong>.
                      {emailResult?.emailSimulated && ' (Email sending isn\u2019t configured on this server yet.)'}
                      {' '}Please share the temporary password below with the employee manually:
                      <div className="mt-2 font-mono text-sm font-bold text-amber-950 bg-white/70 border border-amber-200 rounded-lg px-2 py-1 inline-block">
                        {generatedPass}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl text-left font-mono text-xs space-y-1">
                  <p className="text-slate-400">Employee: <span className="text-white font-bold">{selectedReqToApprove.employeeName}</span></p>
                  <p className="text-slate-400">Email: <span className="text-white font-bold">{selectedReqToApprove.email}</span></p>
                  <p className="text-slate-400">Status: <span className="text-emerald-400 font-bold">Active</span></p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReqToApprove(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
