import { uid } from "@/lib/format";
import type { Difficulty, StudyNote, TestQuestion } from "@/lib/types";
import type { AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import { IMPROVE_SYS, sanitizeImprovedHtml } from "./improve";

const BASE_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, "") ||
  "https://openrouter.ai/api/v1";

// Primary model + optional comma-separated fallbacks, then a hardcoded paid
// safety net. ":free" models are excluded outright — they're slow, heavily
// rate-limited and low quality, so falling onto one burns the request's whole
// time budget and lands the user on the offline mock anyway.
const MODELS = [
  ...new Set(
    [
      process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      ...(process.env.OPENROUTER_FALLBACK_MODELS || "").split(","),
      "openai/gpt-4.1-mini", // paid fallback of last resort
    ]
      .map((s) => s.trim())
      .filter((s) => s && !s.endsWith(":free"))
  ),
];

export function enabled() {
  return !!process.env.OPENROUTER_API_KEY;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

// Pro-tier users get a stronger model (OPENROUTER_PRO_MODEL, e.g. openai/gpt-4o)
// tried first, falling back to the standard chain if it errors.
async function complete(
  messages: Msg[],
  opts: { json?: boolean; maxTokens?: number; pro?: boolean; timeoutMs?: number } = {}
): Promise<string> {
  const models =
    opts.pro && process.env.OPENROUTER_PRO_MODEL
      ? [process.env.OPENROUTER_PRO_MODEL, ...MODELS]
      : MODELS;
  const maxTokens = opts.maxTokens ?? 2000;
  const call = (model: string, useJson: boolean, signal: AbortSignal) =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://anchor.app",
        "X-Title": "Anchor",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
        ...(useJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const ATTEMPTS = 3; // per model — ride out transient 429s / timeouts / blips
  // Serverless functions are hard-capped (60s on Vercel Hobby). Stay comfortably
  // under it and abort a slow generation ourselves, so the route returns a clean
  // offline fallback (+ toast) instead of the platform 504-ing with nothing.
  // 40s per attempt: a slow-but-successful gpt-4o-mini generation (~35s) must
  // FINISH, not get aborted at the finish line and retried into the mock.
  const perAttemptMs = opts.timeoutMs ?? 40000;
  const deadline = Date.now() + 52000;
  let lastErr = "no model configured";
  for (const model of models) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 1500) {
        lastErr = `${model}: ran out of time budget`;
        break;
      }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), Math.min(perAttemptMs, remaining));
      try {
        let res = await call(model, !!opts.json, ac.signal);
        // Some models reject response_format — retry once without it.
        if (!res.ok && opts.json) res = await call(model, false, ac.signal);
        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (typeof content === "string" && content.trim()) return content;
          lastErr = `${model}: empty response`;
          // empty → retry (transient)
        } else {
          const body = await res.text().catch(() => "");
          lastErr = `${model} ${res.status}: ${body.slice(0, 160)}`;
          // 4xx other than 429 (bad slug, auth, quota) won't fix on retry —
          // move to the next model immediately.
          if (res.status !== 429 && res.status < 500) break;
        }
      } catch (e) {
        // abort (our timeout) / network — retry if budget remains
        const aborted = e instanceof Error && e.name === "AbortError";
        lastErr = aborted
          ? `${model}: timed out`
          : `${model}: ${e instanceof Error ? e.message : String(e)}`;
      } finally {
        clearTimeout(timer);
      }
      if (attempt < ATTEMPTS - 1 && deadline - Date.now() > 2000) {
        await sleep(500 * (attempt + 1)); // 0.5s, 1s backoff
      }
    }
    if (deadline - Date.now() <= 1500) break;
  }
  throw new Error(`OpenRouter — all models failed. Last: ${lastErr}`);
}

