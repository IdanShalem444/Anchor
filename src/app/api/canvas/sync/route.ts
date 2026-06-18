import { NextResponse } from "next/server";
import { syncCanvas } from "@/lib/canvas";
import { resolveCanvasCreds } from "@/lib/canvas-creds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const creds = await resolveCanvasCreds();
  if (!creds) {
    return NextResponse.json(
      { error: "Canvas isn't connected. Connect your Canvas first." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json(await syncCanvas(creds));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Canvas sync failed" },
      { status: 502 }
    );
  }
}
