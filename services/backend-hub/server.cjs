const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 4000);
const HUB_HOST = process.env.HUB_HOST || "127.0.0.1";
const HUB_PUBLIC_BASE_URL = process.env.HUB_PUBLIC_BASE_URL || `http://${HUB_HOST}:${PORT}`;
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const N8N_BLOG_WEBHOOK_URL = process.env.N8N_BLOG_WEBHOOK_URL || "http://127.0.0.1:5678/webhook/blog-run";
const FB_BACKEND_URL = process.env.FB_BACKEND_URL || "http://127.0.0.1:3001";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const WP_URL = process.env.WP_URL || "https://finnhouses.com";
const WP_USER = process.env.WP_USER || "";
const WP_APP_PASS = process.env.WP_APP_PASS || "";
const STATE_FILE = path.join(__dirname, "hub-state.json");

// ── Supabase REST Helper ──────────────────────────────────────────────────────
async function supabaseInsert(table, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "No Supabase credentials" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function supabaseUpsert(table, payload, onConflict = "id") {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "No Supabase credentials" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function supabaseUpdate(table, match, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, error: "No Supabase credentials" };
  const params = new URLSearchParams(match).toString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "blog") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function baseState() {
  return {
    system: {
      hubStatus: "idle",
      lastError: "",
      updatedAt: nowIso(),
      stateFile: STATE_FILE,
    },
    blog: {
      engine: "blog",
      runId: "",
      status: "idle",
      queue: 0,
      published: 0,
      failed: 0,
      postId: "",
      postUrl: "",
      keyword: "",
      normalizedKeyword: "",
      category: 13,
      slot: "morning",
      visual_hint: "contemporary",
      message: "",
      source: "",
      startedAt: "",
      finishedAt: "",
      lastSuccessfulKeyword: "",
      lastSuccessfulAt: "",
      updatedAt: nowIso(),
      pipeline: {},
      visionRetries: 0,
      publishChecks: {},
    },
    fb: {
      engine: "fb",
      runId: "",
      status: "idle",
      queue: 0,
      drafts: 0,
      published: 0,
      failed: 0,
      postUrl: "",
      message: "",
      lastAction: "",
      lastUpdate: "",
      startedAt: "",
      finishedAt: "",
      updatedAt: nowIso(),
    },
    history: [],
    content_queue: [],
    fb_queue: [],
  };
}

function normalizeState(raw) {
  const base = baseState();
  const state = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...state,
    system: { ...base.system, ...(state.system || {}) },
    blog: { ...base.blog, ...(state.blog || {}) },
    fb: { ...base.fb, ...(state.fb || {}) },
    history: Array.isArray(state.history) ? state.history : base.history,
    content_queue: Array.isArray(state.content_queue) ? state.content_queue : [],
    fb_queue: Array.isArray(state.fb_queue) ? state.fb_queue : [],
  };
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return baseState();
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return normalizeState(raw);
  } catch {
    return baseState();
  }
}

function writeState(state) {
  const next = normalizeState(state);
  next.system.updatedAt = nowIso();
  next.system.stateFile = STATE_FILE;
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
}

function pushHistory(state, entry) {
  state.history.unshift({
    id: crypto.randomUUID(),
    at: nowIso(),
    ...entry,
  });
  state.history = state.history.slice(0, 100);
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: false,
    }),
  });
  return res.ok;
}

function formatBlogMessage(payload) {
  const icon = payload.status === "published" ? "✅" : "❌";
  const lines = [
    `${icon} Finnhouses Blog ${payload.status === "published" ? "Published" : "Failed"}`,
    `Run ID: ${payload.runId || ""}`,
    `Keyword: ${payload.keyword || ""}`,
    `Category: ${payload.category || ""}`,
  ];
  if (payload.postId) lines.push(`Post ID: ${payload.postId}`);
  if (payload.message) lines.push(`Message: ${payload.message}`);
  if (payload.postUrl) lines.push(`URL: ${payload.postUrl}`);
  return lines.join("\n");
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/state", (req, res) => {
  res.json(readState());
});

app.get("/health", (req, res) => {
  res.json({ ok: true, time: nowIso() });
});