function parseJson<T>(raw: string): T {
  let s = raw.trim();
  // strip ``` fences if the model added them
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  if (start > 0) s = s.slice(start);
  const end = s.lastIndexOf("}");
  if (end >= 0 && end < s.length - 1) s = s.slice(0, end + 1);

  const tryParse = (str: string): T | null => {
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  };

  // 1) straight parse
  let out = tryParse(s);
  if (out) return out;

  // 2) remove trailing commas (a common model slip)
  out = tryParse(s.replace(/,\s*([}\]])/g, "$1"));
  if (out) return out;

  // 3) repair truncated JSON — close any open strings/brackets, drop a dangling
  //    trailing fragment. Free models often get cut off mid-array.
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let lastSafe = 0; // index just after the last complete top-level-ish token
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
    if (!inStr && (c === "}" || c === "]")) lastSafe = i + 1;
  }
  let fixed = s;
  if (inStr) fixed = fixed.slice(0, lastSafe || fixed.length); // drop partial string/element
  // rebuild the bracket stack for the (possibly trimmed) string
  const stack2: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < fixed.length; i++) {
    const c = fixed[i];
    if (inStr2) {
      if (esc2) esc2 = false;
      else if (c === "\\") esc2 = true;
      else if (c === '"') inStr2 = false;
      continue;
    }
    if (c === '"') inStr2 = true;
    else if (c === "{" || c === "[") stack2.push(c);
    else if (c === "}" || c === "]") stack2.pop();
  }
  fixed = fixed.replace(/,\s*$/, "");
  while (stack2.length) fixed += stack2.pop() === "{" ? "}" : "]";
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  out = tryParse(fixed);
  if (out) return out;

  throw new Error("OpenRouter: could not parse model JSON");
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

function contextHeader(input: AnalyzeInput) {
  return `Subject: ${input.subjectName} (type: ${input.subjectType}). Assessment: "${input.assessmentTitle}".`;
}

export async function analyze(
  input: AnalyzeInput,
  o: { pro?: boolean } = {}
): Promise<AnalyzeResult> {
  const sys =
    "You are Anchor, an expert study assistant for school and university students. " +
    "Analyse the student's assessment notification and produce study materials. " +
    "Respond with ONLY valid minified JSON (no markdown) matching this TypeScript type: " +
    `{kind:"study"|"project",summary:{overview:string,requirements:string[],outcomes:string[],objectives:string[],keyConcepts:string[],dueDate?:string,weighting?:string},notes:{heading:string,body:string}[],revision:{guide:string,practiceQuestions:string[],examQuestions:string[],commonMistakes:string[],misconceptions:string[],extras:{title:string,items:string[]}[]},flashcards:{front:string,back:string}[],plan:string[]}. ` +
    "FIRST classify the assessment from the notification and set 'kind': " +
    "'study' = a test, exam, quiz or in-class written assessment the student SITS and must revise for; " +
    "'project' = work the student PRODUCES and submits (essay, report, presentation, video, portfolio, investigation, design, composition). " +
    "If it is genuinely BOTH (e.g. make a fact sheet AND then sit a test on it), set kind to the primary one but populate BOTH 'plan' and the full revision materials. " +
    "dueDate must be ISO yyyy-mm-dd if present, else omit. " +
    "CRITICAL: 'overview', 'keyConcepts', 'requirements' and flashcards must describe the ACTUAL subject matter and task (e.g. building a full-stack web app, the SRS document, HTML/CSS/JS separation) — NEVER admin/instruction words like submit, criterion, complete, minimal, weighting, due, worth, stage or canvas. If the notification is mostly logistics with little real content, keep these short rather than inventing junk. " +
    "THEN tailor the materials to the kind you chose:\n" +
    "• study/exam/in-class — focus on WHAT TO KNOW and HOW TO STUDY: 'keyConcepts' = the exact topics, definitions and formulae to master; 'notes' explain that content; 'revision.guide' is a concrete study method; 'plan' is an ordered revision/study SCHEDULE (what to study, in what order, with active recall); fill 'revision.practiceQuestions' and 'revision.examQuestions' with strong, exam-realistic questions; give 6-10 flashcards covering the key facts.\n" +
    "• project — BREAK IT DOWN: use the brief, any marking criteria/rubric, attachments and syllabus so 'plan' is a thorough, ordered list of concrete, actionable STEPS from understanding the task through researching, outlining, drafting/building and refining against the marking criteria to final submission; 'requirements' lists exactly what to deliver; 'notes' guide the hardest parts. A project is PRODUCED, not memorised, so DO NOT invent study aids: return flashcards:[] and leave revision.practiceQuestions and revision.examQuestions as [] — UNLESS the notification requires the student to PRESENT or LEARN content from memory (oral presentation, viva, speech, or a knowledge/test component). If it is a PRESENTATION/oral: cue cards can only be made from the student's OWN drafted talk, and the notification usually only DESCRIBES the task — in that case return flashcards:[] (NEVER invent cards about the task description or generic topic questions; the app lets the student paste their draft later to make real cue cards) and end 'plan' with: draft the talk, turn the draft into cue cards, rehearse with them. Only if the notification itself contains the actual content to be presented may you make the flashcards CUE CARDS from it (front = a slide/section title or a question the audience or marker might ask; back = concise talking points to say ALOUD in your own words, NOT paragraphs). Always set 'revision.guide' to a concrete plan to MEMORISE and REHEARSE the talk (chunk it section by section, practise each part out loud, time yourself against the limit, and tips for confident delivery and handling questions), and keep 'plan' on preparing, building, rehearsing and refining the talk. For a viva/test component, add targeted flashcards/practice for exactly that content." +
    " Keep EVERY field concise so the JSON is COMPLETE and valid — a truncated response is useless, so never run long. Hard limits: overview ≤ 3 sentences; ≤ 4 notes (each 2–4 sentences); ≤ 8 flashcards; ≤ 6 practiceQuestions; ≤ 4 examQuestions; commonMistakes + misconceptions ≤ 4 items total; ≤ 2 revision.extras groups; plan ≤ 12 steps. Always prefer briefly completing ALL fields over long prose in any one.";
  const user = `${contextHeader(input)}\nCanvas's guess at the type (may be wrong — you decide): ${
    input.kind || "unknown"
  }.\n\nAssessment notification:\n"""\n${input.text.slice(0, 8000)}\n"""`;
  const raw = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    { json: true, maxTokens: 2800, pro: o.pro }
  );
  const p = parseJson<any>(raw);
  const s = p.summary ?? {};
  const notes: StudyNote[] = Array.isArray(p.notes)
    ? p.notes.map((n: any) => ({ id: uid("nt"), heading: String(n.heading || "Note"), body: String(n.body || "") }))
    : [];
  const rev = p.revision ?? {};
  if (!s.overview || notes.length === 0) throw new Error("OpenRouter analyze: incomplete result");
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
      ? p.flashcards
          .map((f: any) => ({ front: String(f.front || ""), back: String(f.back || "") }))
          .filter((f: any) => f.front && f.back)
      : [],
    plan: asArray(p.plan),
  };
}

