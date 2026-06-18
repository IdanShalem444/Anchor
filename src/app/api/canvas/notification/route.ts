import { NextResponse } from "next/server";
import { fetchAssignmentNotification } from "@/lib/canvas";
import { resolveCanvasCreds } from "@/lib/canvas-creds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const creds = await resolveCanvasCreds();
  if (!creds) {
    return NextResponse.json({ error: "Canvas isn't connected" }, { status: 400 });
  }
  try {
    const { courseId, assignmentId } = await req.json();
    if (!courseId || !assignmentId) {
      return NextResponse.json({ error: "Missing courseId/assignmentId" }, { status: 400 });
    }
    const data = await fetchAssignmentNotification(creds, Number(courseId), Number(assignmentId));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read Canvas files" },
      { status: 502 }
    );
  }
}
