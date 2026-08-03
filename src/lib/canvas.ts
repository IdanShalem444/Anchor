import { classifyAssignments } from "./ai/server";

export interface CanvasCreds {
  baseUrl: string;
  token: string;
}

export interface CanvasOutcome {
  title: string;
  description: string;
}
export interface CanvasCourse {
  canvasId: number;
  name: string;
  courseCode?: string;
  syllabusBody?: string;
  outcomes?: CanvasOutcome[];
}
export interface CanvasAssignment {
  canvasId: number;
  courseCanvasId: number;
  name: string;
  dueAt?: string | null;
  description?: string;
  /** The original Canvas description HTML, unstripped (for display as-is). */
  descriptionHtml?: string;
  url?: string;
  points?: number | null;
  kind?: "study" | "project";
  score?: number | null;
  grade?: string | null;
  feedback?: string[];
  gradedAt?: number | null;
  /** Whether the student has submitted this online (Canvas submitted_at is set). */
  submitted?: boolean;
  submittedAt?: number | null;
  /** Past due and not submitted. */
  missing?: boolean;
  /** Formatted marking rubric / criteria, if the assignment has one. */
  rubric?: string;
  /** Canvas grading_type (e.g. "points", "not_graded"). */
  gradingType?: string;
  /** Weighting (%) of the assignment group this belongs to, if the course
   *  uses weighted grading categories (e.g. "Assessments 60%" vs "Classwork 0%"). */
  groupWeight?: number;
  /** Canvas assignment_group_id — used internally to look up groupWeight. */
  assignmentGroupId?: number;
  /** True when this is formally assessed work; false = a day-to-day task
   *  (imported as homework, not an assessment). Set by syncCanvas. */
  assessed?: boolean;
  /** Which indicator(s) drove the assessed/task call — for logging/debugging. */
  assessedReasons?: string[];
}

// ─────────────────────────────────────────────────────────────
// Assessment vs. day-to-day task classification.
//
// This runs on every Canvas sync, for every assignment, so it has to stay
// free and instant for the common case — only genuinely ambiguous items
// (nothing below fires either way) fall through to a single batched AI call
// covering the whole sync (see classifyAmbiguous in syncCanvas below).
// ─────────────────────────────────────────────────────────────

/**
 * Ordered priority list of indicators — checked top to bottom, first match
 * wins. Order matters: strong, concrete Canvas-provided evidence goes first
 * (either direction), explicit task-language is checked BEFORE the weak
 * "has some points" signal so a small completion-tracking point value on a
 * "practice worksheet" doesn't wrongly outrank the word "practice" itself —
 * that exact false positive is what an earlier, flatter version of this list
 * got wrong. Nothing firing at all means genuinely ambiguous → AI tie-break.
 */
const INDICATORS: { assessed: boolean; test: (a: CanvasAssignment) => boolean; reason: string }[] = [
  // 1. Direct evidence it was actually marked — the strongest signal there is.
  { assessed: true, test: (a) => a.score != null || !!(a.grade && a.grade !== ""), reason: "already graded (score/grade present)" },
  { assessed: true, test: (a) => !!a.feedback?.length, reason: "teacher left feedback/comments" },
  { assessed: true, test: (a) => !!a.rubric?.trim(), reason: "has a marking rubric" },
  { assessed: true, test: (a) => (a.groupWeight ?? 0) > 0, reason: "belongs to a weighted assignment category (counts toward the grade)" },

  // 2. Canvas's own structural signals that it explicitly does NOT count.
  { assessed: false, test: (a) => a.gradingType === "not_graded", reason: "Canvas marks it as not graded" },
  { assessed: false, test: (a) => (a.groupWeight ?? -1) === 0 && !(a.points ?? 0), reason: "in a 0%-weighted category with no points" },

  // 3. Explicit language in the title/notification — checked task-language
  //    first, so wording like "practice worksheet" wins over a stray points
  //    value below (a completion-tracking point value doesn't make it a
  //    formal assessment).
  { assessed: false, test: (a) => /\b(homework|classwork|practice|worksheet|reading|revision|optional|for your own (benefit|learning)|not for marks|no need to submit)\b/i.test(`${a.name} ${a.description || ""}`), reason: "notification uses everyday-task language" },
  { assessed: true, test: (a) => /\b(assessment|assessed|examination|exam|test|quiz|summative|marked|marking|graded|grading|rubric|criteri(a|on)|weighting|worth\s+\d+\s*%?|task\s*\d)\b/i.test(`${a.name} ${a.description || ""}`), reason: "notification/title uses formal-assessment language" },

  // 4. Last resort before giving up: worth SOME marks and gradeable at all.
  //    Weakest signal — many schools give small completion points to routine
  //    homework, so this only fires once every stronger check above (and
  //    every task-language check) has already failed to find anything.
  { assessed: true, test: (a) => (a.points ?? 0) > 0 && a.gradingType !== "not_graded", reason: "worth marks and gradeable" },
];

