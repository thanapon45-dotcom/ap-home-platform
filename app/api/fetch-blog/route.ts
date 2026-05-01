import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/fetch-blog
 * Fetches a blog URL and returns the plain text content
 * Body: { url: string }
 */
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

    // Extract og:image (featured image) before stripping tags
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const imageUrl = ogImageMatch?.[1] ?? null;

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
