import { NextResponse } from "next/server";
import { webSearch } from "@/lib/research";
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
    return NextResponse.json({ error: "Sign in to search." }, { status: 401 });
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string")
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    const results = await webSearch(query);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 }
    );
  }
}
