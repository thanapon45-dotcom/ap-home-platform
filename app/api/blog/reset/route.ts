import { NextResponse } from "next/server";

/**
 * POST /api/blog/reset
 * Server-side proxy → Hub /action/blog/reset
 */

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST() {
  try {
    const r = await fetch(`${HUB}/action/blog/reset`, { method: "POST" });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
