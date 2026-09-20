import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/sites?select=id,code,name,type,stage,active&order=code.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: "no-store",
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
