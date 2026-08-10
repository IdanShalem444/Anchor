import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Redeem a promo / friend access code. Validation + plan upgrade happen inside
// the redeem_code() SECURITY DEFINER function, so codes are never exposed to
// the client and the plan write is authorized server-side.
export async function POST(req: Request) {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ ok: false, error: "Accounts not configured" }, { status: 400 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });

  let code = "";
  try {
    code = String((await req.json())?.code || "").trim();
  } catch {
    /* empty */
  }
  if (!code) return NextResponse.json({ ok: false, error: "Enter a code." }, { status: 400 });

  const { data, error } = await sb.rpc("redeem_code", { p_code: code });
  if (error) {
    console.error("[billing] redeem_code failed:", error.message);
    return NextResponse.json({ ok: false, error: "Couldn't redeem that code." }, { status: 500 });
  }
  const r = (data ?? {}) as { ok?: boolean; error?: string; plan?: string };
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error || "Invalid code." }, { status: 400 });
  return NextResponse.json({ ok: true, plan: r.plan });
}
