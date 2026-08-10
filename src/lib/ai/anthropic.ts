import Anthropic from "@anthropic-ai/sdk";
import { uid } from "@/lib/format";
import type { Difficulty, StudyNote, TestQuestion } from "@/lib/types";
import type { AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import { IMPROVE_SYS, FORMAT_SYS, sanitizeImprovedHtml } from "./improve";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

export function enabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

type Msg = { role: "user" | "assistant"; content: string };

async function complete(
  system: string,
  messages: Msg[],
  maxTokens = 2000,
  pro = false
): Promise<string> {
  const model = pro ? process.env.ANTHROPIC_PRO_MODEL || MODEL : MODEL;
  const res = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });
  const text = (res.content as any[])
    .filter((b) => b.type === "text")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
  if (!text) throw new Error("Anthropic: empty response");
  return text;
}

function parseJson<T>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start > 0 || end < s.length - 1) s = s.slice(start, end + 1);
  return JSON.parse(s) as T;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

const header = (i: AnalyzeInput) =>
  `Subject: ${i.subjectName} (type: ${i.subjectType}). Assessment: "${i.assessmentTitle}".`;

export async function analyze(
  input: AnalyzeInput,
  o: { pro?: boolean } = {}
): Promise<AnalyzeResult> {
  const system =
    "You are Anchor, an expert study assistant for school and university students. " +
    "Analyse the student's assessment notification and produce study materials. " +
    "Respond with ONLY valid minified JSON (no markdown) matching this TypeScript type: " +
    `{kind:"study"|"project",summary:{overview:string,requirements:string[],outcomes:string[],objectives:string[],keyConcepts:string[],dueDate?:string,weighting?:string},notes:{heading:string,body:string}[],revision:{guide:string,practiceQuestions:string[],examQuestions:string[],commonMistakes:string[],misconceptions:string[],extras:{title:string,items:string[]}[]},flashcards:{front:string,back:string}[],plan:string[]}. ` +
    "FIRST classify the assessment and set 'kind': 'study' = a test, exam, quiz or in-class written assessment the student SITS and must revise for; 'project' = work the student PRODUCES and submits (essay, report, presentation, video, portfolio, investigation, design). If it is genuinely BOTH (e.g. make a fact sheet AND sit a test on it), set kind to the primary one but populate BOTH 'plan' and the revision materials. " +
    "dueDate is ISO yyyy-mm-dd if present, else omit. " +
    "CRITICAL: 'overview', 'keyConcepts', 'requirements' and flashcards must describe the ACTUAL subject matter and task — NEVER admin/instruction words like submit, criterion, complete, minimal, weighting, due, worth, stage or canvas. " +
    "THEN tailor the materials to that kind. " +
    "study/exam/in-class — focus on WHAT TO KNOW and HOW TO STUDY: 'keyConcepts' = the exact topics/definitions/formulae to master; 'notes' explain that content; 'revision.guide' is a concrete study method; 'plan' is an ordered revision/study schedule; fill 'revision.practiceQuestions' and 'revision.examQuestions' with strong exam-realistic questions; give 6-10 flashcards covering the key facts. " +
    "project — BREAK IT DOWN: use the brief, marking criteria/rubric, attachments and syllabus so 'plan' is a thorough, ordered list of concrete actionable steps from understanding the task to final submission, mapped to the requirements/marking criteria; 'requirements' lists exactly what to deliver. A project is PRODUCED, not memorised, so return flashcards:[] and leave revision.practiceQuestions and revision.examQuestions as [] — UNLESS the notification requires the student to PRESENT or LEARN content from memory. If it is a PRESENTATION/oral: cue cards can only come from the student's OWN drafted talk — if the notification only DESCRIBES the task (the usual case), return flashcards:[] (never invent cards about the task description; the student pastes their draft later to make real cue cards) and end 'plan' with: draft the talk, turn the draft into cue cards, rehearse. Only if the notification itself contains the content to present, make the flashcards CUE CARDS from it (front = a slide/section or a likely audience question; back = concise talking points to say ALOUD in your own words, not paragraphs). Always set 'revision.guide' to a plan to MEMORISE and REHEARSE the talk (chunk it, practise each section out loud, time yourself, delivery + Q&A tips), and keep 'plan' on preparing, building, rehearsing and refining the talk. For a viva/test component, add targeted flashcards/practice for exactly that content.";
  const user = `${header(input)}\nCanvas's guess at the type (may be wrong — you decide): ${
    input.kind || "unknown"
  }.\n\nAssessment notification:\n"""\n${input.text.slice(0, 8000)}\n"""`;
  const raw = await complete(system, [{ role: "user", content: user }], 3000, o.pro);
  const p = parseJson<any>(raw);
  const s = p.summary ?? {};
  const notes: StudyNote[] = Array.isArray(p.notes)
    ? p.notes.map((n: any) => ({ id: uid("nt"), heading: String(n.heading || "Note"), body: String(n.body || "") }))
    : [];
  const rev = p.revision ?? {};
  if (!s.overview || notes.length === 0) throw new Error("Anthropic analyze: incomplete result");
  return {
    kind: p.kind === "project" ? "project" : p.kind === "study" ? "study" : input.kind,
    summary: {
      overview: String(s.overview),
      requirements: asArray(s.requirements),
      outcomes: asArray(s.outcomes),
      objectives: asArray(s.objectives),
      keyConcepts: asArray(s.keyConcepts),
      dueDate: s.dueDate ? String(s.dueDate) : undefined,
      weighting: s.weighting ? String(s.weighting) : undefined,
    },
    notes,
    revision: {
      guide: String(rev.guide || ""),
      practiceQuestions: asArray(rev.practiceQuestions),
      examQuestions: asArray(rev.examQuestions),
      commonMistakes: asArray(rev.commonMistakes),
      misconceptions: asArray(rev.misconceptions),
      extras: Array.isArray(rev.extras)
        ? rev.extras.map((e: any) => ({ title: String(e.title || ""), items: asArray(e.items) })).filter((e: any) => e.title)
        : [],
    },
    flashcards: Array.isArray(p.flashcards)
      ? p.flashcards.map((f: any) => ({ front: String(f.front || ""), back: String(f.back || "") })).filter((f: any) => f.front && f.back)
      : [],
    plan: asArray(p.plan),
  };
}

