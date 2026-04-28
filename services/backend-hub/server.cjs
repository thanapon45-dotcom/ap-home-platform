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
const STATE_FILE = path.join(__dirname, "hub-state.json");

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
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, HUB_HOST, () => {
  const state = readState();
  writeState(state);
  console.log(`Backend Hub running at ${HUB_PUBLIC_BASE_URL}`);
  console.log(`n8n blog webhook: ${N8N_BLOG_WEBHOOK_URL}`);
  console.log(`fb backend: ${FB_BACKEND_URL}`);
  console.log(`State file: ${STATE_FILE}`);
});
