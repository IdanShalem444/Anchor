import { MockAIProvider } from "./mock";
import * as openrouter from "./openrouter";
import * as anthropic from "./anthropic";
import type { AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import type { Difficulty } from "@/lib/types";

const mock = new MockAIProvider();

if (!anthropic.enabled() && !openrouter.enabled()) {
  console.warn(
    "[ai] No AI key set (ANTHROPIC_API_KEY / OPENROUTER_API_KEY) — using the offline generator."
  );
}

/**
 * Server-side AI. Priority: Claude (Anthropic) → OpenRouter → offline generator.
 * Each tier falls through to the next on failure, so generation never blocks.
 *
 * IMPORTANT: when we fall all the way through to the offline mock we record it
 * on `o.report` and log the reason, so the route can tell the client (header
 * `x-anchor-offline`) instead of passing mock content off as a real answer.
 */
export type OfflineReport = { offline?: boolean; reason?: string };
/** Per-request options. `pro` selects the stronger model tier (Pro plan);
 *  `report` collects whether we degraded to the offline generator + why. */
type Opts = { pro?: boolean; report?: OfflineReport };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Note (+ record) that we're serving offline mock output and why. */
function markOffline(o: Opts, label: string, reason: string) {
  console.warn(`[ai] served OFFLINE mock for ${label} — ${reason}`);
  if (o.report) {
    o.report.offline = true;
    o.report.reason = reason;
  }
}

export async function analyze(input: AnalyzeInput, o: Opts = {}): Promise<AnalyzeResult> {
  let reason = "no AI provider configured";
  if (anthropic.enabled()) {
    try {
      return await anthropic.analyze(input, o);
    } catch (e) {
      reason = `Anthropic: ${errMsg(e)}`;
      console.error("[ai] Anthropic analyze failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.analyze(input, o);
    } catch (e) {
      reason = `OpenRouter: ${errMsg(e)}`;
      console.error("[ai] OpenRouter analyze failed:", e);
    }
  }
  markOffline(o, "analyze", reason);
  return mock.analyzeAssessment(input);
}

export async function generateFlashcards(
  input: AnalyzeInput & { count?: number },
  o: Opts = {}
) {
  let reason = "no AI provider configured";
  if (anthropic.enabled()) {
    try {
      return await anthropic.generateFlashcards(input, o);
    } catch (e) {
      reason = `Anthropic: ${errMsg(e)}`;
      console.error("[ai] Anthropic flashcards failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateFlashcards(input, o);
    } catch (e) {
      reason = `OpenRouter: ${errMsg(e)}`;
      console.error("[ai] OpenRouter flashcards failed:", e);
    }
  }
  markOffline(o, "flashcards", reason);
  return mock.generateFlashcards(input);
}

export async function generateTest(
  input: AnalyzeInput & { difficulty: Difficulty; count?: number },
  o: Opts = {}
) {
  let reason = "no AI provider configured";
  if (anthropic.enabled()) {
    try {
      return await anthropic.generateTest(input, o);
    } catch (e) {
      reason = `Anthropic: ${errMsg(e)}`;
      console.error("[ai] Anthropic test failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateTest(input, o);
    } catch (e) {
      reason = `OpenRouter: ${errMsg(e)}`;
      console.error("[ai] OpenRouter test failed:", e);
    }
  }
  markOffline(o, "test", reason);
  return mock.generateTest(input);
}

export async function chat(
  input: {
    messages: { role: "user" | "assistant"; content: string }[];
    context: ChatContext;
  },
  o: Opts = {}
) {
  let reason = "no AI provider configured";
  if (anthropic.enabled()) {
    try {
      return await anthropic.chat(input, o);
    } catch (e) {
      reason = `Anthropic: ${errMsg(e)}`;
      console.error("[ai] Anthropic chat failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.chat(input, o);
    } catch (e) {
      reason = `OpenRouter: ${errMsg(e)}`;
      console.error("[ai] OpenRouter chat failed:", e);
    }
  }
  markOffline(o, "chat", reason);
  return mock.chat(input);
}

export async function improveNote(text: string, o: Opts = {}): Promise<string> {
  let reason = "no AI provider configured";
  if (anthropic.enabled()) {
    try {
      return await anthropic.improveNote(text, o);
    } catch (e) {
      reason = `Anthropic: ${errMsg(e)}`;
      console.error("[ai] Anthropic improveNote failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.improveNote(text, o);
    } catch (e) {
      reason = `OpenRouter: ${errMsg(e)}`;
      console.error("[ai] OpenRouter improveNote failed:", e);
    }
  }
  markOffline(o, "improve", reason);
  return mock.improveNote(text);
}
