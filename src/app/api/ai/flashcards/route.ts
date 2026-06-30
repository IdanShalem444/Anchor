import { NextResponse } from "next/server";
import { generateFlashcards } from "@/lib/ai/server";
import { aiGuard, withUsage } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await aiGuard();
  if (!gate.ok) return gate.response;
  try {
    const input = await req.json();
    const result = await generateFlashcards(input, { pro: gate.pro });
    return withUsage(result, gate.usage);
  } catch (e) {
    return NextResponse.json({ error: "flashcards failed" }, { status: 500 });
  }
}
