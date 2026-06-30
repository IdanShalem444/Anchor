import { NextResponse } from "next/server";
import { analyze } from "@/lib/ai/server";
import { aiGuard, withUsage } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await aiGuard();
  if (!gate.ok) return gate.response;
  try {
    const input = await req.json();
    const result = await analyze(input, { pro: gate.pro });
    return withUsage(result, gate.usage);
  } catch (e) {
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
