export interface UserStats {
  todayReviewCount: number;
  weeklyPracticeCount: number;
  grammarMastery: { [grammarId: string]: number }; // percentage 0-100
}

export interface WordInflections {
  word: string;
  partOfSpeech: string;
  verbType?: number;
  conjugations?: {
    minä: string | string[];
    sinä: string | string[];
    hän: string | string[];
    me: string | string[];
    te: string | string[];
    he: string | string[];
  };
  firstInfinitive?: string | string[];
  secondInfinitive?: {
    inessive: string | string[];
    instructive: string | string[];
  };
  thirdInfinitive?: {
    inessive: string | string[];
    elative: string | string[];
    illative: string | string[];
    adessive: string | string[];
    abessive: string | string[];
  };
  nounInflections?: {
    singularGenitive: string | string[];
    pluralGenitive: string | string[];
    singularPartitive: string | string[];
    pluralPartitive: string | string[];
    pluralNominative: string | string[];
  };
}

export interface VocabularyWord {
  id: string;
  word: string;          // e.g., "puhua"
  partOfSpeech: string;  // e.g., "动词"
  translation: string;   // e.g., "说话，说"
  exampleSentence: string; // e.g., "Minä puhun suomea."
  translationExample: string; // e.g., "我会说芬兰语。"
  keyInflections: string; // e.g., "puhun, puhut, puhuu (Type 1)"
  sourceCourseId: string;
  sourceCourseTitle: string;
  addedAt: string;
  // SM-2 Spaced Repetition parameters
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt: string; // ISO date string
  isMistake?: boolean;  // True if it is currently in the mistake book (拼写/测验答错)
  needsPractice?: boolean; // True if 复习时评"模糊/不记得" → 进"待巩固"池
  incorrectCount: number;
  correctCount: number;
  inflections?: WordInflections;
}

export interface GrammarPoint {
  id: string;
  title: string;
  description: string;
  finnishExample: string;
  chineseExample: string;
  level: 'A2' | 'B1';
}

export interface FillBlankQuestion {
  id: string;
  sentence: string;      // e.g., "Hän ___ (puhua) suomea."
  answer: string;        // e.g., "puhuu"
  hint: string;          // e.g., "Third person singular of puhua"
}

export interface ConjugationTable {
  id: string;
  title: string;         // e.g., "Verbi 'puhua' preesens (动词 'puhua' 现在时变位)"
  verb: string;          // e.g., "puhua"
  verbClass: string;     // e.g., "Type 1"
  pronouns: {
    minä: string;
    sinä: string;
    hän: string;
    me: string;
    te: string;
    he: string;
  };
}

export interface TranslationQuestion {
  id: string;
  chinese: string;       // e.g., "你叫什么名字？"
  finnish: string;       // e.g., "Mikä sinun nimesi on?"
  selfCheckpoints: string[]; // e.g., ["Used 'Mikä'", "Correct word order", "Correct suffix -si"]
}

export interface CourseNote {
  id: string;
  userId: string;
  date: string;          // e.g. "2026-06-26"
  title: string;         // e.g. "第一课: 动词变位与自我介绍"
  keyPoints: string[];   // 本节要点
  grammarPoints: {
    title: string;
    level: 'A2' | 'B1';
    rule: string;
    examples: { finnish: string; chinese: string }[];
  }[];
  vocabulary: {
    word: string;
    partOfSpeech: string;
    translation: string;
    exampleSentence: string;
    translationExample: string;
    keyInflections: string;
    inflections?: WordInflections;
  }[];
  exercises: {
    fillBlanks: FillBlankQuestion[];
    conjugations: ConjugationTable[];
    translations: TranslationQuestion[];
  };
  createdAt: string;
}

export interface StickyNote {
  id: string;
  userId?: string;
  text: string;
  colorIndex: number;     // index into the sticky palette
  rotation: number;       // small random tilt in degrees
  targetType: "board" | "course" | "word"; // where it is pinned
  targetId?: string;      // course id / word lemma when pinned to one
  targetLabel?: string;   // human label of the target (for the board view)
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  date: string;
  score: number;
  total: number;
  details: any; // Saves user answers and correctness
  createdAt?: string;
}
