import React from 'react';
import { X, Flame, Trophy, Award, Calendar, Sparkles, Check, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyStreakData, getLast7DaysStatus } from '../utils/streakManager';

interface StudyStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: StudyStreakData;
}

export const StudyStreakModal: React.FC<StudyStreakModalProps> = ({
  isOpen,
  onClose,
  streakData,
}) => {
  if (!isOpen) return null;

  const past7Days = getLast7DaysStatus(streakData.streakHistory);

  const handleCelebrate = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FF4D94', '#FF80B5', '#FFA500', '#FF4500', '#20B2AA'],
      });
    } catch {}
  };

  const getStreakMessage = (count: number) => {
    if (count >= 14) return 'Legendary Focus! Tum toh university topper banoge bestie! 🏆🔥';
    if (count >= 7) return '1 Full Week Strong! Consistency level 1000%! 🚀✨';
    if (count >= 3) return 'You are on fire! 3 days of unstoppable learning! 💪🔥';
    if (count >= 1) return 'Great start! Roz thoda padho, exam tension gayab! ✨';
    return 'Start your streak today! Study any topic to light the flame! 🕯️';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-orange-100 flex flex-col relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Flame Visual */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-orange-300/50 transform rotate-3">
              <Flame className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-black shadow-xs border border-orange-200">
              +{streakData.currentStreak}d
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {streakData.currentStreak > 0
              ? `${streakData.currentStreak} Day Study Streak! 🔥`
              : 'Start Your Streak! 🚀'}
          </h2>
          <p className="text-xs text-orange-800/80 font-medium max-w-xs mt-1.5 bg-orange-50 py-1.5 px-3 rounded-full border border-orange-200/60">
            {getStreakMessage(streakData.currentStreak)}
          </p>
        </div>

        {/* 7-Day History Track */}
        <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Last 7 Days</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-bold">
              {streakData.streakHistory.length} Total Active Days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {past7Days.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white border border-slate-100 shadow-2xs"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {item.day}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    item.studied
                      ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-300'
                  }`}
                  title={`${item.date}: ${item.studied ? 'Studied! ✓' : 'Missed'}`}
                >
                  {item.studied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100">
            <div className="flex items-center justify-center text-orange-600 mb-1">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-900">{streakData.currentStreak}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Current Streak</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
            <div className="flex items-center justify-center text-amber-600 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-900">{streakData.longestStreak}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Best Record</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
            <div className="flex items-center justify-center text-[#FF4D94] mb-1">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-900">{streakData.totalLessonsCompleted}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Lessons Mastered</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCelebrate}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-[#FF4D94] text-white text-xs font-black shadow-md shadow-orange-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Celebrate Streak 🎉</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Keep Studying
          </button>
        </div>
      </div>
    </div>
  );
};
