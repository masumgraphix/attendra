import React, { useState } from 'react';
import { X, Building2, Palette, UserCheck, Plus } from 'lucide-react';
import { Employee } from '../../types';

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDepartment: (deptData: {
    name: string;
    description?: string;
    headName?: string;
    headAvatar?: string;
    color: string;
  }) => void;
  employees: Employee[];
}

const COLOR_OPTIONS = [
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Sky Blue', hex: '#0284C7' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Rose', hex: '#E11D48' },
];

export const AddDepartmentModal: React.FC<AddDepartmentModalProps> = ({
  isOpen,
  onClose,
  onAddDepartment,
  employees,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a department name.');
      return;
    }

    const headEmp = employees.find((e) => e.id === selectedHeadId);

    onAddDepartment({
      name: name.trim(),
      description: description.trim(),
      headName: headEmp ? headEmp.name : 'Unassigned',
      headAvatar: headEmp ? headEmp.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      color: selectedColor,
    });

    // Reset and close
    setName('');
    setDescription('');
    setSelectedHeadId('');
    setSelectedColor(COLOR_OPTIONS[0].hex);
    setError('');
    onClose();
  };

  const activeEmployees = employees.filter((e) => e.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Add New Department</h3>
              <p className="text-xs text-slate-500">Create an organizational department entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Department Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Product Design, Customer Support"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of responsibilities or operations..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Department Head Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              Department Head <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={selectedHeadId}
              onChange={(e) => setSelectedHeadId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Auto-assign or Unassigned</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Color Tag Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    selectedColor === c.hex
                      ? 'scale-110 ring-2 ring-offset-2 ring-slate-800'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
