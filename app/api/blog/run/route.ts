import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/blog/run
 * Server-side proxy → Hub /action/blog/run
 * Body: { keyword, category, slot?, visual_hint? }
 */

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${HUB}/action/blog/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Hub returned ${r.status}` }, { status: r.status });
    }
    const data = await r.json().catch(() => ({ ok: false, error: "Hub ตอบกลับผิดรูปแบบ" }));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Blog run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
