import { NextResponse } from "next/server";

/**
 * POST /api/blog/reset
 * Server-side proxy → Hub /action/blog/reset
 */

const HUB = process.env.HUB_URL ?? "";

export async function POST() {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/action/blog/reset`, {
      method: "POST",
      headers: { "x-hub-token": process.env.HUB_SECRET ?? "" },
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
