import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Canvas access tokens at most institutions expire ~120 days after they're
// created. We estimate expiry from when the token was connected here.
const TOKEN_LIFETIME_DAYS = 120;
const DAY = 86_400_000;

export async function GET() {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ configured: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ configured: false });

  let { data, error } = await sb
    .from("profiles")
    .select("canvas_base_url, canvas_token, canvas_connected_at")
    .eq("id", user.id)
    .maybeSingle();
  // Fall back if the new column hasn't been added to the DB yet.
  if (error && /canvas_connected_at/.test(error.message)) {
    ({ data } = await sb
      .from("profiles")
      .select("canvas_base_url, canvas_token")
      .eq("id", user.id)
      .maybeSingle());
  }

  const configured = !!(data?.canvas_base_url && data?.canvas_token);
  if (!configured) return NextResponse.json({ configured: false });

  const connectedAt: string | null = data?.canvas_connected_at ?? null;
  let daysLeft: number | null = null;
  let expiresAt: string | null = null;
  if (connectedAt) {
    const expiry = new Date(connectedAt).getTime() + TOKEN_LIFETIME_DAYS * DAY;
    expiresAt = new Date(expiry).toISOString();
    daysLeft = Math.ceil((expiry - Date.now()) / DAY);
  }

  return NextResponse.json({
    configured: true,
    baseUrl: data!.canvas_base_url,
    connectedAt,
    expiresAt,
    daysLeft,
    lifetimeDays: TOKEN_LIFETIME_DAYS,
  });
}
