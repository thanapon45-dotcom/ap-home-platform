import { NextResponse } from "next/server";

/**
 * POST /api/blog/reset
 * Server-side proxy → Hub /action/blog/reset
 */

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST() {
  try {
    const r = await fetch(`${HUB}/action/blog/reset`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Hub returned ${r.status}` }, { status: r.status });
    }
    const data = await r.json().catch(() => ({ ok: false, error: "Hub ตอบกลับผิดรูปแบบ" }));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
