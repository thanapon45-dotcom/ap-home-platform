// No model calls: only explicit publication records, exact titles and recorded guard outcomes.
function normalizeKeyword(value) {
  return String(value || '').normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

function plainTitle(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi,
    (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&nbsp;/g, ' ');
}

function titleMatches(keyword, title) {
  const k = normalizeKeyword(keyword), t = normalizeKeyword(plainTitle(title));
  // A keyword followed by a subtitle is still the same article topic.
  return !!k && (t === k || t.startsWith(k + ':') || t.startsWith(k + ' :'));
}

function historyEvidence(state) {
  const records = [...(state.blog_dedupe || []), ...(state.history || []).filter(r => r.engine === "blog"), ...(state.content_queue || [])];
  if (state.blog?.lastSuccessfulKeyword) records.push({ keyword: state.blog.lastSuccessfulKeyword, status: 'published' });
  return records.filter(r => r.keyword && (
    ['published', 'completed'].includes(r.status) ||
    /duplicate_slug_exists/.test(r.message || r.failureReason || '')
  ));
}

function findDuplicate(item, state, posts, wordpress) {
  const key = normalizeKeyword(item.keyword);
  if (!key) return { reason: 'empty_keyword' };
  const known = historyEvidence(state).find(r => normalizeKeyword(r.keyword) === key);
  if (known) return { reason: 'keyword_already_published', source: 'hub_history', runId: known.runId || null, postId: known.postId || null };
  const post = posts.find(p => p.wp_post_id && p.published_at && normalizeKeyword(p.keyword) === key);
  if (post) return { reason: 'keyword_already_published', source: 'content_posts', postId: post.wp_post_id };
  const wp = wordpress.find(p => titleMatches(item.keyword, p.title?.rendered) ||
    (item.slug && normalizeKeyword(decodeURIComponent(p.slug)) === normalizeKeyword(item.slug)));
  if (wp) return { reason: 'keyword_already_published', source: 'wordpress', postId: wp.id, slug: wp.slug, postUrl: wp.link };
  return null;
}

async function loadPublishedEvidence({ fetchImpl = fetch, supabaseUrl, supabaseKey, wpUrl }) {
  if (!supabaseUrl || !supabaseKey || !wpUrl) throw new Error('Dedupe evidence configuration missing');
  const posts = [], wordpress = [];
  for (let offset = 0; ; offset += 500) {
    const url = new URL('/rest/v1/content_posts', supabaseUrl);
    url.search = new URLSearchParams({ select: 'keyword,wp_post_id,published_at', wp_post_id: 'not.is.null', published_at: 'not.is.null', order: 'id.asc', limit: '500', offset: String(offset) });
    const response = await fetchImpl(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Publication registry unavailable: HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid publication registry response');
    posts.push(...rows);
    if (rows.length < 500) break;
    if (offset >= 99500) throw new Error('Publication registry pagination limit exceeded');
  }
  for (let page = 1; ; page++) {
    const url = new URL(wpUrl.replace(/\/$/, '') + '/wp-json/wp/v2/posts');
    url.search = new URLSearchParams({ status: 'publish', per_page: '100', page: String(page), _fields: 'id,slug,title,link' });
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`WordPress publication check unavailable: HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid WordPress response');
    wordpress.push(...rows);
    const totalPages = Number(response.headers.get('x-wp-totalpages'));
    if ((totalPages > 0 && page >= totalPages) || rows.length < 100) break;
    if (page >= 1000) throw new Error('WordPress pagination limit exceeded');
  }
  return { posts, wordpress };
}

module.exports = { normalizeKeyword, titleMatches, historyEvidence, findDuplicate, loadPublishedEvidence };
