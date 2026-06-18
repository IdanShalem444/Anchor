import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts not configured" }, { status: 400 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  await sb
    .from("profiles")
    .update({ canvas_base_url: null, canvas_token: null })
    .eq("id", user.id);
  return NextResponse.json({ ok: true });
}
