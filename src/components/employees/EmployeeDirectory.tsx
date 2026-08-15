import React, { useState } from 'react';
import { Employee, UserRole } from '../../types';
import { ChangeAvatarModal } from '../modals/ChangeAvatarModal';
import { api } from '../../services/api';
import {
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Grid,
  List,
  MoreVertical,
  ShieldCheck,
  ChevronRight,
  Camera,
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  UserX,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  employees: Employee[];
  currentUserRole?: UserRole;
  onSelectEmployee: (empId: string) => void;
  onAddEmployee: () => void;
  onUpdateAvatar?: (employeeId: string, newAvatarUrl: string) => void;
  onRefreshEmployees?: () => void;
  onDeactivateEmployee?: (empId: string) => Promise<void> | void;
  onDeleteEmployee?: (empId: string) => Promise<void> | void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  employees,
  currentUserRole,
  onSelectEmployee,
  onAddEmployee,
  onUpdateAvatar,
  onRefreshEmployees,
  onDeactivateEmployee,
  onDeleteEmployee,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [editingAvatarEmployee, setEditingAvatarEmployee] = useState<Employee | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [employeeToRemove, setEmployeeToRemove] = useState<Employee | null>(null);
  const [removeOption, setRemoveOption] = useState<'deactivate' | 'delete'>('deactivate');
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const handleConfirmRemove = async () => {
    if (!employeeToRemove) return;
    setIsSubmittingRemove(true);
    try {
      if (removeOption === 'deactivate') {
        if (onDeactivateEmployee) {
          await onDeactivateEmployee(employeeToRemove.id);
        }
      } else {
        if (onDeleteEmployee) {
          await onDeleteEmployee(employeeToRemove.id);
        }
      }
      setEmployeeToRemove(null);
    } catch (err) {
      console.error('Error removing employee:', err);
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  const handleCsvImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await api.importEmployeesCSV(csvText);
      setImportStatus({
        type: 'success',
        message: res.message || 'CSV successfully imported!',
      });
      if (onRefreshEmployees) onRefreshEmployees();
      setTimeout(() => {
        setShowImportModal(false);
        setCsvText('');
        setImportStatus(null);
      }, 2000);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: err.message || 'Failed to import CSV.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content) setCsvText(content);
      };
      reader.readAsText(file);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (emp.status === 'inactive') return false;
    const s = search.toLowerCase();
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(s) ||
      (emp.role || '').toLowerCase().includes(s) ||
      (emp.email || '').toLowerCase().includes(s);
    const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Employee Directory ({employees.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active workforce profiles, shift schedules, and emergency contacts
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-700"
          >
            <option value="all">All Departments</option>
            {Array.from(new Set(employees.map(e => e.department).concat([
              'Administration', 'Creative', 'Development', 'Research & Development', 'Logistics', 'Marketing', 'Engineering', 'Product Design', 'HR & People Ops', 'Finance'
            ]))).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Toggle View */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Employee Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            title="Import employees in bulk from CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Bulk CSV Import
          </button>

          <button
            onClick={onAddEmployee}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-sm shadow-blue-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => onSelectEmployee(emp.id)}
              className="group bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="relative group/avatar">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-4 ring-slate-100"
                    />
                    {onUpdateAvatar && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAvatarEmployee(emp);
                        }}
                        className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Change Photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        emp.status === 'active'
                          ? 'bg-emerald-500'
                          : emp.status === 'on_leave'
                          ? 'bg-purple-500'
                          : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      {emp.employmentType}
                    </span>
                    {isSuperAdmin && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === emp.id ? null : emp.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Employee Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenId === emp.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-1.5 animate-fadeIn text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                setRemoveOption('deactivate');
                                setEmployeeToRemove(emp);
                              }}
                              className="w-full text-left px-3.5 py-2 font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-colors"
                            >
                              <UserX className="w-4 h-4 text-amber-500" />
                              Deactivate Employee
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                setRemoveOption('delete');
                                setEmployeeToRemove(emp);
                              }}
                              className="w-full text-left px-3.5 py-2 font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              Permanently Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {emp.name}
                </h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{emp.designation || emp.role}</p>
                <p className="text-[11px] font-bold text-blue-600/80 mt-1">{emp.department}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>View Full Profile</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Role & Dept</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Work Shift</th>
                <th className="py-3.5 px-4">Leave Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onSelectEmployee(emp.id)}
                      className="flex items-center gap-3 text-left hover:opacity-80"
                    >
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{emp.designation || emp.role}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{emp.department}</p>
                  </td>
                  <td className="py-3.5 px-4">{emp.location}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">{emp.shift}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {emp.leaveBalance.annual}d Annual / {emp.leaveBalance.sick}d Sick
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onUpdateAvatar && (
                        <button
                          onClick={() => setEditingAvatarEmployee(emp)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                          title="Change Photo"
                        >
                          <Camera className="w-3 h-3 text-slate-500" />
                          Photo
                        </button>
                      )}
                      <button
                        onClick={() => onSelectEmployee(emp.id)}
                        className="px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Profile
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoveOption('deactivate');
                            setEmployeeToRemove(emp);
                          }}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                          title="Deactivate / Remove Employee"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingAvatarEmployee && onUpdateAvatar && (
        <ChangeAvatarModal
          isOpen={Boolean(editingAvatarEmployee)}
          onClose={() => setEditingAvatarEmployee(null)}
          employee={editingAvatarEmployee}
          onUpdateAvatar={onUpdateAvatar}
        />
      )}

      {/* CSV Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Bulk Employee CSV Import</h3>
                  <p className="text-xs text-slate-500">Import multiple employee records simultaneously into PostgreSQL</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCsvImportSubmit} className="mt-4 space-y-4">
              {importStatus && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Or Paste CSV Data Directly</label>
                  <button
                    type="button"
                    onClick={() =>
                      setCsvText(
                        `id,name,role,department,manager_id,email,phone,status,join_date,salary\nDG-2001,Ayesha Khan,Software Engineer,Engineering,DG-1001,ayesha@attendra.io,+880 1711-200001,active,2026-02-01,95000\nDG-2002,Tanvir Ahmed,Product Designer,Design,DG-1001,tanvir@attendra.io,+880 1711-200002,active,2026-02-01,80000`
                      )
                    }
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Load Sample Template
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="id,name,role,department,manager_id,email,phone,status,join_date,salary&#10;DG-2001,Ayesha Khan,Software Engineer,Engineering,DG-1001,ayesha@attendra.io,+880 1711-200001,active,2026-02-01,95000"
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !csvText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl shadow-sm flex items-center gap-1.5"
                >
                  {isImporting ? 'Importing...' : 'Import Employees'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove / Deactivate Employee Confirmation Modal */}
      {employeeToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${removeOption === 'deactivate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  {removeOption === 'deactivate' ? <UserX className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Remove Employee Profile</h3>
                  <p className="text-xs text-slate-500 font-medium">Select removal scope for this account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmployeeToRemove(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Employee Summary Card */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={employeeToRemove.avatar}
                alt={employeeToRemove.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-white"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">{employeeToRemove.name}</h4>
                <p className="text-[11px] text-slate-500 truncate">{employeeToRemove.role} • {employeeToRemove.department}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{employeeToRemove.email}</p>
              </div>
            </div>

            {/* Action Option Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Select Action:
              </label>

              {/* Option (a) Deactivate */}
              <div
                onClick={() => setRemoveOption('deactivate')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  removeOption === 'deactivate'
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                }`}
              >
                <input
                  type="radio"
                  name="removeOpt"
                  checked={removeOption === 'deactivate'}
                  onChange={() => setRemoveOption('deactivate')}
                  className="mt-0.5 accent-amber-600 cursor-pointer"
                />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    (a) Deactivate Employee (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Hides profile from Employee Directory and revokes portal login immediately. Attendance logs, leave records, and salary history are permanently preserved for audit compliance.
                  </p>
                </div>
              </div>

              {/* Option (b) Permanently Delete */}
              <div
                onClick={() => setRemoveOption('delete')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  removeOption === 'delete'
                    ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                }`}
              >
                <input
                  type="radio"
                  name="removeOpt"
                  checked={removeOption === 'delete'}
                  onChange={() => setRemoveOption('delete')}
                  className="mt-0.5 accent-rose-600 cursor-pointer"
                />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    (b) Permanently Delete
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Completely removes employee profile and login account from the database. Use only for accidental entries or test profiles.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmployeeToRemove(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRemove}
                onClick={handleConfirmRemove}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  removeOption === 'deactivate'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                {isSubmittingRemove ? (
                  'Processing...'
                ) : removeOption === 'deactivate' ? (
                  <>
                    <UserX className="w-4 h-4" />
                    Deactivate Employee
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