export async function generateFlashcards(
  input: AnalyzeInput & { count?: number; style?: "cuecards" },
  o: { pro?: boolean } = {}
): Promise<{ front: string; back: string }[]> {
  const system =
    input.style === "cuecards"
      ? "You are Anchor, a presentation coach. Convert the student's OWN drafted talk/script/outline into spoken cue cards, in the draft's own order. " +
        'Respond with ONLY valid JSON: {"flashcards":[{"front":string,"back":string}]}. ' +
        "front = the section/slide title, or the question that part answers. " +
        "back = 2-4 short talking points in natural spoken language (separate with \\n) — enough to jog memory while presenting, never full sentences to read out. " +
        "Use only what is in the draft; do not invent content. " +
        `Make up to ${input.count ?? 8} cards (fewer if the draft is short).`
      : "You are Anchor, a study assistant. Create flashcards from the assessment. " +
        'Respond with ONLY valid JSON: {"flashcards":[{"front":string,"back":string}]}. ' +
        `Make ${input.count ?? 8} focused cards.`;
  const label = input.style === "cuecards" ? "The student's drafted talk" : "Content";
  const raw = await complete(
    system,
    [{ role: "user", content: `${header(input)}\n\n${label}:\n"""\n${input.text.slice(0, 6000)}\n"""` }],
    1200,
    o.pro
  );
  const p = parseJson<any>(raw);
  const out = (Array.isArray(p.flashcards) ? p.flashcards : [])
    .map((f: any) => ({ front: String(f.front || ""), back: String(f.back || "") }))
    .filter((f: any) => f.front && f.back);
  if (out.length === 0) throw new Error("Anthropic flashcards: empty");
  return out;
}

