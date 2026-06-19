import { NextResponse } from "next/server";
import { fetchReadable } from "@/lib/research";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

async function requireUser() {
  const sb = getSupabaseServer();
  if (!sb) return true; // dev / no-backend
  const {
    data: { user },
  } = await sb.auth.getUser();
  return !!user;
}

export async function POST(req: Request) {
  if (!(await requireUser()))
    return NextResponse.json({ error: "Sign in to open pages." }, { status: 401 });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string")
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    const page = await fetchReadable(url);
    return NextResponse.json(page);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't open that page" },
      { status: 502 }
    );
  }
}
