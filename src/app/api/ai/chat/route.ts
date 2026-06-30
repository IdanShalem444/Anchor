import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/server";
import { aiGuard, withUsage } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await aiGuard();
  if (!gate.ok) return gate.response;
  try {
    const input = await req.json();
    const text = await chat(input, { pro: gate.pro });
    return withUsage({ text }, gate.usage);
  } catch (e) {
    return NextResponse.json({ error: "chat failed" }, { status: 500 });
  }
}
