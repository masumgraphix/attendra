import React, { useState } from 'react';
import { Announcement, UserRole } from '../../types';
import { Megaphone, Pin, ArrowRight, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface AnnouncementsWidgetProps {
  announcements: Announcement[];
  currentUserRole?: UserRole;
  onOpenAll?: () => void;
  onOpenCreateModal?: () => void;
  onSelectAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => Promise<void> | void;
}

export const AnnouncementsWidget: React.FC<AnnouncementsWidgetProps> = ({
  announcements,
  currentUserRole = 'super_admin',
  onOpenAll,
  onOpenCreateModal,
  onSelectAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-blue-600" />
          Company Broadcasts
        </h3>

        <div className="flex items-center gap-2">
          {isSuperAdmin && onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Broadcast
            </button>
          )}

          {announcements.length > 0 && onOpenAll && (
            <button
              onClick={onOpenAll}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-2.5">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => onSelectAnnouncement && onSelectAnnouncement(ann)}
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 transition-all space-y-1 cursor-pointer hover:shadow-xs group relative"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {ann.isPinned && (
                    <span className="p-0.5 rounded-md bg-blue-100 text-blue-700" title="Pinned Announcement">
                      <Pin className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                    {ann.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">{ann.date}</span>
                  {isSuperAdmin && onDeleteAnnouncement && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnnouncementToDelete(ann);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete broadcast permanently from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">{ann.title}</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ann.content}</p>
              <div className="pt-1 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                <span>
                  Posted by <strong className="text-slate-800">{ann.author}</strong> ({ann.authorRole})
                </span>
                <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-md">
                  Delivered to all portals
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center space-y-2">
          <Megaphone className="w-6 h-6 text-slate-400" />
          <div>
            <p className="text-xs font-bold text-slate-700">No broadcasts published yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Super Admin can post announcements and send live notifications to all employee portals.
            </p>
          </div>
          {isSuperAdmin && onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="mt-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
            >
              + Create First Broadcast
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modal for Deleting Announcement */}
      {announcementToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Delete Announcement?</h4>
                <p className="text-[11px] text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Are you sure you want to delete this announcement?
              <br />
              <strong className="text-slate-900 mt-1 block font-semibold">"{announcementToDelete.title}"</strong>
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteAnnouncement) {
                    await onDeleteAnnouncement(announcementToDelete.id);
                  }
                  setAnnouncementToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
