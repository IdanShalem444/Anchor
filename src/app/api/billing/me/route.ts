import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { aiLimit } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Current plan + this month's AI usage, for the account/plans UI.
export async function GET() {
  const fallback = {
    plan: "free" as Plan,
    plan_status: "active",
    plan_renews_at: null as string | null,
    usage: { used: 0, limit: aiLimit("free") },
  };

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json(fallback);
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json(fallback);

  const { data: prof } = await sb
    .from("profiles")
    .select("plan, plan_status, plan_renews_at")
    .eq("id", user.id)
    .maybeSingle();
  const plan = ((prof?.plan as Plan) || "free") as Plan;

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM (UTC) — matches the SQL
  const { data: usageRow } = await sb
    .from("usage_counters")
    .select("ai_generations")
    .eq("user_id", user.id)
    .eq("period", period)
    .maybeSingle();

  return NextResponse.json({
    plan,
    plan_status: prof?.plan_status ?? "active",
    plan_renews_at: prof?.plan_renews_at ?? null,
    usage: { used: usageRow?.ai_generations ?? 0, limit: aiLimit(plan) },
  });
}
