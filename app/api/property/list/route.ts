import { NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "";

export async function GET() {
  try {
    if (!HUB) {
      return NextResponse.json({ ok: false, properties: [], error: "HUB_URL not configured" }, { status: 500 });
    }
    const r = await fetch(`${HUB}/api/properties/wp-published`, {
      headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET ?? "" },
    });
    const data = await r.json().catch(() => ({ ok: false, properties: [] }));
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch published properties failed";
    return NextResponse.json({ ok: false, properties: [], error: message }, { status: 500 });
  }
}
