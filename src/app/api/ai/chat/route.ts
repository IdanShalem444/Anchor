import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const text = await chat(input);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: "chat failed" }, { status: 500 });
  }
}
