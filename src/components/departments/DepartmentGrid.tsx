import React, { useState } from 'react';
import { Department, Employee, AttendanceRecord, UserRole } from '../../types';
import { Building2, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AddDepartmentModal } from '../modals/AddDepartmentModal';

interface DepartmentGridProps {
  departments: Department[];
  employees: Employee[];
  attendanceRecords?: AttendanceRecord[];
  currentUserRole?: UserRole;
  onAddDepartment?: (deptData: {
    name: string;
    description?: string;
    headName?: string;
    headAvatar?: string;
    color: string;
  }) => void;
  onDeleteDepartment?: (deptIdOrName: string) => void;
}

export const DepartmentGrid: React.FC<DepartmentGridProps> = ({
  departments,
  employees,
  attendanceRecords = [],
  currentUserRole = 'employee',
  onAddDepartment,
  onDeleteDepartment,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteWarningModal, setDeleteWarningModal] = useState<{
    isOpen: boolean;
    deptName: string;
    employeeCount: number;
    sampleEmployees: string[];
  }>({
    isOpen: false,
    deptName: '',
    employeeCount: 0,
    sampleEmployees: [],
  });

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    deptId: string;
    deptName: string;
  }>({
    isOpen: false,
    deptId: '',
    deptName: '',
  });

  // Calculate dynamic stats for each department based on REAL active employees & attendance records
  const processedDepartments = departments.map((dept) => {
    // 1. Active employees in this department
    const deptActiveEmployees = employees.filter(
      (e) =>
        e.status === 'active' &&
        e.department &&
        e.department.trim().toLowerCase() === dept.name.trim().toLowerCase()
    );

    const headcount = deptActiveEmployees.length;

    // 2. Department Lead
    let headName = dept.headName;
    let headAvatar = dept.headAvatar;

    if (deptActiveEmployees.length > 0) {
      // Find employee with lead/manager/head role or designation
      const leadEmp = deptActiveEmployees.find((e) => {
        const r = (e.role || '').toLowerCase();
        const d = (e.designation || '').toLowerCase();
        return (
          r.includes('manager') ||
          r.includes('head') ||
          r.includes('lead') ||
          r.includes('director') ||
          d.includes('manager') ||
          d.includes('head') ||
          d.includes('lead') ||
          d.includes('director')
        );
      });

      const primaryEmp = leadEmp || deptActiveEmployees[0];
      headName = primaryEmp.name;
      headAvatar = primaryEmp.avatar;
    } else {
      // No real active employees in this department — never show a stale/orphaned
      // head name left over from a deleted employee. Always show 'Unassigned'
      // unless the department itself is brand new with no employees ever assigned.
      headName = 'Unassigned';
      headAvatar =
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
    }

    // 3. Real attendance records for this department
    const activeEmpIds = new Set(deptActiveEmployees.map((e) => e.id));
    const deptRecords = attendanceRecords.filter(
      (r) =>
        activeEmpIds.has(r.employeeId) ||
        (r.department && r.department.trim().toLowerCase() === dept.name.trim().toLowerCase())
    );

    let attendanceRate = 0;
    let onTimeRate = 0;
    let avgHours = 0;

    if (deptRecords.length > 0) {
      const presentOrGraceCount = deptRecords.filter(
        (r) => r.status === 'present' || r.status === 'grace_period' || r.status === 'wfh' || r.status === 'official_tour'
      ).length;

      attendanceRate = Math.round((presentOrGraceCount / deptRecords.length) * 100);

      const strictlyOnTimeCount = deptRecords.filter(
        (r) => r.status === 'present' || r.status === 'grace_period'
      ).length;

      onTimeRate = Math.round((strictlyOnTimeCount / deptRecords.length) * 100);

      const validHoursRecords = deptRecords.filter((r) => r.workHours && r.workHours > 0);
      if (validHoursRecords.length > 0) {
        const totalHrs = validHoursRecords.reduce((sum, r) => sum + (Number(r.workHours) || 0), 0);
        avgHours = parseFloat((totalHrs / validHoursRecords.length).toFixed(1));
      }
    }

    return {
      ...dept,
      headName,
      headAvatar,
      headcount,
      attendanceRate,
      onTimeRate,
      avgHours,
      color: dept.color || '#2563EB',
    };
  });

  const handleDeleteClick = (dept: Department, headcount: number) => {
    const deptActiveEmployees = employees.filter(
      (e) =>
        e.status === 'active' &&
        e.department &&
        e.department.trim().toLowerCase() === dept.name.trim().toLowerCase()
    );

    if (deptActiveEmployees.length > 0) {
      // Cannot delete - show warning
      setDeleteWarningModal({
        isOpen: true,
        deptName: dept.name,
        employeeCount: deptActiveEmployees.length,
        sampleEmployees: deptActiveEmployees.slice(0, 3).map((e) => e.name),
      });
    } else {
      // 0 employees - confirm deletion
      setConfirmDeleteModal({
        isOpen: true,
        deptId: dept.id,
        deptName: dept.name,
      });
    }
  };

  const isSuperAdmin = currentUserRole === 'super_admin';
  const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Enterprise Departments
            <span className="px-2.5 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-full">
              {processedDepartments.length} Active
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time headcount, attendance compliance, and leadership overviews
          </p>
        </div>

        {isAdmin && onAddDepartment && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Grid */}
      {processedDepartments.length === 0 ? (
        <div className="bg-white/80 border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800">No Departments Found</h4>
          <p className="text-xs text-slate-500">
            Departments will appear automatically when employees or approved registration requests are added, or click "Add Department" above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {processedDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group"
            >
              {/* Header card info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: dept.color }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 line-clamp-1">{dept.name}</h4>
                    <p className="text-[11px] font-semibold text-slate-400">{dept.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-full">
                    {dept.headcount} {dept.headcount === 1 ? 'Member' : 'Members'}
                  </span>

                  {/* Super Admin Delete Button */}
                  {isSuperAdmin && onDeleteDepartment && (
                    <button
                      onClick={() => handleDeleteClick(dept, dept.headcount)}
                      title="Delete Department (Super Admin)"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Department Lead */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3 mb-4">
                <img
                  src={dept.headAvatar}
                  alt={dept.headName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Department Lead
                  </p>
                  <p className="text-xs font-bold text-slate-800 truncate">{dept.headName}</p>
                </div>
              </div>

              {/* Attendance Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Attendance Rate</span>
                  <span className="text-slate-900">{dept.attendanceRate}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${dept.attendanceRate}%`, backgroundColor: dept.color }}
                  />
                </div>
              </div>

              {/* Metrics footer */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-medium text-slate-400">On-Time Checkins</p>
                  <p className="font-extrabold text-slate-900">{dept.onTimeRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">Avg Work Hours</p>
                  <p className="font-extrabold text-slate-900">{dept.avgHours} hrs/day</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      {onAddDepartment && (
        <AddDepartmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddDepartment={onAddDepartment}
          employees={employees}
        />
      )}

      {/* Delete Warning Modal (When department has active employees) */}
      {deleteWarningModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Cannot Delete Department
              </h3>
              <p className="text-xs text-slate-600">
                The department <strong className="text-slate-900">"{deleteWarningModal.deptName}"</strong> cannot be deleted because it currently has{' '}
                <strong className="text-amber-700">{deleteWarningModal.employeeCount} active employee(s)</strong> assigned to it.
              </p>
            </div>

            {deleteWarningModal.sampleEmployees.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-700">Assigned Employees:</p>
                <p>{deleteWarningModal.sampleEmployees.join(', ')}{deleteWarningModal.employeeCount > 3 ? '...' : ''}</p>
                <p className="text-[11px] text-slate-400 mt-1">Please reassign or delete these employees before removing this department.</p>
              </div>
            )}

            <button
              onClick={() =>
                setDeleteWarningModal({
                  isOpen: false,
                  deptName: '',
                  employeeCount: 0,
                  sampleEmployees: [],
                })
              }
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal (When department has 0 active employees) */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Department?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete <strong className="text-slate-900">"{confirmDeleteModal.deptName}"</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteModal({ isOpen: false, deptId: '', deptName: '' })}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteDepartment) {
                    onDeleteDepartment(confirmDeleteModal.deptId);
                  }
                  setConfirmDeleteModal({ isOpen: false, deptId: '', deptName: '' });
                }}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