app.post("/action/blog/reset", (req, res) => {
  const state = readState();
  const oldRunId = state.blog.runId || "";
  const oldKeyword = state.blog.keyword || "";
  state.blog = {
    ...state.blog,
    runId: "",
    status: "idle",
    queue: 0,
    published: 0,
    failed: 0,
    postId: "",
    postUrl: "",
    message: "Manual reset",
    startedAt: "",
    finishedAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.system.lastError = "";
  pushHistory(state, {
    type: "blog_manual_reset",
    engine: "blog",
    runId: oldRunId,
    keyword: oldKeyword,
    status: "idle",
    message: "Manual reset",
  });
  writeState(state);
  res.json({ ok: true });
});

app.post("/action/blog/run", async (req, res) => {
  const state = readState();
  const keyword = String(req.body.keyword || "").trim();
  const category = Number(req.body.category || 13);
  const slot = String(req.body.slot || "morning");
  const visual_hint = String(req.body.visual_hint || "contemporary");

  if (!keyword) {
    return res.status(400).json({ ok: false, error: "keyword is required" });
  }

  const runId = makeId("blog");
  const callbackUrl = `${HUB_PUBLIC_BASE_URL}/webhook/n8n`;

  state.blog = {
    ...state.blog,
    engine: "blog",
    runId,
    status: "running",
    queue: 0,
    published: 0,
    failed: 0,
    postId: "",
    postUrl: "",
    keyword,
    normalizedKeyword: keyword,
    category,
    slot,
    visual_hint,
    message: "Blog flow dispatched to n8n",
    source: req.body.source || "dashboard-react",
    startedAt: nowIso(),
    finishedAt: "",
    updatedAt: nowIso(),
    pipeline: {},
    visionRetries: 0,
    publishChecks: {},
  };
  state.system.lastError = "";
  pushHistory(state, {
    type: "blog_run_started",
    engine: "blog",
    runId,
    keyword,
    status: "running",
    message: "Hub accepted request from dashboard",
  });
  writeState(state);

  const payload = {
    keyword,
    category,
    slot,
    visual_hint,
    source: req.body.source || "dashboard-react",
    utm_source: req.body.utm_source || "dashboard",
    utm_medium: req.body.utm_medium || "manual",
    utm_campaign: req.body.utm_campaign || "finnhouses-dashboard",
    runId,
    hub_callback_url: callbackUrl,
  };

  // Return immediately — don't wait for n8n to respond
  res.json({ ok: true, runId, category, accepted: true });

  // Fire-and-forget: trigger n8n in background
  fetch(N8N_BLOG_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      const errMsg = `n8n webhook returned HTTP ${r.status}${text ? `: ${text}` : ""}`;
      console.error("[hub] n8n trigger failed:", errMsg);
      const s = readState();
      s.blog.status = "failed";
      s.blog.failed = 1;
      s.blog.message = errMsg;
      s.blog.finishedAt = nowIso();
      s.blog.updatedAt = nowIso();
      s.system.lastError = errMsg;
      pushHistory(s, { type: "blog_run_failed_at_dispatch", engine: "blog", runId, keyword, status: "failed", message: errMsg });
      writeState(s);
      sendTelegram(formatBlogMessage(s.blog)).catch(() => {});
    } else {
      console.log("[hub] n8n triggered OK — runId:", runId);
    }
  }).catch((err) => {
    console.error("[hub] n8n fetch error:", err.message);
    const s = readState();
    s.blog.status = "failed";
    s.blog.failed = 1;
    s.blog.message = `n8n unreachable: ${err.message}`;
    s.blog.finishedAt = nowIso();
    s.blog.updatedAt = nowIso();
    s.system.lastError = err.message;
    pushHistory(s, { type: "blog_run_failed_at_dispatch", engine: "blog", runId, keyword, status: "failed", message: err.message });
    writeState(s);
    sendTelegram(formatBlogMessage(s.blog)).catch(() => {});
  });
});

