import { NextResponse } from "next/server";

/**
 * GET /api/blog/state
 * Server-side proxy → Hub /api/state
 */

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function GET() {
  try {
    const r = await fetch(`${HUB}/api/state`, { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "State fetch failed";
    return NextResponse.json({ blog: { status: "idle" }, error: message });
  }
}
