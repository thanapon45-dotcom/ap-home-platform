import { NextRequest, NextResponse } from "next/server";

// Normalize: strip trailing /api or /api/ so env var works whether or not it has the suffix
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const body = await req.json();
    const r = await fetch(`${HUB}/api/fb/queue/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-secret": process.env.HUB_SECRET ?? "" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Hub returned ${r.status}` }, { status: r.status });
    }
    const data = await r.json().catch(() => ({ ok: false, error: "Hub ตอบกลับผิดรูปแบบ" }));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FB queue build failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
