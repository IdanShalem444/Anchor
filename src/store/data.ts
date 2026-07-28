"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuth } from "@/store/auth";
import { uid, currentTerm } from "@/lib/format";
import { assessmentShade, SUBJECT_COLORS } from "@/lib/colors";
import type {
  Assessment,
  AssessmentNotification,
  ChatMessage,
  ChatThread,
  Essay,
  Flashcard,
  GeneratedContent,
  HomeworkItem,
  MindEdge,
  MindMap,
  MindNode,
  Note,
  PracticeTest,
  Project,
  Quote,
  Reminder,
  Resource,
  Subject,
  SubjectType,
} from "@/lib/types";

/** Best-effort subject type from a Canvas course name (drives icon + tools). */
function inferSubjectType(name: string): SubjectType {
  const n = name.toLowerCase();
  if (/\b(math|maths|calculus|algebra|geometry|statistic)/.test(n)) return "mathematics";
  if (/\b(english|literature|writing)/.test(n)) return "english";
  if (/\b(biolog|chemist|physic|science)/.test(n)) return "science";
  if (/\b(geograph)/.test(n)) return "geography";
  if (/\b(history|ancient|modern history)/.test(n)) return "history";
  if (/\b(commerce|econom)/.test(n)) return "commerce";
  if (/\b(business)/.test(n)) return "business";
  if (/\b(computer|software|programming|info tech|information tech|coding)/.test(n))
    return "computer-technology";
  if (/\b(french|spanish|italian|german|japanese|chinese|korean|arabic|latin|language)/.test(n))
    return "language";
  return "stem";
}

export interface CanvasImportPayload {
  courses: {
    canvasId: number;
    name: string;
    courseCode?: string;
    syllabusBody?: string;
    outcomes?: { title: string; description: string }[];
  }[];
  assignments: {
    canvasId: number;
    courseCanvasId: number;
    name: string;
    dueAt?: string | null;
    description?: string;
    descriptionHtml?: string;
    url?: string;
    points?: number | null;
    kind?: "study" | "project";
    score?: number | null;
    grade?: string | null;
    feedback?: string[];
    gradedAt?: number | null;
    submitted?: boolean;
    submittedAt?: number | null;
    rubric?: string;
    /** False = a day-to-day task (goes to Homework), true/undefined = assessment. */
    assessed?: boolean;
  }[];
}

/** A due date this long past on unfinished work is stale Canvas data (wrong
 *  term / never updated) — drop it rather than show "52 days overdue" forever. */
const STALE_DUE_DAYS = 50;
function staleDue(iso?: string): boolean {
  if (!iso) return false;
  const t = new Date(`${iso}T23:59:59`).getTime();
  return Number.isFinite(t) && Date.now() - t > STALE_DUE_DAYS * 86_400_000;
}

/** Compose an assessment notification/brief from a Canvas assignment. */
function canvasBrief(
  a: CanvasImportPayload["assignments"][number],
  due?: string
): string {
  const lines: string[] = [a.name];
  if (due) lines.push(`Due: ${due}`);
  if (a.points != null) lines.push(`Worth: ${a.points} marks`);
  if (a.url) lines.push(`Source: ${a.url}`);
  if (a.description && a.description.trim()) lines.push("", a.description.trim());
  if (a.rubric && a.rubric.trim()) lines.push("", "Marking criteria:", a.rubric.trim());
  return lines.join("\n");
}

export interface UserData {
  subjects: Subject[];
  assessments: Assessment[];
  flashcards: Flashcard[];
  tests: PracticeTest[];
  essays: Essay[];
  quotes: Quote[];
  chats: ChatThread[];
  reminders: Reminder[];
  resources: Resource[];
  notes: Note[];
  projects: Project[];
  mindmaps: MindMap[];
  homework: HomeworkItem[];
  streak: { count: number; lastActive: string | null };
  /** Canvas assignment ids the user deleted — never re-imported on sync. */
  deletedCanvasIds?: number[];
}

const emptyData = (): UserData => ({
  subjects: [],
  assessments: [],
  flashcards: [],
  tests: [],
  essays: [],
  quotes: [],
  chats: [],
  reminders: [],
  resources: [],
  notes: [],
  projects: [],
  mindmaps: [],
  homework: [],
  streak: { count: 0, lastActive: null },
  deletedCanvasIds: [],
});

