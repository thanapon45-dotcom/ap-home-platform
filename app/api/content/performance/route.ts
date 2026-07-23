import { NextResponse } from "next/server";

/**
 * /api/content/performance — server-side proxy to Supabase `content_posts` +
 * `post_performance`.
 *
 * Added session 29 (Jul 23, 2026, ADR-020 follow-up) — this is the UI half of
 * the "AI Content Studio never proved itself" finding: `content_posts` has had
 * 13 rows since May with impressions/engagement/clicks stuck at 0 forever
 * (nothing ever updates those columns — see note below), and the dedicated
 * `post_performance` table (meant to hold real FB Graph API numbers from the
 * "FB Post Performance Tracker" n8n workflow) had 0 rows because that workflow
 * was hardcoded with an anon key that RLS silently blocked (ADR-020).
 *
 * `content_posts.impressions/engagement/clicks` are NOT the real signal —
 * Hub v1 (server.cjs) only ever inserts them as 0 and nothing ever patches
 * them afterward. The real numbers live in `post_performance`, keyed by
 * `content_post_id` (fallback `fb_post_id`). This route treats
 * `post_performance` as the source of truth and just uses `content_posts` for
 * topic/keyword/channel context.
 *
 * Same honest-empty-state pattern as /api/qc/accuracy and Deals ROI (ADR-015/017):
 * below RELIABILITY_THRESHOLD real-data rows, `reliable:false` — UI must show
 * "not enough data yet", not a misleading aggregate from a tiny sample.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const RELIABILITY_THRESHOLD = 5; // min # of posts with real performance data before showing aggregates

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

type ContentPost = {
  id: string;
  content_id: string;
  topic: string | null;
  keyword: string | null;
  format: string | null;
  source_channel: string | null;
  fb_post_id: string | null;
  wp_post_id: number | null;
  published_at: string | null;
  lead_generated: boolean | null;
};

type PostPerformance = {
  content_post_id: string | null;
  fb_post_id: string | null;
  topic: string | null;
  keyword: string | null;
  reach: number | null;
  impressions: number | null;
  engaged_users: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  link_clicks: number | null;
  engagement_rate: number | null;
  fetched_at: string | null;
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  try {
    const [postsRes, perfRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/content_posts?select=id,content_id,topic,keyword,format,source_channel,fb_post_id,wp_post_id,published_at,lead_generated&order=published_at.desc&limit=200`,
        { headers: headers() }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/post_performance?select=content_post_id,fb_post_id,topic,keyword,reach,impressions,engaged_users,reactions,comments,shares,link_clicks,engagement_rate,fetched_at`,
        { headers: headers() }
      ),
    ]);

    const posts = (await postsRes.json()) as ContentPost[];
    const perf = (await perfRes.json()) as PostPerformance[];
    if (!postsRes.ok) throw new Error(typeof posts === "object" ? JSON.stringify(posts) : String(posts));
    if (!perfRes.ok) throw new Error(typeof perf === "object" ? JSON.stringify(perf) : String(perf));

    const perfById = new Map(perf.filter(p => p.content_post_id).map(p => [p.content_post_id as string, p]));
    const perfByFbId = new Map(perf.filter(p => p.fb_post_id).map(p => [p.fb_post_id as string, p]));

    const merged = posts.map(post => {
      const match = perfById.get(post.id) ?? (post.fb_post_id ? perfByFbId.get(post.fb_post_id) : undefined);
      return { post, perf: match ?? null };
    });

    const withRealData = merged.filter(m => m.perf !== null);
    const total = posts.length;
    const withRealDataCount = withRealData.length;
    const coveragePct = total > 0 ? Math.round((withRealDataCount / total) * 1000) / 10 : 0;
    const leadsGenerated = posts.filter(p => p.lead_generated).length;
    const reliable = withRealDataCount >= RELIABILITY_THRESHOLD;

    const avgReach = reliable
      ? Math.round(withRealData.reduce((s, m) => s + (m.perf?.reach ?? 0), 0) / withRealDataCount)
      : null;
    const avgEngagementRate = reliable
      ? Math.round((withRealData.reduce((s, m) => s + (m.perf?.engagement_rate ?? 0), 0) / withRealDataCount) * 100) / 100
      : null;

    const topPosts = [...withRealData]
      .sort((a, b) => (b.perf?.reach ?? 0) - (a.perf?.reach ?? 0))
      .slice(0, 5)
      .map(m => ({
        topic: m.post.topic,
        keyword: m.post.keyword,
        source_channel: m.post.source_channel,
        published_at: m.post.published_at,
        reach: m.perf?.reach ?? 0,
        engagement_rate: m.perf?.engagement_rate ?? 0,
        link_clicks: m.perf?.link_clicks ?? 0,
      }));

    const dates = posts.map(p => p.published_at).filter(Boolean).sort() as string[];
    const window = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;

    return NextResponse.json({
      ok: true,
      data: {
        total_posts: total,
        with_real_data: withRealDataCount,
        coverage_pct: coveragePct,
        leads_generated: leadsGenerated,
        reliable,
        threshold: RELIABILITY_THRESHOLD,
        avg_reach: avgReach,
        avg_engagement_rate: avgEngagementRate,
        top_posts: reliable ? topPosts : [],
        window,
        recent: merged.slice(0, 15).map(m => ({
          topic: m.post.topic,
          keyword: m.post.keyword,
          source_channel: m.post.source_channel,
          published_at: m.post.published_at,
          has_real_data: m.perf !== null,
          reach: m.perf?.reach ?? null,
          engagement_rate: m.perf?.engagement_rate ?? null,
        })),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
