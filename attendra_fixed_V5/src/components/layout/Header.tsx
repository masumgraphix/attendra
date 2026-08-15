import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Sparkles,
  UserCheck,
  Calendar,
  MapPin,
  X,
  Shield,
  Clock,
  User,
  ShieldCheck,
  LogOut,
  KeyRound,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { NotificationItem, NavSection, Employee, UserAccount } from '../../types';

interface HeaderProps {
  currentUser: UserAccount;
  onOpenClockInModal: () => void;
  onOpenAIInsights: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onSelectNotification?: (notification: NotificationItem) => void;
  employees: Employee[];
  onSelectEmployee: (employeeId: string) => void;
  onNavigate: (section: NavSection) => void;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenClockInModal,
  onOpenAIInsights,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSelectNotification,
  employees,
  onSelectEmployee,
  onNavigate,
  onLogout,
  onOpenChangePassword,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs for click-outside detection on the notification bell/panel,
  // the profile chip/dropdown, and the search box/results dropdown.
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close any open dropdown/panel when the user clicks outside of it,
  // or presses Escape. Previously these panels only toggled via the bell/
  // avatar button itself, so clicking anywhere else on the page left them
  // stuck open.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setShowSearchDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isEmployee = currentUser.role === 'employee';
  const isSuperAdmin = currentUser.role === 'super_admin';

  const matchedEmployees = employees.filter(
    (emp) =>
      (emp.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (emp.department || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (emp.id || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <header className="sticky top-4 my-4 mr-4 z-10 flex items-center justify-between gap-4 px-6 py-3.5 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Left: Greeting & Date */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isSuperAdmin
                ? 'Super Admin Workspace 👋'
                : isEmployee
                ? `Welcome back, ${currentUser.name} 👋`
                : 'Office Administrator Workspace 👋'}
            </h2>
            <span
              className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase border rounded-full ${
                isSuperAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isEmployee
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isSuperAdmin ? 'bg-purple-500' : isEmployee ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
              ></span>
              {isSuperAdmin ? 'Super Admin' : isEmployee ? 'Employee' : 'Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-slate-300">•</span>
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Headquarters</span>
          </p>
        </div>
      </div>

      {/* Center: Global Search Bar (Only for Admin & Super Admin) */}
      {!isEmployee ? (
        <div ref={searchBoxRef} className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee profile or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery.length > 0 && setShowSearchDropdown(true)}
              className="w-full pl-10 pr-10 py-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-2 z-50 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Click Employee To View Profile
              </div>
              {matchedEmployees.length > 0 ? (
                matchedEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      onSelectEmployee(emp.id);
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-blue-50/80 text-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-500">{emp.department} • {emp.id}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md">
                      View Profile
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-xs text-center text-slate-400">
                  No employees matching '{searchQuery}'
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="px-3 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-800 font-bold flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Personal Portal • ID: {currentUser.employeeId || 'EMP-SELF'}</span>
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Record Attendance Action Button */}
        <button
          onClick={onOpenClockInModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <UserCheck className="w-4 h-4 stroke-[2.2]" />
          <span>{isEmployee ? 'Punch Attendance' : 'Record Attendance'}</span>
        </button>

        {/* AI Workforce Insights Trigger (For Admin & Super Admin) */}
        {!isEmployee && (
          <button
            onClick={onOpenAIInsights}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-2xl transition-all cursor-pointer"
            title="Run AI Strategic Workforce Analysis"
          >
            <Sparkles className="w-4 h-4 text-purple-600 fill-purple-100" />
            <span className="hidden sm:inline">AI Insights</span>
          </button>
        )}

        {/* Notifications Button */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {unreadCount} Unread
                  </span>
                  {unreadCount > 0 && onMarkAllNotificationsRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAllNotificationsRead();
                      }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-2">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationRead(notif.id);
                        setShowNotifications(false);
                        if (onSelectNotification) {
                          onSelectNotification(notif);
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        notif.read ? 'opacity-60 hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-800">{notif.title}</span>
                        <span className="text-[10px] text-slate-400">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">No new notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Chip with Dropdown */}
        <div ref={profileMenuRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 transition-colors cursor-pointer"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-300"
            />
            <span className="hidden lg:inline">{currentUser.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-3 z-50 animate-fade-in space-y-2">
              {/* Profile Overview */}
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <p className="text-xs font-extrabold text-slate-900">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : isEmployee
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    {isSuperAdmin ? 'Super Admin' : isEmployee ? 'Employee' : 'Admin'}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1 pt-1">
                {onOpenChangePassword && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenChangePassword();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50/80 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Change Password</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Settings & Security</span>
                </button>

                <div className="border-t border-slate-100 pt-1 my-1" />

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

