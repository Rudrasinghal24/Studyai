import React, { useState, useEffect } from 'react';
import {
  X,
  Cast,
  Users,
  ArrowRight,
  Copy,
  Check,
  Radio,
  Sparkles,
  BookOpen,
  ArrowRightLeft,
  Tv,
} from 'lucide-react';
import { PeerScreenState } from '../types';

interface ScreenShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPeerId: string;
  myUsername: string;
  onConnectPeer: (peerId: string) => Promise<boolean>;
  activeFriendScreen: PeerScreenState | null;
  onSwitchScreen: () => void;
  onDisconnect: () => void;
}

export const ScreenShareModal: React.FC<ScreenShareModalProps> = ({
  isOpen,
  onClose,
  myPeerId,
  myUsername,
  onConnectPeer,
  activeFriendScreen,
  onSwitchScreen,
  onDisconnect,
}) => {
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [peerList, setPeerList] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPeers = async () => {
      try {
        const res = await fetch('/api/peer-list');
        const data = await res.json();
        if (data.success && data.peers) {
          // Filter out our own ID
          setPeerList(data.peers.filter((p: any) => p.peerId !== myPeerId));
        }
      } catch {}
    };
    fetchPeers();
  }, [isOpen, myPeerId]);

  if (!isOpen) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(myPeerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/?screenshare=${encodeURIComponent(myPeerId)}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {}
  };

  const handleConnect = async (targetId?: string) => {
    const cleanId = (targetId || friendIdInput).trim().toUpperCase();
    if (!cleanId) {
      setError("Please enter your friend's ID or username!");
      return;
    }
    if (cleanId === myPeerId) {
      setError("You cannot connect to your own ID! Enter a friend's ID.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const success = await onConnectPeer(cleanId);
      if (!success) {
        throw new Error(`Could not find a live study screen for "${cleanId}". Make sure they have the app open!`);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to friend screen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-teal-100 flex flex-col relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#20B2AA] to-[#0D9488] text-white flex items-center justify-center shadow-md shadow-teal-100">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Study Screen Share & Co-Study</span>
              <span className="text-base">⚡</span>
            </h2>
            <p className="text-xs text-slate-500">
              Mirror each other's notes, videos & tests in real-time
            </p>
          </div>
        </div>

        {/* Active Connected Screen (if currently paired) */}
        {activeFriendScreen && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Currently Paired with: {activeFriendScreen.username}</span>
              </span>
              <span className="font-mono text-teal-700">{activeFriendScreen.peerId}</span>
            </div>

            <p className="text-xs text-teal-800">
              Topic: <strong>{activeFriendScreen.activeLessonTitle}</strong>
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onSwitchScreen();
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-teal-200"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Switch Screen Role 🔄</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="py-2 px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Your Screen Share ID */}
        <div className="mb-5 p-4 rounded-2xl bg-pink-50/70 border border-pink-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-[#FF4D94] animate-pulse" />
              <span>Your Screen Share ID</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              🟢 Broadcasting Live
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3">
            Give this ID to your friend so they can mirror your study screen:
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-pink-200 font-mono font-extrabold text-base text-slate-900 tracking-wider flex items-center justify-between shadow-2xs">
              <span>{myPeerId}</span>
              <span className="text-xs font-sans text-slate-400 font-normal">({myUsername})</span>
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              className="px-3.5 py-2.5 bg-[#FF4D94] hover:bg-[#e62e76] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs shadow-pink-200 shrink-0"
              title="Copy ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2.5 bg-white hover:bg-pink-100/60 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Copy 1-Click Join Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Cast className="w-3.5 h-3.5" />}
              <span>Link</span>
            </button>
          </div>
        </div>

        {/* Section 2: Enter Friend's ID */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Enter Friend's ID to Watch Their Screen
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConnect();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={friendIdInput}
              onChange={(e) => {
                setFriendIdInput(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="e.g. BESTIE-ALEX or BESTIE-PRIYA"
              className="flex-1 px-4 py-3 text-sm font-mono font-bold tracking-wider text-slate-900 uppercase bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-[#20B2AA] focus:bg-white outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !friendIdInput.trim()}
              className="px-4 py-3 bg-[#20B2AA] hover:bg-[#199d96] text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-teal-100 shrink-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Watch Screen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {error && <p className="text-xs text-rose-500 font-semibold mt-1.5 px-1">{error}</p>}
        </div>

        {/* Section 3: Active Study Peers Online */}
        {peerList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Active Besties Studying Online</span>
              </span>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
                1-Click Connect
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {peerList.map((peer) => (
                <div
                  key={peer.peerId}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-200 flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {peer.username}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {peer.peerId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      📖 {peer.activeLessonTitle || 'Live Study Notes'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConnect(peer.peerId)}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg bg-white group-hover:bg-[#20B2AA] text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-transparent text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <span>Watch</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How Screen Switching Works Tip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <span>
            <strong>Screen Switching:</strong> Once connected, either peer can hit <em>"Switch Screen"</em> anytime to swap who is broadcasting!
          </span>
        </div>
      </div>
    </div>
  );
};
