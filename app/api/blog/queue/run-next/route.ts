import { NextRequest, NextResponse } from "next/server";

// Normalize: strip trailing /api or /api/ so env var works whether or not it has the suffix
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

export async function POST(_req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    // Forward body from Dashboard to Hub (keyword, category, queue_item_id)
    let body = {};
    try { body = await _req.json(); } catch { /* empty body is fine */ }

    const r = await fetch(`${HUB}/action/blog/queue/run-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET ?? "" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Queue run-next failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
