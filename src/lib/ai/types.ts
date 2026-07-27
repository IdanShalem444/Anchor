import type {
  AssessmentSummary,
  Difficulty,
  RevisionHub,
  StudyNote,
  Subject,
  SubjectType,
  TestQuestion,
} from "@/lib/types";

export interface AnalyzeInput {
  subjectType: SubjectType;
  subjectName: string;
  assessmentTitle: string;
  text: string;
  /** "study" = test/exam; "project" = work to produce & submit. */
  kind?: "study" | "project";
}

export interface AnalyzeResult {
  /** The AI's own read of the assessment type, used to tailor + relabel it. */
  kind?: "study" | "project";
  summary: AssessmentSummary;
  notes: StudyNote[];
  revision: RevisionHub;
  flashcards: { front: string; back: string }[];
  /** Ordered step-by-step breakdown — populated for project/submission tasks. */
  plan: string[];
}

export interface ChatContext {
  subject?: Pick<Subject, "name" | "type">;
  assessmentTitle?: string;
  notificationText?: string;
  summary?: AssessmentSummary;
  today?: string;
  /** Course syllabus + learning outcomes (from Canvas), to ground answers. */
  syllabus?: string;
  outcomes?: { title: string; description: string }[];
  /** The student's assessments (for "what's next / due / my grades" questions). */
  assessments?: {
    title: string;
    subject?: string;
    dueDate?: string | null;
    status: string;
    grade?: string | null;
  }[];
}

export interface AIProvider {
  readonly name: string;
  analyzeAssessment(input: AnalyzeInput): Promise<AnalyzeResult>;
  generateTest(
    input: AnalyzeInput & { difficulty: Difficulty; count?: number }
  ): Promise<{ title: string; questions: TestQuestion[] }>;
  generateFlashcards(
    input: AnalyzeInput & { count?: number; style?: "cuecards" }
  ): Promise<{ front: string; back: string }[]>;
  chat(input: {
    messages: { role: "user" | "assistant"; content: string }[];
    context: ChatContext;
  }): Promise<string>;
  /** Rewrite note text for structure + clarity; returns clean minimal HTML. */
  improveNote(text: string): Promise<string>;
}
