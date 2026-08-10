import { NextResponse } from "next/server";
import { formatNotification, type OfflineReport } from "@/lib/ai/server";
import { aiGuard, withUsage } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reformat a notification for display (content verbatim). Metered like every
// AI route — consumes one monthly credit, 402 ai_limit at the cap. Available
// on all plans (no feature gate).
export async function POST(req: Request) {
  const gate = await aiGuard();
  if (!gate.ok) return gate.response;
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string")
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    const report: OfflineReport = {};
    const html = await formatNotification(text, { pro: gate.pro, report });
    return withUsage({ html }, gate.usage, report.offline);
  } catch (e) {
    return NextResponse.json({ error: "format failed" }, { status: 500 });
  }
}
