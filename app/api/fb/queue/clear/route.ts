import { NextRequest, NextResponse } from "next/server";

// Normalize: strip trailing /api or /api/ so env var works whether or not it has the suffix
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

export async function POST(_req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/action/fb/queue/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET ?? "" },
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
