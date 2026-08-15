import React, { useState } from 'react';
import { X, Megaphone, Send, Sparkles, Pin, ShieldCheck } from 'lucide-react';
import { Announcement } from '../../types';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAnnouncement: (data: {
    title: string;
    content: string;
    category: 'policy' | 'event' | 'holiday' | 'general';
    isPinned: boolean;
  }) => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmitAnnouncement,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'policy' | 'event' | 'holiday' | 'general'>('general');
  const [isPinned, setIsPinned] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSubmitAnnouncement({
      title,
      content,
      category,
      isPinned,
    });

    setTitle('');
    setContent('');
    setIsPinned(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
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
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 shadow-sm">
            <Megaphone className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Broadcast Company Announcement
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Publish official notice & send instant notifications directly to all employee portals
            </p>
          </div>
        </div>

        {/* Notice Info Pill */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 font-semibold flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            This announcement will trigger a live notification pop-up and red badge across every employee dashboard.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q3 Mandatory Staff Offsite & Office Closure"
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800"
            />
          </div>

          {/* Category & Pin Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as 'policy' | 'event' | 'holiday' | 'general')
                }
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800 cursor-pointer"
              >
                <option value="general">📢 General Company Notice</option>
                <option value="policy">📜 HR Policy Update</option>
                <option value="event">🎉 Corporate Event & Outing</option>
                <option value="holiday">🌴 Official Holiday Notice</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">Pin Settings</label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer h-[42px]">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <Pin className="w-3.5 h-3.5 text-blue-600" />
                <span>Pin to top of Dashboard</span>
              </label>
            </div>
          </div>

          {/* Content TextArea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Announcement Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write detailed instructions or announcement content for employees..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800 leading-relaxed"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Publish & Broadcast to All Portals
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
