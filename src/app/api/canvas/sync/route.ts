import { NextResponse } from "next/server";
import { syncCanvas, CanvasError } from "@/lib/canvas";
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
    if (e instanceof CanvasError && (e.status === 401 || e.status === 403)) {
      return NextResponse.json(
        {
          error:
            "Canvas rejected your token — it has likely expired (tokens last about 120 days). Open “Manage” and reconnect with a new token.",
          expired: true,
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Canvas sync failed" },
      { status: 502 }
    );
  }
}
