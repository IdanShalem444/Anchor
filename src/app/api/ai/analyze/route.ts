import { NextResponse } from "next/server";
import { analyze } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = await analyze(input);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
