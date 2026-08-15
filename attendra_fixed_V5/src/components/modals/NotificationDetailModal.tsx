import React from 'react';
import { X, Bell, Megaphone, Calendar, ShieldCheck, CheckCircle2, User, Sparkles } from 'lucide-react';
import { NotificationItem, Announcement } from '../../types';

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: NotificationItem | null;
  announcements?: Announcement[];
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  isOpen,
  onClose,
  notification,
  announcements = [],
}) => {
  if (!isOpen || !notification) return null;

  const notifTitle = (notification.title || '').toLowerCase();
  const notifMsg = (notification.message || '').toLowerCase();

  // Check if this notification relates to an announcement
  const matchingAnnouncement = announcements.find((a) => {
    const aTitle = (a.title || '').toLowerCase();
    return (
      (notifTitle && aTitle && notifTitle.includes(aTitle)) ||
      (aTitle && notifTitle && aTitle.includes(notifTitle)) ||
      (notifMsg && aTitle && notifMsg.includes(aTitle))
    );
  });

  const isAnnouncementType =
    notification.type === 'system' &&
    ((notification.title || '').includes('📢') ||
      notifTitle.includes('broadcast') ||
      notifTitle.includes('meeting') ||
      matchingAnnouncement !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 pr-8">
          <div
            className={`p-3 rounded-2xl ${
              isAnnouncementType
                ? 'bg-blue-100 text-blue-700'
                : notification.type === 'leave'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isAnnouncementType ? (
              <Megaphone className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <Bell className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {isAnnouncementType ? 'Official Broadcast' : notification.type.toUpperCase()}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{notification.time}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
              {matchingAnnouncement ? matchingAnnouncement.title : notification.title}
            </h3>
          </div>
        </div>

        {/* Announcement / Notification Full Content */}
        <div className="space-y-4">
          {matchingAnnouncement ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Published by <strong className="text-slate-800">{matchingAnnouncement.author}</strong> ({matchingAnnouncement.authorRole})
                </span>
                <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-100/80 px-2 py-0.5 rounded-md">
                  {matchingAnnouncement.category}
                </span>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {matchingAnnouncement.content}
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Corporate Broadcast
                </span>
                <span className="font-mono text-[10px] text-slate-400">Date: {matchingAnnouncement.date}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {notification.message}
              </p>
              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-200/60">
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Attendra Enterprise System Notice
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Marked as Read
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all shadow-md cursor-pointer"
          >
            Close Notification
          </button>
        </div>
      </div>
    </div>
  );
};
