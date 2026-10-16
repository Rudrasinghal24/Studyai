import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Radio,
  RefreshCw,
  ArrowLeftRight,
  ExternalLink,
  Download,
  X,
  Edit2,
  Sparkles,
} from 'lucide-react';

export interface PeerScreenState {
  peerId: string;
  username: string;
  activeLessonTitle: string;
  markdown: string;
  notes: string;
  mode: string;
  video?: any;
  messages?: any[];
  lastUpdated: number;
}

interface PeerScreenShareBarProps {
  myPeerId: string;
  myUsername: string;
  onUpdateUsername: (name: string) => void;
  activeScreenMode: 'my_screen' | 'friend_screen';
  friendScreen: PeerScreenState | null;
  onSwitchScreen: (mode: 'my_screen' | 'friend_screen') => void;
  onConnectFriend: (peerId: string) => Promise<boolean>;
  onRefreshFriendScreen: () => void;
  onDisconnectFriend: () => void;
  onImportFriendNotes: () => void;
  isSyncing?: boolean;
}

export const PeerScreenShareBar: React.FC<PeerScreenShareBarProps> = ({
  myPeerId,
  myUsername,
  onUpdateUsername,
  activeScreenMode,
  friendScreen,
  onSwitchScreen,
  onConnectFriend,
  onRefreshFriendScreen,
  onDisconnectFriend,
  onImportFriendNotes,
  isSyncing = false,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(myUsername);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [targetFriendId, setTargetFriendId] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recentPeers, setRecentPeers] = useState<any[]>([]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(myPeerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateUsername(tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleOpenConnect = async () => {
    setIsConnectOpen(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/peer-list');
      const data = await res.json();
      if (data.success && data.peers) {
        setRecentPeers(data.peers.filter((p: any) => p.peerId !== myPeerId));
      }
    } catch {}
  };

  const handleConnectSubmit = async (e?: React.FormEvent, codeToUse?: string) => {
    if (e) e.preventDefault();
    const idToConnect = (codeToUse || targetFriendId).trim();
    if (!idToConnect) {
      setConnectError("Please enter your friend's ID or username");
      return;
    }
    setIsConnecting(true);
    setConnectError(null);
    try {
      const success = await onConnectFriend(idToConnect);
      if (success) {
        setIsConnectOpen(false);
        setTargetFriendId('');
      } else {
        setConnectError(`Could not find live session for "${idToConnect}"`);
      }
    } catch (err: any) {
      setConnectError(err?.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full mb-4">
      {/* Top Floating Peer Bar */}
      <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:px-4 border border-pink-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Your User ID & Username */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-sans uppercase">MY ID:</span>
            <span>{myPeerId}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="ml-0.5 p-0.5 text-emerald-700 hover:text-emerald-900 cursor-pointer"
              title="Copy your ID to share with friends"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* User Display Name */}
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="text-xs font-bold text-slate-800 px-2 py-0.5 border border-pink-300 rounded-md outline-none w-28 bg-white"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-800"
              >
                Save
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer group"
              title="Click to change your nickname"
            >
              <span>{myUsername}</span>
              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-pink-500 transition-colors" />
            </div>
          )}
        </div>

        {/* Center / Right: Screen Switcher or Connect Button */}
        <div className="flex items-center gap-2">
          {friendScreen ? (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {/* My Screen Tab */}
              <button
                type="button"
                onClick={() => onSwitchScreen('my_screen')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeScreenMode === 'my_screen'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>👤 My Screen</span>
              </button>

              {/* Friend's Screen Tab (Screen Share) */}
              <button
                type="button"
                onClick={() => onSwitchScreen('friend_screen')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeScreenMode === 'friend_screen'
                    ? 'bg-[#FF4D94] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span className="truncate max-w-[130px]">
                  {friendScreen.username.split(' ')[0]}'s Screen
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenConnect}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-teal-500 hover:from-pink-600 hover:to-teal-600 text-white shadow-xs cursor-pointer transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Connect Friend's Screen</span>
            </button>
          )}

          {/* If connected, provide sync and disconnect options */}
          {friendScreen && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRefreshFriendScreen}
                disabled={isSyncing}
                className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sync screen right now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onDisconnectFriend}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Disconnect from friend's screen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* When Viewing Friend's Screen: Prominent Live Watching Banner */}
      {friendScreen && activeScreenMode === 'friend_screen' && (
        <div className="w-full mt-2 p-3 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span>📡 LIVE SCREEN SHARE:</span>
                <span className="underline decoration-pink-300">{friendScreen.username}</span>
                <span className="font-mono text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
                  {friendScreen.peerId}
                </span>
              </div>
              <p className="text-[11px] text-teal-100 truncate max-w-md">
                Active Topic: "{friendScreen.activeLessonTitle || 'Studying together'}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onImportFriendNotes}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-teal-900 text-xs font-bold shadow-xs hover:bg-teal-50 transition-all cursor-pointer"
              title="Copy your friend's current notes and lesson to your own study screen"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              <span>Clone to My Screen</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchScreen('my_screen')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Switch to My Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* Connect Friend Modal */}
      {isConnectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-pink-100 relative">
            <button
              type="button"
              onClick={() => setIsConnectOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4D94] to-[#20B2AA] text-white flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Connect to Friend's Study Screen
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your friend's ID to mirror their study screen live
                </p>
              </div>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-3 mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={targetFriendId}
                  onChange={(e) => setTargetFriendId(e.target.value.toUpperCase())}
                  placeholder="e.g. BESTIE-ALEX or BESTIE-7X9K2"
                  className="w-full px-4 py-3 text-sm font-mono font-bold uppercase bg-slate-50 border-2 border-slate-200 focus:border-[#FF4D94] focus:bg-white rounded-xl outline-none"
                  autoFocus
                />
              </div>

              {connectError && (
                <p className="text-xs text-rose-500 font-semibold">{connectError}</p>
              )}

              <button
                type="submit"
                disabled={isConnecting || !targetFriendId.trim()}
                className="w-full py-3 rounded-xl bg-[#FF4D94] hover:bg-[#E62E76] text-white text-xs font-bold transition-all shadow-md shadow-pink-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isConnecting ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5" />
                    <span>Connect & Load Screen</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Peer Discovery */}
            {recentPeers.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Active Study Buddies Online:
                </span>
                <div className="space-y-2">
                  {recentPeers.map((p) => (
                    <div
                      key={p.peerId}
                      onClick={() => handleConnectSubmit(undefined, p.peerId)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-pink-50 border border-slate-100 hover:border-pink-200 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-pink-600 transition-colors">
                          {p.username}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {p.peerId} • {p.activeLessonTitle || 'Studying'}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-pink-600 group-hover:underline">
                        Connect →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
