import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Users,
  Sparkles,
  QrCode,
  ExternalLink,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  notes?: string;
  title?: string;
  mode?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  markdown,
  notes,
  title,
  mode = 'bestie_mode',
}) => {
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [authorName, setAuthorName] = useState('Bestie Student');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !markdown) return;

    let isMounted = true;
    const generateShare = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'StudyBestie Masterclass Notes',
            markdown,
            notes: notes || '',
            mode,
            authorName,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create share code');

        if (isMounted) {
          setShareId(data.shareId);
          const currentOrigin = window.location.origin;
          setShareUrl(`${currentOrigin}?share=${data.shareId}`);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Could not generate share link');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    generateShare();

    return () => {
      isMounted = false;
    };
  }, [isOpen, markdown]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    if (!shareId) return;
    try {
      await navigator.clipboard.writeText(shareId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  const handleWhatsAppShare = () => {
    if (!shareId || !shareUrl) return;
    const text = encodeURIComponent(
      `Hey! Check out these StudyBestie notes for our study session! 🚀\n\nStudy Code: ${shareId}\nDirect Link: ${shareUrl}\n\n("Mai Samjha Dunga!")`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `StudyBestie Notes: ${title || 'Exam Prep'}`,
          text: `Check out these StudyBestie notes with Feynman intuition & desi analogies! Use code ${shareId}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-pink-100 flex flex-col relative overflow-hidden">
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF3385] to-[#20B2AA] text-white flex items-center justify-center shadow-md shadow-pink-200">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Share With Your Bestie</span>
              <span className="text-base">🤝</span>
            </h2>
            <p className="text-xs text-slate-500">
              Generate a unique Study ID to sync directly with your friend
            </p>
          </div>
        </div>

        {/* Body Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#FF3385] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              Generating your unique Bestie Study Code...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm mb-4">
            {error}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Unique Code Highlight Box */}
            <div className="bg-gradient-to-br from-pink-50 via-white to-teal-50 rounded-2xl p-5 border-2 border-pink-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-pink-600 bg-pink-100/80 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>UNIQUE CODE</span>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Your Friend's Unlock Code
              </span>

              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-wider text-slate-900 my-2 select-all py-1 px-3 bg-white/90 rounded-xl border border-pink-200/60 shadow-xs">
                {shareId}
              </div>

              <p className="text-xs text-slate-500 max-w-xs mb-3">
                Your friend can simply tap <strong>"Friend's Code"</strong> in their app and enter this code to load these exact notes!
              </p>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF4D94] hover:bg-[#E62E76] text-white text-xs font-bold transition-all shadow-md shadow-pink-200 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Unique Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Unique Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct URL Share Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Direct Share Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl font-mono outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Instant Social / Chat Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>💬 WhatsApp Share</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share App Options</span>
              </button>
            </div>

            {/* Pro-tip */}
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200/80 text-[11px] text-teal-800 flex items-start gap-2">
              <Users className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Study Group Tip:</strong> When your friend opens this code, they get the full interactive breakdown, handwritten preview, and can take the self-test quiz right alongside you!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
