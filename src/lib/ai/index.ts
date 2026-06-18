import { HttpAIProvider } from "./client";
import type { AIProvider } from "./types";

/**
 * The active AI provider used across the app.
 *
 * `HttpAIProvider` calls secure server routes under /api/ai/*. Those routes use
 * OpenRouter when `OPENROUTER_API_KEY` is set (model via `OPENROUTER_MODEL`),
 * and otherwise fall back to a fully offline generator — so the app works with
 * or without keys. The provider also falls back locally if a request fails
 * (e.g. offline), so generation never blocks.
 */
export const ai: AIProvider = new HttpAIProvider();

export type { AIProvider } from "./types";
export * from "./types";
