/**
 * Finnhouses Backend Hub — server.js
 * Deploy on Railway as "ap-home-platform" service.
 *
 * Routes:
 *  GET  /health              → health check
 *  GET  /api/state           → Dashboard polls blog state
 *  POST /action/blog/run     → Dashboard triggers a blog run
 *  POST /webhook/blog        → n8n calls this when publish is done  ← THE MISSING ROUTE
 *  GET  /api/fb/state        → Dashboard polls FB engine state
 *
 * Env vars required on Railway:
 *  PORT                  (Railway sets this automatically)
 *  HUB_HOST              set to 0.0.0.0
 *  N8N_BLOG_WEBHOOK_URL  https://primary-production-8158a.up.railway.app/webhook/blog-run
 *  FB_BACKEND_URL        https://easygoing-friendship-production-e663.up.railway.app
 *  HUB_PUBLIC_BASE_URL   https://ap-home-platform-production.up.railway.app
 */

const express = require('express');
const cors    = require('cors');

// node-fetch v3 is ESM-only — use dynamic import for compatibility
const fetchFn = (...a) =>
  import('node-fetch').then(({ default: f }) => f(...a));

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─────────────────────────────────────────
// In-memory state (survives within a dyno restart)
// ─────────────────────────────────────────
const blogState = {
  status:    'idle',     // idle | running | published | failed
  runId:     null,
  keyword:   null,
  category:  null,
  postId:    null,
  postUrl:   null,
  message:   null,
  startedAt: null,
  updatedAt: null,
};

// ─────────────────────────────────────────
// Health
// ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'hub' }));

// ─────────────────────────────────────────
// GET /api/state  — Dashboard polls every 5 s
// Returns the current blog engine state.
// ─────────────────────────────────────────
app.get('/api/state', (_req, res) => {
  res.json({ blog: blogState });
});

// ─────────────────────────────────────────
// POST /action/blog/run  — Dashboard triggers a blog run
// Body: { keyword, category, slot?, visual_hint? }
// ─────────────────────────────────────────
app.post('/action/blog/run', async (req, res) => {
  const { keyword, category, slot, visual_hint } = req.body || {};

  if (!keyword || !category) {
    return res.status(400).json({ ok: false, error: 'keyword and category are required' });
  }

  // Guard: reject if already running
  if (blogState.status === 'running') {
    return res.status(429).json({ ok: false, error: 'A blog run is already in progress', runId: blogState.runId });
  }

  const runId = `run_${Date.now()}`;

  // Update state → running
  blogState.status    = 'running';
  blogState.runId     = runId;
  blogState.keyword   = keyword;
  blogState.category  = category;
  blogState.postId    = null;
  blogState.postUrl   = null;
  blogState.message   = null;
  blogState.startedAt = new Date().toISOString();
  blogState.updatedAt = new Date().toISOString();

  const n8nUrl = process.env.N8N_BLOG_WEBHOOK_URL;
  if (!n8nUrl) {
    blogState.status  = 'failed';
    blogState.message = 'N8N_BLOG_WEBHOOK_URL not configured';
    blogState.updatedAt = new Date().toISOString();
    return res.status(500).json({ ok: false, error: blogState.message });
  }

  // Call n8n asynchronously — don't wait for the full pipeline
  fetchFn(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, category, slot, visual_hint, runId }),
  }).catch((err) => {
    console.error('[hub] n8n trigger failed:', err.message);
    blogState.status  = 'failed';
    blogState.message = `n8n trigger error: ${err.message}`;
    blogState.updatedAt = new Date().toISOString();
  });

  console.log(`[hub] blog run started — runId=${runId} keyword="${keyword}" category=${category}`);
  res.json({ ok: true, runId });
});

// ─────────────────────────────────────────
// POST /webhook/blog  — n8n calls this when publish is done
// Body: { runId, status, postId, postUrl, message?, engine? }
// ─────────────────────────────────────────
app.post('/webhook/blog', (req, res) => {
  const { runId, status, postId, postUrl, message } = req.body || {};

  console.log('[hub] /webhook/blog received:', req.body);

  // runId check (only when both are present)
  if (runId && blogState.runId && runId !== blogState.runId) {
    console.warn(`[hub] runId mismatch — expected ${blogState.runId}, got ${runId}`);
    return res.status(200).json({ ok: false, reason: 'runId_mismatch' });
  }

  blogState.status    = status    || 'published';
  blogState.postId    = postId    || blogState.postId;
  blogState.postUrl   = postUrl   || blogState.postUrl;
  blogState.message   = message   || null;
  blogState.updatedAt = new Date().toISOString();

  console.log(`[hub] blog state updated → status=${blogState.status} postId=${blogState.postId}`);
  res.json({ ok: true });
});

// ─────────────────────────────────────────
// GET /api/fb/state  — Proxy to FB backend
// ─────────────────────────────────────────
app.get('/api/fb/state', async (_req, res) => {
  const fbUrl = process.env.FB_BACKEND_URL;
  if (!fbUrl) return res.json({ queue: 0, drafts: 0, published: 0 });

  try {
    const r = await fetchFn(`${fbUrl}/api/state`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('[hub] FB state fetch failed:', err.message);
    res.json({ queue: 0, drafts: 0, published: 0, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /action/fb/publish  — Proxy to FB backend
// ─────────────────────────────────────────
app.post('/action/fb/publish', async (req, res) => {
  const fbUrl = process.env.FB_BACKEND_URL;
  if (!fbUrl) return res.status(500).json({ ok: false, error: 'FB_BACKEND_URL not set' });

  try {
    const r = await fetchFn(`${fbUrl}/api/fb/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    console.error('[hub] FB publish failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// Start
// ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const HOST = process.env.HUB_HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[hub] listening on ${HOST}:${PORT}`);
  console.log(`[hub] N8N_BLOG_WEBHOOK_URL = ${process.env.N8N_BLOG_WEBHOOK_URL || '(not set)'}`);
});
