import { NextResponse } from "next/server";

// Public WordPress REST endpoint (published posts only, no credential needed).
// Called server-side to avoid browser CORS.
const WP = "https://www.finnhouses.com";
export const dynamic = "force-dynamic";

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

export async function GET() {
  try {
    const slugs = new Set<string>();
    let page = 1;
    let totalPages = 1;
    do {
      const r = await fetch(
        `${WP}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug`,
        { signal: AbortSignal.timeout(8000), cache: "no-store" }
      );
      if (!r.ok) {
        return NextResponse.json(
          { ok: false, error: `WordPress returned ${r.status}` },
          { status: 502 }
        );
      }
      totalPages = Number(r.headers.get("x-wp-totalpages") ?? "1") || 1;
      const rows = await r.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row?.slug) slugs.add(safeDecode(String(row.slug)).toLowerCase());
        }
      }
      page++;
    } while (page <= totalPages && page <= 20);

    return NextResponse.json({ ok: true, count: slugs.size, slugs: [...slugs] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch published slugs";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
