export type MaterialType =
  | 'youtube_transcript'
  | 'lecture_notes'
  | 'assignment'
  | 'textbook'
  | 'syllabus_problem'
  | 'custom';

export type LearnerLevel = 'beginner' | 'undergraduate' | 'advanced';

export interface Lesson {
  id: string;
  title: string;
  materialType: MaterialType;
  learnerLevel: LearnerLevel;
  rawMaterial: string;
  specificQuestions?: string;
  markdown: string;
  createdAt: number;
}

export interface SampleMaterial {
  id: string;
  title: string;
  topic: string;
  type: MaterialType;
  description: string;
  content: string;
  specificQuestions?: string;
  level: LearnerLevel;
}

export interface SelfTestQuestion {
  id: string;
  question: string;
  answer: string;
  userGuessed?: boolean;
  revealed?: boolean;
}

export interface SocraticMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface ParsedLessonSections {
  bigPicture?: string;
  keyConcepts?: string;
  analogy?: string;
  practical?: string;
  selfTest?: string;
  unparsed?: string;
}

export interface PeerScreenState {
  peerId: string;
  username: string;
  activeLessonTitle: string;
  markdown: string;
  notes: string;
  mode: 'deep_dive' | 'bestie_mode' | string;
  video?: {
    videoId: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    canonicalUrl?: string;
  } | null;
  messages?: any[];
  lastUpdated: number;
  pairedPeerId?: string;
  activePresenterId?: string;
}

