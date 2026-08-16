import React, { useState } from 'react';
import { CompanyHoliday, UserRole } from '../../types';
import { Palmtree, Calendar, MapPin, Plus, Trash2, Pencil, Clock, ShieldCheck, X, Sparkles, CalendarDays, RefreshCw, Landmark, UserCog } from 'lucide-react';

interface HolidaysViewProps {
  holidays: CompanyHoliday[];
  currentUserRole?: UserRole;
  onAddHoliday?: (newHoliday: Omit<CompanyHoliday, 'id'>) => void;
  onUpdateHoliday?: (id: string, updated: Partial<CompanyHoliday>) => void;
  onDeleteHoliday?: (id: string) => void;
  onSyncHolidays?: () => Promise<void>;
}

const getDayOfWeekFrom = (dateStr: string): string => {
  if (!dateStr) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(`${dateStr}T00:00:00`).getDay()] || '';
};

export const HolidaysView: React.FC<HolidaysViewProps> = ({
  holidays,
  currentUserRole = 'super_admin',
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onSyncHolidays,
}) => {
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const [filterType, setFilterType] = useState<string>('upcoming'); // Default to showing upcoming holidays!
  const [isSyncing, setIsSyncing] = useState(false);
  const [addError, setAddError] = useState('');

  // Modal State (shared by Add and Edit)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [type, setType] = useState<'national' | 'religious' | 'corporate' | 'optional'>('national');
  const [appliesTo, setAppliesTo] = useState('All Company Staff');

  // Reference date: real current date, so past/upcoming logic always stays accurate
  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysRemaining = (holidayDateStr: string) => {
    const today = new Date(`${todayStr}T00:00:00`);
    const holDate = new Date(`${holidayDateStr}T00:00:00`);
    const diffTime = holDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Find next upcoming holiday
  const upcomingHolidays = holidays
    .filter((h) => h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastHolidays = holidays
    .filter((h) => h.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const nextUpcoming = upcomingHolidays[0];

  const filteredHolidays = holidays
    .filter((h) => {
      if (filterType === 'upcoming') return h.date >= todayStr;
      if (filterType === 'past') return h.date < todayStr;
      if (filterType === 'all') return true;
      if (filterType === 'government') return (h.source ?? 'manual') === 'government';
      if (filterType === 'manual') return (h.source ?? 'manual') === 'manual';
      if (filterType === 'religious') return h.type === 'religious';
      return true;
    })
    .sort((a, b) => {
      const aIsUpcoming = a.date >= todayStr;
      const bIsUpcoming = b.date >= todayStr;
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      return aIsUpcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });

  const handleDateChange = (val: string) => {
    setDate(val);
    setDayOfWeek(getDayOfWeekFrom(val));
  };

  const openAddModal = () => {
    setEditId(null);
    setTitle('');
    setDate('');
    setDayOfWeek('');
    setType('national');
    setAppliesTo('All Company Staff');
    setAddError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (hol: CompanyHoliday) => {
    setEditId(hol.id);
    setTitle(hol.title);
    setDate(hol.date);
    setDayOfWeek(hol.dayOfWeek || getDayOfWeekFrom(hol.date));
    setType((hol.type === 'company' ? 'corporate' : hol.type) as 'national' | 'religious' | 'corporate' | 'optional');
    setAppliesTo(hol.appliesTo || 'All Company Staff');
    setAddError('');
    setIsAddModalOpen(true);
  };

  const handleSubmitHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    // Duplicate guard: never create a second holiday on a date that already
    // has one (either from government auto-sync or a previous manual entry).
    const duplicate = holidays.find(
      (h) => h.date === date && (!editId || h.id !== editId)
    );
    if (duplicate) {
      setAddError(`"${duplicate.title}" already exists on ${date}. A holiday is already registered for this date.`);
      return;
    }

    if (editId && onUpdateHoliday) {
      onUpdateHoliday(editId, { title, date, dayOfWeek, type, appliesTo });
    } else if (!editId && onAddHoliday) {
      onAddHoliday({
        title,
        date,
        dayOfWeek,
        type,
        appliesTo,
        source: 'manual',
      });
    }

    setIsAddModalOpen(false);
    setTitle('');
    setDate('');
    setEditId(null);
  };

  const handleSync = async () => {
    if (!onSyncHolidays || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncHolidays();
    } finally {
      setIsSyncing(false);
    }
  };

  const isGovernment = (h: CompanyHoliday) => (h.source ?? 'manual') === 'government';

  return (
    <div className="space-y-6">
      {/* Office Hours & Schedule Banner */}
      <div className="p-6 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Clock className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                Official Office Policy
              </span>
              <h2 className="text-xl font-extrabold tracking-tight mt-1 text-white">
                Standard Office Schedule & Calendar Rules
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              <span className="text-xs text-slate-300 font-bold">Managed by Admin & Super Admin</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Office Hours</p>
              <p className="text-lg font-black text-white">09:00 AM – 05:00 PM</p>
              <p className="text-[10px] text-slate-300">8.0 Hours Regular Daily Shift</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Working Days</p>
              <p className="text-lg font-black text-white">Saturday to Thursday</p>
              <p className="text-[10px] text-slate-300">6 Working Days per Week</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Weekly Holiday</p>
              <p className="text-lg font-black text-amber-300">Friday (Official Off Day)</p>
              <p className="text-[10px] text-slate-300">Auto-flagged Weekly Off</p>
            </div>
          </div>
        </div>
      </div>

      {/* NEXT UPCOMING HOLIDAY BANNER */}
      {nextUpcoming && (
        <div className="p-5 bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-3xl shadow-xl border border-emerald-400/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start md:items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shrink-0">
              <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-amber-400 text-slate-900 rounded-full tracking-wider shadow-xs">
                  Next Holiday
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-white/20 border border-white/30 text-white tracking-wider flex items-center gap-1">
                  {isGovernment(nextUpcoming) ? <Landmark className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                  {isGovernment(nextUpcoming) ? 'Government (Auto)' : 'Custom (Manual)'}
                </span>
                <span className="text-xs font-extrabold text-emerald-100 flex items-center gap-1 font-mono">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {nextUpcoming.date} ({nextUpcoming.dayOfWeek || getDayOfWeekFrom(nextUpcoming.date)})
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-1 tracking-tight">
                {nextUpcoming.title}
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                {isGovernment(nextUpcoming)
                  ? 'Official Bangladesh Government Public Holiday (auto-synced)'
                  : 'Custom company holiday added by an administrator'}{' '}
                • {nextUpcoming.appliesTo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center relative z-10">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center">
              <span className="block text-2xl font-black text-amber-300">
                {getDaysRemaining(nextUpcoming.date)}
              </span>
              <span className="text-[10px] font-extrabold uppercase text-emerald-200 tracking-wider">
                Days Remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Holidays Section */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Palmtree className="w-5 h-5 text-purple-600" />
              Govt & Custom Holiday Calendar
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Government holidays sync automatically; admins can add, edit, or remove entries.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setFilterType('upcoming')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterType === 'upcoming' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                Upcoming ({upcomingHolidays.length})
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({holidays.length})
              </button>
              <button
                onClick={() => setFilterType('past')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'past' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Past ({pastHolidays.length})
              </button>
              <button
                onClick={() => setFilterType('government')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'government' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Government (Auto)
              </button>
              <button
                onClick={() => setFilterType('manual')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'manual' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom (Manual)
              </button>
              <button
                onClick={() => setFilterType('religious')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'religious' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Eid & Religious
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !onSyncHolidays}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 disabled:opacity-60"
                  title="Fetch the latest Bangladesh government holidays"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Govt Holidays'}
                </button>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-md shadow-purple-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Holiday
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHolidays.map((hol) => {
            const isUpcoming = hol.date >= todayStr;
            const daysLeft = isUpcoming ? getDaysRemaining(hol.date) : -1;
            const isNextHoliday = nextUpcoming && hol.id === nextUpcoming.id;
            const gov = isGovernment(hol);

            return (
              <div
                key={hol.id}
                className={`p-5 rounded-3xl transition-all space-y-3 relative group border ${
                  isNextHoliday
                    ? 'bg-linear-to-br from-emerald-50 via-teal-50 to-white border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg'
                    : isUpcoming
                    ? gov
                      ? 'bg-white border-blue-300/90 hover:border-blue-400 hover:shadow-md'
                      : 'bg-white border-emerald-200/90 hover:border-emerald-400 hover:shadow-md'
                    : 'bg-slate-50/80 border-slate-200/70 opacity-50 hover:opacity-100 grayscale-[35%]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-md border flex items-center gap-1 ${
                        gov
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title={gov ? 'Auto-synced from Bangladesh government holiday data' : 'Manually added by an administrator'}
                    >
                      {gov ? <Landmark className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                      {gov ? 'Government (Auto)' : 'Custom (Manual)'}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                        hol.type === 'religious'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : hol.type === 'national'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {hol.type === 'religious' ? 'Eid / Religious' : hol.type}
                    </span>

                    {isNextHoliday && (
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-400 text-slate-900 tracking-wider shadow-xs animate-pulse">
                        ⭐ NEXT UP
                      </span>
                    )}

                    {isUpcoming && !isNextHoliday && (
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-emerald-500 text-white tracking-wider">
                        UPCOMING
                      </span>
                    )}

                    {!isUpcoming && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-slate-200 text-slate-600">
                        Passed
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-500">{hol.dayOfWeek || getDayOfWeekFrom(hol.date)}</span>
                </div>

                <h4 className="text-base font-extrabold text-slate-900 pr-6">{hol.title}</h4>

                {isUpcoming && daysLeft >= 0 && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {daysLeft === 0 ? 'Today is Holiday!' : `In ${daysLeft} Days (${hol.date})`}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1 text-slate-800 font-mono font-bold">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {hol.date}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {hol.appliesTo || 'All Employees'}
                  </span>
                </div>

                {isAdmin && (onDeleteHoliday || onUpdateHoliday) && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onUpdateHoliday && (
                      <button
                        onClick={() => openEditModal(hol)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                        title={gov ? 'Edit (detaches from auto-sync and becomes custom)' : 'Edit Holiday'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteHoliday && (
                      <button
                        onClick={() => onDeleteHoliday(hol.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Add / Edit Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{editId ? 'Edit Holiday' : 'Add Custom Holiday'}</h3>
                  <p className="text-[11px] text-slate-500">
                    {editId
                      ? 'Saving converts a government entry into a custom holiday'
                      : 'Add a company, Eid, or custom holiday manually'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHoliday} className="space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-800 font-semibold flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Holiday Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Holy Eid-ul-Fitr Day 1 or Independence Day"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Day of Week</label>
                  <input
                    type="text"
                    disabled
                    value={dayOfWeek}
                    className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="national">Government / National Holiday</option>
                  <option value="religious">Eid / Religious Festival</option>
                  <option value="corporate">Corporate / Company Leave</option>
                  <option value="optional">Optional / Floating Holiday</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Applies To</label>
                <input
                  type="text"
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value)}
                  placeholder="All Company Staff"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20"
                >
                  {editId ? 'Save Changes' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
