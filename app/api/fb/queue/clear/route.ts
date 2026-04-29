import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(_req: NextRequest) {
  try {
    const r = await fetch(`${HUB}/action/fb/queue/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Hub returned ${r.status}` }, { status: r.status });
    }
    const data = await r.json().catch(() => ({ ok: false, error: "Hub ตอบกลับผิดรูปแบบ" }));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FB queue clear failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
