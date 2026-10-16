import React, { useState } from 'react';
import {
  Cast,
  Copy,
  Check,
  Edit2,
  RefreshCw,
  LogOut,
  Radio,
  ArrowRightLeft,
  ArrowRight,
  Tv,
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
  onConnectFriendId: (friendId: string) => Promise<boolean>;
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
  isPeerSyncing,
  onOpenScreenShareModal,
  onConnectFriendId,
  onSwitchScreen,
  onDisconnect,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(myUsername);
  const [quickFriendInput, setQuickFriendInput] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleQuickConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickFriendInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === myPeerId) {
      setConnectError('Enter your friend’s ID, not your own!');
      setTimeout(() => setConnectError(null), 3000);
      return;
    }
    setConnectError(null);
    setIsConnecting(true);
    try {
      const ok = await onConnectFriendId(clean);
      if (ok) {
        setQuickFriendInput('');
      } else {
        setConnectError(`ID "${clean}" not found. Ensure friend has app open!`);
        setTimeout(() => setConnectError(null), 4000);
      }
    } catch {
      setConnectError('Connection failed. Please retry.');
      setTimeout(() => setConnectError(null), 3000);
    } finally {
      setIsConnecting(false);
    }
  };

  const isWatchingFriend = Boolean(friendScreen && activeScreenMode === 'friend_screen');

  return (
    <div className="w-full max-w-4xl mb-4 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 shadow-md shadow-pink-100/60 border border-pink-200/80 flex flex-col gap-2.5 transition-all">
      {/* Top Row: User Identity (Always visible) & ID & Direct Connect Input */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: User Identity + ID */}
        <div className="flex items-center gap-2">
          {/* Avatar with pulse */}
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4D94] to-[#FF80B5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {myUsername.charAt(0).toUpperCase() || 'B'}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                friendScreen ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'
              }`}
              title="Study Screen Active & Broadcasting"
            />
          </div>

          {/* Username (editable) & ID Badge */}
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100/90 text-pink-700 border border-pink-200/80 font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer group shadow-2xs"
              title="Click to copy your ID so your friend can view your study screen"
            >
              <Radio className="w-3 h-3 text-[#FF4D94] animate-pulse" />
              <span>ID: {myPeerId}</span>
              {copied ? (
                <span className="text-emerald-600 flex items-center gap-0.5 font-sans font-bold text-[10px]">
                  <Check className="w-3 h-3" /> Copied!
                </span>
              ) : (
                <Copy className="w-3 h-3 text-pink-400 group-hover:text-pink-700 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Inline Quick-Connect to Friend ID OR Switch Screen Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {!friendScreen ? (
            <div className="flex items-center gap-1.5">
              <form onSubmit={handleQuickConnect} className="flex items-center gap-1">
                <input
                  type="text"
                  value={quickFriendInput}
                  onChange={(e) => setQuickFriendInput(e.target.value.toUpperCase())}
                  placeholder="Enter Friend's ID..."
                  className="px-2.5 py-1 text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-lg outline-none w-36 sm:w-44 transition-all"
                />
                <button
                  type="submit"
                  disabled={!quickFriendInput.trim() || isConnecting}
                  className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer active:scale-95 shrink-0"
                  title="Connect and load your friend's study screen"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <span>Connect</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={onOpenScreenShareModal}
                className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
                title="Browse active study peers"
              >
                <Cast className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Prominent Screen Switching Button */}
              <button
                type="button"
                onClick={onSwitchScreen}
                disabled={isPeerSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-teal-200 transition-all cursor-pointer active:scale-95"
                title="Switch between viewing friend's screen and broadcasting your screen"
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
          )}
        </div>
      </div>

      {connectError && (
        <div className="text-xs text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
          {connectError}
        </div>
      )}

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
