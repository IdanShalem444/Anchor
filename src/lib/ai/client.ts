"use client";

import { MockAIProvider } from "./mock";
import type { AIProvider, AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import type { Difficulty, TestQuestion } from "@/lib/types";
import { emitUsage, emitBlock, type EntitlementBlock } from "@/lib/billing/signals";

const fallback = new MockAIProvider();

/** Thrown when the server refuses for plan reasons (limit reached / feature
 *  locked). The global billing host shows the upgrade modal; callers should
 *  just stop their spinner — do NOT fall back to the offline generator. */
export class AiBlockedError extends Error {
  info: EntitlementBlock;
  constructor(info: EntitlementBlock) {
    super(info.kind);
    this.name = "AiBlockedError";
    this.info = info;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error */
    }
    if (res.status === 402 && data?.error === "ai_limit") {
      const info: EntitlementBlock = {
        kind: "ai_limit",
        used: Number(data.used) || 0,
        limit: Number(data.limit) || 0,
        plan: String(data.plan || "free"),
      };
      emitBlock(info);
      throw new AiBlockedError(info);
    }
    if (res.status === 403 && data?.error === "feature_locked") {
      const info: EntitlementBlock = {
        kind: "feature_locked",
        feature: String(data.feature || ""),
        requiredPlan: String(data.requiredPlan || "basic"),
        plan: String(data.plan || "free"),
      };
      emitBlock(info);
      throw new AiBlockedError(info);
    }
    throw new Error(`${path} ${res.status}`);
  }

  const usage = res.headers.get("x-anchor-usage");
  if (usage) {
    try {
      emitUsage(JSON.parse(usage));
    } catch {
      /* ignore malformed header */
    }
  }
  return (await res.json()) as T;
}

const rethrowIfBlocked = (e: unknown) => {
  if (e instanceof AiBlockedError) throw e;
};

/**
 * Client AI provider — calls the secure server routes under /api/ai/*.
 * On a network/server failure it falls back to the offline generator so the
 * app never blocks. Plan blocks (limit reached / feature locked) are surfaced
 * as AiBlockedError and drive the upgrade modal — they never fall back.
 */
export class HttpAIProvider implements AIProvider {
  readonly name = "Anchor AI";

  async analyzeAssessment(input: AnalyzeInput): Promise<AnalyzeResult> {
    try {
      return await post<AnalyzeResult>("/api/ai/analyze", input);
    } catch (e) {
      rethrowIfBlocked(e);
      return fallback.analyzeAssessment(input);
    }
  }

  async generateFlashcards(input: AnalyzeInput & { count?: number }) {
    try {
      return await post<{ front: string; back: string }[]>("/api/ai/flashcards", input);
    } catch (e) {
      rethrowIfBlocked(e);
      return fallback.generateFlashcards(input);
    }
  }

  async generateTest(input: AnalyzeInput & { difficulty: Difficulty; count?: number }) {
    try {
      return await post<{ title: string; questions: TestQuestion[] }>("/api/ai/test", input);
    } catch (e) {
      rethrowIfBlocked(e);
      return fallback.generateTest(input);
    }
  }

  async chat(input: {
    messages: { role: "user" | "assistant"; content: string }[];
    context: ChatContext;
  }): Promise<string> {
    try {
      const r = await post<{ text: string }>("/api/ai/chat", input);
      return r.text;
    } catch (e) {
      rethrowIfBlocked(e);
      return fallback.chat(input);
    }
  }

  async improveNote(text: string): Promise<string> {
    try {
      const r = await post<{ html: string }>("/api/ai/improve", { text });
      return r.html;
    } catch (e) {
      rethrowIfBlocked(e);
      return fallback.improveNote(text);
    }
  }
}
