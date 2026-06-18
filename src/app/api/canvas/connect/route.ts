import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifyCanvas } from "@/lib/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts not configured" }, { status: 400 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  let baseUrl = "";
  let token = "";
  try {
    const body = await req.json();
    baseUrl = String(body.baseUrl || "").trim().replace(/\/$/, "");
    token = String(body.token || "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!/^https?:\/\//.test(baseUrl) || !token) {
    return NextResponse.json(
      { error: "Enter your Canvas URL (https://…instructure.com) and access token." },
      { status: 400 }
    );
  }

  // Validate the token against Canvas before saving.
  let name = "";
  try {
    name = (await verifyCanvas({ baseUrl, token })).name;
  } catch {
    return NextResponse.json(
      { error: "Couldn't connect — double-check the URL and token." },
      { status: 400 }
    );
  }

  const { error } = await sb
    .from("profiles")
    .update({ canvas_base_url: baseUrl, canvas_token: token })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, name });
}
