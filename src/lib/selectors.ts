import type { Assessment, Reminder, Subject } from "@/lib/types";
import type { UserData } from "@/store/data";
import { daysUntil, isThisWeek } from "@/lib/format";

export function activeSubjects(d: UserData): Subject[] {
  return d.subjects.filter((s) => !s.deletedAt);
}
export function trashedSubjects(d: UserData): Subject[] {
  return d.subjects.filter((s) => s.deletedAt);
}

export function subjectById(d: UserData, id?: string) {
  return d.subjects.find((s) => s.id === id);
}

export function assessmentsFor(d: UserData, subjectId: string): Assessment[] {
  return d.assessments.filter((a) => a.subjectId === subjectId && !a.deletedAt);
}

export function assessmentById(d: UserData, id?: string) {
  return d.assessments.find((a) => a.id === id);
}

export function activeAssessments(d: UserData): Assessment[] {
  return d.assessments.filter((a) => !a.deletedAt);
}

export function subjectProgress(d: UserData, subjectId: string): number {
  const list = assessmentsFor(d, subjectId);
  if (list.length === 0) return 0;
  return Math.round(list.reduce((s, a) => s + a.progress, 0) / list.length);
}

export function upcomingAssessments(d: UserData): Assessment[] {
  // "Upcoming" = not completed and due today or later. Past-due items (e.g. old
  // Canvas assignments from before the app was installed) are NOT upcoming.
  return activeAssessments(d)
    .filter((a) => {
      if (a.status === "completed" || !a.dueDate) return false;
      const du = daysUntil(a.dueDate);
      return du !== null && du >= 0;
    })
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}

/** Not-completed assessments whose due date has passed (overdue / past). */
export function pastDueAssessments(d: UserData): Assessment[] {
  return activeAssessments(d)
    .filter((a) => {
      if (a.status === "completed" || !a.dueDate) return false;
      const du = daysUntil(a.dueDate);
      return du !== null && du < 0;
    })
    .sort((a, b) => (a.dueDate! > b.dueDate! ? -1 : 1));
}

/**
 * Assessments that need a "did you finish this?" check-in: due today or recently
 * overdue (within two weeks) and not yet completed. The window stops ancient
 * pre-install Canvas assignments from prompting.
 */
export function assessmentsNeedingCheckIn(d: UserData): Assessment[] {
  return activeAssessments(d)
    .filter((a) => {
      if (a.status === "completed" || !a.dueDate) return false;
      const du = daysUntil(a.dueDate);
      return du !== null && du <= 0 && du >= -14;
    })
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}

/**
 * Canvas assessments that have NO real notification/details (the teacher only
 * gave a name, no description or attached brief) and are due in ~1–3 weeks — so
 * we can ask the student to add the notification while there's still time.
 */
export function assessmentsNeedingNotification(d: UserData): Assessment[] {
  return activeAssessments(d)
    .filter((a) => {
      if (!a.canvasId || a.generated || !a.dueDate) return false;
      if (a.status === "completed") return false; // already submitted / done
      const du = daysUntil(a.dueDate);
      // any upcoming assessment within ~5 weeks (incl. due soon), not past
      if (du === null || du < 0 || du > 35) return false;
      const hasDescription = !!(a.description && a.description.trim().length > 12);
      const hasAttachedBrief = !!a.notification?.rawText?.includes("[Attached:");
      return !hasDescription && !hasAttachedBrief;
    })
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}

export function dueThisWeek(d: UserData): Assessment[] {
  return activeAssessments(d).filter(
    (a) => a.status !== "completed" && isThisWeek(a.dueDate)
  );
}

/** The academic reminders "table" is a live view over assessments. */
export function academicReminders(d: UserData): Assessment[] {
  return activeAssessments(d).sort((a, b) => {
    const da = daysUntil(a.dueDate);
    const db = daysUntil(b.dueDate);
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

export function assessmentCounts(d: UserData, assessmentId: string) {
  return {
    flashcards: d.flashcards.filter((c) => c.assessmentId === assessmentId).length,
    tests: d.tests.filter((t) => t.assessmentId === assessmentId).length,
    chats: d.chats.filter((c) => c.assessmentId === assessmentId).length,
    resources: d.resources.filter((r) => r.assessmentId === assessmentId).length,
  };
}

export function readiness(a: Assessment): {
  pct: number;
  label: string;
  tone: "neutral" | "amber" | "blue" | "green";
} {
  const hasMaterials = !!a.generated;
  const pct = Math.round(a.progress * 0.7 + (hasMaterials ? 30 : 0));
  if (a.status === "completed")
    return { pct: 100, label: "Completed", tone: "green" };
  if (pct >= 80) return { pct, label: "Exam ready", tone: "green" };
  if (pct >= 45) return { pct, label: "On track", tone: "blue" };
  if (pct > 0) return { pct, label: "Getting started", tone: "amber" };
  return { pct: 0, label: "Not started", tone: "neutral" };
}

export function personalRemindersActive(d: UserData): Reminder[] {
  return d.reminders.filter((r) => r.status === "active");
}

export function scheduledNotesUpcoming(d: UserData) {
  return d.notes.filter(
    (n) => !n.deletedAt && n.kind === "scheduled" && isThisWeek(n.scheduledFor)
  );
}
