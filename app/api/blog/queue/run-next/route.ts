import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function POST(_req: NextRequest) {
  try {
    const r = await fetch(`${HUB}/action/blog/queue/run-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await r.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Queue run-next failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
