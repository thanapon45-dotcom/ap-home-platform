import { NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "";

export async function GET() {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, data: [], error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/api/properties/pending`, {
      headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET ?? "" },
    });
    const data = await r.json().catch(() => ({ ok: false, data: [] }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch pending properties failed";
    return NextResponse.json({ ok: false, data: [], error: message }, { status: 500 });
  }
}
