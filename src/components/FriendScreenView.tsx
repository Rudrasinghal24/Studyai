import React, { useState } from 'react';
import {
  Radio,
  ArrowRightLeft,
  Download,
  X,
  Volume2,
  VolumeX,
  PenTool,
  Copy,
  Check,
  Eye,
  CheckCircle2,
  XCircle,
  BookOpen,
  Send,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PeerScreenState } from '../types';
import { renderMarkdown, parseSelfTestQuestions } from '../utils/lessonParser';

interface FriendScreenViewProps {
  friendScreen: PeerScreenState;
  onSwitchToMyScreen: () => void;
  onCloneNotes: () => void;
  onDisconnect: () => void;
  onOpenExport: (markdown: string) => void;
  onPlayVoice: (text: string) => void;
  isPlayingAudio: boolean;
  fontSize: 'normal' | 'large';
  onSendFollowUpToBestie?: (query: string) => void;
}

export const FriendScreenView: React.FC<FriendScreenViewProps> = ({
  friendScreen,
  onSwitchToMyScreen,
  onCloneNotes,
  onDisconnect,
  onOpenExport,
  onPlayVoice,
  isPlayingAudio,
  fontSize,
  onSendFollowUpToBestie,
}) => {
  const [copied, setCopied] = useState(false);
  const [revealedQuiz, setRevealedQuiz] = useState<Record<string, boolean>>({});
  const [quizScore, setQuizScore] = useState<Record<string, 'correct' | 'review'>>({});
  const [friendFollowUp, setFriendFollowUp] = useState('');

  const quizItems = friendScreen.markdown
    ? parseSelfTestQuestions(friendScreen.markdown)
    : [];

  const handleCopyMarkdown = async () => {
    if (!friendScreen.markdown) return;
    try {
      await navigator.clipboard.writeText(friendScreen.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleMarkQuiz = (id: string, score: 'correct' | 'review') => {
    setQuizScore((prev) => ({ ...prev, [id]: score }));
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendFollowUp.trim() || !onSendFollowUpToBestie) return;
    onSendFollowUpToBestie(friendFollowUp.trim());
    setFriendFollowUp('');
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      {/* 1. SCREEN SHARE CONTROLLER BAR */}
      <div className="w-full bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-teal-200/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full">
                LIVE SCREEN MIRROR
              </span>
              <span className="text-xs font-mono text-teal-100 font-bold">
                {friendScreen.peerId}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold mt-0.5 text-white flex items-center gap-2">
              <span>{friendScreen.username}'s Study Screen</span>
              <span className="text-xs font-normal opacity-90">
                ({friendScreen.mode === 'deep_dive' ? '🔬 Deep Dive' : '🧸 Bestie Mode'})
              </span>
            </h2>
          </div>
        </div>

        {/* Action Controls: Switch Screen, Clone Notes, Exit */}
        <div className="flex flex-wrap items-center gap-2">
          {/* THE CRITICAL SWITCH SCREEN BUTTON */}
          <button
            type="button"
            onClick={onSwitchToMyScreen}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-teal-900 text-xs font-extrabold shadow-md hover:bg-teal-50 active:scale-95 transition-all cursor-pointer"
            title="Switch roles: broadcast your study screen to your friend instead"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#FF4D94]" />
            <span>Switch Screen: Broadcast Mine 🔄</span>
          </button>

          {/* Clone Notes to My Screen */}
          <button
            type="button"
            onClick={onCloneNotes}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-teal-700/80 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer"
            title="Import this study material into your own study session"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Clone to My Space</span>
          </button>

          {/* Disconnect */}
          <button
            type="button"
            onClick={onDisconnect}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
            title="Exit friend screen share"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. FRIEND'S ACTIVE VIDEO CARD (if studying a YouTube video) */}
      {friendScreen.video && (
        <div className="w-full bg-white rounded-3xl p-5 shadow-lg border border-teal-100 flex items-center gap-4 animate-in slide-in-from-top-1">
          <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-2xl overflow-hidden bg-slate-900 shrink-0 shadow-xs">
            <img
              src={friendScreen.video.thumbnailUrl}
              alt={friendScreen.video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                ▶
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                Now Watching Together
              </span>
              <span className="text-xs text-slate-400 font-semibold truncate">
                {friendScreen.video.author}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800 line-clamp-2">
              {friendScreen.video.title}
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <a
                href={
                  friendScreen.video.canonicalUrl ||
                  `https://www.youtube.com/watch?v=${friendScreen.video.videoId}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 hover:underline"
              >
                <span>Open video in YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. FRIEND'S SCRATCHPAD NOTES (if any) */}
      {friendScreen.notes && friendScreen.notes.trim() && (
        <div className="w-full bg-amber-50/90 rounded-3xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
            <BookOpen className="w-4 h-4 text-amber-700" />
            <span>{friendScreen.username}'s Scratchpad Notes:</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-950 font-medium whitespace-pre-wrap bg-white/70 p-3 rounded-2xl border border-amber-200/60">
            {friendScreen.notes}
          </p>
        </div>
      )}

      {/* 4. FRIEND'S LESSON MATERIAL (The Main Markdown Content) */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-100/40 border border-teal-100/80">
        {friendScreen.markdown ? (
          <div>
            {/* Toolbar for Audio, Export, and Copy */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPlayVoice(friendScreen.markdown)}
                  className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen to Bestie Narration</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Material Button */}
                <button
                  type="button"
                  onClick={() => onOpenExport(friendScreen.markdown)}
                  className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-100/70 hover:bg-pink-200/80 border border-pink-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#FF4D94]" />
                  <span>Download PDF · JPG · Notes</span>
                </button>

                {/* Copy Markdown */}
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Copy markdown"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Markdown Body */}
            <div
              className={`markdown-body ${
                fontSize === 'large' ? 'text-base leading-loose' : 'text-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(friendScreen.markdown) }}
            />

            {/* Interactive Self-Test Accordion (if self-test questions are present) */}
            {quizItems.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Live Co-Study Quiz: Test Each Other!</span>
                </div>
                {quizItems.map((q, idx) => {
                  const isRev = revealedQuiz[q.id];
                  const score = quizScore[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500">
                          Question #{idx + 1}
                        </span>
                        {score && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              score === 'correct'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {score === 'correct' ? 'Mastered! ✓' : 'Needs Review'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-2.5">
                        {q.question}
                      </p>
                      {!isRev ? (
                        <button
                          type="button"
                          onClick={() => setRevealedQuiz((prev) => ({ ...prev, [q.id]: true }))}
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal Answer</span>
                        </button>
                      ) : (
                        <div className="pt-2 border-t border-teal-100">
                          <div
                            className="text-xs text-slate-700 markdown-body mb-2.5"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(q.answer) }}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkQuiz(q.id, 'review')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3 text-amber-500" />
                              <span>Need Review</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkQuiz(q.id, 'correct')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-white" />
                              <span>Got it!</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-2xl mb-3">
              👀
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Waiting for {friendScreen.username} to load study material...
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Your friend is currently setting up a lecture or topic. Their screen will appear here automatically!
            </p>
            <button
              type="button"
              onClick={onSwitchToMyScreen}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switch and Broadcast Your Screen Instead</span>
            </button>
          </div>
        )}

        {/* 5. ASK BESTIE QUESTION ABOUT FRIEND'S MATERIAL */}
        {friendScreen.markdown && onSendFollowUpToBestie && (
          <form
            onSubmit={handleFollowUpSubmit}
            className="flex items-center gap-2 pt-5 mt-6 border-t border-slate-100"
          >
            <input
              type="text"
              value={friendFollowUp}
              onChange={(e) => setFriendFollowUp(e.target.value)}
              placeholder={`Ask Bestie to explain ${friendScreen.username}'s topic further...`}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-full outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!friendFollowUp.trim()}
              className="p-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
