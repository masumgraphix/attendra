import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Link as LinkIcon, Check, Image as ImageIcon } from 'lucide-react';
import { Employee } from '../../types';

interface ChangeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onUpdateAvatar: (employeeId: string, newAvatarUrl: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
];

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({
  isOpen,
  onClose,
  employee,
  onUpdateAvatar,
}) => {
  const [selectedUrl, setSelectedUrl] = useState(employee.avatar);
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setSelectedUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      setSelectedUrl(customUrl.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUrl) {
      onUpdateAvatar(employee.id, selectedUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Change Profile Picture
            </h3>
            <p className="text-xs text-slate-500">
              Update photo for <span className="font-bold text-slate-800">{employee.name}</span>
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative group">
            <img
              src={selectedUrl || employee.avatar}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/30 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
              }}
            />
            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-2">Selected Photo Preview</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'presets' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Image URL
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-extrabold text-slate-800">Click to upload image from device</p>
              <p className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP (Max 5MB)</p>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-600">Choose from curated avatars:</p>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedUrl(url)}
                  className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                    selectedUrl === url ? 'border-blue-600 ring-2 ring-blue-500/40 scale-95' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                  {selectedUrl === url && (
                    <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block">Paste Direct Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <form onSubmit={handleSubmit} className="pt-2">
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            Save New Profile Photo
          </button>
        </form>
      </div>
    </div>
  );
};
