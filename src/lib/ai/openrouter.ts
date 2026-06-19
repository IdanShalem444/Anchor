import { uid } from "@/lib/format";
import type { Difficulty, StudyNote, TestQuestion } from "@/lib/types";
import type { AnalyzeInput, AnalyzeResult, ChatContext } from "./types";

const BASE_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, "") ||
  "https://openrouter.ai/api/v1";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

export function enabled() {
  return !!process.env.OPENROUTER_API_KEY;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function complete(
  messages: Msg[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const call = (useJson: boolean) =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://anchor.app",
        "X-Title": "Anchor",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 2000,
        ...(useJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  let res = await call(!!opts.json);
  // Some models (e.g. Gemma) reject response_format — retry once without it.
  if (!res.ok && opts.json) res = await call(false);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter: empty response");
  return content;
}

function parseJson<T>(raw: string): T {
  let s = raw.trim();
  // strip ``` fences if the model added them
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start > 0 || end < s.length - 1) s = s.slice(start, end + 1);
  return JSON.parse(s) as T;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

function contextHeader(input: AnalyzeInput) {
  return `Subject: ${input.subjectName} (type: ${input.subjectType}). Assessment: "${input.assessmentTitle}".`;
}

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  const sys =
    "You are Anchor, an expert study assistant for school and university students. " +
    "Analyse the student's assessment notification and produce study materials. " +
    "Respond with ONLY valid minified JSON (no markdown) matching this TypeScript type: " +
    `{summary:{overview:string,requirements:string[],outcomes:string[],objectives:string[],keyConcepts:string[],dueDate?:string,weighting?:string},notes:{heading:string,body:string}[],revision:{guide:string,practiceQuestions:string[],examQuestions:string[],commonMistakes:string[],misconceptions:string[],extras:{title:string,items:string[]}[]},flashcards:{front:string,back:string}[],plan:string[]}. ` +
    "dueDate must be ISO yyyy-mm-dd if a date is present, else omit. Make notes concrete and specific to the task. 6-10 flashcards. Tailor 'extras' to the subject (e.g. formula sheet for maths, techniques for English, definitions for science, vocabulary for languages). " +
    `'plan' is an ordered list of concrete steps — ${
      input.kind === "project"
        ? "for this project/submission, how to actually complete and submit it (unpack brief, research, outline, draft/build, refine against criteria, submit)"
        : "for this test/exam, a short revision sequence"
    }.`;
  const user = `${contextHeader(input)}\nType: ${
    input.kind === "project" ? "project/submission to produce" : "test/exam to study for"
  }.\n\nAssessment notification:\n"""\n${input.text.slice(0, 8000)}\n"""`;
  const raw = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    { json: true, maxTokens: 2600 }
  );
  const p = parseJson<any>(raw);
  const s = p.summary ?? {};
  const notes: StudyNote[] = Array.isArray(p.notes)
    ? p.notes.map((n: any) => ({ id: uid("nt"), heading: String(n.heading || "Note"), body: String(n.body || "") }))
    : [];
  const rev = p.revision ?? {};
  if (!s.overview || notes.length === 0) throw new Error("OpenRouter analyze: incomplete result");
  return {
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
      ? p.flashcards
          .map((f: any) => ({ front: String(f.front || ""), back: String(f.back || "") }))
          .filter((f: any) => f.front && f.back)
      : [],
    plan: asArray(p.plan),
  };
}

export async function generateFlashcards(
  input: AnalyzeInput & { count?: number }
): Promise<{ front: string; back: string }[]> {
  const sys =
    "You are Anchor, a study assistant. Create flashcards from the assessment. " +
    'Respond with ONLY valid JSON: {"flashcards":[{"front":string,"back":string}]}. ' +
    `Make ${input.count ?? 8} focused cards.`;
  const raw = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: `${contextHeader(input)}\n\nContent:\n"""\n${input.text.slice(0, 6000)}\n"""` },
    ],
    { json: true, maxTokens: 1200 }
  );
  const p = parseJson<any>(raw);
  const cards = Array.isArray(p.flashcards) ? p.flashcards : [];
  const out = cards
    .map((f: any) => ({ front: String(f.front || ""), back: String(f.back || "") }))
    .filter((f: any) => f.front && f.back);
  if (out.length === 0) throw new Error("OpenRouter flashcards: empty");
  return out;
}

export async function generateTest(
  input: AnalyzeInput & { difficulty: Difficulty; count?: number }
): Promise<{ title: string; questions: TestQuestion[] }> {
  const sys =
    "You are Anchor, a study assistant. Create a practice test from the assessment. " +
    'Respond with ONLY valid JSON: {"title":string,"questions":[{"type":"mcq"|"short"|"extended","prompt":string,"options"?:string[],"answerIndex"?:number,"modelAnswer"?:string}]}. ' +
    `Difficulty: ${input.difficulty}. Include a mix; MCQs must have 4 options and a correct answerIndex; short/extended must include a modelAnswer.`;
  const raw = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: `${contextHeader(input)}\n\nContent:\n"""\n${input.text.slice(0, 6000)}\n"""` },
    ],
    { json: true, maxTokens: 2200 }
  );
  const p = parseJson<any>(raw);
  const questions: TestQuestion[] = Array.isArray(p.questions)
    ? p.questions.map((q: any) => ({
        id: uid("q"),
        type: q.type === "mcq" || q.type === "extended" ? q.type : "short",
        prompt: String(q.prompt || ""),
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
        answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
        modelAnswer: q.modelAnswer ? String(q.modelAnswer) : undefined,
      })).filter((q: TestQuestion) => q.prompt)
    : [];
  if (questions.length === 0) throw new Error("OpenRouter test: empty");
  return { title: String(p.title || `${input.difficulty} practice — ${input.assessmentTitle}`), questions };
}

export async function chat(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  context: ChatContext;
}): Promise<string> {
  const c = input.context;
  const assessmentList = c.assessments?.length
    ? "The student's assessments (synced from Canvas) — title | due | status | grade:\n" +
      c.assessments
        .map(
          (a) =>
            `• ${a.title}${a.subject && !c.subject ? ` (${a.subject})` : ""} | ${
              a.dueDate || "no due date"
            } | ${a.status}${a.grade ? ` | grade ${a.grade}` : ""}`
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
    c.research?.length
      ? "Student's saved web research for this subject:\n" +
        c.research
          .slice(0, 12)
          .map((r) =>
            r.title
              ? `• ${r.title}${r.excerpt ? `: ${r.excerpt.slice(0, 400)}` : ""}`
              : r.query
                ? `• searched: "${r.query}"`
                : ""
          )
          .filter(Boolean)
          .join("\n")
      : "",
    c.notificationText ? `Notification excerpt: ${c.notificationText.slice(0, 1500)}` : "",
    assessmentList,
  ].filter(Boolean);
  const sys =
    "You are Anchor, a friendly, expert AI study tutor. Help the student understand, plan, draft and revise. " +
    "Be concise and practical. You DO have the student's assessment schedule and grades below — answer questions about what's next, what's due, deadlines and results directly from it (relative to today's date). Never tell the student to upload their schedule; you already have it.\n\n" +
    (ctxLines.length ? `Context:\n${ctxLines.join("\n")}` : "No assessments are linked yet — suggest they sync Canvas or add a subject.");
  const msgs: Msg[] = [
    { role: "system", content: sys },
    ...input.messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];
  return complete(msgs, { maxTokens: 900 });
}
