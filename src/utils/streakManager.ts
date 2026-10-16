export interface StudyStreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // 'YYYY-MM-DD'
  totalLessonsCompleted: number;
  streakHistory: string[]; // list of dates 'YYYY-MM-DD'
}

const STORAGE_KEY = 'studybestie_streak_data';

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStudyStreak(): StudyStreakData {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: getTodayDateString(),
      totalLessonsCompleted: 1,
      streakHistory: [getTodayDateString()],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: StudyStreakData = {
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: getTodayDateString(),
        totalLessonsCompleted: 1,
        streakHistory: [getTodayDateString()],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const data: StudyStreakData = JSON.parse(raw);
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // Check if streak was broken (last study date is older than yesterday)
    if (data.lastStudyDate !== today && data.lastStudyDate !== yesterday) {
      data.currentStreak = 0; // broken streak
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    return data;
  } catch {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: getTodayDateString(),
      totalLessonsCompleted: 1,
      streakHistory: [getTodayDateString()],
    };
  }
}

/**
 * Record a study activity (lesson analyzed, question asked, quiz answered, or notes taken)
 * and update the streak accordingly. Returns whether a new streak day was recorded.
 */
export function recordStudyActivity(incrementLesson = false): {
  data: StudyStreakData;
  isNewDay: boolean;
  milestoneReached: boolean;
} {
  const data = getStudyStreak();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let isNewDay = false;
  let milestone = false;

  if (incrementLesson) {
    data.totalLessonsCompleted = (data.totalLessonsCompleted || 0) + 1;
  }

  if (data.lastStudyDate === today) {
    // Already studied today
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { data, isNewDay: false, milestoneReached: false };
  }

  if (data.lastStudyDate === yesterday) {
    // Consecutive day!
    data.currentStreak += 1;
    isNewDay = true;
  } else {
    // Streak reset or started fresh
    data.currentStreak = 1;
    isNewDay = true;
  }

  data.lastStudyDate = today;
  if (!data.streakHistory.includes(today)) {
    data.streakHistory.push(today);
  }
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  if (data.currentStreak === 3 || data.currentStreak === 7 || data.currentStreak === 14 || data.currentStreak === 30) {
    milestone = true;
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  return { data, isNewDay, milestoneReached: milestone };
}

/**
 * Returns activity status for the last 7 days (day abbreviation + studied boolean)
 */
export function getLast7DaysStatus(streakHistory: string[]): { day: string; date: string; studied: boolean }[] {
  const result = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayAbbr = dayNames[d.getDay()];

    result.push({
      day: dayAbbr,
      date: dateStr,
      studied: streakHistory.includes(dateStr),
    });
  }

  return result;
}
