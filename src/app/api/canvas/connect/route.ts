import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifyCanvas, normalizeBaseUrl, CanvasError } from "@/lib/canvas";
import { can, requiredPlanFor } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts not configured" }, { status: 400 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  // Canvas auto-sync is a Basic+ feature.
  const { data: prof } = await sb.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = ((prof?.plan as Plan) || "free") as Plan;
  if (!can(plan, "canvas")) {
    return NextResponse.json(
      { error: "feature_locked", feature: "canvas", requiredPlan: requiredPlanFor("canvas"), plan },
      { status: 403 }
    );
  }

  let baseUrl = "";
  let token = "";
  try {
    const body = await req.json();
    baseUrl = normalizeBaseUrl(body.baseUrl); // accepts bare domains / full URLs
    token = String(body.token || "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!baseUrl || !token) {
    return NextResponse.json(
      { error: "Enter your Canvas URL (e.g. yourschool.instructure.com) and an access token." },
      { status: 400 }
    );
  }

  // Validate the token against Canvas before saving.
  let name = "";
  try {
    name = (await verifyCanvas({ baseUrl, token })).name;
  } catch (e) {
    if (e instanceof CanvasError && e.status === 401) {
      return NextResponse.json(
        {
          error:
            "That token didn't work — it's invalid or has expired. Canvas tokens expire (about every 120 days), so generate a fresh one and paste it here.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't reach Canvas — double-check the URL (e.g. yourschool.instructure.com)." },
      { status: 400 }
    );
  }

  let { error } = await sb
    .from("profiles")
    .update({
      canvas_base_url: baseUrl,
      canvas_token: token,
      canvas_connected_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  // If the new column hasn't been added to the DB yet, save without it.
  if (error && /canvas_connected_at/.test(error.message)) {
    ({ error } = await sb
      .from("profiles")
      .update({ canvas_base_url: baseUrl, canvas_token: token })
      .eq("id", user.id));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, name });
}