app.post("/webhook/n8n", async (req, res) => {
  const state = readState();
  const payload = req.body || {};
  const status = String(payload.status || "").toLowerCase();
  const normalizedStatus = status === "published" ? "published" : "failed";

  state.blog = {
    ...state.blog,
    runId: String(payload.runId || state.blog.runId || ""),
    status: normalizedStatus,
    queue: Number(payload.queue || 0),
    published: normalizedStatus === "published" ? Number(payload.published || 1) : 0,
    failed: normalizedStatus === "published" ? 0 : Number(payload.failed || 1),
    postId: String(payload.postId || ""),
    postUrl: String(payload.postUrl || ""),
    keyword: String(payload.keyword || state.blog.keyword || ""),
    normalizedKeyword: String(payload.keyword || state.blog.keyword || ""),
    category: Number(payload.category || state.blog.category || 13),
    message: String(payload.message || "Callback received"),
    finishedAt: nowIso(),
    updatedAt: nowIso(),
    lastSuccessfulKeyword:
      normalizedStatus === "published"
        ? String(payload.keyword || state.blog.keyword || "")
        : state.blog.lastSuccessfulKeyword || "",
    lastSuccessfulAt: normalizedStatus === "published" ? nowIso() : state.blog.lastSuccessfulAt || "",
    pipeline: payload.pipeline && typeof payload.pipeline === "object" ? payload.pipeline : (state.blog.pipeline || {}),
    visionRetries: typeof payload.visionRetries === "number" ? payload.visionRetries : (state.blog.visionRetries || 0),
    publishChecks: payload.publishChecks && typeof payload.publishChecks === "object" ? payload.publishChecks : (state.blog.publishChecks || {}),
  };
  state.system.lastError = normalizedStatus === "failed" ? state.blog.message : "";

  // Update queue item if this callback came from a queued run
  if (payload.queue_item_id && Array.isArray(state.content_queue)) {
    const qi = state.content_queue.find(i => i.id === payload.queue_item_id);
    if (qi) {
      qi.status = normalizedStatus;
      qi.postUrl = String(payload.postUrl || "");
      qi.runId = String(payload.runId || qi.runId || "");
      qi.updatedAt = nowIso();
    }
  }

  pushHistory(state, {
    type: "blog_callback_received",
    engine: "blog",
    runId: state.blog.runId,
    keyword: state.blog.keyword,
    status: state.blog.status,
    postId: state.blog.postId,
    postUrl: state.blog.postUrl,
    message: state.blog.message,
  });
  writeState(state);

  try {
    await sendTelegram(formatBlogMessage(state.blog));
    pushHistory(state, {
      type: "telegram_blog_notify",
      engine: "blog",
      runId: state.blog.runId,
      status: state.blog.status,
      keyword: state.blog.keyword,
      message: "Telegram sent",
    });
    writeState(state);
  } catch (error) {
    state.system.lastError = error.message;
    writeState(state);
  }

  res.json({ ok: true });
});

// ── WF2 Image-done callback ───────────────────────────────────────────────────
app.post("/webhook/image-done", async (req, res) => {
  const state = readState();
  const payload = req.body || {};
  const status = String(payload.status || "patched");
  const postId = String(payload.post_id || "");
  const mediaId = String(payload.media_id || "0");
  const mediaUrl = String(payload.media_url || "");

  state.blog = {
    ...state.blog,
    image_status: status,
    image_media_id: mediaId,
    image_media_url: mediaUrl,
    image_patched_at: nowIso(),
    updatedAt: nowIso(),
  };

  pushHistory(state, {
    type: "image_callback_received",
    engine: "blog",
    postId,
    mediaId,
    status,
    message: `WF2 image ${status}`,
  });
  writeState(state);

  if (status === "patched") {
    const msg = `🖼️ Image patched\nPost ID: ${postId}\nMedia ID: ${mediaId}\nURL: ${mediaUrl}`;
    sendTelegram(msg).catch(() => {});
    // sync image status back to content_posts
    supabaseUpdate("content_posts", { wp_post_id: `eq.${postId}` }, {
      image_generated: true,
    }).catch(() => {});
  }

  res.json({ ok: true, status, postId, mediaId });
});

// ── WF1 Blog-published callback → Supabase content_posts ─────────────────────
app.post("/webhook/blog-published", async (req, res) => {
  const payload = req.body || {};
  const topic        = String(payload.topic || "");
  const keyword      = String(payload.keyword || "");
  const wpPostId     = Number(payload.wp_post_id || 0);
  const postUrl      = String(payload.post_url || "");
  const format       = String(payload.format || "blog");
  const tokenUsage   = Number(payload.token_usage || 0);
  const contentId    = `blog_${wpPostId || Date.now()}`;

  const row = {
    content_id:     contentId,
    topic,
    keyword,
    format,
    source_channel: "blog_runner",
    wp_post_id:     wpPostId || null,
    published_at:   new Date().toISOString(),
    image_generated: false,
    token_usage:    tokenUsage,
    lead_generated: false,
    conversion_rate: 0,
  };

  const result = await supabaseInsert("content_posts", row);

  if (result.ok) {
    sendTelegram(`📝 Blog published logged\nKeyword: ${keyword}\nPost: ${postUrl}\nID: ${contentId}`).catch(() => {});
  }

  res.json({ ok: result.ok, content_id: contentId, supabase: result });
});

