import { NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function GET() {
  try {
    const r = await fetch(`${HUB}/api/properties/pending`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await r.json().catch(() => ({ ok: false, data: [] }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch pending properties failed";
    return NextResponse.json({ ok: false, data: [], error: message }, { status: 500 });
  }
}
