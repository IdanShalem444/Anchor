import { NextResponse } from "next/server";
import { improveNote } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string")
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    const html = await improveNote(text);
    return NextResponse.json({ html });
  } catch (e) {
    return NextResponse.json({ error: "improve failed" }, { status: 500 });
  }
}
