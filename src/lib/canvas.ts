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
  url?: string;
  points?: number | null;
  kind?: "study" | "project";
  score?: number | null;
  grade?: string | null;
  feedback?: string[];
  gradedAt?: number | null;
  /** Formatted marking rubric / criteria, if the assignment has one. */
  rubric?: string;
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

async function cget(creds: CanvasCreds, path: string) {
  const res = await fetch(`${creds.baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${creds.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Canvas ${res.status} on ${path}: ${body.slice(0, 200)}`);
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
    url: x.html_url,
    points: x.points_possible ?? null,
    kind: classifyKind(x.name || "", x.submission_types || []),
    rubric: formatRubric(x.rubric),
  }));
}

/** The student's own grades + feedback for a course, keyed by assignment id. */
async function fetchSubmissions(creds: CanvasCreds, courseId: number) {
  const map = new Map<
    number,
    { score: number | null; grade: string | null; feedback: string[]; gradedAt: number | null }
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
        const [as, grades, outcomes] = await Promise.all([
          fetchAssignments(creds, c.canvasId),
          fetchSubmissions(creds, c.canvasId),
          fetchOutcomes(creds, c.canvasId),
        ]);
        if (outcomes.length) c.outcomes = outcomes;
        for (const a of as) {
          const g = grades.get(a.canvasId);
          if (g) {
            a.score = g.score;
            a.grade = g.grade;
            a.feedback = g.feedback;
            a.gradedAt = g.gradedAt;
          }
        }
        assignments.push(...as);
      } catch {
        // skip a course that errors
      }
    })
  );
  return { courses, assignments };
}