// ── Property saved → Supabase properties (upsert) ────────────────────────────
app.post("/webhook/property-saved", async (req, res) => {
  const payload = req.body || {};
  const wpPostId = Number(payload.wp_post_id || 0);
  if (!wpPostId) return res.status(400).json({ ok: false, error: "wp_post_id required" });

  const row = {
    wp_post_id:    wpPostId,
    title:         String(payload.title || ""),
    property_type: String(payload.property_type || ""),
    status:        String(payload.status || "ขาย"),
    location:      String(payload.location || ""),
    zone:          String(payload.zone || ""),
    asking_price:  payload.asking_price ? Number(payload.asking_price) : null,
    area_sqm:      payload.area_sqm    ? Number(payload.area_sqm)    : null,
    land_sqm:      payload.land_sqm    ? Number(payload.land_sqm)    : null,
    bedrooms:      payload.bedrooms    ? Number(payload.bedrooms)    : null,
    bathrooms:     payload.bathrooms   ? Number(payload.bathrooms)   : null,
    is_flip:       Boolean(payload.is_flip || false),
    listed_at:     String(payload.listed_at || new Date().toISOString()),
    updated_at:    new Date().toISOString(),
  };

  const result = await supabaseUpsert("properties", row, "wp_post_id");
  console.log(`[hub] property-saved wp_post_id=${wpPostId}`, result.ok ? "✅" : result.error);
  res.json({ ok: result.ok, wp_post_id: wpPostId, supabase: result });
});

app.post("/webhook/fb", (req, res) => {
  const state = readState();
  const payload = req.body || {};
  const status = String(payload.status || "idle").toLowerCase();

  state.fb = {
    ...state.fb,
    engine: "fb",
    runId: String(payload.runId || state.fb.runId || ""),
    status,
    queue: Number(payload.queue ?? state.fb.queue ?? 0),
    drafts: Number(payload.drafts ?? state.fb.drafts ?? 0),
    published: Number(payload.published ?? state.fb.published ?? 0),
    failed: Number(payload.failed ?? state.fb.failed ?? (status === "failed" ? 1 : 0)),
    postUrl: String(payload.postUrl || state.fb.postUrl || ""),
    message: String(payload.message || state.fb.message || ""),
    lastAction: String(payload.lastAction || state.fb.lastAction || ""),
    lastUpdate: String(payload.lastUpdate || nowIso()),
    startedAt: String(payload.startedAt || state.fb.startedAt || (status === "running" ? nowIso() : "")),
    finishedAt: status === "published" || status === "failed" ? nowIso() : String(payload.finishedAt || state.fb.finishedAt || ""),
    updatedAt: nowIso(),
  };

  pushHistory(state, {
    type: "fb_webhook_received",
    engine: "fb",
    runId: state.fb.runId,
    status: state.fb.status,
    message: state.fb.message || "FB webhook received",
  });
  writeState(state);
  res.json({ ok: true });
});