/**
 * Classify one assignment against the indicator list above.
 * Returns `assessed: null` when nothing fires either way — genuinely
 * ambiguous, left for the AI tie-breaker (or a conservative default) rather
 * than guessed at here.
 */
export function classifyAssessedIndicator(a: CanvasAssignment): {
  assessed: boolean | null;
  reasons: string[];
} {
  for (const i of INDICATORS) if (i.test(a)) return { assessed: i.assessed, reasons: [i.reason] };
  return { assessed: null, reasons: [] };
}

/** Format a Canvas rubric (array of criteria) into readable marking criteria. */
function formatRubric(rubric: any): string | undefined {
  if (!Array.isArray(rubric) || rubric.length === 0) return undefined;
  const lines = rubric.slice(0, 20).map((c: any) => {
    const name = stripHtml(c.description) || "Criterion";
    const pts = c.points != null ? ` (${c.points} pts)` : "";
    const detail = stripHtml(c.long_description);
    const ratings = Array.isArray(c.ratings)
      ? c.ratings
          .slice(0, 6)
          .map((r: any) => `${stripHtml(r.description)}${r.points != null ? ` [${r.points}]` : ""}`)
          .filter(Boolean)
          .join("; ")
      : "";
    return `- ${name}${pts}${detail ? `: ${detail}` : ""}${ratings ? `\n   levels: ${ratings}` : ""}`;
  });
  return lines.join("\n").slice(0, 4000);
}

/** Classify a Canvas assignment as a test to study for vs. work to submit. */
function classifyKind(name: string, types: string[]): "study" | "project" {
  const n = (name || "").toLowerCase();
  if (types.includes("online_quiz") || /\b(exam|test|quiz)\b/.test(n)) return "study";
  if (
    /\b(project|essay|report|portfolio|presentation|task|assignment|investigation|design|composition|workbook|research|prac|depth study)\b/.test(n)
  )
    return "project";
  if (
    types.some((t) =>
      ["online_upload", "online_text_entry", "online_url", "media_recording", "discussion_topic"].includes(t)
    )
  )
    return "project";
  return "study";
}

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 6000);
}

/** Error that knows it came from Canvas (carries the HTTP status). */
export class CanvasError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "CanvasError";
  }
}

/**
 * Accept whatever the user pastes for their Canvas URL and return a clean origin:
 *   "emanuel.instructure.com"            → "https://emanuel.instructure.com"
 *   "https://emanuel.instructure.com/"   → "https://emanuel.instructure.com"
 *   "https://emanuel.instructure.com/courses/123" → "https://emanuel.instructure.com"
 * Returns "" if it can't be parsed.
 */
