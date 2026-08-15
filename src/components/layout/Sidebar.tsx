import React from 'react';
import { NavSection, UserAccount, UserRole } from '../../types';
import {
  LayoutDashboard,
  Clock,
  Users,
  CalendarDays,
  Building2,
  Calendar,
  FileSpreadsheet,
  BarChart3,
  Palmtree,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  Shield,
  User,
  ShieldAlert,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingLeavesCount: number;
  currentUser: UserAccount;
  onLogout: () => void;
  // Mobile drawer control. On desktop (lg and up) the sidebar always
  // renders normally regardless of these — they only affect the
  // off-canvas behavior below the lg breakpoint.
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  pendingLeavesCount,
  currentUser,
  onLogout,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const role = currentUser.role;

  let menuItems: { id: NavSection; label: string; icon: React.FC<{ className?: string }>; badge?: number | string }[] = [];

  if (role === 'employee') {
    menuItems = [
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'My Attendance', icon: Clock },
      { id: 'leave', label: 'My Leave', icon: CalendarDays },
      { id: 'employees', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  } else if (role === 'admin') {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'leave', label: 'Leave', icon: CalendarDays, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined },
      { id: 'departments', label: 'Departments', icon: Building2 },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
      { id: 'analytics', label: 'Analytics & AI', icon: BarChart3, badge: 'AI' },
      { id: 'holidays', label: 'Holidays', icon: Palmtree },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  } else {
    // Super Admin
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'leave', label: 'Leave', icon: CalendarDays, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined },
      { id: 'departments', label: 'Departments', icon: Building2 },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
      { id: 'analytics', label: 'Analytics & AI', icon: BarChart3, badge: 'AI' },
      { id: 'holidays', label: 'Holidays', icon: Palmtree },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    ];
  }

  let roleBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let roleLabel = 'Employee';
  if (role === 'super_admin') {
    roleBadgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
    roleLabel = 'Super Admin';
  } else if (role === 'admin') {
    roleBadgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
    roleLabel = 'Admin';
  }

  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    // Selecting a page from the mobile drawer should close it, same as
    // tapping a link in any standard mobile nav.
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile-only dim backdrop behind the drawer. Hidden entirely on
          desktop (lg+) and hidden on mobile whenever the drawer is closed,
          so it never intercepts clicks when not needed. */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 h-[calc(100vh-2rem)] flex flex-col justify-between bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 ease-out z-40
          fixed top-4 left-4
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'}
          lg:translate-x-0 lg:sticky lg:top-4 lg:left-auto lg:my-4 lg:ml-4 lg:z-20`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-3 py-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
                <Clock className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">Attendra</h1>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-600">Enterprise HR Suite</p>
              </div>
            </div>
            {/* Close button — only ever visible on mobile since the drawer
                is permanently open (and un-closeable) on desktop. */}
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {role === 'employee' ? 'Personal Portal' : 'Main Navigation'}
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'AI'
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                <span className={`inline-block px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