/** Stable reference returned when the current user has no data bucket yet —
 *  prevents render loops for selectors that read `data()`. Never mutated. */
const EMPTY_DATA = emptyData();

interface DataState {
  byUser: Record<string, UserData>;
  _mutate: (fn: (d: UserData) => void) => void;
  data: () => UserData;

  // streak
  touchStreak: () => void;

  // subjects
  addSubject: (s: Omit<Subject, "id" | "createdAt">) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  trashSubject: (id: string) => void;
  restoreSubject: (id: string) => void;
  deleteSubjectForever: (id: string) => void;

  // assessments
  addAssessment: (
    a: Omit<Assessment, "id" | "createdAt" | "color" | "progress" | "status"> &
      Partial<Pick<Assessment, "status" | "progress">>
  ) => Assessment;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  trashAssessment: (id: string) => void;
  restoreAssessment: (id: string) => void;
  setNotification: (id: string, n: AssessmentNotification) => void;
  setGenerated: (id: string, g: GeneratedContent) => void;

  // flashcards
  addFlashcards: (cards: Omit<Flashcard, "id" | "createdAt" | "known">[]) => void;
  /** Swap out the AI-generated cards for an assessment (manual cards survive). */
  replaceAiFlashcards: (
    assessmentId: string,
    cards: Omit<Flashcard, "id" | "createdAt" | "known">[]
  ) => void;
  addFlashcard: (c: Omit<Flashcard, "id" | "createdAt" | "known">) => void;
  updateFlashcard: (id: string, patch: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;
  toggleKnown: (id: string) => void;

  // tests
  addTest: (t: Omit<PracticeTest, "id" | "createdAt">) => PracticeTest;
  setTestScore: (id: string, score: number) => void;
  deleteTest: (id: string) => void;

  // essays / quotes
  addEssay: (e: Omit<Essay, "id" | "createdAt" | "updatedAt">) => Essay;
  updateEssay: (id: string, patch: Partial<Essay>) => void;
  deleteEssay: (id: string) => void;
  addQuote: (q: Omit<Quote, "id" | "createdAt">) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;

  // resources
  addResource: (r: Omit<Resource, "id" | "createdAt">) => void;
  deleteResource: (id: string) => void;

  // chats
  createChat: (init: Partial<ChatThread>) => ChatThread;
  addMessage: (chatId: string, m: Omit<ChatMessage, "id" | "createdAt">) => void;
  renameChat: (chatId: string, title: string) => void;
  deleteChat: (chatId: string) => void;

  // reminders (personal)
  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "status">) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  completeReminder: (id: string) => void;
  reopenReminder: (id: string) => void;
  deleteReminder: (id: string) => void;

  // notes
  addNote: (n: Omit<Note, "id" | "createdAt" | "updatedAt" | "tags"> & { tags?: string[] }) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteNoteForever: (id: string) => void;