app.post("/action/fb/publish", async (req, res) => {
  const state = readState();
  const content = String(req.body.content || "").trim();
  if (!content) {
    return res.status(400).json({ ok: false, error: "content is required" });
  }

  const runId = makeId("fb");
  state.fb = {
    ...state.fb,
    engine: "fb",
    runId,
    status: "running",
    message: "FB publish dispatched to fb-backend",
    lastAction: "publish",
    lastUpdate: nowIso(),
    startedAt: nowIso(),
    finishedAt: "",
    updatedAt: nowIso(),
  };
  pushHistory(state, {
    type: "fb_publish_started",
    engine: "fb",
    runId,
    status: "running",
    message: "Hub accepted FB publish request",
  });
  writeState(state);

  try {
    const response = await fetch(`${FB_BACKEND_URL}/api/fb/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        runId,
        source: req.body.source || "dashboard-react",
        content,
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`fb-backend returned HTTP ${response.status}${bodyText ? ` ${bodyText}` : ""}`);
    }

    res.json({ ok: true, runId, accepted: true, upstream: bodyText || "accepted" });
  } catch (error) {
    state.fb = {
      ...state.fb,
      runId,
      status: "failed",
      failed: 1,
      message: error.message,
      lastAction: "publish",
      lastUpdate: nowIso(),
      finishedAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.system.lastError = error.message;
    pushHistory(state, {
      type: "fb_publish_failed_at_dispatch",
      engine: "fb",
      runId,
      status: "failed",
      message: error.message,
    });
    writeState(state);
    sendTelegram(`❌ FB Publish Error\n${error.message}\nrunId: ${runId}`).catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── FB Queue endpoints ────────────────────────────────────────────────────────

app.post("/action/fb/queue/build", (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items array required" });
  }
  const state = readState();
  state.fb_queue = items.map(item => ({
    id: String(item.id || crypto.randomUUID()),
    date: String(item.date || ""),
    content: String(item.content || ""),
    status: "pending",
    postUrl: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  writeState(state);
  res.json({ ok: true, count: state.fb_queue.length, queue: state.fb_queue });
});

app.post("/action/fb/queue/clear", (req, res) => {
  const state = readState();
  state.fb_queue = [];
  writeState(state);
  res.json({ ok: true });
});

app.post("/action/fb/queue/run-next", async (req, res) => {
  const state = readState();
  if (!Array.isArray(state.fb_queue) || state.fb_queue.length === 0) {
    return res.json({ ok: true, skipped: true, message: "FB queue is empty" });
  }
  const todayStr = new Date().toISOString().split("T")[0];
  const nextItem = state.fb_queue.find(
    item => item.status === "pending" && item.date <= todayStr
  );
  if (!nextItem) {
    return res.json({ ok: true, skipped: true, message: "No FB posts due today or earlier" });
  }

  const runId = makeId("fb");
  nextItem.status = "running";
  nextItem.updatedAt = nowIso();

  state.fb = {
    ...state.fb,
    engine: "fb",
    runId,
    status: "running",
    message: "FB Queue: dispatching post",
    lastAction: "queue-publish",
    lastUpdate: nowIso(),
    startedAt: nowIso(),
    finishedAt: "",
    updatedAt: nowIso(),
  };
  pushHistory(state, {
    type: "fb_queue_item_started",
    engine: "fb",
    runId,
    status: "running",
    message: `FB Queue: ${nextItem.date} item started`,
  });
  writeState(state);

  try {
    const response = await fetch(`${FB_BACKEND_URL}/api/fb/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ runId, source: "fb-queue", content: nextItem.content }),
    });
    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`fb-backend returned HTTP ${response.status}${bodyText ? ` ${bodyText}` : ""}`);
    }

    const s = readState();
    const qi = s.fb_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "published"; qi.updatedAt = nowIso(); }
    s.fb = { ...s.fb, runId, status: "published", published: (s.fb.published || 0) + 1,
      message: "FB Queue post published", lastUpdate: nowIso(), finishedAt: nowIso(), updatedAt: nowIso() };
    pushHistory(s, { type: "fb_queue_item_published", engine: "fb", runId, status: "published",
      message: `FB Queue: ${nextItem.date} published` });
    writeState(s);
    res.json({ ok: true, runId, item: nextItem });
  } catch (error) {
    const s = readState();
    const qi = s.fb_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
    s.fb = { ...s.fb, runId, status: "failed", failed: (s.fb.failed || 0) + 1,
      message: error.message, lastUpdate: nowIso(), finishedAt: nowIso(), updatedAt: nowIso() };
    s.system.lastError = error.message;
    pushHistory(s, { type: "fb_queue_item_failed", engine: "fb", runId, status: "failed",
      message: error.message });
    writeState(s);
    sendTelegram(`❌ FB Queue Error\n${error.message}\nrunId: ${runId}`).catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Content Queue endpoints ───────────────────────────────────────────────────

app.post("/action/blog/queue/build", (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items array required" });
  }
  const state = readState();
  state.content_queue = items.map(item => ({
    id: String(item.id || crypto.randomUUID()),
    date: String(item.date || ""),
    slot: String(item.slot || "morning"),
    keyword: String(item.keyword || ""),
    category: Number(item.category || 13),
    visual_hint: String(item.visual_hint || "contemporary"),
    status: "pending",
    runId: "",
    postUrl: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  writeState(state);
  res.json({ ok: true, count: state.content_queue.length, queue: state.content_queue });
});

app.post("/action/blog/queue/clear", (req, res) => {
  const state = readState();
  state.content_queue = [];
  writeState(state);
  res.json({ ok: true });
});

app.post("/action/blog/queue/run-next", async (req, res) => {
  const state = readState();
  if (!Array.isArray(state.content_queue) || state.content_queue.length === 0) {
    return res.json({ ok: true, skipped: true, message: "Queue is empty" });
  }
  const todayStr = new Date().toISOString().split("T")[0];
  const nextItem = state.content_queue.find(
    item => item.status === "pending" && item.date <= todayStr
  );
  if (!nextItem) {
    return res.json({ ok: true, skipped: true, message: "No pending items due today or earlier" });
  }

  const runId = makeId("blog");
  const callbackUrl = `${HUB_PUBLIC_BASE_URL}/webhook/n8n`;

  nextItem.status = "running";
  nextItem.runId = runId;
  nextItem.updatedAt = nowIso();

  state.blog = {
    ...state.blog,
    engine: "blog",
    runId,
    status: "running",
    queue: 0, published: 0, failed: 0,
    postId: "", postUrl: "",
    keyword: nextItem.keyword,
    normalizedKeyword: nextItem.keyword,
    category: nextItem.category,
    slot: nextItem.slot,
    visual_hint: nextItem.visual_hint,
    message: "Queue: dispatched to n8n",
    source: "content-queue",
    startedAt: nowIso(), finishedAt: "",
    updatedAt: nowIso(),
    pipeline: {}, visionRetries: 0, publishChecks: {},
  };
  state.system.lastError = "";
  pushHistory(state, {
    type: "queue_item_started", engine: "blog",
    runId, keyword: nextItem.keyword,
    status: "running", message: `Queue: ${nextItem.date} item started`,
  });
  writeState(state);

  res.json({ ok: true, runId, item: nextItem });

  const payload = {
    keyword: nextItem.keyword,
    category: nextItem.category,
    slot: nextItem.slot,
    visual_hint: nextItem.visual_hint,
    source: "content-queue",
    utm_source: "queue", utm_medium: "auto", utm_campaign: "finnhouses-queue",
    runId,
    hub_callback_url: callbackUrl,
    queue_item_id: nextItem.id,
  };

  fetch(N8N_BLOG_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      const errMsg = `n8n returned HTTP ${r.status}${text ? `: ${text}` : ""}`;
      console.error("[hub] queue run-next n8n failed:", errMsg);
      const s = readState();
      const qi = s.content_queue?.find(i => i.id === nextItem.id);
      if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
      s.blog.status = "failed"; s.blog.failed = 1;
      s.blog.message = errMsg; s.blog.finishedAt = nowIso(); s.blog.updatedAt = nowIso();
      s.system.lastError = errMsg;
      writeState(s);
      sendTelegram(`❌ Blog Queue Error\nn8n ตอบ ${r.status}\n${errMsg}`).catch(() => {});
    } else {
      console.log("[hub] queue run-next n8n OK — runId:", runId);
    }
  }).catch((err) => {
    const s = readState();
    const qi = s.content_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
    s.blog.status = "failed"; s.blog.message = `n8n unreachable: ${err.message}`;
    s.blog.finishedAt = nowIso(); s.blog.updatedAt = nowIso();
    s.system.lastError = err.message;
    writeState(s);
    sendTelegram(`❌ Blog Queue Error\nn8n unreachable: ${err.message}`).catch(() => {});
  });
});

// ── LINE Seller Intake → Supabase properties (insert, no wp_post_id) ──────────
app.post("/webhook/property-line-intake", async (req, res) => {
  const payload = req.body || {};
  if (!payload.title && !payload.notes) {
    return res.status(400).json({ ok: false, error: "title or notes required" });
  }
  const row = {
    title:         String(payload.title || "ทรัพย์จาก LINE"),
    property_type: String(payload.property_type || ""),
    status:        "pending_review",
    location:      String(payload.location || ""),
    zone:          String(payload.zone || ""),
    asking_price:  payload.asking_price ? Number(payload.asking_price) : null,
    area_sqm:      payload.area_sqm    ? Number(payload.area_sqm)    : null,
    land_sqm:      payload.land_sqm    ? Number(payload.land_sqm)    : null,
    bedrooms:      payload.bedrooms    ? Number(payload.bedrooms)    : null,
    bathrooms:     payload.bathrooms   ? Number(payload.bathrooms)   : null,
    is_flip:       false,
    source:        "LINE ฝากขาย",
    notes:         String(payload.notes || ""),
    line_user_id:  String(payload.line_user_id || ""),
    listed_at:     new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  };
  const result = await supabaseInsert("properties", row);
  console.log(`[hub] property-line-intake title="${row.title}"`, result.ok ? "✅" : result.error);
  res.json({ ok: result.ok, supabase: result });
});

// ── Upload image to WP Media Library ─────────────────────────────────────────
app.post("/action/property/upload-image",
  express.raw({ type: ["image/jpeg","image/jpg","image/png","image/webp"], limit: "10mb" }),
  async (req, res) => {
    if (!WP_USER || !WP_APP_PASS) {
      return res.status(500).json({ ok: false, error: "WP credentials not configured" });
    }
    const filename = req.headers["x-filename"] || "photo.jpg";
    const mimetype = req.headers["content-type"] || "image/jpeg";
    const basicAuth = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");
    try {
      const wpRes = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Type": mimetype,
        },
        body: req.body,
      });
      const data = await wpRes.json();
      if (!wpRes.ok) return res.status(502).json({ ok: false, error: data?.message ?? "WP media upload failed" });
      console.log(`[hub] media uploaded id=${data.id} url=${data.source_url}`);
      res.json({ ok: true, media_id: data.id, url: data.source_url });
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message });
    }
  }
);

