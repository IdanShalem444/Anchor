import { NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";
import { aiLimit, can, requiredPlanFor, type Feature } from "./plans";

// ─────────────────────────────────────────────────────────────
// Server-side plan enforcement. Used by the /api/ai/* and Canvas
// routes to (1) identify the user, (2) gate premium features, and
// (3) meter + hard-cap monthly AI usage. This is the money guard —
// blocked requests never reach the model, so they cost $0.
// ─────────────────────────────────────────────────────────────

export type Usage = { used: number; limit: number; plan: Plan };

type Ok = { ok: true; plan: Plan; pro: boolean; usage: Usage };
type Err = { ok: false; response: NextResponse };

/**
 * Resolve AI access for the current request.
 * - `feature` (optional): require this entitlement, else 403 feature_locked.
 * - `consume` (default true): consume one monthly AI credit, else 402 ai_limit.
 *   Pass false for non-AI gated routes (e.g. Canvas connect).
 *
 * When Supabase isn't configured (local dev), gating is skipped so the app
 * stays usable offline.
 */
export async function aiGuard(opts?: {
  feature?: Feature;
  consume?: boolean;
}): Promise<Ok | Err> {
  const consume = opts?.consume ?? true;

  if (!isSupabaseConfigured) {
    return {
      ok: true,
      plan: "free",
      pro: false,
      usage: { used: 0, limit: aiLimit("free"), plan: "free" },
    };
  }

  const sb = getSupabaseServer()!;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  const { data } = await sb
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = ((data?.plan as Plan) || "free") as Plan;

  if (opts?.feature && !can(plan, opts.feature)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "feature_locked",
          feature: opts.feature,
          requiredPlan: requiredPlanFor(opts.feature),
          plan,
        },
        { status: 403 }
      ),
    };
  }

  const limit = aiLimit(plan);
  let used = 0;

  if (consume) {
    const { data: res, error } = await sb.rpc("consume_ai_credit", { p_limit: limit });
    // If the RPC isn't deployed yet, fail open (don't block real users) but log.
    if (error) {
      console.error("[billing] consume_ai_credit failed:", error.message);
    } else {
      const r = (res ?? {}) as { allowed?: boolean; used?: number; limit?: number };
      used = r.used ?? 0;
      if (!r.allowed) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "ai_limit", used, limit, plan },
            { status: 402 }
          ),
        };
      }
    }
  }

  return { ok: true, plan, pro: can(plan, "bestModel"), usage: { used, limit, plan } };
}

/** Attach the current usage to a successful JSON response (read by the client
 *  to show the "approaching your limit" warning). When `offline` is set, the
 *  body is offline-mock output (all real providers failed) — flag it so the
 *  client can tell the user it isn't the real model instead of silently
 *  passing it off as a genuine answer. */
export function withUsage<T>(body: T, usage: Usage, offline?: boolean): NextResponse {
  const res = NextResponse.json(body as Record<string, unknown>);
  res.headers.set("x-anchor-usage", JSON.stringify(usage));
  if (offline) res.headers.set("x-anchor-offline", "1");
  return res;
}