export async function generateFlashcards(
  input: AnalyzeInput & { count?: number; style?: "cuecards" },
  o: { pro?: boolean } = {}
): Promise<{ front: string; back: string }[]> {
  const sys =
    input.style === "cuecards"
      ? "You are Anchor, a presentation coach. Convert the student's OWN drafted talk/script/outline into spoken cue cards, in the draft's own order. " +
        'Respond with ONLY valid JSON: {"flashcards":[{"front":string,"back":string}]}. ' +
        "front = the section/slide title, or the question that part of the talk answers. " +
        "back = 2-4 short talking points in natural spoken language (separate points with \\n) — just enough to jog memory while presenting, NEVER full sentences to read out word-for-word. " +
        "Use only what is in the draft; do not invent new content. " +
        `Make up to ${input.count ?? 8} cards (fewer if the draft is short).`
      : "You are Anchor, a study assistant. Create flashcards from the assessment. " +
        'Respond with ONLY valid JSON: {"flashcards":[{"front":string,"back":string}]}. ' +
        `Make ${input.count ?? 8} focused cards.`;
  const label = input.style === "cuecards" ? "The student's drafted talk" : "Content";
  const raw = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: `${contextHeader(input)}\n\n${label}:\n"""\n${input.text.slice(0, 6000)}\n"""` },
    ],
    { json: true, maxTokens: 1200, pro: o.pro }
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
  input: AnalyzeInput & { difficulty: Difficulty; count?: number },
  o: { pro?: boolean } = {}
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
    { json: true, maxTokens: 2200, pro: o.pro }
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
  return complete(msgs, { maxTokens: 900, pro: o.pro });
}

export async function improveNote(text: string, o: { pro?: boolean } = {}): Promise<string> {
  const raw = await complete(
    [
      { role: "system", content: IMPROVE_SYS },
      { role: "user", content: text.slice(0, 8000) },
    ],
    { maxTokens: 2000, pro: o.pro }
  );
  const out = sanitizeImprovedHtml(raw);
  if (out.length < 4) throw new Error("OpenRouter improve: no usable HTML");
  return out;
}
