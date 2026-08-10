import { uid } from "@/lib/format";
import type { Difficulty, SubjectType, TestQuestion } from "@/lib/types";
import type {
  AIProvider,
  AnalyzeInput,
  AnalyzeResult,
  ChatContext,
} from "./types";

// ── text analysis helpers ──────────────────────────────────────

const STOP = new Set(
  "the a an and or but of to in on for with as at by from into your you will be is are was were this that these those it its their they we our must should need will can may also which what when where how why each any all not no nor so than then once only own same too very just about above after again against because before below between both during further here more most other out over under up down off both only".split(
    /\s+/
  )
);

const REQ_KEYWORDS =
  /\b(must|should|need to|required to|you are to|you will|complete|submit|include|demonstrate|analyse|analyze|evaluate|create|design|write|produce|investigate|explain|describe|compare|discuss|justify|construct|develop|present|research|identify|outline|examine|calculate|solve)\b/i;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+|•|•|‣|◦/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && s.length < 320);
}

function lines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*•\d.)]+/, "").trim())
    .filter(Boolean);
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clamp<T>(arr: T[], n: number) {
  return arr.slice(0, n);
}

function dedupe(arr: string[]) {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = x.toLowerCase().trim();
    if (seen.has(k) || !k) return false;
    seen.add(k);
    return true;
  });
}

export function findDueDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Format from local date parts (avoids UTC off-by-one from toISOString).
  const iso = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
      dt.getDate()
    ).padStart(2, "0")}`;
  // numeric dd/mm/yyyy or dd-mm-yy
  const numeric = lower.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (numeric) {
    let [, d, m, y] = numeric;
    let year = parseInt(y.length === 2 ? "20" + y : y, 10);
    const date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) return iso(date);
  }
  // "12 March 2025" or "March 12"
  const monthRe = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})\\b(?:\\s+(\\d{4}))?`,
    "i"
  );
  const m1 = lower.match(monthRe);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const mon = MONTHS.indexOf(m1[2].toLowerCase());
    const year = m1[3] ? parseInt(m1[3], 10) : new Date().getFullYear();
    const date = new Date(year, mon, day);
    if (!isNaN(date.getTime())) return iso(date);
  }
  const monthRe2 = new RegExp(
    `\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`,
    "i"
  );
  const m2 = lower.match(monthRe2);
  if (m2) {
    const mon = MONTHS.indexOf(m2[1].toLowerCase());
    const day = parseInt(m2[2], 10);
    const year = m2[3] ? parseInt(m2[3], 10) : new Date().getFullYear();
    const date = new Date(year, mon, day);
    if (!isNaN(date.getTime())) return iso(date);
  }
  return undefined;
}

function findWeighting(text: string): string | undefined {
  const m = text.match(/(\d{1,3})\s?%/);
  return m ? `${m[1]}%` : undefined;
}

