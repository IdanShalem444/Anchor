import { NextResponse } from "next/server";
import { improveNote, type OfflineReport } from "@/lib/ai/server";
import { aiGuard, withUsage } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  // Note Improver is a Basic+ feature, and also consumes one AI credit.
  const gate = await aiGuard({ feature: "noteImprover" });
  if (!gate.ok) return gate.response;
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string")
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    const report: OfflineReport = {};
    const html = await improveNote(text, { pro: gate.pro, report });
    return withUsage({ html }, gate.usage, report.offline);
  } catch (e) {
    return NextResponse.json({ error: "improve failed" }, { status: 500 });
  }
}
