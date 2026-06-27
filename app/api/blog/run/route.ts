import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/blog/run
 * Server-side proxy → Hub /action/blog/run
 * Body: { keyword, category, slot?, visual_hint? }
 */

const HUB = process.env.HUB_URL ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();
    const r = await fetch(`${HUB}/action/blog/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-token": process.env.HUB_SECRET ?? "",
        "x-correlation-id": correlationId,
      },
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