function keywords(text: string, n = 10): string[] {
  // capitalised multi-word phrases from the source
  const phrases =
    text.match(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g) || [];
  const phraseCount = new Map<string, number>();
  for (const p of phrases) {
    if (STOP.has(p.toLowerCase())) continue;
    phraseCount.set(p, (phraseCount.get(p) || 0) + 1);
  }
  // frequent content words
  const words = (text.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
    (w) => !STOP.has(w) && !REQ_KEYWORDS.test(w)
  );
  const wordCount = new Map<string, number>();
  for (const w of words) wordCount.set(w, (wordCount.get(w) || 0) + 1);

  const topPhrases = Array.from(phraseCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const topWords = Array.from(wordCount.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => titleCase(k));

  return clamp(dedupe([...topPhrases, ...topWords]), n);
}

function extractRequirements(text: string): string[] {
  const fromLines = lines(text).filter((l) => REQ_KEYWORDS.test(l));
  const fromSentences = sentences(text).filter((s) => REQ_KEYWORDS.test(s));
  return clamp(dedupe([...fromLines, ...fromSentences]).map(titleCase), 7);
}

function extractOutcomes(text: string): string[] {
  const out = lines(text).filter((l) =>
    /\b(outcome|syllabus|objective|able to|criteria|assessed|rubric)\b/i.test(l)
  );
  const codes = text.match(/\b([A-Z]{2,4}\d(?:[-.]\d+)?)\b/g) || [];
  return clamp(
    dedupe([...out.map(titleCase), ...codes.map((c) => `Syllabus outcome ${c}`)]),
    6
  );
}

// ── subject-specific packs ──────────────────────────────────────

function subjectPack(type: SubjectType, kw: string[]) {
  const k = (i: number) => kw[i % Math.max(1, kw.length)] || "the core topic";
  const mistakes: Record<SubjectType, string[]> = {
    mathematics: [
      "Skipping working — markers award method marks, so show every step.",
      "Sign errors when expanding brackets or moving terms across the equals sign.",
      "Rounding too early; keep full precision until the final answer.",
      "Misreading the question and solving for the wrong variable.",
    ],
    english: [
      "Retelling the plot instead of analysing technique and effect.",
      "Quotes dropped in without analysis of language or purpose.",
      "Ignoring the specific wording of the question or rubric verbs.",
      "A weak thesis that does not sustain across the response.",
    ],
    science: [
      "Confusing correlation with causation when discussing results.",
      "Vague variables — be explicit about independent, dependent and controlled.",
      "Stating observations without linking them back to the theory.",
      "Forgetting units, uncertainty or significant figures.",
    ],
    geography: [
      "Describing patterns without explaining the processes behind them.",
      "Missing scale — local, regional and global perspectives.",
      "Generic case studies with no specific data or place names.",
    ],
    history: [
      "Narrating events instead of arguing a sustained thesis.",
      "Over-reliance on one source without evaluating reliability.",
      "Ignoring historical context and differing perspectives.",
    ],
    commerce: [
      "Defining terms but not applying them to the scenario.",
      "Forgetting to weigh costs against benefits in evaluations.",
      "No real-world examples to support recommendations.",
    ],
    business: [
      "Listing strategies without justifying why they suit the business.",
      "Ignoring the stakeholder or financial implications.",
      "Generic answers not tied to the case study.",
    ],
    stem: [
      "Jumping to a solution before defining the problem and constraints.",
      "No testing or iteration documented in the design process.",
      "Skipping justification of materials or methods chosen.",
    ],
    "computer-technology": [
      "Code without comments or explanation of logic.",
      "Not testing edge cases or handling invalid input.",
      "Ignoring the design brief's specific requirements.",
    ],
    language: [
      "Direct word-for-word translation that ignores grammar structure.",
      "Inconsistent verb tenses and gender agreement.",
      "Limited vocabulary range — reach for higher-level connectives.",
    ],
  };

  const extras: Record<SubjectType, { title: string; items: string[] }[]> = {
    mathematics: [
      {
        title: "Formula sheet",
        items: [
          `Key formula relating to ${k(0)}`,
          "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
          "Gradient: m = (y₂-y₁)/(x₂-x₁)",
          "Area, perimeter and volume relationships for the figures in scope",
        ],
      },
      {
        title: "Worked-solution checklist",
        items: [
          "State the formula before substituting",
          "Substitute values with units",
          "Show each algebraic step",
          "Box the final answer and sanity-check it",
        ],
      },
    ],
    english: [
      {
        title: "Techniques to deploy",
        items: [
          "Metaphor, simile and extended imagery",
          "Juxtaposition and contrast",
          "Tone, mood and modality",
          "Structure: motif, framing, cyclical structure",
        ],
      },
      {
        title: "Essay scaffold",
        items: [
          "Thesis that directly answers the question",
          "Topic sentence → evidence → technique → effect → link",
          "Sustained argument across paragraphs",
          "Conceptual conclusion, not a summary",
        ],
      },
    ],
    science: [
      {
        title: "Key definitions",
        items: kw
          .slice(0, 4)
          .map((c) => `${c}: a key concept to define precisely in your response`),
      },
      {
        title: "Experiment design",
        items: [
          "Aim, hypothesis and variables",
          "Method that is valid and repeatable",
          "Risk assessment",
          "Results, analysis and evaluation of reliability",
        ],
      },
    ],
    geography: [
      {
        title: "Case study checklist",
        items: [
          "Specific place names and data",
          "Processes and their causes",
          "Impacts across scales",
          "Management or response strategies",
        ],
      },
    ],
    history: [
      {
        title: "Source analysis",
        items: [
          "Origin, purpose and context",
          "Usefulness and reliability",
          "Perspective and bias",
          "Corroboration with other sources",
        ],
      },
    ],
    commerce: [
      { title: "Apply, don't just define", items: ["Definition", "Example", "Application to the scenario", "Evaluation"] },
    ],
    business: [
      { title: "Business framework", items: ["Situation", "Strategy", "Justification", "Stakeholder impact"] },
    ],
    stem: [
      { title: "Design process", items: ["Define", "Ideate", "Prototype", "Test", "Iterate"] },
    ],
    "computer-technology": [
      { title: "Build checklist", items: ["Requirements", "Algorithm/design", "Implementation", "Testing & evaluation"] },
    ],
    language: [
      {
        title: "Vocabulary set",
        items: kw.slice(0, 6).map((c) => `${c} — add the translation and an example sentence`),
      },
      { title: "Grammar focus", items: ["Verb conjugations", "Tense agreement", "Gender & number", "Connectives"] },
    ],
  };

  return {
    mistakes: mistakes[type],
    misconceptions: mistakes[type].slice().reverse().map((m) => `Misconception: ${m.split(" — ")[0].split(";")[0]}`),
    extras: extras[type],
  };
}

function noteSet(input: AnalyzeInput, kw: string[], reqs: string[]) {
  const subj = input.subjectName;
  const concepts = kw.length ? kw : ["the core topic"];
  return [
    {
      id: uid("nt"),
      heading: "Overview & purpose",
      body: `This ${subj} task — "${input.assessmentTitle}" — asks you to ${
        reqs[0]?.toLowerCase().replace(/\.$/, "") ||
        "demonstrate your understanding of the topic"
      }. Read the marking criteria first and keep returning to it. The focus topics are ${concepts
        .slice(0, 4)
        .join(", ")}.`,
    },
    {
      id: uid("nt"),
      heading: "Key concepts & definitions",
      body: concepts
        .slice(0, 6)
        .map((c) => `• ${c} — define this clearly and be ready to use it in context.`)
        .join("\n"),
    },
    {
      id: uid("nt"),
      heading: "How to approach it",
      body: (reqs.length ? reqs : ["Plan", "Draft", "Refine", "Check against criteria"])
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${titleCase(r)}`)
        .join("\n"),
    },
    {
      id: uid("nt"),
      heading: "What markers reward",
      body: "Address every verb in the question, support claims with evidence, structure your response clearly, and link each point back to the central focus. Quality of reasoning matters more than length.",
    },
  ];
}

function studyGuide(input: AnalyzeInput, dueDate?: string) {
  const base = `A focused plan for "${input.assessmentTitle}".`;
  if (!dueDate) {
    return `${base}\n\n1. Unpack the task and criteria.\n2. Gather notes and resources.\n3. Build a plan or outline.\n4. Draft.\n5. Revise against the criteria.\n6. Final check and submit.`;
  }
  return `${base} Working back from your due date:\n\n• Week 1 — Understand the task, annotate the criteria, collect material.\n• Week 2 — Build your plan, draft the core response, generate flashcards.\n• Final days — Refine, self-test with practice questions, check against every criterion.`;
}

function questionsFrom(kw: string[], reqs: string[], style: "practice" | "exam") {
  const k = (i: number) => kw[i % Math.max(1, kw.length)] || "the topic";
  if (style === "practice") {
    return clamp(
      dedupe([
        `Explain the role of ${k(0)} in this topic.`,
        `How does ${k(1)} relate to ${k(2)}?`,
        `Give an example that demonstrates ${k(0)}.`,
        `What would happen if ${k(3)} changed?`,
        `Summarise ${k(1)} in your own words.`,
        ...reqs.slice(0, 2).map((r) => `Practise: ${titleCase(r)}`),
      ]),
      6
    );
  }
  return clamp(
    dedupe([
      `Critically evaluate the significance of ${k(0)} with reference to ${k(1)}.`,
      `To what extent does ${k(2)} shape the outcomes in this topic? Justify your response.`,
      `Analyse the relationship between ${k(0)} and ${k(1)}, using evidence.`,
      `Discuss how ${k(3)} could be applied in an unfamiliar context.`,
    ]),
    4
  );
}

function buildPlan(input: AnalyzeInput, reqs: string[], kw: string[]): string[] {
  const k = (i: number) => kw[i % Math.max(1, kw.length)] || "the topic";
  if (input.kind === "project") {
    return clamp(
      dedupe([
        "Read the brief and marking criteria; list every requirement.",
        ...reqs.slice(0, 3).map((r) => `Address: ${titleCase(r)}`),
        `Research and gather material on ${kw.slice(0, 2).join(" and ") || "the topic"}.`,
        "Plan the structure / outline before starting.",
        "Produce a first draft or build.",
        "Review against every criterion and refine.",
        "Proofread, finalise, and submit on Canvas.",
      ]),
      8
    );
  }
  return [
    `Unpack the task and the key concepts (${k(0)}, ${k(1)}).`,
    "Make summary notes and flashcards.",
    "Do practice questions, then a timed practice test.",
    "Review mistakes and weak spots.",
    "Final review the day before.",
  ];
}

// ── the provider ────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockAIProvider implements AIProvider {
  readonly name = "Anchor AI";

  async analyzeAssessment(input: AnalyzeInput): Promise<AnalyzeResult> {
    await delay(900);
    const text = input.text || input.assessmentTitle;
    const kw = keywords(text);
    const reqs = extractRequirements(text);
    const outcomes = extractOutcomes(text);
    const due = findDueDate(text);
    const weighting = findWeighting(text);
    const pack = subjectPack(input.subjectType, kw);

    const overview = `${input.subjectName}: "${input.assessmentTitle}". ${
      reqs.length
        ? `You are asked to ${reqs[0].toLowerCase().replace(/\.$/, "")}.`
        : "This task assesses your understanding and application of the topic."
    } ${kw.length ? `Central focus: ${kw.slice(0, 4).join(", ")}.` : ""}${
      weighting ? ` Worth ${weighting}.` : ""
    }`.trim();

    const objectives = (reqs.length ? reqs : kw.map((k) => `Understand ${k}`))
      .slice(0, 5)
      .map((r) => `Be able to ${r.toLowerCase().replace(/^(you (will|are to) )/, "").replace(/\.$/, "")}`);

    return {
      kind: input.kind,
      summary: {
        overview,
        requirements: reqs.length
          ? reqs
          : ["Address the task description fully", "Meet every point in the marking criteria"],
        outcomes: outcomes.length
          ? outcomes
          : ["Demonstrate understanding of the key concepts", "Communicate ideas clearly and accurately"],
        objectives,
        keyConcepts: kw.length ? kw : ["Core concept 1", "Core concept 2"],
        dueDate: due,
        weighting,
      },
      notes: noteSet(input, kw, reqs),
      revision: {
        guide: studyGuide(input, due),
        practiceQuestions: questionsFrom(kw, reqs, "practice"),
        examQuestions: questionsFrom(kw, reqs, "exam"),
        commonMistakes: pack.mistakes,
        misconceptions: pack.misconceptions,
        extras: pack.extras,
      },
      flashcards: await this.generateFlashcards({ ...input, count: 8 }),
      plan: buildPlan(input, reqs, kw),
    };
  }

  async generateFlashcards(input: AnalyzeInput & { count?: number }) {
    await delay(300);
    const kw = keywords(input.text || input.assessmentTitle, input.count || 8);
    const reqs = extractRequirements(input.text || "");
    const cards = kw.map((k) => ({
      front: `What is "${k}" and why does it matter here?`,
      back: `${k} is a key idea in ${input.subjectName}. Define it precisely and connect it to "${input.assessmentTitle}".`,
    }));
    for (const r of reqs.slice(0, 3)) {
      cards.push({
        front: `Requirement: ${titleCase(r)}`,
        back: `Make sure your response explicitly addresses this. Markers check for it directly.`,
      });
    }
    return clamp(cards.length ? cards : [
      { front: `Key term in ${input.subjectName}`, back: "Add the definition here." },
    ], input.count || 8);
  }

  async generateTest(
    input: AnalyzeInput & { difficulty: Difficulty; count?: number }
  ) {
    await delay(700);
    const kw = keywords(input.text || input.assessmentTitle, 12);
    const k = (i: number) => kw[i % Math.max(1, kw.length)] || "the topic";
    const count = input.count || (input.difficulty === "exam" ? 6 : 8);
    const questions: TestQuestion[] = [];

    const mcqCount = input.difficulty === "exam" ? 2 : input.difficulty === "easy" ? Math.ceil(count * 0.7) : Math.ceil(count * 0.5);

    for (let i = 0; i < mcqCount; i++) {
      const correct = k(i);
      const opts = dedupe([correct, k(i + 1), k(i + 2), k(i + 3), "None of the above"]).slice(0, 4);
      if (!opts.includes(correct)) opts[0] = correct;
      questions.push({
        id: uid("q"),
        type: "mcq",
        prompt: `Which of the following best relates to ${k(i + 5) || "this topic"}?`,
        options: opts,
        answerIndex: opts.indexOf(correct),
      });
    }
    const remaining = count - mcqCount;
    for (let i = 0; i < remaining; i++) {
      const extended = input.difficulty === "exam" || input.difficulty === "hard";
      questions.push({
        id: uid("q"),
        type: extended && i % 2 === 0 ? "extended" : "short",
        prompt:
          extended && i % 2 === 0
            ? `Evaluate the importance of ${k(i)} in "${input.assessmentTitle}". Justify your response with examples.`
            : `Explain ${k(i)} and give one example.`,
        modelAnswer: `A strong answer defines ${k(i)} clearly, links it to ${k(i + 1)}, and supports the point with a relevant example from ${input.subjectName}.`,
      });
    }

    return {
      title: `${titleCase(input.difficulty)} practice — ${input.assessmentTitle}`,
      questions,
    };
  }

  async chat(input: {
    messages: { role: "user" | "assistant"; content: string }[];
    context: ChatContext;
  }): Promise<string> {
    await delay(600);
    const last = [...input.messages].reverse().find((m) => m.role === "user");
    const q = last?.content.trim() || "";
    const ctx = input.context;
    const head = ctx.assessmentTitle
      ? `On your ${ctx.subject?.name ?? ""} assessment "${ctx.assessmentTitle}"`
      : ctx.subject
      ? `For ${ctx.subject.name}`
      : "Here";
    const concepts = ctx.summary?.keyConcepts?.slice(0, 3).join(", ");

    if (/^(hi|hello|hey)\b/i.test(q) || !q) {
      return `${head}, I've already read your assessment notification${
        concepts ? ` and I know the focus is ${concepts}` : ""
      }. Ask me to explain a concept, plan your response, draft a paragraph, or quiz you — what would help most?`;
    }
    if (/next|due|deadline|upcoming|when|schedule|assess/i.test(q) && ctx.assessments?.length) {
      const today = ctx.today || new Date().toISOString().slice(0, 10);
      const upcoming = ctx.assessments.filter(
        (a) => a.status !== "completed" && (!a.dueDate || a.dueDate >= today)
      );
      const list = (upcoming.length ? upcoming : ctx.assessments).slice(0, 6);
      return `Here's what's coming up:\n\n${list
        .map((a) => `• ${a.title}${a.subject ? ` (${a.subject})` : ""} — ${a.dueDate || "no due date set"}`)
        .join("\n")}\n\nWant a study plan for any of these?`;
    }
    if (/grade|mark|result|score|how am i/i.test(q) && ctx.assessments?.length) {
      const graded = ctx.assessments.filter((a) => a.grade);
      return graded.length
        ? `Your results so far:\n\n${graded.map((a) => `• ${a.title}: ${a.grade}`).join("\n")}`
        : "No grades have come back from Canvas yet — I'll show them here once your teacher marks them.";
    }
    if (/plan|structure|outline|approach|start|where do i begin/i.test(q)) {
      const reqs = ctx.summary?.requirements?.slice(0, 3) || [];
      return `${head}, here's a plan:\n\n1. Unpack the task — ${
        reqs[0] ?? "address the question directly"
      }.\n2. Gather evidence around ${concepts || "the key concepts"}.\n3. Draft, then refine against the marking criteria.\n\nWant me to expand any step into detail?`;
    }
    if (/explain|what is|define|mean|understand/i.test(q)) {
      return `${head}: ${concepts ? `the key idea here is ${concepts}. ` : ""}In short — ${q.replace(/\?+$/, "")} comes down to defining the concept precisely, then showing how it applies to this task. Want a worked example or some flashcards on it?`;
    }
    if (/quiz|test|practice|question/i.test(q)) {
      return `Let's test you. Based on your assessment: \n\n• ${
        ctx.summary?.keyConcepts?.[0]
          ? `Explain the role of ${ctx.summary.keyConcepts[0]}.`
          : "Explain the central concept of this task."
      }\n• How would you justify your main argument?\n\nReply with your answer and I'll give feedback.`;
    }
    return `${head}, here's how I'd think about that: focus on ${
      concepts || "the core requirements"
    }, tie your point back to the marking criteria, and support it with a specific example. ${
      ctx.assessmentTitle
        ? "I'm using your uploaded notification as context, so feel free to go deeper."
        : "Link a subject and assessment for sharper, tailored help."
    }`;
  }

  async improveNote(text: string): Promise<string> {
    await delay(400);
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const blocks = text
      .replace(/<[^>]+>/g, " ")
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) return "";
    return blocks
      .map((b) => {
        const ls = b.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (ls.length > 1 && ls.every((l) => /^[-*•]/.test(l))) {
          return (
            "<ul>" +
            ls.map((l) => `<li>${esc(l.replace(/^[-*•]\s?/, ""))}</li>`).join("") +
            "</ul>"
          );
        }
        return `<p>${esc(b.replace(/\n/g, " "))}</p>`;
      })
      .join("");
  }

  /** Offline formatter — structure only, every word kept verbatim. */
  async formatNotification(text: string): Promise<string> {
    await delay(200);
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const blocks = text
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) return "";
    return blocks
      .map((b) => {
        const ls = b.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (ls.length > 1 && ls.every((l) => /^[-*•]/.test(l))) {
          return (
            "<ul>" +
            ls.map((l) => `<li>${esc(l.replace(/^[-*•]\s?/, ""))}</li>`).join("") +
            "</ul>"
          );
        }
        // keep original line breaks — this is formatting, not rewriting
        return `<p>${ls.map(esc).join("<br/>")}</p>`;
      })
      .join("");
  }
}