// ── Publish Property to WordPress + update Supabase ──────────────────────────
app.post("/action/property/publish", async (req, res) => {
  const { supabase_id, ...propertyData } = req.body || {};

  if (!supabase_id) {
    return res.status(400).json({ ok: false, error: "supabase_id required" });
  }
  if (!WP_USER || !WP_APP_PASS) {
    return res.status(500).json({ ok: false, error: "WP credentials not configured" });
  }

  const basicAuth = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");

  // ── Step 1: Log what we're sending ───────────────────────────────────────
  const featuredMediaId = Number(propertyData.featured_media) || 0;
  const galleryIds = Array.isArray(propertyData.gallery_ids) ? propertyData.gallery_ids : [];
  console.log(`[hub] publish → featured_media=${featuredMediaId} gallery_ids=[${galleryIds.join(",")}] supabase_id=${supabase_id}`);

  // ── Step 2: Call WordPress custom REST endpoint ───────────────────────────
  let wpResult;
  try {
    const wpRes = await fetch(`${WP_URL}/wp-json/finnhouses/v1/property-intake`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...propertyData, supabase_id, post_status: "publish" }),
    });
    wpResult = await wpRes.json();
    if (!wpRes.ok) {
      console.error("[hub] WP publish failed", JSON.stringify(wpResult));
      return res.status(502).json({ ok: false, error: "WP error", detail: wpResult });
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: "WP unreachable", detail: e.message });
  }

  const { wp_post_id, url } = wpResult;
  const wpDebug = wpResult.debug || {};
  console.log(`[hub] WP created post_id=${wp_post_id} | thumbnail_id=${wpDebug.thumbnail_id ?? "?"} has_thumbnail=${wpDebug.has_thumbnail ?? "?"} gallery_saved=[${(wpDebug.gallery_saved ?? []).join(",")}]`);

  // ── Step 3: Belt-and-suspenders — set featured_media via standard WP REST API ─
  // set_post_thumbnail() inside the custom endpoint can fail silently;
  // this call ensures the featured image is always set correctly.
  if (featuredMediaId > 0 && wp_post_id) {
    try {
      const patchRes = await fetch(`${WP_URL}/wp-json/wp/v2/property/${wp_post_id}`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featured_media: featuredMediaId }),
      });
      const patchData = await patchRes.json();
      const confirmedId = patchData.featured_media ?? "unknown";
      console.log(`[hub] WP featured_media patch → confirmed=${confirmedId} (sent=${featuredMediaId})`);
    } catch (e) {
      console.warn(`[hub] WP featured_media patch failed (non-fatal): ${e.message}`);
    }
  }

  // ── Step 4: Update Supabase ───────────────────────────────────────────────
  const sbResult = await supabaseUpdate(
    "properties",
    { id: `eq.${supabase_id}` },
    {
      status:     "published",
      wp_post_id: wp_post_id,
      updated_at: new Date().toISOString(),
    }
  );

  console.log(`[hub] property published ✅ wp_post_id=${wp_post_id} supabase_id=${supabase_id}`, sbResult.ok ? "✅" : sbResult.error);
  res.json({
    ok: true,
    wp_post_id,
    url,
    debug: {
      sent_featured_media: featuredMediaId,
      sent_gallery_ids: galleryIds,
      wp_thumbnail_id: wpDebug.thumbnail_id,
      wp_gallery_saved: wpDebug.gallery_saved,
    },
    supabase: sbResult,
  });
});

