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
 */
export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (anthropic.enabled()) {
    try {
      return await anthropic.analyze(input);
    } catch (e) {
      console.error("[ai] Anthropic analyze failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.analyze(input);
    } catch (e) {
      console.error("[ai] OpenRouter analyze failed:", e);
    }
  }
  return mock.analyzeAssessment(input);
}

export async function generateFlashcards(input: AnalyzeInput & { count?: number }) {
  if (anthropic.enabled()) {
    try {
      return await anthropic.generateFlashcards(input);
    } catch (e) {
      console.error("[ai] Anthropic flashcards failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateFlashcards(input);
    } catch (e) {
      console.error("[ai] OpenRouter flashcards failed:", e);
    }
  }
  return mock.generateFlashcards(input);
}

export async function generateTest(
  input: AnalyzeInput & { difficulty: Difficulty; count?: number }
) {
  if (anthropic.enabled()) {
    try {
      return await anthropic.generateTest(input);
    } catch (e) {
      console.error("[ai] Anthropic test failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateTest(input);
    } catch (e) {
      console.error("[ai] OpenRouter test failed:", e);
    }
  }
  return mock.generateTest(input);
}

export async function chat(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  context: ChatContext;
}) {
  if (anthropic.enabled()) {
    try {
      return await anthropic.chat(input);
    } catch (e) {
      console.error("[ai] Anthropic chat failed:", e);
    }
  }
  if (openrouter.enabled()) {
    try {
      return await openrouter.chat(input);
    } catch (e) {
      console.error("[ai] OpenRouter chat failed:", e);
    }
  }
  return mock.chat(input);
}
