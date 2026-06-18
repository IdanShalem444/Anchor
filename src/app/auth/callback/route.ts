import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OAuth / email-link callback: exchange the code for a session, then continue. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const sb = getSupabaseServer();
  if (code && sb) {
    await sb.auth.exchangeCodeForSession(code).catch(() => {});
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
