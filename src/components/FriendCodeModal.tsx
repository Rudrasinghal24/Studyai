import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
  Eye,
  Clock,
} from 'lucide-react';

interface SharedLesson {
  id: string;
  title: string;
  markdown: string;
  notes?: string;
  mode: string;
  authorName: string;
  createdAt: number;
  views: number;
}

interface FriendCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLesson: (lesson: SharedLesson) => void;
  initialCode?: string;
}

export const FriendCodeModal: React.FC<FriendCodeModalProps> = ({
  isOpen,
  onClose,
  onLoadLesson,
  initialCode = '',
}) => {
  const [inputCode, setInputCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentShares, setRecentShares] = useState<any[]>([]);

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch recent shared guides
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/share-recent');
        const data = await res.json();
        if (data.success && data.recent) {
          setRecentShares(data.recent);
        }
      } catch {}
    };

    fetchRecent();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent, codeToUse?: string) => {
    if (e) e.preventDefault();
    const targetCode = (codeToUse || inputCode).trim().toUpperCase();

    if (!targetCode) {
      setError("Please enter your friend's study code!");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/share/${encodeURIComponent(targetCode)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Study note not found for this code.');
      }

      onLoadLesson(data.lesson);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not find study note. Ask your bestie for the code!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-pink-100 flex flex-col relative overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#20B2AA] to-[#0D9488] text-white flex items-center justify-center shadow-md shadow-teal-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Enter Friend's Study Code</span>
              <span className="text-base">🚀</span>
            </h2>
            <p className="text-xs text-slate-500">
              Sync notes directly from your study buddy with their unique ID
            </p>
          </div>
        </div>

        {/* Code Input Form */}
        <form onSubmit={handleSubmit} className="mb-5 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="e.g. BESTIE-AI101 or 7X9K2"
              className="w-full px-5 py-3.5 pr-28 text-base font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 uppercase bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-[#20B2AA] focus:bg-white outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputCode.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-[#20B2AA] hover:bg-[#199d96] text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Load</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-semibold px-1">{error}</p>
          )}
        </form>

        {/* Community / Recommended Peer Guides */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Available Peer Notes & Guides</span>
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {recentShares.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setInputCode(item.id);
                  handleSubmit(undefined, item.id);
                }}
                className="p-3 bg-slate-50 hover:bg-pink-50/60 rounded-2xl border border-slate-100 hover:border-pink-200 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-[#FF3385] bg-pink-100/80 px-2 py-0.5 rounded-md">
                      {item.id}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      by {item.authorName || 'Bestie'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-[#FF3385] transition-colors">
                    {item.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#FF3385] text-xs font-bold">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer tip */}
        <div className="mt-5 pt-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Need to share your own notes? Generate any topic and tap the <strong>Share</strong> button to get your unique code!
          </p>
        </div>
      </div>
    </div>
  );
};
