import React, { useState } from 'react';
import {
  Cast,
  Copy,
  Check,
  Edit2,
  RefreshCw,
  Users,
  LogOut,
  Radio,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import { PeerScreenState } from '../types';

interface LiveScreenBarProps {
  myPeerId: string;
  myUsername: string;
  onUpdateUsername: (name: string) => void;
  friendScreen: PeerScreenState | null;
  activeScreenMode: 'my_screen' | 'friend_screen';
  activePresenterId?: string;
  isPeerSyncing: boolean;
  onOpenScreenShareModal: () => void;
  onSwitchScreen: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export const LiveScreenBar: React.FC<LiveScreenBarProps> = ({
  myPeerId,
  myUsername,
  onUpdateUsername,
  friendScreen,
  activeScreenMode,
  activePresenterId,
  isPeerSyncing,
  onOpenScreenShareModal,
  onSwitchScreen,
  onDisconnect,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(myUsername);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(myPeerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      onUpdateUsername(tempUsername.trim());
    }
    setIsEditingUsername(false);
  };

  const isWatchingFriend = Boolean(friendScreen && activeScreenMode === 'friend_screen');
  const isBroadcastingToFriend = Boolean(friendScreen && activeScreenMode === 'my_screen');

  return (
    <div className="w-full max-w-4xl mb-4 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-md shadow-pink-100/60 border border-pink-200/80 flex flex-col gap-2 transition-all">
      {/* Top Row: User Identity (Always visible) & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: User Identity + ID */}
        <div className="flex items-center gap-2">
          {/* Status Indicator Avatar */}
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4D94] to-[#FF80B5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {myUsername.charAt(0).toUpperCase() || 'B'}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                friendScreen ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'
              }`}
              title="Broadcasting live study presence"
            />
          </div>

          {/* Username (editable) & ID Tag */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            {isEditingUsername ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                  autoFocus
                  className="px-2 py-0.5 text-xs font-bold text-slate-800 bg-pink-50 border border-pink-300 rounded-md outline-none max-w-[130px]"
                />
                <button
                  type="button"
                  onClick={handleSaveUsername}
                  className="px-1.5 py-0.5 text-[11px] font-bold bg-[#FF4D94] text-white rounded hover:bg-[#e62e76] cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                  {myUsername}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTempUsername(myUsername);
                    setIsEditingUsername(true);
                  }}
                  className="text-slate-400 hover:text-pink-600 transition-colors p-0.5 cursor-pointer"
                  title="Edit your display username"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Permanent Study ID Badge with 1-Click Copy */}
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100/90 text-pink-700 border border-pink-200/80 font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer group shadow-2xs"
              title="Click to copy your unique ID for friend to watch your screen"
            >
              <Radio className="w-3 h-3 text-[#FF4D94] animate-pulse" />
              <span>ID: {myPeerId}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-pink-400 group-hover:text-pink-700 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Screen Share Status or Connect Button */}
        <div className="flex items-center gap-1.5 ml-auto">
          {friendScreen ? (
            <div className="flex items-center gap-1.5">
              {/* Switching Button */}
              <button
                type="button"
                onClick={onSwitchScreen}
                disabled={isPeerSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-teal-200 transition-all cursor-pointer active:scale-95"
                title="Switch between your screen and friend's screen"
              >
                <ArrowRightLeft className={`w-3.5 h-3.5 ${isPeerSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isWatchingFriend ? 'Switch to My Screen' : `Switch to ${friendScreen.username.split(' ')[0]}'s Screen`}
                </span>
              </button>

              {/* Refresh Sync */}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isPeerSyncing}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh peer screen"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPeerSyncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Disconnect */}
              <button
                type="button"
                onClick={onDisconnect}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                title="Disconnect from friend's screen"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenScreenShareModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#20B2AA] to-[#0D9488] hover:from-[#199d96] hover:to-[#0b7c72] text-white text-xs font-bold shadow-xs hover:shadow-md shadow-teal-200 transition-all cursor-pointer group"
            >
              <Cast className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Connect Friend's Screen</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
            </button>
          )}
        </div>
      </div>

      {/* Connected Co-Study Status Banner (when paired with a friend) */}
      {friendScreen && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all animate-in fade-in ${
            isWatchingFriend
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs'
              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>
              {isWatchingFriend ? (
                <>
                  🔴 Watching <strong>{friendScreen.username}</strong>'s Study Screen (Live Sync • {friendScreen.peerId})
                </>
              ) : (
                <>
                  🟢 Broadcasting your study screen to <strong>{friendScreen.username}</strong> ({friendScreen.peerId})
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono">
              Topic: {friendScreen.activeLessonTitle || 'Live Notes'}
            </span>
            <button
              type="button"
              onClick={onSwitchScreen}
              className="bg-white text-slate-800 px-2.5 py-1 rounded-lg font-extrabold hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
            >
              <ArrowRightLeft className="w-3 h-3 text-[#FF4D94]" />
              <span>Switch Screen 🔄</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
