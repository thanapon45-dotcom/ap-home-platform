import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "";

export async function GET(req: NextRequest) {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, error: "HUB_URL not configured" }, { status: 500 });
    }
    const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();
    const r = await fetch(`${HUB}/api/ops/summary`, {
      headers: {
        "x-hub-token": process.env.HUB_SECRET ?? "",
        "x-correlation-id": correlationId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({ ok: false, error: "Hub returned invalid JSON" }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Operational summary failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