export function normalizeBaseUrl(input: string): string {
  let s = String(input || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

async function cget(creds: CanvasCreds, path: string) {
  const res = await fetch(`${creds.baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${creds.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CanvasError(res.status, `Canvas ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Verify credentials and return the Canvas user's name. */
export async function verifyCanvas(creds: CanvasCreds): Promise<{ name: string }> {
  const me = await cget(creds, "/users/self");
  return { name: me?.name || me?.short_name || "Canvas user" };
}

export async function fetchCourses(creds: CanvasCreds): Promise<CanvasCourse[]> {
  const courses = await cget(
    creds,
    "/courses?enrollment_state=active&state[]=available&include[]=syllabus_body&per_page=100"
  );
  return (Array.isArray(courses) ? courses : [])
    .filter((c: any) => c && c.id && c.name && !c.access_restricted_by_date)
    .map((c: any) => ({
      canvasId: c.id,
      name: c.name,
      courseCode: c.course_code || undefined,
      syllabusBody: c.syllabus_body ? stripHtml(c.syllabus_body) : undefined,
    }));
}

/** Course learning outcomes / syllabus standards (one bounded call per course). */
export async function fetchOutcomes(
  creds: CanvasCreds,
  courseId: number
): Promise<CanvasOutcome[]> {
  try {
    const links = await cget(
      creds,
      `/courses/${courseId}/outcome_group_links?outcome_style=full&per_page=100`
    );
    if (!Array.isArray(links)) return [];
    const seen = new Set<string>();
    const out: CanvasOutcome[] = [];
    for (const l of links) {
      const o = l?.outcome;
      const title = o?.title || o?.display_name;
      if (!o || !title || seen.has(title)) continue;
      seen.add(title);
      out.push({ title: String(title), description: stripHtml(o.description).slice(0, 600) });
      if (out.length >= 60) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchAssignments(
  creds: CanvasCreds,
  courseId: number
): Promise<CanvasAssignment[]> {
  const a = await cget(
    creds,
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at`
  );
  return (Array.isArray(a) ? a : []).map((x: any) => ({
    canvasId: x.id,
    courseCanvasId: courseId,
    name: x.name || "Assignment",
    dueAt: x.due_at,
    description: stripHtml(x.description),
    descriptionHtml: typeof x.description === "string" && x.description.trim() ? x.description : undefined,
    url: x.html_url,
    points: x.points_possible ?? null,
    kind: classifyKind(x.name || "", x.submission_types || []),
    rubric: formatRubric(x.rubric),
    gradingType: x.grading_type || undefined,
    assignmentGroupId: x.assignment_group_id ?? undefined,
  }));
}

/** Weighting (%) per assignment group, keyed by group id — a course that
 *  weights "Assessments" at 60% vs "Classwork" at 0% gives us a strong,
 *  otherwise-unused signal for the assessed/task split below. */
async function fetchAssignmentGroupWeights(
  creds: CanvasCreds,
  courseId: number
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  try {
    const groups = await cget(creds, `/courses/${courseId}/assignment_groups?per_page=100`);
    if (Array.isArray(groups)) {
      for (const g of groups) map.set(g.id, Number(g.group_weight) || 0);
    }
  } catch {
    // weighting not exposed on this course — the other indicators still apply
  }
  return map;
}

/** The student's own grades + feedback for a course, keyed by assignment id. */
async function fetchSubmissions(creds: CanvasCreds, courseId: number) {
  const map = new Map<
    number,
    {
      score: number | null;
      grade: string | null;
      feedback: string[];
      gradedAt: number | null;
      submitted: boolean;
      submittedAt: number | null;
      missing: boolean;
    }
  >();
  try {
    const subs = await cget(
      creds,
      `/courses/${courseId}/students/submissions?student_ids[]=self&include[]=submission_comments&per_page=100`
    );
    if (Array.isArray(subs)) {
      for (const s of subs) {
        map.set(s.assignment_id, {
          score: s.score ?? null,
          grade: s.grade ?? null,
          feedback: Array.isArray(s.submission_comments)
            ? s.submission_comments.map((c: any) => c.comment).filter(Boolean)
            : [],
          gradedAt: s.graded_at ? Date.parse(s.graded_at) : null,
          // submitted_at is set the moment the student hands in online.
          submitted: !!s.submitted_at,
          submittedAt: s.submitted_at ? Date.parse(s.submitted_at) : null,
          missing: !!s.missing,
        });
      }
    }
  } catch {
    // grades not accessible for this course — skip
  }
  return map;
}

async function extractFileText(meta: any, buf: ArrayBuffer): Promise<string> {
  const name = String(meta.display_name || meta.filename || "").toLowerCase();
  const ct = String(meta["content-type"] || meta.content_type || "").toLowerCase();
  try {
    if (name.endsWith(".pdf") || ct.includes("pdf")) {
      const mod: any = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = mod.default ?? mod;
      const data = await pdfParse(Buffer.from(buf));
      return String(data.text || "").slice(0, 8000);
    }
    if (
      name.endsWith(".docx") ||
      ct.includes("word") ||
      ct.includes("officedocument") ||
      ct.includes("vnd.openxmlformats")
    ) {
      // mammoth's methods live under `.default` in some bundles, top-level in others.
      const mod: any = await import("mammoth");
      const mammoth = mod.extractRawText ? mod : mod.default ?? mod;
      const res = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      return String(res.value || "").slice(0, 8000);
    }
    if (name.endsWith(".txt") || name.endsWith(".md") || ct.startsWith("text/")) {
      return Buffer.from(buf).toString("utf8").slice(0, 8000);
    }
  } catch (e) {
    console.error(`[canvas] file extract failed for "${name}" (${ct}):`, e);
  }
  return "";
}

/** Download + extract text from files attached to a single assignment. */
export async function fetchAssignmentNotification(
  creds: CanvasCreds,
  courseId: number,
  assignmentId: number
): Promise<{ text: string; files: { name: string }[] }> {
  const a = await cget(creds, `/courses/${courseId}/assignments/${assignmentId}`);
  const desc: string = a?.description || "";
  // Canvas embeds file links as /files/123, /courses/12/files/123 or
  // .../files/123/download — capture the id from any of those shapes.
  const ids = Array.from(
    new Set([...desc.matchAll(/files\/(\d+)/g)].map((m) => m[1]))
  ).slice(0, 4);

  const files: { name: string }[] = [];
  const rubric = formatRubric(a?.rubric);
  let text = rubric ? `\n\n[Marking criteria]\n${rubric}` : "";
  if (ids.length === 0) {
    console.warn(`[canvas] no file links found in assignment ${assignmentId} description`);
  }
  for (const fid of ids) {
    try {
      // Some instances only resolve the file in its course scope.
      let meta: any = await cget(creds, `/files/${fid}`).catch(() => null);
      if (!meta?.url) meta = await cget(creds, `/courses/${courseId}/files/${fid}`).catch(() => null);
      if (!meta?.url) {
        console.warn(`[canvas] file ${fid}: no download url`);
        continue;
      }
      // The signed url works unauthenticated; retry with the token if it 401s.
      let fr = await fetch(meta.url);
      if (!fr.ok) fr = await fetch(meta.url, { headers: { Authorization: `Bearer ${creds.token}` } });
      if (!fr.ok) {
        console.warn(`[canvas] file ${fid} download failed: ${fr.status}`);
        continue;
      }
      const t = await extractFileText(meta, await fr.arrayBuffer());
      const fname = meta.display_name || meta.filename || `file ${fid}`;
      if (t.trim()) {
        files.push({ name: fname });
        text += `\n\n[Attached: ${fname}]\n${t.trim()}`;
      } else {
        console.warn(`[canvas] file ${fid} ("${fname}") extracted no text`);
      }
    } catch (e) {
      console.error(`[canvas] file ${fid} failed:`, e);
    }
  }
  return { text: text.trim(), files };
}

/** Pull active courses + assignments + the student's grades, normalised. */
export async function syncCanvas(creds: CanvasCreds): Promise<{
  courses: CanvasCourse[];
  assignments: CanvasAssignment[];
}> {
  const courses = await fetchCourses(creds);
  const assignments: CanvasAssignment[] = [];
  await Promise.all(
    courses.map(async (c) => {
      try {
        const [as, grades, outcomes, groupWeights] = await Promise.all([
          fetchAssignments(creds, c.canvasId),
          fetchSubmissions(creds, c.canvasId),
          fetchOutcomes(creds, c.canvasId),
          fetchAssignmentGroupWeights(creds, c.canvasId),
        ]);
        if (outcomes.length) c.outcomes = outcomes;
        for (const a of as) {
          const g = grades.get(a.canvasId);
          if (g) {
            a.score = g.score;
            a.grade = g.grade;
            a.feedback = g.feedback;
            a.gradedAt = g.gradedAt;
            a.submitted = g.submitted;
            a.submittedAt = g.submittedAt;
            a.missing = g.missing;
          }
          if (a.assignmentGroupId != null) a.groupWeight = groupWeights.get(a.assignmentGroupId) ?? 0;
        }
        assignments.push(...as);
      } catch {
        // skip a course that errors
      }
    })
  );

  // Run the free indicator-based classifier first (see classifyAssessedIndicator
  // above for the full list). Only items where NOTHING fires either way — no
  // grade, no rubric, no weighting, no telling keywords — go to a single
  // batched AI call covering the whole sync, so cost stays flat regardless of
  // how many assignments there are.
  const ambiguous: CanvasAssignment[] = [];
  for (const a of assignments) {
    const { assessed, reasons } = classifyAssessedIndicator(a);
    a.assessed = assessed ?? undefined;
    a.assessedReasons = reasons;
    if (assessed === null) ambiguous.push(a);
  }
  if (ambiguous.length > 0) {
    try {
      const decided = await classifyAmbiguous(ambiguous);
      for (const a of ambiguous) {
        a.assessed = decided.get(a.canvasId) ?? false; // conservative default: task
        a.assessedReasons = [decided.has(a.canvasId) ? "AI tie-break (ambiguous case)" : "ambiguous — AI unavailable, defaulted to task"];
      }
    } catch (e) {
      console.error("[canvas] AI tie-break failed, defaulting ambiguous items to task:", e);
      for (const a of ambiguous) {
        a.assessed = false;
        a.assessedReasons = ["ambiguous — AI tie-break failed, defaulted to task"];
      }
    }
    console.log(
      `[canvas] classified ${assignments.length} assignment(s): ${ambiguous.length} were ambiguous, resolved via AI tie-break.`
    );
  }

  return { courses, assignments };
}

/**
 * Last-resort tie-break for assignments the indicator list couldn't call
 * either way. Batches ALL ambiguous items from one sync into a SINGLE model
 * call (cost stays flat no matter how many assignments a user has) and is
 * deliberately NOT metered against the user's plan — this is a background
 * sorting courtesy, not a content generation the user asked for.
 */
async function classifyAmbiguous(items: CanvasAssignment[]): Promise<Map<number, boolean>> {
  const payload = items.map((a) => ({
    id: a.canvasId,
    name: a.name,
    points: a.points ?? null,
    gradingType: a.gradingType,
    groupWeight: a.groupWeight,
    excerpt: (a.description || "").slice(0, 400),
  }));
  const result = await classifyAssignments(payload);
  const map = new Map<number, boolean>();
  for (const [id, assessed] of Object.entries(result)) map.set(Number(id), assessed);
  return map;
}
