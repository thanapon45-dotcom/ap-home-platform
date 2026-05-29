import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://omvpagvqyfmkkhzuuzda.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") ?? "market_insights";

  let query = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc&limit=50`;

  try {
    const res = await fetch(query, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
