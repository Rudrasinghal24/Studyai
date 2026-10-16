import React, { useState, useRef, useEffect } from 'react';
import { X, User, Camera, Image as ImageIcon, Sparkles, Check, Upload } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentAvatar: string;
  onSaveProfile: (username: string, avatarUrl: string) => void;
}

const PRESET_AVATARS = [
  { label: 'Scholar', emoji: '🎓', bg: 'bg-purple-500' },
  { label: 'Rocket', emoji: '🚀', bg: 'bg-orange-500' },
  { label: 'Coding', emoji: '💻', bg: 'bg-teal-600' },
  { label: 'Chai', emoji: '☕', bg: 'bg-amber-600' },
  { label: 'Genius', emoji: '✨', bg: 'bg-pink-500' },
  { label: 'Music', emoji: '🎧', bg: 'bg-indigo-500' },
  { label: 'Electric', emoji: '⚡', bg: 'bg-yellow-500' },
  { label: 'Love', emoji: '💖', bg: 'bg-rose-500' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  currentAvatar,
  onSaveProfile,
}) => {
  const [username, setUsername] = useState(currentUsername);
  const [avatar, setAvatar] = useState(currentAvatar);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername);
      setAvatar(currentAvatar);
    }
  }, [isOpen, currentUsername, currentAvatar]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2MB!');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = username.trim() || 'Study Bestie ✨';
    onSaveProfile(cleanName, avatar);
    onClose();
  };

  const isPreset = (emoji: string) => avatar === emoji;
  const isImageAvatar = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-pink-100 flex flex-col relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF4D94] to-[#FF80B5] text-white flex items-center justify-center shadow-md shadow-pink-200">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Edit Your Bestie Profile</span>
              <span className="text-base">✨</span>
            </h2>
            <p className="text-xs text-slate-500">
              Customize how you appear to your study besties
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Live Preview Avatar */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-3 border-pink-300 shadow-md flex items-center justify-center bg-gradient-to-tr from-pink-100 to-teal-50">
                {isImageAvatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl select-none">{avatar || username.charAt(0).toUpperCase() || '✨'}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 mt-1.5">
              Tap photo to upload image
            </span>
          </div>

          {/* Bestie Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bestie Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Rudra & Bestie 💖"
              maxLength={40}
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-900 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-[#FF4D94] focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Avatar Presets Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profile Photo / Avatar
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-800 hover:underline cursor-pointer"
              >
                {showUrlInput ? 'Hide URL' : 'Use Photo URL'}
              </button>
            </div>

            {/* Quick Preset Emojis */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_AVATARS.map((p) => {
                const active = isPreset(p.emoji);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAvatar(p.emoji)}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-lg font-bold border transition-all cursor-pointer ${
                      active
                        ? 'border-[#FF4D94] bg-pink-50 ring-2 ring-pink-400/50 scale-105 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span className="text-[10px] font-sans font-bold text-slate-600">{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Upload File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-pink-600" />
                <span>Upload Custom Photo</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="py-2 px-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Custom Photo URL Input (Optional) */}
            {showUrlInput && (
              <div className="mt-3 flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrl.trim()) setAvatar(customUrl.trim());
                  }}
                  className="px-3 py-1.5 bg-[#FF4D94] text-white rounded-lg text-xs font-bold hover:bg-[#e62e76] cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#20B2AA] text-white text-xs font-black shadow-md shadow-pink-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
