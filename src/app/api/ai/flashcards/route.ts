import { NextResponse } from "next/server";
import { generateFlashcards } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = await generateFlashcards(input);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "flashcards failed" }, { status: 500 });
  }
}
