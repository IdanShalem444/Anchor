import { MockAIProvider } from "./mock";
import * as openrouter from "./openrouter";
import type { AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import type { Difficulty } from "@/lib/types";

const mock = new MockAIProvider();

if (!openrouter.enabled()) {
  console.warn(
    "[ai] OPENROUTER_API_KEY is not set — using the offline generator. Set it for real AI generation."
  );
}

/** Server-side AI: use OpenRouter when configured, otherwise the offline generator. */
export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (openrouter.enabled()) {
    try {
      return await openrouter.analyze(input);
    } catch (e) {
      console.error("[ai] OpenRouter analyze failed, using offline generator:", e);
    }
  }
  return mock.analyzeAssessment(input);
}

export async function generateFlashcards(
  input: AnalyzeInput & { count?: number }
) {
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateFlashcards(input);
    } catch (e) {
      console.error("[ai] OpenRouter flashcards failed, using offline generator:", e);
    }
  }
  return mock.generateFlashcards(input);
}

export async function generateTest(
  input: AnalyzeInput & { difficulty: Difficulty; count?: number }
) {
  if (openrouter.enabled()) {
    try {
      return await openrouter.generateTest(input);
    } catch (e) {
      console.error("[ai] OpenRouter test failed, using offline generator:", e);
    }
  }
  return mock.generateTest(input);
}

export async function chat(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  context: ChatContext;
}) {
  if (openrouter.enabled()) {
    try {
      return await openrouter.chat(input);
    } catch (e) {
      console.error("[ai] OpenRouter chat failed, using offline generator:", e);
    }
  }
  return mock.chat(input);
}