// ── Get pending_review properties (for Dashboard review UI) ──────────────────
app.get("/api/properties/pending", async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  }
  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?status=eq.pending_review&order=listed_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await sbRes.json();
    res.json({ ok: sbRes.ok, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Get published properties from WordPress (for AI Content Listing tab) ─────
app.get("/api/properties/wp-published", async (req, res) => {
  if (!WP_URL || !WP_USER || !WP_APP_PASS) {
    return res.status(500).json({ ok: false, error: "No WP credentials" });
  }
  try {
    const auth = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");
    const wpRes = await fetch(
      `${WP_URL}/wp-json/wp/v2/property?status=publish&per_page=20&orderby=date&order=desc&_embed=1`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (!wpRes.ok) {
      const txt = await wpRes.text();
      return res.status(500).json({ ok: false, error: `WP ${wpRes.status}: ${txt.slice(0,200)}` });
    }
    const posts = await wpRes.json();
    const properties = posts.map(p => {
      // Taxonomies come via _embedded["wp:term"] — array of arrays per taxonomy
      const terms = p._embedded?.["wp:term"] ?? [];
      const getTaxTerm = (slug) => {
        for (const group of terms) {
          const found = group.find(t => t.taxonomy === slug);
          if (found) return found.name ?? "";
        }
        return "";
      };
      return {
        wp_id:          p.id,
        title:          p.title?.rendered ?? "",
        link:           p.link ?? "",
        date:           p.date ?? "",
        excerpt:        p.excerpt?.rendered?.replace(/<[^>]+>/g, "").trim() ?? "",
        featured_image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
        // Meta fields — WP uses finn_ prefix (registered via finnhouses_register_property_meta)
        price:          p.meta?.finn_price ?? null,
        zone:           p.meta?.finn_zone ?? "",
        bedrooms:       p.meta?.finn_bedrooms ?? null,
        bathrooms:      p.meta?.finn_bathrooms ?? null,
        area_sqm:       p.meta?.finn_usable_area ?? null,
        land_sqm:       p.meta?.finn_area ?? null,
        // Taxonomies
        property_type:  getTaxTerm("property_type"),
        location:       getTaxTerm("property_location"),
      };
    });
    res.json({ ok: true, properties });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Dismiss a pending property (update status → dismissed) ───────────────────
app.post("/action/property/dismiss", async (req, res) => {
  const { supabase_id } = req.body || {};
  if (!supabase_id) return res.status(400).json({ ok: false, error: "supabase_id required" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${supabase_id}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ status: "dismissed" }),
      }
    );
    if (!patchRes.ok) {
      const txt = await patchRes.text();
      return res.status(500).json({ ok: false, error: txt });
    }
    res.json({ ok: true, supabase_id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Append LINE image to a property — uses Supabase RPC for atomic DB-level append ──
// RPC: append_line_image_atomic(p_id, p_media_id, p_url)
// ป้องกัน race condition ที่ PostgreSQL level (SELECT FOR UPDATE ใน function)
app.post("/action/property/append-line-image", async (req, res) => {
  const { line_user_id, media_id, url } = req.body || {};
  if (!line_user_id || !media_id || !url) {
    return res.status(400).json({ ok: false, error: "line_user_id, media_id, url required" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  }
  try {
    // 1. Find latest pending_review property for this LINE user (within 48h)
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?line_user_id=eq.${encodeURIComponent(line_user_id)}&status=eq.pending_review&listed_at=gte.${since}&order=listed_at.desc&limit=1`,
      { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await findRes.json();
    if (!rows?.length) {
      return res.status(404).json({ ok: false, error: "No pending property found for this LINE user (within 48h)" });
    }
    const prop = rows[0];

    // 2. Atomic append ผ่าน Supabase RPC (PostgreSQL SELECT FOR UPDATE)
    // ไม่ต้องใช้ in-memory mutex — DB handle concurrency เอง
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/append_line_image_atomic`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_id: prop.id, p_media_id: media_id, p_url: url }),
    });
    const rpcData = await rpcRes.json();
    console.log(`[hub] append-line-image RPC → property ${prop.id} media_id=${media_id}`, rpcRes.ok ? "✅" : rpcData);

    if (!rpcRes.ok) {
      return res.status(500).json({ ok: false, error: rpcData?.message || JSON.stringify(rpcData) });
    }

    res.json({
      ok: true,
      property_id: prop.id,
      image_count: rpcData?.image_count ?? null,
      skipped: rpcData?.skipped ?? false,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Land Analyzer / Reno Estimator — Lead Capture ────────────────────────────
app.post("/action/land-lead", async (req, res) => {
  const { name, phone, source, notes, budget, roi } = req.body || {};
  if (!name || !phone) return res.status(400).json({ ok: false, error: "name and phone required" });

  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const d = new Date();
  const lead_date = `${d.getDate()} ${months[d.getMonth()]}`;
  const business_unit = source === "Reno Estimator" ? "renovation" : "broker";

  const row = {
    name,
    phone,
    stage:         "new",
    source:        source || "Land Analyzer",
    business_unit,
    score:         70,
    budget:        budget || null,
    notes:         notes || null,
    lead_date,
    outcome:       "pending",
  };

  const result = await supabaseInsert("leads", row);

  const roiLine = roi ? ` | ROI ≈ ${roi}` : "";
  const msg = `🗺️ Lead ใหม่ — ${source || "Land Analyzer"}\n👤 ${name}\n📞 ${phone}\n💰 ${budget || "ไม่ระบุ"}${roiLine}\n📝 ${notes || "-"}`;
  sendTelegram(msg).catch(() => {});

  res.json({ ok: result.ok, error: result.error || null });
});

app.listen(PORT, HUB_HOST, () => {
  const state = readState();
  writeState(state);
  console.log(`Backend Hub v2 running at ${HUB_PUBLIC_BASE_URL}`);
  console.log(`Routes: /action/blog/queue/build|clear|run-next + /action/fb/queue/build|clear|run-next`);
  console.log(`n8n blog webhook: ${N8N_BLOG_WEBHOOK_URL}`);
  console.log(`fb backend: ${FB_BACKEND_URL}`);
  console.log(`State file: ${STATE_FILE}`);
});