  // projects
  addProject: (p: Omit<Project, "id" | "createdAt" | "tasks" | "links" | "milestones" | "body"> & Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // mindmaps
  createMap: (name: string) => MindMap;
  updateMap: (id: string, patch: Partial<MindMap>) => void;
  deleteMap: (id: string) => void;

  // homework
  addHomework: (h: Pick<HomeworkItem, "title"> & Partial<HomeworkItem>) => void;
  toggleHomework: (id: string) => void;
  updateHomework: (id: string, patch: Partial<HomeworkItem>) => void;
  deleteHomework: (id: string) => void;

  /** Hard-remove an assessment (no trash) — used when a Canvas re-sync
   *  reclassifies it as a day-to-day task, so it can move to Homework. */
  purgeAssessment: (id: string) => void;

  seedExample: () => void;
  importFromCanvas: (payload: CanvasImportPayload) => {
    subjectsAdded: number;
    assessmentsAdded: number;
    assessmentsUpdated: number;
    tasksAdded: number;
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const useData = create<DataState>()(
  persist(
    (set, get) => {
      const currentId = () => useAuth.getState().currentUserId;

      const mutate = (fn: (d: UserData) => void) => {
        const id = currentId();
        if (!id) return;
        set((state) => {
          const bucket = state.byUser[id] ?? emptyData();
          const draft: UserData = JSON.parse(JSON.stringify(bucket));
          fn(draft);
          return { byUser: { ...state.byUser, [id]: draft } };
        });
      };

      return {
        byUser: {},
        _mutate: mutate,
        data: () => {
          const id = currentId();
          return (id && get().byUser[id]) || EMPTY_DATA;
        },

        touchStreak: () =>
          mutate((d) => {
            const today = todayKey();
            if (d.streak.lastActive === today) return;
            const yesterday = new Date(Date.now() - 86400000)
              .toISOString()
              .slice(0, 10);
            d.streak.count =
              d.streak.lastActive === yesterday ? d.streak.count + 1 : 1;
            d.streak.lastActive = today;
          }),

        // ── subjects ──────────────────────────────────────
        addSubject: (s) => {
          const subject: Subject = {
            ...s,
            id: uid("sub"),
            createdAt: Date.now(),
            deletedAt: null,
          };
          mutate((d) => {
            d.subjects.push(subject);
          });
          return subject;
        },
        updateSubject: (id, patch) =>
          mutate((d) => {
            const i = d.subjects.findIndex((x) => x.id === id);
            if (i >= 0) d.subjects[i] = { ...d.subjects[i], ...patch };
          }),
        trashSubject: (id) =>
          mutate((d) => {
            const i = d.subjects.findIndex((x) => x.id === id);
            if (i >= 0) d.subjects[i].deletedAt = Date.now();
          }),
        restoreSubject: (id) =>
          mutate((d) => {
            const i = d.subjects.findIndex((x) => x.id === id);
            if (i >= 0) d.subjects[i].deletedAt = null;
          }),
        deleteSubjectForever: (id) =>
          mutate((d) => {
            d.subjects = d.subjects.filter((x) => x.id !== id);
            const aids = d.assessments
              .filter((a) => a.subjectId === id)
              .map((a) => a.id);
            d.assessments = d.assessments.filter((a) => a.subjectId !== id);
            d.flashcards = d.flashcards.filter((c) => c.subjectId !== id);
            d.tests = d.tests.filter((t) => t.subjectId !== id);
            d.essays = d.essays.filter((e) => e.subjectId !== id);
            d.quotes = d.quotes.filter((q) => q.subjectId !== id);
            d.resources = d.resources.filter((r) => r.subjectId !== id);
            d.chats = d.chats.filter((c) => c.subjectId !== id);
            d.reminders = d.reminders.filter(
              (r) => !r.assessmentId || !aids.includes(r.assessmentId)
            );
          }),

        // ── assessments ───────────────────────────────────
        addAssessment: (a) => {
          const d0 = get().data();
          const siblingCount = d0.assessments.filter(
            (x) => x.subjectId === a.subjectId
          ).length;
          const subject = d0.subjects.find((s) => s.id === a.subjectId);
          const color = subject
            ? assessmentShade(subject.color, siblingCount)
            : "#3b82f6";
          const assessment: Assessment = {
            status: "not-started",
            progress: 0,
            ...a,
            color,
            id: uid("asm"),
            createdAt: Date.now(),
            deletedAt: null,
          };
          mutate((d) => {
            d.assessments.push(assessment);
          });
          return assessment;
        },
        updateAssessment: (id, patch) =>
          mutate((d) => {
            const i = d.assessments.findIndex((x) => x.id === id);
            if (i >= 0) d.assessments[i] = { ...d.assessments[i], ...patch };
          }),
        trashAssessment: (id) =>
          mutate((d) => {
            const i = d.assessments.findIndex((x) => x.id === id);
            if (i < 0) return;
            d.assessments[i].deletedAt = Date.now();
            // Remember Canvas-sourced deletions so a re-sync doesn't bring them back.
            const cid = d.assessments[i].canvasId;
            if (cid != null) {
              if (!d.deletedCanvasIds) d.deletedCanvasIds = [];
              if (!d.deletedCanvasIds.includes(cid)) d.deletedCanvasIds.push(cid);
            }
          }),
        restoreAssessment: (id) =>
          mutate((d) => {
            const i = d.assessments.findIndex((x) => x.id === id);
            if (i < 0) return;
            d.assessments[i].deletedAt = null;
            const cid = d.assessments[i].canvasId;
            if (cid != null && d.deletedCanvasIds) {
              d.deletedCanvasIds = d.deletedCanvasIds.filter((x) => x !== cid);
            }
          }),
        purgeAssessment: (id) =>
          mutate((d) => {
            // Deliberately does NOT record in deletedCanvasIds — the same
            // Canvas item lives on as a homework task.
            d.assessments = d.assessments.filter((x) => x.id !== id);
            d.flashcards = d.flashcards.filter((c) => c.assessmentId !== id);
            d.tests = d.tests.filter((t) => t.assessmentId !== id);
          }),
        setNotification: (id, n) =>
          mutate((d) => {
            const i = d.assessments.findIndex((x) => x.id === id);
            if (i >= 0) {
              d.assessments[i].notification = n;
              if (d.assessments[i].status === "not-started")
                d.assessments[i].status = "in-progress";
            }
          }),
        setGenerated: (id, g) =>
          mutate((d) => {
            const i = d.assessments.findIndex((x) => x.id === id);
            if (i >= 0) {
              d.assessments[i].generated = g;
              if (g.summary.dueDate && !d.assessments[i].dueDate)
                d.assessments[i].dueDate = g.summary.dueDate;
            }
          }),

        // ── flashcards ────────────────────────────────────
        addFlashcards: (cards) =>
          mutate((d) => {
            for (const c of cards)
              d.flashcards.push({
                ...c,
                id: uid("fc"),
                createdAt: Date.now(),
                known: false,
              });
          }),
        replaceAiFlashcards: (assessmentId, cards) =>
          mutate((d) => {
            d.flashcards = d.flashcards.filter(
              (c) => !(c.assessmentId === assessmentId && c.source === "ai")
            );
            for (const c of cards)
              d.flashcards.push({
                ...c,
                id: uid("fc"),
                createdAt: Date.now(),
                known: false,
              });
          }),
        addFlashcard: (c) =>
          mutate((d) => {
            d.flashcards.push({
              ...c,
              id: uid("fc"),
              createdAt: Date.now(),
              known: false,
            });
          }),
        updateFlashcard: (id, patch) =>
          mutate((d) => {
            const i = d.flashcards.findIndex((x) => x.id === id);
            if (i >= 0) d.flashcards[i] = { ...d.flashcards[i], ...patch };
          }),
        deleteFlashcard: (id) =>
          mutate((d) => {
            d.flashcards = d.flashcards.filter((x) => x.id !== id);
          }),
        toggleKnown: (id) =>
          mutate((d) => {
            const i = d.flashcards.findIndex((x) => x.id === id);
            if (i >= 0) d.flashcards[i].known = !d.flashcards[i].known;
          }),

        // ── tests ─────────────────────────────────────────
        addTest: (t) => {
          const test: PracticeTest = { ...t, id: uid("tst"), createdAt: Date.now() };
          mutate((d) => {
            d.tests.push(test);
          });
          return test;
        },
        setTestScore: (id, score) =>
          mutate((d) => {
            const i = d.tests.findIndex((x) => x.id === id);
            if (i >= 0) d.tests[i].lastScore = score;
          }),
        deleteTest: (id) =>
          mutate((d) => {
            d.tests = d.tests.filter((x) => x.id !== id);
          }),

        // ── essays / quotes ───────────────────────────────
        addEssay: (e) => {
          const essay: Essay = {
            ...e,
            id: uid("ess"),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          mutate((d) => {
            d.essays.push(essay);
          });
          return essay;
        },
        updateEssay: (id, patch) =>
          mutate((d) => {
            const i = d.essays.findIndex((x) => x.id === id);
            if (i >= 0) d.essays[i] = { ...d.essays[i], ...patch, updatedAt: Date.now() };
          }),
        deleteEssay: (id) =>
          mutate((d) => {
            d.essays = d.essays.filter((x) => x.id !== id);
          }),
        addQuote: (q) =>
          mutate((d) => {
            d.quotes.push({ ...q, id: uid("qt"), createdAt: Date.now() });
          }),
        updateQuote: (id, patch) =>
          mutate((d) => {
            const i = d.quotes.findIndex((x) => x.id === id);
            if (i >= 0) d.quotes[i] = { ...d.quotes[i], ...patch };
          }),
        deleteQuote: (id) =>
          mutate((d) => {
            d.quotes = d.quotes.filter((x) => x.id !== id);
          }),

        // ── resources ─────────────────────────────────────
        addResource: (r) =>
          mutate((d) => {
            d.resources.push({ ...r, id: uid("res"), createdAt: Date.now() });
          }),
        deleteResource: (id) =>
          mutate((d) => {
            d.resources = d.resources.filter((x) => x.id !== id);
          }),

        // ── chats ─────────────────────────────────────────
        createChat: (init) => {
          const chat: ChatThread = {
            id: uid("cht"),
            title: init.title || "New chat",
            subjectId: init.subjectId,
            assessmentId: init.assessmentId,
            messages: init.messages || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          mutate((d) => {
            d.chats.unshift(chat);
          });
          return chat;
        },
        addMessage: (chatId, m) =>
          mutate((d) => {
            const i = d.chats.findIndex((x) => x.id === chatId);
            if (i >= 0) {
              d.chats[i].messages.push({ ...m, id: uid("msg"), createdAt: Date.now() });
              d.chats[i].updatedAt = Date.now();
            }
          }),
        renameChat: (chatId, title) =>
          mutate((d) => {
            const i = d.chats.findIndex((x) => x.id === chatId);
            if (i >= 0) d.chats[i].title = title;
          }),
        deleteChat: (chatId) =>
          mutate((d) => {
            d.chats = d.chats.filter((x) => x.id !== chatId);
          }),

        // ── reminders (personal) ──────────────────────────
        addReminder: (r) =>
          mutate((d) => {
            d.reminders.push({
              ...r,
              id: uid("rem"),
              status: "active",
              createdAt: Date.now(),
            });
          }),
        updateReminder: (id, patch) =>
          mutate((d) => {
            const i = d.reminders.findIndex((x) => x.id === id);
            if (i >= 0) d.reminders[i] = { ...d.reminders[i], ...patch };
          }),
        completeReminder: (id) =>
          mutate((d) => {
            const i = d.reminders.findIndex((x) => x.id === id);
            if (i >= 0) {
              d.reminders[i].status = "completed";
              d.reminders[i].completedAt = Date.now();
              d.reminders[i].progress = 100;
            }
          }),
        reopenReminder: (id) =>
          mutate((d) => {
            const i = d.reminders.findIndex((x) => x.id === id);
            if (i >= 0) {
              d.reminders[i].status = "active";
              d.reminders[i].completedAt = null;
            }
          }),
        deleteReminder: (id) =>
          mutate((d) => {
            d.reminders = d.reminders.filter((x) => x.id !== id);
          }),

        // ── notes ─────────────────────────────────────────
        addNote: (n) => {
          const note: Note = {
            ...n,
            tags: n.tags || [],
            id: uid("note"),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
          };
          mutate((d) => {
            d.notes.unshift(note);
          });
          return note;
        },
        updateNote: (id, patch) =>
          mutate((d) => {
            const i = d.notes.findIndex((x) => x.id === id);
            if (i >= 0) d.notes[i] = { ...d.notes[i], ...patch, updatedAt: Date.now() };
          }),
        trashNote: (id) =>
          mutate((d) => {
            const i = d.notes.findIndex((x) => x.id === id);
            if (i >= 0) d.notes[i].deletedAt = Date.now();
          }),
        restoreNote: (id) =>
          mutate((d) => {
            const i = d.notes.findIndex((x) => x.id === id);
            if (i >= 0) d.notes[i].deletedAt = null;
          }),
        deleteNoteForever: (id) =>
          mutate((d) => {
            d.notes = d.notes.filter((x) => x.id !== id);
          }),

        // ── projects ──────────────────────────────────────
        addProject: (p) => {
          const project: Project = {
            id: uid("prj"),
            name: p.name,
            description: p.description,
            color: p.color ?? "#6366f1",
            body: p.body ?? "",
            tasks: p.tasks ?? [],
            links: p.links ?? [],
            milestones: p.milestones ?? [],
            createdAt: Date.now(),
            deletedAt: null,
          };
          mutate((d) => {
            d.projects.push(project);
          });
          return project;
        },
        updateProject: (id, patch) =>
          mutate((d) => {
            const i = d.projects.findIndex((x) => x.id === id);
            if (i >= 0) d.projects[i] = { ...d.projects[i], ...patch };
          }),
        deleteProject: (id) =>
          mutate((d) => {
            d.projects = d.projects.filter((x) => x.id !== id);
          }),

        // ── mindmaps ──────────────────────────────────────
        createMap: (name) => {
          const map: MindMap = {
            id: uid("map"),
            name,
            nodes: [],
            edges: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          mutate((d) => {
            d.mindmaps.push(map);
          });
          return map;
        },
        updateMap: (id, patch) =>
          mutate((d) => {
            const i = d.mindmaps.findIndex((x) => x.id === id);
            if (i >= 0) d.mindmaps[i] = { ...d.mindmaps[i], ...patch, updatedAt: Date.now() };
          }),
        deleteMap: (id) =>
          mutate((d) => {
            d.mindmaps = d.mindmaps.filter((x) => x.id !== id);
          }),

        // ── homework ──────────────────────────────────────
        addHomework: (h) =>
          mutate((d) => {
            if (!d.homework) d.homework = [];
            d.homework.unshift({
              id: uid("hw"),
              title: h.title,
              subjectId: h.subjectId,
              canvasId: h.canvasId,
              done: h.done ?? false,
              createdAt: Date.now(),
            });
          }),
        toggleHomework: (id) =>
          mutate((d) => {
            const i = (d.homework || []).findIndex((x) => x.id === id);
            if (i >= 0) d.homework[i].done = !d.homework[i].done;
          }),
        updateHomework: (id, patch) =>
          mutate((d) => {
            const i = (d.homework || []).findIndex((x) => x.id === id);
            if (i >= 0) d.homework[i] = { ...d.homework[i], ...patch };
          }),
        deleteHomework: (id) =>
          mutate((d) => {
            d.homework = (d.homework || []).filter((x) => x.id !== id);
          }),

        seedExample: () => {
          const existing = get().data();
          if (existing.subjects.length > 0) return;
          const math = get().addSubject({
            type: "mathematics",
            name: "Mathematics",
            color: "#3b82f6",
            description: "Year-level mathematics — algebra, calculus and statistics.",
          });
          get().addAssessment({
            subjectId: math.id,
            title: "Algebra Assignment",
            description: "Quadratic equations, factorising and graphing.",
            dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            term: "Term 2",
            priority: "high",
          });
        },

        importFromCanvas: (payload) => {
          let subjectsAdded = 0;
          let tasksAdded = 0;
          let assessmentsAdded = 0;
          let assessmentsUpdated = 0;

          for (const c of payload.courses) {
            const exists = get()
              .data()
              .subjects.find((s) => s.canvasCourseId === c.canvasId && !s.deletedAt);
            if (!exists) {
              const count = get().data().subjects.length;
              get().addSubject({
                type: inferSubjectType(c.name),
                name: c.name,
                color: SUBJECT_COLORS[count % SUBJECT_COLORS.length],
                canvasCourseId: c.canvasId,
                description: c.courseCode,
                syllabus: c.syllabusBody || undefined,
                outcomes: c.outcomes && c.outcomes.length ? c.outcomes : undefined,
              });
              subjectsAdded++;
            } else if (c.syllabusBody || (c.outcomes && c.outcomes.length)) {
              // Keep the syllabus + outcomes fresh on re-sync.
              get().updateSubject(exists.id, {
                ...(c.syllabusBody ? { syllabus: c.syllabusBody } : {}),
                ...(c.outcomes && c.outcomes.length ? { outcomes: c.outcomes } : {}),
              });
            }
          }

          const deletedIds = new Set(get().data().deletedCanvasIds || []);
          for (const a of payload.assignments) {
            if (deletedIds.has(a.canvasId)) continue; // user deleted it — stay gone
            const subject = get()
              .data()
              .subjects.find((s) => s.canvasCourseId === a.courseCanvasId && !s.deletedAt);
            if (!subject) continue;
            const rawDue = a.dueAt ? a.dueAt.slice(0, 10) : undefined;
            const finished =
              a.gradedAt != null ||
              a.score != null ||
              (!!a.grade && a.grade !== "") ||
              !!a.submitted;
            // Finished work keeps its historical date; unfinished work drops
            // a long-stale one.
            const due = rawDue && (finished || !staleDue(rawDue)) ? rawDue : undefined;

            // Day-to-day task (not formally assessed) → Homework, not an
            // assessment. Runs automatically on every sync.
            if (a.assessed === false) {
              const done = !!(a.submitted || a.gradedAt != null || a.score != null);
              const hw = (get().data().homework || []).find(
                (h) => h.canvasId === a.canvasId
              );
              if (hw) {
                get().updateHomework(hw.id, {
                  title: a.name || hw.title,
                  ...(done && !hw.done ? { done: true } : {}),
                });
              } else {
                // Migrate a previously imported assessment — unless the user
                // has generated materials on it (then their work wins).
                const asExisting = get()
                  .data()
                  .assessments.find((x) => x.canvasId === a.canvasId && !x.deletedAt);
                if (asExisting?.generated) {
                  // keep as an assessment
                } else {
                  if (asExisting) get().purgeAssessment(asExisting.id);
                  get().addHomework({
                    title: a.name || "Task",
                    subjectId: subject.id,
                    canvasId: a.canvasId,
                    done,
                  });
                  tasksAdded++;
                }
              }
              continue;
            }

            const hasBrief = !!(a.description && a.description.trim().length > 10);
            const brief = canvasBrief(a, due);
            const notification = {
              rawText: brief,
              ...(a.descriptionHtml ? { html: a.descriptionHtml } : {}),
              fileName: `Canvas · ${subject.name}`,
              fileType: "canvas",
              uploadedAt: Date.now(),
            };
            const graded =
              a.gradedAt != null || a.score != null || (!!a.grade && a.grade !== "");
            const result = graded
              ? {
                  score: a.score ?? null,
                  grade: a.grade ?? null,
                  pointsPossible: a.points ?? null,
                  feedback: a.feedback ?? [],
                  gradedAt: a.gradedAt ?? Date.now(),
                }
              : undefined;
            // Graded → completed (with the result). Submitted online but not yet
            // graded → also mark completed, so handing in on Canvas clears it from
            // your reminders/check-ins. Not submitted → leave the status alone.
            const gradePatch = {
              ...(result
                ? { result, status: "completed" as const, progress: 100 }
                : a.submitted
                ? { status: "completed" as const, progress: 100 }
                : {}),
              ...(a.submittedAt != null ? { submittedAt: a.submittedAt } : {}),
            };
            const existing = get().data().assessments.find((x) => x.canvasId === a.canvasId);
            if (existing) {
              get().updateAssessment(existing.id, {
                title: a.name || existing.title,
                // Also scrub a stale stored date off unfinished work.
                dueDate:
                  due ??
                  (existing.status !== "completed" && staleDue(existing.dueDate)
                    ? undefined
                    : existing.dueDate),
                description: a.description || existing.description,
                kind: a.kind ?? existing.kind,
                ...gradePatch,
              });
              // Refresh the Canvas brief as the notification. Safe when the
              // current notification is Canvas-sourced (or missing) — it only
              // replaces the brief, never generated materials. A user-UPLOADED
              // notification on a generated assessment is left alone.
              const notifIsOurs =
                !existing.notification || existing.notification.fileType === "canvas";
              if (hasBrief && (!existing.generated || notifIsOurs)) {
                get().setNotification(existing.id, notification);
              }
              assessmentsUpdated++;
            } else {
              const created = get().addAssessment({
                subjectId: subject.id,
                canvasId: a.canvasId,
                title: a.name || "Assignment",
                description: a.description || undefined,
                dueDate: due,
                term: currentTerm(),
                priority: "medium",
                kind: a.kind,
                ...gradePatch,
              });
              if (hasBrief) get().setNotification(created.id, notification);
              assessmentsAdded++;
            }
          }

          return { subjectsAdded, assessmentsAdded, assessmentsUpdated, tasksAdded };
        },
      };
    },
    { name: "anchor-data" }
  )
);
