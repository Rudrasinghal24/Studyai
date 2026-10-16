/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize,
  Minimize,
  Type,
  Edit2,
  Circle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Share2,
  Users,
  PenTool,
  Sparkles,
  BookOpen,
  Radio,
  Tv,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import fallbackStudyBuddiesImg from './assets/images/study_buddies_3d_1792179642733.jpg';
import { renderMarkdown, splitLessonSections, parseSelfTestQuestions } from './utils/lessonParser';
import { ExportModal } from './components/ExportModal';
import { ShareModal } from './components/ShareModal';
import { FriendCodeModal } from './components/FriendCodeModal';
import { LiveScreenBar } from './components/LiveScreenBar';
import { ScreenShareModal } from './components/ScreenShareModal';
import { FriendScreenView } from './components/FriendScreenView';
import { PeerScreenState } from './types';

interface DecodedVideoInfo {
  videoId: string;
  canonicalUrl: string;
  title: string;
  author: string;
  thumbnailUrl: string;
}

interface ChatMessage {
  id: string;
  sender: 'bestie' | 'user';
  text: string;
  time: string;
  isMarkdown?: boolean;
  video?: DecodedVideoInfo;
}

const BOY_QUOTES = [
  'Phod denge exam! 🚀',
  'You got this, bestie 💪',
  'Tension mat le, mai samjha dunga! 🔥',
  'Calculus ho ya code, we got this! 💻',
  'Chill bro, we are unstoppable! ⚡',
];

const GIRL_QUOTES = [
  'Slay that syllabus! ✨',
  'Ekdum perfect! 💯',
  'Time to ace this together! 💖',
  'Notes ready hai, let\'s go! 📖',
  'You\'re smarter than you think! 🌟',
];

