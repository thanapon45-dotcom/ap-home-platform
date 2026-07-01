import { NextRequest, NextResponse } from "next/server";

// Normalize: strip trailing /api or /api/ so env var works whether or not it has the suffix
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

export async function POST(_req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/api/fb/queue/run-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-secret": process.env.HUB_SECRET ?? "" },
      body: JSON.stringify({}),
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FB queue run-next failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
