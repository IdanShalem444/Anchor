// ─────────────────────────────────────────────────────────────
// Anchor domain model
// ─────────────────────────────────────────────────────────────

export type Plan = "free" | "basic" | "pro";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  plan: Plan;
  createdAt: number;
}

export interface UserSettings {
  notifications: boolean;
  weekStart: "sunday" | "monday";
  reduceMotion: boolean;
}

// ── School ─────────────────────────────────────────────────────

export type SubjectType =
  | "mathematics"
  | "english"
  | "science"
  | "geography"
  | "history"
  | "commerce"
  | "business"
  | "stem"
  | "computer-technology"
  | "language";

export type LanguageName =
  | "French"
  | "Spanish"
  | "Italian"
  | "German"
  | "Japanese"
  | "Chinese"
  | "Korean"
  | "Arabic"
  | "Latin";

export interface Subject {
  id: string;
  type: SubjectType;
  name: string;
  language?: LanguageName;
  color: string;
  description?: string;
  /** Canvas course id when imported/synced from Canvas. */
  canvasCourseId?: number;
  /** Course syllabus text (from Canvas), used to ground AI study materials. */
  syllabus?: string;
  /** Course learning outcomes / syllabus standards (from Canvas). */
  outcomes?: { title: string; description: string }[];
  createdAt: number;
  deletedAt?: number | null;
}

/** A lightweight homework item — day-to-day tasks, separate from formal assessments. */
export interface HomeworkItem {
  id: string;
  title: string;
  subjectId?: string;
  dueDate?: string;
  done: boolean;
  createdAt: number;
}

export type Priority = "low" | "medium" | "high";
export type AssessmentStatus = "not-started" | "in-progress" | "completed";
export type Term = "Term 1" | "Term 2" | "Term 3" | "Term 4";

export interface AssessmentNotification {
  rawText: string;
  fileName?: string;
  fileType?: string;
  uploadedAt: number;
}

export interface AssessmentSummary {
  overview: string;
  requirements: string[];
  outcomes: string[];
  objectives: string[];
  keyConcepts: string[];
  dueDate?: string;
  weighting?: string;
}

export interface StudyNote {
  id: string;
  heading: string;
  body: string;
}

export interface RevisionHub {
  guide: string;
  practiceQuestions: string[];
  examQuestions: string[];
  commonMistakes: string[];
  misconceptions: string[];
  /** Subject-specific extras (formula sheet, definitions, vocab, etc). */
  extras: { title: string; items: string[] }[];
}

export interface GeneratedContent {
  summary: AssessmentSummary;
  notes: StudyNote[];
  revision: RevisionHub;
  generatedAt: number;
  model: string;
}

export interface AssessmentResult {
  score: number | null;
  grade: string | null;
  pointsPossible: number | null;
  feedback: string[];
  gradedAt: number | null;
}

export interface AssessmentStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Assessment {
  id: string;
  subjectId: string;
  /** Canvas assignment id when imported/synced from Canvas. */
  canvasId?: number;
  /** "study" = test/exam to revise for; "project" = work to produce & submit. */
  kind?: "study" | "project";
  /** Grade + teacher feedback synced from Canvas. */
  result?: AssessmentResult;
  /** Step-by-step breakdown for project/submission assessments. */
  steps?: AssessmentStep[];
  title: string;
  description?: string;
  dueDate?: string;
  term?: Term;
  priority: Priority;
  status: AssessmentStatus;
  progress: number;
  color: string;
  createdAt: number;
  deletedAt?: number | null;
  notification?: AssessmentNotification;
  generated?: GeneratedContent;
}

export type FlashcardSource = "ai" | "manual";

export interface Flashcard {
  id: string;
  subjectId: string;
  assessmentId: string;
  front: string;
  back: string;
  source: FlashcardSource;
  known: boolean;
  createdAt: number;
}

export type QuestionType = "mcq" | "short" | "extended";
export type Difficulty = "easy" | "medium" | "hard" | "exam";

export interface TestQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answerIndex?: number;
  modelAnswer?: string;
}

export interface PracticeTest {
  id: string;
  subjectId: string;
  assessmentId: string;
  title: string;
  difficulty: Difficulty;
  questions: TestQuestion[];
  createdAt: number;
  lastScore?: number | null;
}

// English-specific
export interface Essay {
  id: string;
  subjectId: string;
  assessmentId?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Quote {
  id: string;
  subjectId: string;
  assessmentId?: string;
  text: string;
  technique?: string;
  theme?: string;
  source?: string;
  createdAt: number;
}

// Chat / AI tutor
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  title: string;
  subjectId?: string;
  assessmentId?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Reminders (academic + personal share one table)
export type ReminderKind = "academic" | "personal";
export type ReminderStatus = "active" | "completed";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  subjectId?: string;
  assessmentId?: string;
  dueDate?: string;
  term?: Term;
  priority: Priority;
  progress: number;
  status: ReminderStatus;
  notes?: string;
  completedAt?: number | null;
  createdAt: number;
}

// Resources (links/files attached to a subject or assessment)
export interface Resource {
  id: string;
  subjectId: string;
  assessmentId?: string;
  title: string;
  url?: string;
  kind: "link" | "note" | "file";
  createdAt: number;
}

// ── Personal hub ──────────────────────────────────────────────

export type NoteKind = "quick" | "permanent" | "scheduled";

export interface Note {
  id: string;
  title: string;
  body: string;
  kind: NoteKind;
  scheduledFor?: string;
  tags: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  body: string;
  tasks: ProjectTask[];
  links: { id: string; label: string; url: string }[];
  milestones: { id: string; title: string; date?: string; done: boolean }[];
  createdAt: number;
  deletedAt?: number | null;
}

export interface MindNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
  kind: "text" | "sticky";
}

export interface MindEdge {
  id: string;
  from: string;
  to: string;
}

export interface MindMap {
  id: string;
  name: string;
  nodes: MindNode[];
  edges: MindEdge[];
  createdAt: number;
  updatedAt: number;
}

// Labels for UI
export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  mathematics: "Mathematics",
  english: "English",
  science: "Science",
  geography: "Geography",
  history: "History",
  commerce: "Commerce",
  business: "Business Studies",
  stem: "STEM",
  "computer-technology": "Computer Technology",
  language: "Language",
};

export const LANGUAGES: LanguageName[] = [
  "French",
  "Spanish",
  "Italian",
  "German",
  "Japanese",
  "Chinese",
  "Korean",
  "Arabic",
  "Latin",
];

export const DEFAULT_SUBJECT_COLOR: Record<SubjectType, string> = {
  mathematics: "#3b82f6",
  english: "#ec4899",
  science: "#10b981",
  geography: "#14b8a6",
  history: "#f59e0b",
  commerce: "#6366f1",
  business: "#8b5cf6",
  stem: "#06b6d4",
  "computer-technology": "#64748b",
  language: "#d946ef",
};