export async function generateTest(
  input: AnalyzeInput & { difficulty: Difficulty; count?: number },
  o: { pro?: boolean } = {}
): Promise<{ title: string; questions: TestQuestion[] }> {
  const system =
    "You are Anchor, a study assistant. Create a practice test from the assessment. " +
    'Respond with ONLY valid JSON: {"title":string,"questions":[{"type":"mcq"|"short"|"extended","prompt":string,"options"?:string[],"answerIndex"?:number,"modelAnswer"?:string}]}. ' +
    `Difficulty: ${input.difficulty}. MCQs need 4 options + correct answerIndex; short/extended need a modelAnswer.`;
  const raw = await complete(
    system,
    [{ role: "user", content: `${header(input)}\n\nContent:\n"""\n${input.text.slice(0, 6000)}\n"""` }],
    2200,
    o.pro
  );
  const p = parseJson<any>(raw);
  const questions: TestQuestion[] = (Array.isArray(p.questions) ? p.questions : [])
    .map((q: any) => ({
      id: uid("q"),
      type: q.type === "mcq" || q.type === "extended" ? q.type : "short",
      prompt: String(q.prompt || ""),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
      answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
      modelAnswer: q.modelAnswer ? String(q.modelAnswer) : undefined,
    }))
    .filter((q: TestQuestion) => q.prompt);
  if (questions.length === 0) throw new Error("Anthropic test: empty");
  return { title: String(p.title || `${input.difficulty} practice — ${input.assessmentTitle}`), questions };
}

export async function chat(
  input: {
    messages: { role: "user" | "assistant"; content: string }[];
    context: ChatContext;
  },
  o: { pro?: boolean } = {}
): Promise<string> {
  const c = input.context;
  const assessmentList = c.assessments?.length
    ? "The student's assessments (synced from Canvas) — title | due | status | grade:\n" +
      c.assessments
        .map(
          (a) =>
            `• ${a.title}${a.subject && !c.subject ? ` (${a.subject})` : ""} | ${a.dueDate || "no due date"} | ${a.status}${a.grade ? ` | grade ${a.grade}` : ""}`
        )
        .join("\n")
    : "";
  const ctxLines = [
    c.today ? `Today's date: ${c.today}.` : "",
    c.subject ? `Subject: ${c.subject.name} (${c.subject.type}).` : "",
    c.assessmentTitle ? `Current assessment: "${c.assessmentTitle}".` : "",
    c.summary?.overview ? `Overview: ${c.summary.overview}` : "",
    c.summary?.keyConcepts?.length ? `Key concepts: ${c.summary.keyConcepts.join(", ")}.` : "",
    c.summary?.requirements?.length ? `Requirements: ${c.summary.requirements.join("; ")}.` : "",
    c.outcomes?.length
      ? `Course learning outcomes (syllabus): ${c.outcomes.slice(0, 30).map((o) => o.title).join("; ")}.`
      : "",
    c.syllabus ? `Course syllabus excerpt: ${c.syllabus.slice(0, 1200)}` : "",
    c.notificationText ? `Notification excerpt: ${c.notificationText.slice(0, 1500)}` : "",
    assessmentList,
  ].filter(Boolean);
  const system =
    "You are Anchor, a friendly, expert AI study tutor. Help the student understand, plan, draft and revise. " +
    "Be concise and practical. You DO have the student's assessment schedule and grades below — answer questions about what's next, what's due, deadlines and results directly from it (relative to today's date). Never tell the student to upload their schedule; you already have it.\n\n" +
    (ctxLines.length ? `Context:\n${ctxLines.join("\n")}` : "No assessments are linked yet — suggest they sync Canvas or add a subject.");
  return complete(system, input.messages.slice(-12), 900, o.pro);
}

export async function improveNote(text: string, o: { pro?: boolean } = {}): Promise<string> {
  const raw = await complete(IMPROVE_SYS, [{ role: "user", content: text.slice(0, 8000) }], 2000, o.pro);
  const out = sanitizeImprovedHtml(raw);
  if (out.length < 4) throw new Error("Anthropic improve: no usable HTML");
  return out;
}

/** Presentation-only reformat of a notification — content stays verbatim. */
export async function formatNotification(
  text: string,
  o: { pro?: boolean } = {}
): Promise<string> {
  const raw = await complete(FORMAT_SYS, [{ role: "user", content: text.slice(0, 8000) }], 2600, o.pro);
  const out = sanitizeImprovedHtml(raw);
  if (out.length < 4) throw new Error("Anthropic format: no usable HTML");
  return out;
}

