import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/fetch-blog
 * Fetches a blog URL, returns plain text + featured image URL
 * Image strategy:
 *   1. og:image / twitter:image meta tags (multiple attribute orderings)
 *   2. WordPress REST API featured image (wp-json fallback)
 * Body: { url: string }
 */

function extractOgImage(html: string): string | null {
  // Cover all common WordPress/Yoast attribute orderings
  const patterns = [
    // property before content (most common)
    /<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i,
    // content before property
    /<meta\s[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*\/?>/i,
    // twitter:image fallback
    /<meta\s[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i,
    /<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*\/?>/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1] && m[1].startsWith("http")) return m[1];
  }
  return null;
}

async function fetchWpFeaturedImage(siteBase: string, slug: string): Promise<string | null> {
  try {
    const apiUrl = `${siteBase}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1&per_page=1`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinnhousesBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const posts = await res.json();
    const media = posts?.[0]?._embedded?.["wp:featuredmedia"]?.[0];
    return media?.source_url ?? media?.media_details?.sizes?.full?.source_url ?? null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.startsWith("http")) {
    return NextResponse.json({ error: "URL ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinnhousesBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `ไม่สามารถเข้าถึง URL (${res.status})` }, { status: 400 });
    }

    const html = await res.text();

    // 1. Try og:image / twitter:image from HTML
    let imageUrl: string | null = extractOgImage(html);

    // 2. WordPress REST API fallback (only for finnhouses.com)
    if (!imageUrl) {
      try {
        const parsed = new URL(url);
        const slug = parsed.pathname.replace(/^\/|\/$/g, "").split("/").pop() ?? "";
        if (slug) {
          const siteBase = `${parsed.protocol}//${parsed.hostname}`;
          imageUrl = await fetchWpFeaturedImage(siteBase, slug);
        }
      } catch { /* skip */ }
    }

    // Strip HTML tags and extract readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{3,}/g, "\n\n")
      .trim()
      .slice(0, 4000);

    return NextResponse.json({ text, imageUrl });
  } catch (err) {
    return NextResponse.json({ error: "ไม่สามารถดึงบทความได้ กรุณาลองใหม่" }, { status: 500 });
  }
}
