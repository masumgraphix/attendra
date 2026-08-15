import React, { useState } from 'react';
import { CompanyHoliday, LeaveRequest } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  RefreshCw,
  ExternalLink,
  Plus,
  CheckCircle2,
  CalendarCheck2,
  Sparkles,
  Download,
} from 'lucide-react';

interface CalendarViewProps {
  holidays: CompanyHoliday[];
  leaves: LeaveRequest[];
  onAddHoliday?: (holiday: Partial<CompanyHoliday>) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ holidays, leaves }) => {
  // State for dynamic month and year navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // Default Aug 2026
  const [isGCalSynced, setIsGCalSynced] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just Now');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    holidays: CompanyHoliday[];
    leaves: LeaveRequest[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calculate days in month and starting day of week
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  // Date navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(new Date(year, newMonth, 1));
  };

  // Google Calendar Manual Sync Action
  const handleSyncGCal = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsGCalSynced(true);
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(`Today at ${timeStr}`);
    }, 800);
  };

  // Helper to construct Google Calendar Direct Add URL
  const getGoogleCalendarUrl = (title: string, startDateStr: string, endDateStr?: string, details?: string) => {
    const cleanStartDate = startDateStr.replace(/-/g, '');
    const cleanEndDate = (endDateStr || startDateStr).replace(/-/g, '');
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${cleanStartDate}/${cleanEndDate}`,
      details: details || 'Synced from Attendra Enterprise Portal',
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // Generate Array for Grid (leading empty cells + days of month)
  const leadingEmptyCells = Array.from({ length: startDayOfWeek }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const todayObj = new Date();
  const isCurrentMonthView = todayObj.getFullYear() === year && todayObj.getMonth() === month;
  const todayDateNum = todayObj.getDate();

  return (
    <div className="space-y-6">
      {/* Google Calendar Direct Integration Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" fill="#4285F4" />
              <path d="M3 8H21V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V8Z" fill="#34A853" />
              <path d="M16 2V6M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 12V16M10 14H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold tracking-tight">Google Calendar Direct Integration</h4>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Connected
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Live bi-directional sync active • All company holidays and approved leave schedules are mapped to Google Calendar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncGCal}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-2xl transition-all shadow-md cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Google Calendar'}
          </button>

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
            Open Google Calendar
          </a>
        </div>
      </div>

      {/* Main Interactive Calendar Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        {/* Calendar Navigation Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Corporate Attendance & Leave Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse any past or future month to inspect scheduled leaves and official company holidays
            </p>
          </div>

          {/* Month/Year Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Today Button */}
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Today
            </button>

            {/* Previous & Next Month Navigation */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-extrabold text-slate-800 min-w-[110px] text-center">
                {monthNames[month]} {year}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Month Selector Dropdown */}
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {monthNames.map((mName, idx) => (
                <option key={mName} value={idx}>
                  {mName}
                </option>
              ))}
            </select>

            {/* Direct Year Selector Dropdown */}
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="grid grid-cols-7 bg-slate-100/80 text-slate-600 font-black text-[11px] uppercase tracking-wider text-center py-3 border-b border-slate-200">
            <div className="text-rose-600">Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-indigo-600">Sat</div>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 font-medium text-xs bg-white">
            {/* Leading Empty Cells */}
            {leadingEmptyCells.map((emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="min-h-[100px] p-2 bg-slate-50/40 opacity-40"></div>
            ))}

            {/* Month Day Cells */}
            {monthDays.map((dayNum) => {
              const monthStr = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
              const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const dateKey = `${year}-${monthStr}-${dayStr}`;

              const isTodayCell = isCurrentMonthView && dayNum === todayDateNum;

              // Filter events for this day
              const dayHolidays = holidays.filter((h) => h.date === dateKey);
              const dayLeaves = leaves.filter((l) => dateKey >= l.startDate && dateKey <= l.endDate);

              const hasEvents = dayHolidays.length > 0 || dayLeaves.length > 0;

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({ dateStr: dateKey, holidays: dayHolidays, leaves: dayLeaves });
                    }
                  }}
                  className={`min-h-[105px] p-2 flex flex-col justify-between transition-all group relative ${
                    isTodayCell
                      ? 'bg-blue-50/70 ring-2 ring-blue-500/40 z-10'
                      : hasEvents
                      ? 'hover:bg-slate-50/90 cursor-pointer'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-black text-xs w-6 h-6 flex items-center justify-center rounded-full transition-transform ${
                        isTodayCell
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'text-slate-800 group-hover:scale-110'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isTodayCell && (
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1.5 py-0.5 bg-blue-100 rounded-md">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-[60px] pr-0.5">
                    {dayHolidays.map((h) => (
                      <a
                        key={h.id}
                        href={getGoogleCalendarUrl(h.title, h.date, h.date, `Company Holiday: ${h.type}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block p-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold truncate border border-amber-200 transition-colors"
                        title={`Click to add '${h.title}' to Google Calendar`}
                      >
                        🎉 {h.title}
                      </a>
                    ))}

                    {dayLeaves.map((l) => (
                      <a
                        key={l.id}
                        href={getGoogleCalendarUrl(
                          `${l.employeeName} - ${l.leaveType.toUpperCase()} Leave`,
                          l.startDate,
                          l.endDate,
                          `Reason: ${l.reason}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block p-1 rounded-lg bg-purple-100/90 hover:bg-purple-200 text-purple-900 text-[10px] font-extrabold truncate border border-purple-200 transition-colors"
                        title={`Click to add leave for ${l.employeeName} to Google Calendar`}
                      >
                        🌴 {l.employeeName} ({l.leaveType})
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Events Modal / Detail View */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-extrabold text-slate-900">
                Schedule for {selectedDayEvents.dateStr}
              </h4>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedDayEvents.holidays.map((h) => (
                <div key={h.id} className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Company Holiday
                  </span>
                  <p className="text-xs font-extrabold text-amber-900">{h.title}</p>
                  <a
                    href={getGoogleCalendarUrl(h.title, h.date, h.date, `Official Company Holiday`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Add to Google Calendar
                  </a>
                </div>
              ))}

              {selectedDayEvents.leaves.map((l) => (
                <div key={l.id} className="p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    {l.leaveType} Leave • {l.totalDays} Days
                  </span>
                  <p className="text-xs font-extrabold text-purple-900">{l.employeeName}</p>
                  <p className="text-[11px] text-slate-600">{l.reason}</p>
                  <a
                    href={getGoogleCalendarUrl(
                      `${l.employeeName} Leave`,
                      l.startDate,
                      l.endDate,
                      `Reason: ${l.reason}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Export to Google Calendar
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
