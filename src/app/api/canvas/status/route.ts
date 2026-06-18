import { NextResponse } from "next/server";
import { resolveCanvasCreds } from "@/lib/canvas-creds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const creds = await resolveCanvasCreds();
  return NextResponse.json({ configured: !!creds, baseUrl: creds?.baseUrl ?? null });
}
