"use client";

import { MockAIProvider } from "./mock";
import type { AIProvider, AnalyzeInput, AnalyzeResult, ChatContext } from "./types";
import type { Difficulty, TestQuestion } from "@/lib/types";

const fallback = new MockAIProvider();

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Client AI provider — calls the server API routes (which use OpenRouter when
 * configured, else the offline generator). If the request itself fails
 * (offline), it falls back to the local offline generator so the app never
 * blocks.
 */
export class HttpAIProvider implements AIProvider {
  readonly name = "Anchor AI";

  async analyzeAssessment(input: AnalyzeInput): Promise<AnalyzeResult> {
    try {
      return await post<AnalyzeResult>("/api/ai/analyze", input);
    } catch {
      return fallback.analyzeAssessment(input);
    }
  }

  async generateFlashcards(input: AnalyzeInput & { count?: number }) {
    try {
      return await post<{ front: string; back: string }[]>("/api/ai/flashcards", input);
    } catch {
      return fallback.generateFlashcards(input);
    }
  }

  async generateTest(input: AnalyzeInput & { difficulty: Difficulty; count?: number }) {
    try {
      return await post<{ title: string; questions: TestQuestion[] }>("/api/ai/test", input);
    } catch {
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
    } catch {
      return fallback.chat(input);
    }
  }
}
