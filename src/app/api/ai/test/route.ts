import { NextResponse } from "next/server";
import { generateTest } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = await generateTest(input);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "test failed" }, { status: 500 });
  }
}