export default function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [decodedVideo, setDecodedVideo] = useState<DecodedVideoInfo | null>(null);
  const [isDecodingYt, setIsDecodingYt] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [mode, setMode] = useState<'deep_dive' | 'bestie_mode'>('bestie_mode');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Floating Speech Bubble for Interactive Study Buddies
  const [activeQuote, setActiveQuote] = useState<{
    text: string;
    speaker: 'boy' | 'girl';
  } | null>(null);
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Floating Toolbar states
  const [isExpanded, setIsExpanded] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Messages stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bestie',
      text: "heyy 👋 drop a YouTube link or some files and I'll explain it all ✨",
      time: '01:05 AM',
      isMarkdown: false,
    },
  ]);

  const [followUp, setFollowUp] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Self-test quiz states
  const [revealedQuiz, setRevealedQuiz] = useState<Record<string, boolean>>({});
  const [quizScore, setQuizScore] = useState<Record<string, 'correct' | 'review'>>({});

  // Export, Share, and Friend Code Modal States
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeExportLesson, setActiveExportLesson] = useState<{
    markdown: string;
    title: string;
    notes?: string;
  } | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeShareLesson, setActiveShareLesson] = useState<{
    markdown: string;
    title: string;
    mode: string;
    notes?: string;
  } | null>(null);

  // Live Peer Screen Share & Switching States
  const [myPeerId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('studybestie_peer_id') : null;
    if (saved) return saved;
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const newId = `BESTIE-${code}`;
    if (typeof window !== 'undefined') localStorage.setItem('studybestie_peer_id', newId);
    return newId;
  });

  const [myUsername, setMyUsername] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('studybestie_username')) || 'Study Bestie ✨';
  });

  const [activeScreenMode, setActiveScreenMode] = useState<'my_screen' | 'friend_screen'>('my_screen');
  const [friendScreen, setFriendScreen] = useState<PeerScreenState | null>(null);
  const [isPeerSyncing, setIsPeerSyncing] = useState(false);
  const [screenShareModalOpen, setScreenShareModalOpen] = useState(false);

  const [friendCodeModalOpen, setFriendCodeModalOpen] = useState(false);
  const [loadedBanner, setLoadedBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const deriveTitle = (text: string) => {
    const match = text.match(/^#+\s*(?:1[\.:\)]?\s*)?(?:Asli\s+Mudda|The\s+Big\s+Picture)?[^\n]*\n+([^\n]+)/i);
    if (match && match[1]) {
      return match[1].replace(/[#*`]/g, '').trim().slice(0, 60);
    }
    const firstLine = text.split('\n').find((l) => l.trim().length > 3) || 'Study Notes';
    return firstLine.replace(/[#*`]/g, '').trim().slice(0, 60);
  };

  const handleUpdateUsername = (name: string) => {
    setMyUsername(name);
    if (typeof window !== 'undefined') localStorage.setItem('studybestie_username', name);
  };

  const handleSwitchScreen = async (targetMode?: 'my_screen' | 'friend_screen') => {
    if (!friendScreen) return;
    setIsPeerSyncing(true);
    try {
      const nextMode = targetMode || (activeScreenMode === 'friend_screen' ? 'my_screen' : 'friend_screen');
      const newPresenter = nextMode === 'my_screen' ? myPeerId : friendScreen.peerId;

      await fetch('/api/peer/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: myPeerId,
          targetId: friendScreen.peerId,
          newPresenterId: newPresenter,
        }),
      });

      setActiveScreenMode(nextMode);
      if (nextMode === 'my_screen') {
        setLoadedBanner(`Switched: You are now broadcasting your study screen to ${friendScreen.username}!`);
      } else {
        setLoadedBanner(`Switched: Now watching ${friendScreen.username}'s study screen!`);
      }
      setTimeout(() => setLoadedBanner(null), 4000);
    } catch (err) {
      console.error('Error switching screen:', err);
    } finally {
      setIsPeerSyncing(false);
    }
  };

  const handleConnectFriendScreen = async (friendId: string): Promise<boolean> => {
    setIsPeerSyncing(true);
    try {
      const res = await fetch(`/api/peer/${encodeURIComponent(friendId.trim())}`);
      const data = await res.json();
      if (data.success && data.screen) {
        setFriendScreen(data.screen);
        setActiveScreenMode('friend_screen');

        // Pair with friend on server and make friend the initial active presenter
        await fetch('/api/peer/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterId: myPeerId,
            targetId: data.screen.peerId,
            newPresenterId: data.screen.peerId,
          }),
        }).catch(() => {});

        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } catch {}
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsPeerSyncing(false);
    }
  };

  const handleRefreshFriendScreen = async () => {
    if (!friendScreen) return;
    setIsPeerSyncing(true);
    try {
      const res = await fetch(`/api/peer/${encodeURIComponent(friendScreen.peerId)}`);
      const data = await res.json();
      if (data.success && data.screen) {
        setFriendScreen(data.screen);
      }
    } catch {}
    finally {
      setIsPeerSyncing(false);
    }
  };

  const handleDisconnectFriend = () => {
    setFriendScreen(null);
    setActiveScreenMode('my_screen');
    setLoadedBanner('Exited screen share.');
    setTimeout(() => setLoadedBanner(null), 3000);
  };

  const handleImportFriendNotes = () => {
    if (!friendScreen) return;
    if (friendScreen.markdown) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: `imported-${Date.now()}`,
          sender: 'user',
          text: `Cloned friend's study screen: "${friendScreen.activeLessonTitle}"`,
          time: nowTime,
        },
        {
          id: `bestie-imported-${Date.now()}`,
          sender: 'bestie',
          text: friendScreen.markdown,
          time: nowTime,
          isMarkdown: true,
        },
      ]);
    }
    if (friendScreen.notes) {
      setNotesText(friendScreen.notes);
      setShowNotes(true);
    }
    setActiveScreenMode('my_screen');
    setLoadedBanner(`Cloned ${friendScreen.username}'s notes to your study space!`);
    setTimeout(() => setLoadedBanner(null), 4000);
  };

  const handleOpenExport = (markdown: string) => {
    setActiveExportLesson({
      markdown,
      title: deriveTitle(markdown),
      notes: notesText,
    });
    setExportModalOpen(true);
  };

  const handleOpenShare = (markdown: string) => {
    setActiveShareLesson({
      markdown,
      title: deriveTitle(markdown),
      mode,
      notes: notesText,
    });
    setShareModalOpen(true);
  };

  const handleLoadSharedLesson = (lesson: {
    id: string;
    title: string;
    markdown: string;
    notes?: string;
    mode?: string;
    authorName?: string;
  }) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `user-loaded-${Date.now()}`,
        sender: 'user',
        text: `Loaded friend's notes: "${lesson.title}" [Code: ${lesson.id}]`,
        time: nowTime,
        isMarkdown: false,
      },
      {
        id: `bestie-loaded-${Date.now()}`,
        sender: 'bestie',
        text: lesson.markdown,
        time: nowTime,
        isMarkdown: true,
      },
    ]);

    if (lesson.notes) {
      setNotesText(lesson.notes);
      setShowNotes(true);
    }

    if (lesson.mode === 'deep_dive' || lesson.mode === 'bestie_mode') {
      setMode(lesson.mode as any);
    }

    setLoadedBanner(`✨ Loaded note "${lesson.title}" shared by ${lesson.authorName || 'Bestie'} (${lesson.id})`);
    setTimeout(() => setLoadedBanner(null), 6000);

    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    } catch {}

    setTimeout(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareCode = urlParams.get('share') || urlParams.get('code') || urlParams.get('id');
    if (shareCode) {
      const fetchDirect = async () => {
        try {
          const res = await fetch(`/api/share/${encodeURIComponent(shareCode.trim().toUpperCase())}`);
          const data = await res.json();
          if (data.success && data.lesson) {
            handleLoadSharedLesson(data.lesson);
          }
        } catch (err) {
          console.error('Auto-load share error:', err);
        }
      };
      fetchDirect();
    }

    // Direct Screen Share connect from URL query
    const peerParam = urlParams.get('screenshare') || urlParams.get('peer') || urlParams.get('watch');
    if (peerParam) {
      handleConnectFriendScreen(peerParam);
    }
  }, []);

  // Periodic broadcast of our study screen state
  useEffect(() => {
    const broadcastState = async () => {
      try {
        const latestLesson = [...messages].reverse().find((m) => m.sender === 'bestie' && m.isMarkdown);
        const currentMarkdown = latestLesson?.text || '';
        const title = currentMarkdown ? deriveTitle(currentMarkdown) : (decodedVideo?.title || 'Live Study Session');

        const syncRes = await fetch('/api/peer/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peerId: myPeerId,
            username: myUsername,
            activeLessonTitle: title,
            markdown: currentMarkdown,
            notes: notesText,
            mode,
            video: decodedVideo,
            messages,
            pairedPeerId: friendScreen?.peerId,
            activePresenterId: friendScreen
              ? (activeScreenMode === 'my_screen' ? myPeerId : friendScreen.peerId)
              : myPeerId,
          }),
        });
        const syncData = await syncRes.json();
        // If another peer entered our ID and paired with us:
        if (
          syncData.success &&
          syncData.pairedPeerId &&
          (!friendScreen || friendScreen.peerId !== syncData.pairedPeerId)
        ) {
          const friendRes = await fetch(`/api/peer/${encodeURIComponent(syncData.pairedPeerId)}`);
          const friendData = await friendRes.json();
          if (friendData.success && friendData.screen) {
            setFriendScreen(friendData.screen);
            setLoadedBanner(`🎉 ${friendData.screen.username} connected to your live study screen!`);
            setTimeout(() => setLoadedBanner(null), 5000);
            try {
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
            } catch {}
          }
        }
      } catch {}
    };

    broadcastState();
    const timer = setInterval(broadcastState, 2800);
    return () => clearInterval(timer);
  }, [myPeerId, myUsername, messages, notesText, mode, decodedVideo, friendScreen?.peerId, activeScreenMode]);

  // Periodic poll of friend's screen when connected
  useEffect(() => {
    if (!friendScreen) return;

    const pollFriend = async () => {
      try {
        const res = await fetch(`/api/peer/${encodeURIComponent(friendScreen.peerId)}`);
        const data = await res.json();
        if (data.success && data.screen) {
          setFriendScreen(data.screen);

          // Detect if friend switched the presenter!
          if (data.screen.activePresenterId) {
            if (data.screen.activePresenterId === myPeerId && activeScreenMode === 'friend_screen') {
              setActiveScreenMode('my_screen');
              setLoadedBanner(`Screen switched! You are now presenting to ${data.screen.username}`);
              setTimeout(() => setLoadedBanner(null), 4000);
            } else if (data.screen.activePresenterId === friendScreen.peerId && activeScreenMode === 'my_screen') {
              setActiveScreenMode('friend_screen');
              setLoadedBanner(`Screen switched! Now watching ${data.screen.username}'s study screen`);
              setTimeout(() => setLoadedBanner(null), 4000);
            }
          }
        }
      } catch {}
    };

    const timer = setInterval(pollFriend, 1800);
    return () => clearInterval(timer);
  }, [friendScreen?.peerId, activeScreenMode, myPeerId]);

  // Automatic YouTube URL live decoding with debounce
  useEffect(() => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setDecodedVideo(null);
      setDecodeError(null);
      setIsDecodingYt(false);
      return;
    }

    const looksLikeYt =
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      /^[a-zA-Z0-9_\-]{11}$/.test(trimmed);

    if (!looksLikeYt) {
      setDecodedVideo(null);
      setDecodeError(null);
      setIsDecodingYt(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsDecodingYt(true);
      setDecodeError(null);
      try {
        const res = await fetch(`/api/decode-yt?url=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success && data.video) {
          setDecodedVideo(data.video);
          setErrorMsg(null);
        } else {
          setDecodeError(data.error || 'Could not decode this YouTube link');
        }
      } catch (err: any) {
        setDecodeError('Failed to fetch video details');
      } finally {
        setIsDecodingYt(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [youtubeUrl]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.copy-code-btn') as HTMLButtonElement | null;
      if (!target) return;

      const base64Code = target.getAttribute('data-code');
      if (base64Code) {
        try {
          const rawCode = decodeURIComponent(atob(base64Code));
          navigator.clipboard.writeText(rawCode);
          const originalHtml = target.innerHTML;
          target.innerHTML = `<span class="text-emerald-400 font-bold">Copied! ✓</span>`;
          setTimeout(() => {
            target.innerHTML = originalHtml;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      if (audioRef.current) audioRef.current.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, []);

  // Handle Boy (Left) click
  const handleBoyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const randomQuote = BOY_QUOTES[Math.floor(Math.random() * BOY_QUOTES.length)];
    triggerSpeechBubble(randomQuote, 'boy');
  };

  // Handle Girl (Right) click
  const handleGirlClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const randomQuote = GIRL_QUOTES[Math.floor(Math.random() * GIRL_QUOTES.length)];
    triggerSpeechBubble(randomQuote, 'girl');
  };

  const triggerSpeechBubble = (text: string, speaker: 'boy' | 'girl') => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setActiveQuote({ text, speaker });
    quoteTimerRef.current = setTimeout(() => {
      setActiveQuote(null);
    }, 3000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      setUploadedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = youtubeUrl.trim();

    if (!query && uploadedFiles.length === 0) {
      setErrorMsg('Please enter a YouTube link or attach study material!');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userPrompt = decodedVideo
      ? `🎬 ${decodedVideo.title} • ${decodedVideo.author}`
      : query || `Attached files: ${uploadedFiles.map((f) => f.name).join(', ')}`;

    const currentDecodedVideo = decodedVideo;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userPrompt,
        time: nowTime,
        isMarkdown: false,
        video: currentDecodedVideo || undefined,
      },
    ]);

    let fileContent = '';
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          const text = await file.text();
          fileContent += `\n\n[File: ${file.name}]\n${text.slice(0, 5000)}`;
        } catch {
          fileContent += `\n[File attached: ${file.name}]`;
        }
      }
    }

    const modePrompt =
      mode === 'bestie_mode'
        ? '\n\n[Instruction: Bestie Mode (Explain Like I\'m 5): Use relatable, fun analogies, conversational Hinglish banter (mai samjha dunga), and zero dry academic jargon while maintaining rock-solid intuition.]'
        : '\n\n[Instruction: Deep Dive Mode: Provide full university-grade depth, mathematical equations/proofs, and step-by-step mechanisms while keeping your witty Bestie persona.]';

    const payloadMaterial = (query ? `${query}\n` : '') + fileContent;

    try {
      const res = await fetch('/api/educate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: payloadMaterial.trim() || 'Please teach this material.',
          materialType: query.includes('youtube.com') || query.includes('youtu.be') ? 'youtube_transcript' : 'custom',
          learnerLevel: mode === 'deep_dive' ? 'advanced' : 'undergraduate',
          specificQuestions: modePrompt,
        }),
      });

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned error (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to explain material');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bestie-resp-${Date.now()}`,
          sender: 'bestie',
          text: data.lessonMarkdown || 'Tension mat lo, here is your breakdown!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMarkdown: true,
          video: data.video || currentDecodedVideo || undefined,
        },
      ]);

      setYoutubeUrl('');
      setDecodedVideo(null);
      setUploadedFiles([]);
    } catch (err: any) {
      console.error('Error in educate API:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bestie-err-${Date.now()}`,
          sender: 'bestie',
          text: `Arrey yaar, connection hiccup occurred (${err?.message || 'Error'}). Send the link once more, mai yahi hoon!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMarkdown: false,
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handleSendFollowUp = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const query = (directQuery || followUp).trim();
    if (!query || isFollowUpLoading) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `user-followup-${Date.now()}`,
        sender: 'user',
        text: query,
        time: nowTime,
        isMarkdown: false,
      },
    ]);
    setFollowUp('');
    setIsFollowUpLoading(true);

    const lastLesson = [...messages].reverse().find((m) => m.isMarkdown)?.text || '';

    try {
      const res = await fetch('/api/ask-educator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          lessonContext: lastLesson.slice(0, 7000),
          conversationHistory: messages.slice(-5).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text.slice(0, 1000),
          })),
        }),
      });

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || 'Server error');

      setMessages((prev) => [
        ...prev,
        {
          id: `bestie-followup-${Date.now()}`,
          sender: 'bestie',
          text: data.reply || 'Dekho simple si baat hai, tension mat lo!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMarkdown: true,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bestie-err-${Date.now()}`,
          sender: 'bestie',
          text: 'Arrey network glitch ho gaya! Ask me again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMarkdown: false,
        },
      ]);
    } finally {
      setIsFollowUpLoading(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handlePlayVoice = async (text: string) => {
    if (isPlayingAudio) {
      if (audioRef.current) audioRef.current.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setAudioNotice('Connecting voice...');
    try {
      const cleanText = text.replace(/[#*`_\[\]]/g, '').slice(0, 1200);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: 'Puck',
        }),
      });

      if (!res.ok) throw new Error('TTS API issue');

      const data = await res.json();
      if (data.audioBase64) {
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = `data:audio/wav;base64,${data.audioBase64}`;
        audioRef.current.onended = () => {
          setIsPlayingAudio(false);
          setAudioNotice(null);
        };
        audioRef.current.onerror = () => {
          fallbackSpeech(cleanText);
        };
        await audioRef.current.play();
        setIsPlayingAudio(true);
        setAudioNotice(null);
      } else {
        fallbackSpeech(cleanText);
      }
    } catch {
      fallbackSpeech(text.replace(/[#*`_\[\]]/g, '').slice(0, 500));
    }
  };

  const fallbackSpeech = (cleanText: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleanText);
      u.rate = 1.02;
      u.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel'))
      );
      if (preferredVoice) {
        u.voice = preferredVoice;
      }

      u.onstart = () => {
        setIsPlayingAudio(true);
        setAudioNotice('Bestie speaking... 🎙️');
      };
      u.onend = () => {
        setIsPlayingAudio(false);
        setAudioNotice(null);
      };
      u.onerror = () => {
        setIsPlayingAudio(false);
        setAudioNotice(null);
      };
      window.speechSynthesis.speak(u);
    } else {
      setIsPlayingAudio(false);
      setAudioNotice('Speech not supported on this browser');
      setTimeout(() => setAudioNotice(null), 2500);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleDownload = (text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyBestie_Notes_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMarkQuiz = (id: string, score: 'correct' | 'review') => {
    setQuizScore((prev) => ({ ...prev, [id]: score }));
    if (score === 'correct') {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFE6F0] to-[#FFF5F8] p-4 sm:p-8 flex flex-col items-center justify-start">
      {/* 1. BACKGROUND & MAIN LAYOUT: Centered column, max-width around max-w-3xl */}
      <div
        className={`w-full transition-all duration-300 flex flex-col items-center ${
          isExpanded ? 'max-w-4xl' : 'max-w-3xl'
        }`}
      >
        {/* Live Bestie ID & Screen Share Bar (Always visible at top) */}
        <LiveScreenBar
          myPeerId={myPeerId}
          myUsername={myUsername}
          onUpdateUsername={handleUpdateUsername}
          friendScreen={friendScreen}
          activeScreenMode={activeScreenMode}
          activePresenterId={friendScreen?.activePresenterId}
          isPeerSyncing={isPeerSyncing}
          onOpenScreenShareModal={() => setScreenShareModalOpen(true)}
          onConnectFriendId={handleConnectFriendScreen}
          onSwitchScreen={() => handleSwitchScreen()}
          onDisconnect={handleDisconnectFriend}
          onRefresh={handleRefreshFriendScreen}
        />

        {/* If Watching Friend's Screen: Render Mirrored Study View */}
        {activeScreenMode === 'friend_screen' && friendScreen ? (
          <FriendScreenView
            friendScreen={friendScreen}
            onSwitchToMyScreen={() => handleSwitchScreen('my_screen')}
            onCloneNotes={handleImportFriendNotes}
            onDisconnect={handleDisconnectFriend}
            onOpenExport={handleOpenExport}
            onPlayVoice={handlePlayVoice}
            isPlayingAudio={isPlayingAudio}
            fontSize={fontSize}
            onSendFollowUpToBestie={(query) => {
              setFollowUp(query);
              setTimeout(() => {
                handleSendFollowUp(undefined, query);
                setActiveScreenMode('my_screen');
              }, 100);
            }}
          />
        ) : (
          <>
            {/* 2. INTERACTIVE STUDY BUDDIES (Top Section) */}
            <div className="relative flex flex-col items-center justify-center mb-6 w-full">
          {/* Floating White Pill Above the Image */}
          <div className="flex flex-col items-center gap-1 mb-2 z-20">
            <span className="px-5 py-1 rounded-full bg-white shadow-xs border border-pink-100 text-[11px] font-mono-code font-bold tracking-widest text-slate-700 uppercase">
              STUDY BUDDIES
            </span>
            <span className="text-xs font-semibold text-[#FF4D94]">
              tap the besties 👋
            </span>
          </div>

          {/* Character Container with Interactive Left & Right Zones */}
          <div className="relative w-64 sm:w-72 md:w-80 h-auto rounded-3xl overflow-visible select-none">
            {/* The 3D Study Buddies Image: Uses direct user URL from ibb.co with local fallback */}
            <img
              src="https://i.ibb.co/RTZPsNgW/besties-Cx-JNHtpd.png"
              onError={(e) => {
                // Fallback to local 3D render if network drops
                (e.target as HTMLImageElement).src = fallbackStudyBuddiesImg;
              }}
              alt="Study Buddies"
              className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
            />

            {/* Floating Speech Bubble State */}
            {activeQuote && (
              <div
                className={`absolute -top-7 z-30 transform -translate-y-full transition-all duration-200 pointer-events-none ${
                  activeQuote.speaker === 'boy' ? 'left-2 sm:left-4' : 'right-2 sm:right-4'
                }`}
              >
                <div className="relative bg-white text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg border border-pink-200 flex items-center gap-1.5 whitespace-nowrap animate-in zoom-in-90 fade-in duration-150">
                  <span>{activeQuote.speaker === 'boy' ? '👦' : '👧'}</span>
                  <span>"{activeQuote.text}"</span>
                  {/* Bubble pointer triangle */}
                  <div
                    className={`absolute bottom-[-6px] w-3 h-3 bg-white border-b border-r border-pink-200 transform rotate-45 ${
                      activeQuote.speaker === 'boy' ? 'left-8' : 'right-8'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Left 50% Interactive Zone (Boy) */}
            <div
              onClick={handleBoyClick}
              onContextMenu={(e) => {
                e.preventDefault();
                handleBoyClick(e);
              }}
              className="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10 transition-colors hover:bg-emerald-400/5 rounded-l-3xl"
              title="Click the Boy: 'Phod denge exam!'"
            />

            {/* Right 50% Interactive Zone (Girl) */}
            <div
              onClick={handleGirlClick}
              onContextMenu={(e) => {
                e.preventDefault();
                handleGirlClick(e);
              }}
              className="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10 transition-colors hover:bg-pink-400/5 rounded-r-3xl"
              title="Click the Girl: 'Slay that syllabus!'"
            />
          </div>
        </div>

        {/* Banner when note is loaded from a friend */}
        {loadedBanner && (
          <div className="w-full mb-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{loadedBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setLoadedBanner(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. HEADER ROW: Left side StudyBestie pink-to-teal gradient, Right side Friend Code & toggle pill */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
          {/* Left: StudyBestie Text Gradient Logo & Tagline */}
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gradient-logo font-sans select-none">
              StudyBestie
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5 font-sans">
              "Mai Samjha Dunga!" • AI Study Buddy & Peer Sync
            </p>
          </div>

          {/* Right: Friend's Code Button + Pill-Shaped Toggle Switch */}
          <div className="flex items-center gap-2">
            {/* Friend's Code Button */}
            <button
              type="button"
              onClick={() => setFriendCodeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/90 hover:bg-white text-teal-800 border border-teal-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
              title="Enter your friend's unique study code or open peer notes"
            >
              <Users className="w-3.5 h-3.5 text-[#20B2AA] group-hover:scale-110 transition-transform" />
              <span>Friend's Code</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Pill-Shaped Toggle Switch */}
            <div className="flex items-center bg-white/80 backdrop-blur-sm p-1 rounded-full border border-pink-200/60 shadow-xs">
              <button
                type="button"
                onClick={() => setMode('deep_dive')}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'deep_dive'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 bg-transparent'
                }`}
              >
                <span>🔬</span>
                <span>Deep Dive</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('bestie_mode')}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'bestie_mode'
                    ? 'bg-[#FF4D94] text-white shadow-md shadow-pink-300/60'
                    : 'text-slate-400 hover:text-slate-600 bg-transparent'
                }`}
              >
                <span>🧸</span>
                <span>Bestie Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. MAIN INPUT CARD: Large white container, rounded-3xl, subtle pink shadow */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-pink-100/50 mb-3 relative border border-pink-50">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* a) Label: YOUTUBE VIDEO / PLAYLIST with Quick Test buttons */}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-mono-code font-bold uppercase tracking-wider text-[#20B2AA]">
                YOUTUBE VIDEO / TOPIC LINK
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                <span className="text-slate-400">Try sample:</span>
                <button
                  type="button"
                  onClick={() => setYoutubeUrl('https://www.youtube.com/watch?v=aircAruvnKk')}
                  className="text-pink-600 hover:text-pink-800 hover:underline cursor-pointer"
                >
                  Neural Networks
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setYoutubeUrl('https://www.youtube.com/watch?v=IHZwWFHWa-w')}
                  className="text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                >
                  Gradient Descent
                </button>
              </div>
            </div>

            {/* b) Input: Rounded-2xl bordered text field for YouTube URL */}
            <div className="relative">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isAnalyzing}
                placeholder="https://youtube.com/watch?v=... or youtu.be/..."
                className="w-full px-5 py-3.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-white rounded-2xl border border-slate-200 focus:border-[#20B2AA] focus:ring-2 focus:ring-[#20B2AA]/20 outline-none transition-all"
              />
              {youtubeUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setYoutubeUrl('');
                    setDecodedVideo(null);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Decoding Status */}
            {isDecodingYt && (
              <div className="flex items-center gap-2 p-2.5 bg-pink-50/80 border border-pink-200/80 rounded-xl text-xs font-semibold text-pink-700 animate-in fade-in">
                <div className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Bestie is decoding your YouTube video & extracting lecture topics...</span>
              </div>
            )}

            {/* Decoded Video Preview Card */}
            {decodedVideo && !isDecodingYt && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50/90 via-white to-teal-50/90 rounded-2xl border-2 border-pink-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden shadow-xs bg-slate-900 shrink-0">
                  <img
                    src={decodedVideo.thumbnailUrl}
                    alt={decodedVideo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${decodedVideo.videoId}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                      ▶
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ✓ Decoded Link
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 truncate">
                      {decodedVideo.author}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {decodedVideo.title}
                  </h4>
                  <p className="text-[11px] text-[#FF4D94] font-medium mt-0.5">
                    Ready for Study Bestie Feynman breakdown! 🚀
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setYoutubeUrl('');
                    setDecodedVideo(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
                  title="Remove video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {decodeError && !isDecodingYt && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                <span>⚠️ {decodeError}</span>
                <span className="text-[11px] text-rose-500">Check the URL or attach notes below</span>
              </div>
            )}

            {/* c) Upload Zone: Dashed grey border, rounded-2xl, 📁, text and subtext */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-[#20B2AA] bg-[#F0FDF4]'
                  : 'border-slate-200 hover:border-pink-300 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.pptx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-3xl mb-2 select-none">📁</span>
              <p className="text-sm font-semibold text-slate-700">
                Drag & drop or tap to upload
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF · JPG · PNG · PPTX
              </p>

              {uploadedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {uploadedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                    >
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-medium px-1">{errorMsg}</p>
            )}

            {/* 4. BUTTON: Overlapping bottom, smooth linear gradient soft pink to soft mint green */}
            <button
              type="submit"
              disabled={isAnalyzing}
              className="button-gradient-pink-mint w-full py-4 rounded-2xl font-bold text-base text-white shadow-md shadow-pink-200/50 flex items-center justify-center gap-2 cursor-pointer transition-transform disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Bestie is preparing your lesson...</span>
                </>
              ) : (
                <span>✨ Explain it to me</span>
              )}
            </button>
          </form>
        </div>

        {/* 4. FLOATING TOOLBAR: Tiny white pill-shaped toolbar with 4 icons */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white shadow-md border border-slate-100">
            {/* Maximize */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-500 hover:text-[#FF3385] p-1 rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Maximize container width'}
            >
              {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Type */}
            <button
              type="button"
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                fontSize === 'large' ? 'text-[#FF3385]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toggle font size"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Edit2 */}
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                showNotes ? 'text-[#20B2AA]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Quick notes scratchpad"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Circle */}
            <button
              type="button"
              onClick={() => {
                chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-slate-500 hover:text-[#20B2AA] p-1 rounded-lg transition-colors cursor-pointer"
              title="Scroll to conversation"
            >
              <Circle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scratchpad Drawer */}
        {showNotes && (
          <div className="w-full bg-amber-50/80 rounded-2xl p-4 border border-amber-200 mb-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900">
                Exam Scratchpad Notes:
              </span>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-xs text-amber-800 hover:underline"
              >
                Close
              </button>
            </div>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Jot down quick formulas, mnemonics, or key points..."
              className="w-full p-2.5 text-xs text-slate-800 bg-white border border-amber-200 rounded-xl outline-none"
            />
          </div>
        )}

        {/* 5. BESTIE CHAT CONTAINER */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-pink-100/50 relative border border-pink-50 flex flex-col min-h-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF3385] to-[#FF85A2] flex items-center justify-center text-white text-base shadow-xs">
                💖
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <span>Bestie</span>
                  <span className="text-[#FF3385]">💖</span>
                </h3>
                <span className="text-xs font-semibold text-emerald-500">online</span>
              </div>
            </div>

            {audioNotice && (
              <span className="text-xs text-slate-400 animate-pulse">{audioNotice}</span>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-4 mb-6">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              const parsedSections = m.isMarkdown ? splitLessonSections(m.text) : null;
              const quizItems = m.isMarkdown
                ? parseSelfTestQuestions(parsedSections?.selfTest || m.text)
                : [];

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#ECFDF5] border border-[#D1FAE5] text-[#065F46] rounded-tr-xs'
                        : 'bg-[#FDF2F8] border border-[#FCE7F3] text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {!m.isMarkdown ? (
                      <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Audio & Export Toolbar */}
                        <div className="flex items-center justify-between pb-2 border-b border-pink-200/60 mb-2">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(m.text)}
                            className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                          >
                            {isPlayingAudio ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Stop Voice</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen to Bestie</span>
                              </>
                            )}
                          </button>

                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {/* Share with Friend Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenShare(m.text)}
                              className="flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
                              title="Share unique ID with your friend"
                            >
                              <Share2 className="w-3 h-3 text-[#20B2AA]" />
                              <span>Share ID</span>
                            </button>

                            {/* Export / Handwritten Notes Download Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenExport(m.text)}
                              className="flex items-center gap-1 text-[11px] font-bold text-pink-700 bg-pink-100/70 hover:bg-pink-200/80 border border-pink-200 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
                              title="Download as PDF, JPG, or Handwritten Notebook"
                            >
                              <PenTool className="w-3 h-3 text-[#FF4D94]" />
                              <span>PDF · JPG · Notes</span>
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(m.id, m.text)}
                              className="text-slate-500 hover:text-slate-800 p-1 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                              title="Copy raw markdown text"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Markdown Lesson Content */}
                        <div
                          className={`markdown-body ${
                            fontSize === 'large' ? 'text-base leading-loose' : 'text-sm'
                          }`}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                        />

                        {/* Interactive Self-Test Accordion */}
                        {quizItems.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-pink-200/60 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-pink-800">
                              📝 Test Yourself Yaar!
                            </div>
                            {quizItems.map((q, idx) => {
                              const isRev = revealedQuiz[q.id];
                              const score = quizScore[q.id];
                              return (
                                <div
                                  key={q.id}
                                  className="p-3.5 rounded-xl bg-white border border-pink-100"
                                >
                                  <div className="flex items-center justify-between mb-1">
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
                                        {score === 'correct' ? 'Mastered!' : 'Needs Review'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                                    {q.question}
                                  </p>
                                  {!isRev ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealedQuiz((prev) => ({ ...prev, [q.id]: true }))
                                      }
                                      className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Reveal Answer</span>
                                    </button>
                                  ) : (
                                    <div className="pt-2 border-t border-slate-100">
                                      <div
                                        className="text-xs text-slate-700 markdown-body mb-2"
                                        dangerouslySetInnerHTML={{
                                          __html: renderMarkdown(q.answer),
                                        }}
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleMarkQuiz(q.id, 'review')}
                                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                                        >
                                          <XCircle className="w-3 h-3 text-amber-500" />
                                          <span>Need Review</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkQuiz(q.id, 'correct')}
                                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white flex items-center gap-1"
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
                    )}

                    <div className="text-[10px] text-slate-400 text-right mt-1.5 font-mono-code">
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {isFollowUpLoading && (
              <div className="flex items-center gap-2 text-xs text-pink-600 font-semibold p-3 bg-pink-50/70 rounded-2xl w-fit">
                <div className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span>Bestie is typing...</span>
              </div>
            )}

            <div ref={chatScrollRef} />
          </div>

          {/* Follow-up question input */}
          <form
            onSubmit={handleSendFollowUp}
            className="flex items-center gap-2 pt-3 border-t border-slate-100"
          >
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              disabled={isFollowUpLoading}
              placeholder="Ask Bestie anything... (e.g. aur simple desi analogy do na!)"
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-[#F8FAFC] border border-slate-200 focus:border-[#FF3385] rounded-full outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!followUp.trim() || isFollowUpLoading}
              className="p-2.5 rounded-full bg-[#FF3385] hover:bg-[#E62E76] text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </>
    )}

    {/* 6. MODALS: Export (Multi-Page PDF/JPG/ZIP), Share (Unique ID), Friend Code Sync, Live Screen Share */}
    {activeExportLesson && (
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setActiveExportLesson(null);
        }}
        markdown={activeExportLesson.markdown}
        title={activeExportLesson.title}
        notes={activeExportLesson.notes}
      />
    )}

    {activeShareLesson && (
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setActiveShareLesson(null);
        }}
        markdown={activeShareLesson.markdown}
        title={activeShareLesson.title}
        mode={activeShareLesson.mode}
        notes={activeShareLesson.notes}
      />
    )}

    <FriendCodeModal
      isOpen={friendCodeModalOpen}
      onClose={() => setFriendCodeModalOpen(false)}
      onLoadLesson={handleLoadSharedLesson}
    />

    <ScreenShareModal
      isOpen={screenShareModalOpen}
      onClose={() => setScreenShareModalOpen(false)}
      myPeerId={myPeerId}
      myUsername={myUsername}
      onConnectPeer={handleConnectFriendScreen}
      activeFriendScreen={friendScreen}
      onSwitchScreen={() => handleSwitchScreen()}
      onDisconnect={handleDisconnectFriend}
    />
  </div>
</div>
);
}

