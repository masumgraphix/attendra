import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { EmploymentType } from '../../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (employee: any) => Promise<void> | void;
}

const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
];

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Development');
  const [email, setEmail] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const randomAvatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
      await onAddEmployee({
        id: `DG-${Math.floor(1000 + Math.random() * 9000)}`,
        name,
        role,
        department,
        email,
        phone: '+880 1711-000000',
        avatar: randomAvatar,
        status: 'active',
        employmentType,
        location: 'San Francisco, CA (HQ)',
        joinDate: new Date().toISOString().split('T')[0],
        shift: 'General Day (08:30 - 17:30)',
        leaveBalance: {
          annual: 18,
          sick: 10,
          casual: 5,
          emergency: 3,
          unpaid: 10,
          maternity: 90,
          paternity: 12,
          half_day: 6,
        },
        manager: 'Executive Desk',
      });
      // reset form
      setName('');
      setRole('');
      setEmail('');
      onClose();
    } catch (err) {
      console.error('Error submitting new employee:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Onboard New Team Member</h3>
            <p className="text-xs text-slate-500">Assign work shift and grant Attendra access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex Rivera"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Role Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Systems Engineer"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
              >
                <option value="Administration">Administration</option>
                <option value="Creative">Creative</option>
                <option value="Development">Development</option>
                <option value="Research & Development">Research & Development</option>
                <option value="Logistics">Logistics</option>
                <option value="Marketing">Marketing</option>
                <option value="Engineering">Engineering</option>
                <option value="Product Design">Product Design</option>
                <option value="HR & People Ops">HR & People Ops</option>
                <option value="Finance">Finance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Work Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
              >
                <option value="full_time">Full-Time Office</option>
                <option value="hybrid">Hybrid Work</option>
                <option value="remote">Full Remote</option>
                <option value="contract">Contractor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Corporate Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.rivera@attendra.io"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                'Create Employee Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
