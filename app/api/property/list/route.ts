import { NextResponse } from "next/server";

const HUB = process.env.HUB_URL ?? "https://ap-home-platform-production.up.railway.app";

export async function GET() {
  try {
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
