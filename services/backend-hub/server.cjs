const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 4000);
const HUB_HOST = process.env.HUB_HOST || "127.0.0.1";
const HUB_PUBLIC_BASE_URL = process.env.HUB_PUBLIC_BASE_URL || `http://${HUB_HOST}:${PORT}`;
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const N8N_BLOG_WEBHOOK_URL = process.env.N8N_BLOG_WEBHOOK_URL || "http://127.0.0.1:5678/webhook/blog-run";
const FB_BACKEND_URL = process.env.FB_BACKEND_URL || "http://127.0.0.1:3001";
const HUB_SECRET = process.env.HUB_SECRET || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_REST_KEY = SUPABASE_SERVICE_KEY || "";
const HUB_STATE_KEY = process.env.HUB_STATE_KEY || "default";
const WP_URL = process.env.WP_URL || "https://finnhouses.com";
const WP_USER = process.env.WP_USER || "";
const WP_APP_PASS = process.env.WP_APP_PASS || "";

// ── Supabase REST Helper ──────────────────────────────────────────────────────
async function supabaseInsert(table, payload) {
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) return { ok: false, error: "No Supabase credentials" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_REST_KEY,
        "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) return { ok: false, error: "No Supabase credentials" };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_REST_KEY,
        "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) return { ok: false, error: "No Supabase credentials" };
  const params = new URLSearchParams(match).toString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_REST_KEY,
        "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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

async function supabaseRequest(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) {
    return { ok: false, status: 0, data: null, error: "No Supabase credentials" };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_REST_KEY,
        Authorization: `Bearer ${SUPABASE_REST_KEY}`,
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data, text };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

function envEntry(name, value, required = false, description = "") {
  const configured = Boolean(String(value || "").trim());
  return {
    name,
    required,
    configured,
    missing: required && !configured,
    description,
  };
}

function getEnvValidation() {
  const entries = [
    envEntry("HUB_SECRET", HUB_SECRET, true, "Shared secret for Hub auth and webhook signatures"),
    envEntry("SUPABASE_URL", SUPABASE_URL, true, "Supabase REST API base URL"),
    envEntry("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY, true, "Service key for Hub state and DLQ access"),
    envEntry("DASHBOARD_ORIGIN", DASHBOARD_ORIGIN, true, "Allowed browser origin for Hub CORS"),
    envEntry("FB_BACKEND_URL", FB_BACKEND_URL, false, "Facebook publish backend"),
    envEntry("N8N_BLOG_WEBHOOK_URL", N8N_BLOG_WEBHOOK_URL, false, "Blog workflow trigger URL"),
    envEntry("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN, false, "Telegram alert transport"),
    envEntry("TELEGRAM_CHAT_ID", TELEGRAM_CHAT_ID, false, "Telegram alert destination"),
    envEntry("WP_USER", WP_USER, false, "WordPress upload/publish user"),
    envEntry("WP_APP_PASS", WP_APP_PASS, false, "WordPress application password"),
  ];
  return {
    ok: entries.filter(item => item.required).every(item => item.configured),
    entries,
    missing: entries.filter(item => item.missing).map(item => item.name),
    ready: entries.filter(item => item.required).every(item => item.configured),
    generatedAt: nowIso(),
  };
}

function createCorrelationId(req) {
  return String(req.headers["x-correlation-id"] || crypto.randomUUID());
}

function logEvent(level, message, details = {}) {
  const entry = {
    at: nowIso(),
    service: "backend-hub",
    level,
    message,
    ...details,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
  return entry;
}

async function getSupabaseDlq(limit = 25) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const result = await supabaseRequest(`hub_dlq?select=*&order=updated_at.desc&limit=${safeLimit}`);
  return result.ok ? (Array.isArray(result.data) ? result.data : []) : [];
}

async function recordDlq(entry) {
  const row = {
    service: "backend-hub",
    operation: String(entry.operation || "unknown"),
    route: String(entry.route || ""),
    target_url: String(entry.targetUrl || ""),
    method: String(entry.method || "POST"),
    status: "open",
    attempts: Number(entry.attempts || 1),
    correlation_id: String(entry.correlationId || ""),
    request_headers: entry.requestHeaders && typeof entry.requestHeaders === "object" ? entry.requestHeaders : {},
    request_body: entry.requestBody && typeof entry.requestBody === "object" ? entry.requestBody : {},
    error_message: String(entry.errorMessage || ""),
    last_attempt_at: nowIso(),
    next_retry_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const result = await supabaseInsert("hub_dlq", row);
  if (!result.ok) {
    logEvent("error", "DLQ insert failed", {
      correlationId: entry.correlationId || "",
      operation: row.operation,
      error: result.error || "unknown",
    });
  }
  return result;
}

async function retryDlqEntry(row, correlationId) {
  const requestHeaders = row.request_headers && typeof row.request_headers === "object" ? row.request_headers : {};
  const requestBody = row.request_body && typeof row.request_body === "object" ? row.request_body : {};
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...requestHeaders,
    "x-correlation-id": correlationId,
  };
  const method = String(row.method || "POST").toUpperCase();
  const init = {
    method,
    headers,
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(requestBody);
  }
  const response = await fetch(String(row.target_url || ""), init);
  const text = await response.text().catch(() => "");
  const update = {
    attempts: Number(row.attempts || 1) + 1,
    last_attempt_at: nowIso(),
    next_retry_at: nowIso(),
    updated_at: nowIso(),
  };
  if (response.ok) {
    update.status = "resolved";
    update.resolved_at = nowIso();
    update.error_message = "";
  } else {
    update.status = "open";
    update.error_message = text || `HTTP ${response.status}`;
  }
  await supabaseUpdate("hub_dlq", { id: `eq.${row.id}` }, update);
  return { ok: response.ok, status: response.status, body: text, update };
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "blog") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function timingSafeEq(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function hmacHex(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function signRunToken(runId) {
  if (!HUB_SECRET) return "";
  return hmacHex(`n8n:${runId}`, HUB_SECRET);
}

function signWebhookBody(payload, timestamp) {
  if (!HUB_SECRET) return "";
  const canonical = JSON.stringify({
    engine: String(payload.engine || ""),
    runId: String(payload.runId || ""),
    status: String(payload.status || ""),
    queue: Number(payload.queue || 0),
    drafts: Number(payload.drafts || 0),
    published: Number(payload.published || 0),
    failed: Number(payload.failed || 0),
    postUrl: String(payload.postUrl || ""),
    lastAction: String(payload.lastAction || ""),
    lastUpdate: String(payload.lastUpdate || ""),
    message: String(payload.message || ""),
  });
  return hmacHex(`${timestamp}.${canonical}`, HUB_SECRET);
}

function verifyWebhookSignature(payload, timestamp, signature) {
  if (!HUB_SECRET || !timestamp || !signature) return false;
  const issued = Number(timestamp);
  if (!Number.isFinite(issued)) return false;
  const ageMs = Math.abs(Date.now() - issued);
  if (ageMs > 10 * 60 * 1000) return false;
  const expected = signWebhookBody(payload, timestamp);
  return timingSafeEq(expected, signature);
}

function verifyRunToken(runId, token) {
  if (!HUB_SECRET || !runId || !token) return false;
  return timingSafeEq(signRunToken(runId), token);
}

function baseState() {
  return {
    system: {
      hubStatus: "idle",
      lastError: "",
      updatedAt: nowIso(),
      stateStore: "supabase:hub_state",
      stateKey: HUB_STATE_KEY,
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

let stateCache = null;

function stateCredentialsAvailable() {
  return Boolean(SUPABASE_URL && SUPABASE_REST_KEY);
}

async function readState() {
  if (!stateCredentialsAvailable()) {
    if (!stateCache) {
      stateCache = normalizeState({
        ...baseState(),
        system: {
          ...baseState().system,
          lastError: "Supabase credentials missing; using in-memory Hub state",
        },
      });
    }
    return normalizeState(stateCache);
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/hub_state?key=eq.${encodeURIComponent(HUB_STATE_KEY)}&select=value&limit=1`,
      {
        headers: {
          "apikey": SUPABASE_REST_KEY,
          "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase hub_state read failed: HTTP ${res.status}`);
    const rows = await res.json().catch(() => []);
    const state = normalizeState(rows?.[0]?.value || baseState());
    stateCache = state;
    return state;
  } catch (e) {
    console.error("[hub] readState Supabase error:", e.message);
    if (!stateCache) stateCache = baseState();
    stateCache.system.lastError = `Supabase hub_state read failed: ${e.message}`;
    stateCache.system.updatedAt = nowIso();
    return normalizeState(stateCache);
  }
}

async function writeState(state) {
  const next = normalizeState(state);
  next.system.updatedAt = nowIso();
  next.system.stateStore = "supabase:hub_state";
  next.system.stateKey = HUB_STATE_KEY;
  stateCache = next;

  if (!stateCredentialsAvailable()) {
    console.warn("[hub] Supabase credentials missing; Hub state persisted in memory only");
    return { ok: false, error: "No Supabase credentials" };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hub_state?on_conflict=key`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_REST_KEY,
        "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key: HUB_STATE_KEY,
        value: next,
        updated_at: nowIso(),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${text ? ` ${text}` : ""}`);
    }
    return { ok: true };
  } catch (e) {
    console.error("[hub] writeState Supabase error:", e.message);
    stateCache.system.lastError = `Supabase hub_state write failed: ${e.message}`;
    stateCache.system.updatedAt = nowIso();
    return { ok: false, error: e.message };
  }
}

function pushHistory(state, entry) {
  state.history.unshift({
    id: crypto.randomUUID(),
    at: nowIso(),
    ...entry,
  });
  state.history = state.history.slice(0, 100);
}

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, retries = 2, delayMs = 4000, label = "", dlqMeta = null) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries) {
        if (dlqMeta) {
          await recordDlq({
            ...dlqMeta,
            attempts: retries + 1,
            errorMessage: err.message,
          });
        }
        throw err;
      }
      logEvent("warn", "retrying operation", {
        label,
        attempt: i + 1,
        retries,
        error: err.message,
        correlationId: dlqMeta?.correlationId || "",
      });
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function checkUrlHealth(url, timeoutMs = 2500) {
  if (!url) return { ok: false, configured: false, status: "missing" };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return {
      ok: response.ok,
      configured: true,
      status: response.ok ? "ok" : `http_${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      status: error.message || "unreachable",
    };
  }
}

async function checkSupabaseHealth() {
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) {
    return { ok: false, configured: false, status: "missing" };
  }
  const result = await supabaseRequest(`hub_state?select=key&limit=1`);
  return {
    ok: result.ok,
    configured: true,
    status: result.ok ? "ok" : `http_${result.status || 0}`,
  };
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
  const allowedOrigins = new Set([
    DASHBOARD_ORIGIN,
    `https://${new URL(DASHBOARD_ORIGIN).hostname}`,
  ]);
  const origin = req.headers.origin || "";
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Hub-Token, X-Webhook-Signature, X-Webhook-Timestamp");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  const correlationId = createCorrelationId(req);
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  const startedAt = Date.now();
  res.on("finish", () => {
    logEvent("info", "request_complete", {
      correlationId,
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (req.path.startsWith("/health")) return next();
  if (req.path === "/webhook/n8n" || req.path === "/webhook/fb") return next();

  if (!HUB_SECRET) {
    return res.status(500).json({ ok: false, error: "HUB_SECRET not configured" });
  }

  const token = String(req.headers["x-hub-token"] || "");
  if (!timingSafeEq(token, HUB_SECRET)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  next();
});

app.get("/api/state", async (req, res) => {
  res.json(await readState());
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "backend-hub",
    time: nowIso(),
    uptimeMs: Math.round(process.uptime() * 1000),
    correlationId: req.correlationId,
  });
});

app.get("/health/live", (req, res) => {
  res.json({
    ok: true,
    service: "backend-hub",
    live: true,
    time: nowIso(),
    correlationId: req.correlationId,
  });
});

app.get("/health/config", (req, res) => {
  const validation = getEnvValidation();
  res.status(validation.ok ? 200 : 500).json({
    ok: validation.ok,
    service: "backend-hub",
    validation,
    correlationId: req.correlationId,
  });
});

app.get("/health/ready", async (req, res) => {
  const [supabase, fbBackend] = await Promise.all([
    checkSupabaseHealth(),
    checkUrlHealth(`${FB_BACKEND_URL}/health`, 2500),
  ]);
  const validation = getEnvValidation();
  const ok = validation.ok && supabase.ok && fbBackend.ok;
  res.status(ok ? 200 : 503).json({
    ok,
    service: "backend-hub",
    ready: ok,
    correlationId: req.correlationId,
    validation,
    checks: {
      supabase,
      fbBackend,
    },
  });
});

app.get("/api/ops/summary", async (req, res) => {
  const [state, validation, supabase, fbBackend, dlq] = await Promise.all([
    readState(),
    Promise.resolve(getEnvValidation()),
    checkSupabaseHealth(),
    checkUrlHealth(`${FB_BACKEND_URL}/health`, 2500),
    getSupabaseDlq(25),
  ]);
  res.json({
    ok: true,
    service: "backend-hub",
    generatedAt: nowIso(),
    correlationId: req.correlationId,
    validation,
    checks: {
      supabase,
      fbBackend,
    },
    state: {
      system: state.system,
      blog: state.blog,
      fb: state.fb,
    },
    dlq: {
      total: dlq.length,
      items: dlq,
    },
  });
});

app.get("/api/ops/dlq", async (req, res) => {
  const limit = Number(req.query.limit || 25);
  const items = await getSupabaseDlq(limit);
  res.json({ ok: true, correlationId: req.correlationId, items });
});

app.post("/api/ops/dlq/:id/retry", async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) {
    return res.status(400).json({ ok: false, error: "id is required" });
  }
  const result = await supabaseRequest(`hub_dlq?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const row = Array.isArray(result.data) ? result.data[0] : null;
  if (!row) {
    return res.status(404).json({ ok: false, error: "DLQ entry not found" });
  }
  if (!row.target_url) {
    return res.status(400).json({ ok: false, error: "DLQ entry missing target_url" });
  }
  const retryResult = await retryDlqEntry(row, req.correlationId);
  logEvent(retryResult.ok ? "info" : "warn", "dlq_retry", {
    correlationId: req.correlationId,
    dlqId: id,
    status: retryResult.status,
    targetUrl: row.target_url,
  });
  res.status(retryResult.ok ? 200 : 502).json({
    ok: retryResult.ok,
    correlationId: req.correlationId,
    dlqId: id,
    result: retryResult,
  });
});

app.post("/action/blog/reset", async (req, res) => {
  const state = await readState();
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
  await writeState(state);
  res.json({ ok: true });
});

app.post("/action/blog/run", async (req, res) => {
  const state = await readState();
  const keyword = String(req.body.keyword || "").trim();
  const category = Number(req.body.category || 13);
  const slot = String(req.body.slot || "morning");
  const visual_hint = String(req.body.visual_hint || "contemporary");

  if (!keyword) {
    return res.status(400).json({ ok: false, error: "keyword is required" });
  }

  const runId = makeId("blog");
  const callbackToken = signRunToken(runId);
  const callbackUrl = `${HUB_PUBLIC_BASE_URL}/webhook/n8n?token=${encodeURIComponent(callbackToken)}`;
  const correlationId = req.correlationId;

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
  await writeState(state);

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
    headers: {
      "Content-Type": "application/json",
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify(payload),
  }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      const errMsg = `n8n webhook returned HTTP ${r.status}${text ? `: ${text}` : ""}`;
      console.error("[hub] n8n trigger failed:", errMsg);
      await recordDlq({
        operation: "blog.dispatch",
        route: "/action/blog/run",
        targetUrl: N8N_BLOG_WEBHOOK_URL,
        method: "POST",
        requestHeaders: { "Content-Type": "application/json", "x-correlation-id": correlationId },
        requestBody: payload,
        correlationId,
        errorMessage: errMsg,
        attempts: 1,
      });
      const s = await readState();
      s.blog.status = "failed";
      s.blog.failed = 1;
      s.blog.message = errMsg;
      s.blog.finishedAt = nowIso();
      s.blog.updatedAt = nowIso();
      s.system.lastError = errMsg;
      pushHistory(s, { type: "blog_run_failed_at_dispatch", engine: "blog", runId, keyword, status: "failed", message: errMsg });
      await writeState(s);
      sendTelegram(formatBlogMessage(s.blog)).catch(() => {});
    } else {
      console.log("[hub] n8n triggered OK — runId:", runId);
    }
  }).catch(async (err) => {
    console.error("[hub] n8n fetch error:", err.message);
    await recordDlq({
      operation: "blog.dispatch",
      route: "/action/blog/run",
      targetUrl: N8N_BLOG_WEBHOOK_URL,
      method: "POST",
      requestHeaders: { "Content-Type": "application/json", "x-correlation-id": correlationId },
      requestBody: payload,
      correlationId,
      errorMessage: err.message,
      attempts: 1,
    });
    const s = await readState();
    s.blog.status = "failed";
    s.blog.failed = 1;
    s.blog.message = `n8n unreachable: ${err.message}`;
    s.blog.finishedAt = nowIso();
    s.blog.updatedAt = nowIso();
    s.system.lastError = err.message;
    pushHistory(s, { type: "blog_run_failed_at_dispatch", engine: "blog", runId, keyword, status: "failed", message: err.message });
    await writeState(s);
    sendTelegram(formatBlogMessage(s.blog)).catch(() => {});
  });
});

app.post("/webhook/n8n", async (req, res) => {
  const token = String(req.query.token || "");
  const runIdForToken = String(req.body?.runId || "");
  if (!verifyRunToken(runIdForToken, token)) {
    return res.status(401).json({ ok: false, error: "Invalid webhook token" });
  }

  const state = await readState();
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
  await writeState(state);

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
    await writeState(state);
  } catch (error) {
    state.system.lastError = error.message;
    await writeState(state);
  }

  res.json({ ok: true });
});

// ── WF2 Image-done callback ───────────────────────────────────────────────────
app.post("/webhook/image-done", async (req, res) => {
  const state = await readState();
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
  await writeState(state);

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

app.post("/webhook/fb", async (req, res) => {
  const payload = req.body || {};
  const signature = String(req.headers["x-webhook-signature"] || "");
  const timestamp = String(req.headers["x-webhook-timestamp"] || "");
  if (!verifyWebhookSignature(payload, timestamp, signature)) {
    return res.status(401).json({ ok: false, error: "Invalid webhook signature" });
  }

  const state = await readState();
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
  await writeState(state);
  res.json({ ok: true });
});

app.post("/action/fb/publish", async (req, res) => {
  const state = await readState();
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
  await writeState(state);

  try {
    const { bodyText } = await withRetry(async () => {
      const response = await fetch(`${FB_BACKEND_URL}/api/fb/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-hub-token": HUB_SECRET,
          "x-correlation-id": req.correlationId,
        },
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
      return { bodyText };
    }, 2, 4000, "fb-publish", {
      operation: "fb.publish.dispatch",
      route: "/action/fb/publish",
      targetUrl: `${FB_BACKEND_URL}/api/fb/publish`,
      method: "POST",
      requestHeaders: {
        "Content-Type": "application/json; charset=utf-8",
        "x-hub-token": HUB_SECRET,
      },
      requestBody: {
        runId,
        source: req.body.source || "dashboard-react",
        content,
      },
      correlationId: req.correlationId,
    });

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
    await writeState(state);
    sendTelegram(`❌ FB Publish Error\n${error.message}\nrunId: ${runId}`).catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── FB Queue endpoints ────────────────────────────────────────────────────────

app.post("/action/fb/queue/build", async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items array required" });
  }
  const state = await readState();
  state.fb_queue = items.map(item => ({
    id: String(item.id || crypto.randomUUID()),
    date: String(item.date || ""),
    content: String(item.content || ""),
    status: "pending",
    postUrl: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  await writeState(state);
  res.json({ ok: true, count: state.fb_queue.length, queue: state.fb_queue });
});

app.post("/action/fb/queue/clear", async (req, res) => {
  const state = await readState();
  state.fb_queue = [];
  await writeState(state);
  res.json({ ok: true });
});

app.post("/action/fb/queue/run-next", async (req, res) => {
  const state = await readState();
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
  await writeState(state);

  try {
    const { fbBody } = await withRetry(async () => {
      const response = await fetch(`${FB_BACKEND_URL}/api/fb/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-hub-token": HUB_SECRET,
          "x-correlation-id": req.correlationId,
        },
        body: JSON.stringify({ runId, source: "fb-queue", content: nextItem.content }),
      });
      const fbBody = await response.text();
      if (!response.ok) {
        throw new Error(`fb-backend returned HTTP ${response.status}${fbBody ? ` ${fbBody}` : ""}`);
      }
      return { fbBody };
    }, 2, 4000, "fb-queue-run-next", {
      operation: "fb.queue.run-next",
      route: "/action/fb/queue/run-next",
      targetUrl: `${FB_BACKEND_URL}/api/fb/publish`,
      method: "POST",
      requestHeaders: {
        "Content-Type": "application/json; charset=utf-8",
        "x-hub-token": HUB_SECRET,
      },
      requestBody: { runId, source: "fb-queue", content: nextItem.content },
      correlationId: req.correlationId,
    });

    // Write fb_post_id back to Supabase content_posts
    let fbPostId = null;
    try { fbPostId = JSON.parse(fbBody || "{}").postId || null; } catch {}
    if (fbPostId) {
      supabaseInsert("content_posts", {
        content_id: runId,
        fb_post_id: fbPostId,
        source_channel: "fb_queue",
        published_at: nowIso(),
      }).catch(() => {});
    }

    const s = await readState();
    const qi = s.fb_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "published"; qi.postUrl = fbPostId ? `https://www.facebook.com/${fbPostId.replace("_", "/posts/")}` : ""; qi.updatedAt = nowIso(); }
    s.fb = { ...s.fb, runId, status: "published", published: (s.fb.published || 0) + 1,
      message: "FB Queue post published", lastUpdate: nowIso(), finishedAt: nowIso(), updatedAt: nowIso() };
    pushHistory(s, { type: "fb_queue_item_published", engine: "fb", runId, status: "published",
      message: `FB Queue: ${nextItem.date} published` });
    await writeState(s);
    res.json({ ok: true, runId, fbPostId, item: nextItem });
  } catch (error) {
    const s = await readState();
    const qi = s.fb_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
    s.fb = { ...s.fb, runId, status: "failed", failed: (s.fb.failed || 0) + 1,
      message: error.message, lastUpdate: nowIso(), finishedAt: nowIso(), updatedAt: nowIso() };
    s.system.lastError = error.message;
    pushHistory(s, { type: "fb_queue_item_failed", engine: "fb", runId, status: "failed",
      message: error.message });
    await writeState(s);
    sendTelegram(`❌ FB Queue Error\n${error.message}\nrunId: ${runId}`).catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Content Queue endpoints ───────────────────────────────────────────────────

app.post("/action/blog/queue/build", async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items array required" });
  }
  const state = await readState();
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
  await writeState(state);
  res.json({ ok: true, count: state.content_queue.length, queue: state.content_queue });
});

app.post("/action/blog/queue/clear", async (req, res) => {
  const state = await readState();
  state.content_queue = [];
  await writeState(state);
  res.json({ ok: true });
});

app.post("/action/blog/queue/run-next", async (req, res) => {
  const state = await readState();
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
  const callbackToken = signRunToken(runId);
  const callbackUrl = `${HUB_PUBLIC_BASE_URL}/webhook/n8n?token=${encodeURIComponent(callbackToken)}`;

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
  await writeState(state);

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
      const s = await readState();
      const qi = s.content_queue?.find(i => i.id === nextItem.id);
      if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
      s.blog.status = "failed"; s.blog.failed = 1;
      s.blog.message = errMsg; s.blog.finishedAt = nowIso(); s.blog.updatedAt = nowIso();
      s.system.lastError = errMsg;
      await writeState(s);
      sendTelegram(`❌ Blog Queue Error\nn8n ตอบ ${r.status}\n${errMsg}`).catch(() => {});
    } else {
      console.log("[hub] queue run-next n8n OK — runId:", runId);
    }
  }).catch(async (err) => {
    const s = await readState();
    const qi = s.content_queue?.find(i => i.id === nextItem.id);
    if (qi) { qi.status = "failed"; qi.updatedAt = nowIso(); }
    s.blog.status = "failed"; s.blog.message = `n8n unreachable: ${err.message}`;
    s.blog.finishedAt = nowIso(); s.blog.updatedAt = nowIso();
    s.system.lastError = err.message;
    await writeState(s);
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
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) {
    return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  }
  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?status=eq.pending_review&order=listed_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_REST_KEY,
          "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${supabase_id}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_REST_KEY,
          "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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
  if (!SUPABASE_URL || !SUPABASE_REST_KEY) {
    return res.status(500).json({ ok: false, error: "No Supabase credentials" });
  }
  try {
    // 1. Find latest pending_review property for this LINE user (within 48h)
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?line_user_id=eq.${encodeURIComponent(line_user_id)}&status=eq.pending_review&listed_at=gte.${since}&order=listed_at.desc&limit=1`,
      { headers: { "apikey": SUPABASE_REST_KEY, "Authorization": `Bearer ${SUPABASE_REST_KEY}` } }
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
        "apikey": SUPABASE_REST_KEY,
        "Authorization": `Bearer ${SUPABASE_REST_KEY}`,
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

// ══════════════════════════════════════════════════════════════════════════════
// QC LINE SYSTEM — /api/qc/*
// ══════════════════════════════════════════════════════════════════════════════

const QC_DAILY_BUDGET_THB = Number(process.env.QC_DAILY_BUDGET_THB || 300);
const QC_THB_PER_1K_IN    = Number(process.env.QC_THB_PER_1K_IN    || 0.18);
const QC_THB_PER_1K_OUT   = Number(process.env.QC_THB_PER_1K_OUT   || 0.54);

const QC_SYSTEM_PROMPT = `คุณคือ QC Inspector ตรวจคุณภาพงานช่างก่อสร้างและรีโนเวทในประเทศไทย สำหรับบริษัทรับสร้างบ้าน Finnhouses มีประสบการณ์ 20 ปีในงานก่อสร้างบ้านพักอาศัยไทย

วัตถุประสงค์: ตรวจคุณภาพงานช่าง (workmanship quality) ของงานที่ทำอยู่หรือทำเสร็จแล้ว
ไม่ใช่: ประเมินความปลอดภัยส่วนตัวของคนงาน (ห้ามรายงาน PPE หรือ safety equipment ของคนงาน)

หมวดงานที่ตรวจ:
- concrete     งานคอนกรีต (ดูกติกาพิเศษด้านล่าง)
- plaster      งานก่อฉาบ: ความเรียบ, มุมฉาก, ระดับ, รอยร้าวเส้นผม, การยึดเกาะ
- level        งานเส้น/Line Level: ความได้ระดับ, ความฉาก, alignment ผนัง/พื้น/เพดาน
- electrical   งานระบบไฟฟ้า: การเดินสาย, กล่อง, ช่องเดินสาย, socket/switch box ฝัง
- plumbing     งานระบบน้ำ: ท่อ, ข้อต่อ, การฝัง, slope ระบายน้ำ, จุดรั่วซึม
- paint        งานสี: ความสม่ำเสมอ, ไม่มีรอยแปรง/ลูกกลิ้ง, ความสะอาดขอบ, ตกหล่น
- finishing    งานFinishing: ประตู/หน้าต่าง, กระเบื้อง, ฝ้า, ความเรียบร้อยงานสุดท้าย
- structure    โครงสร้าง: เสา, คาน, ผนัง, การเสริมเหล็ก, ระยะ cover block
- cleanliness  ความสะอาดหน้างาน: วัสดุเศษ, ความเป็นระเบียบ
- other        งานอื่นที่ไม่ตรงหมวดข้างต้น

=== กติกาพิเศษงานคอนกรีต ===
แบ่งเป็น 2 ประเภท — ต้องแยกให้ถูกต้องก่อนประเมิน:

A) คอนกรีตโครงสร้าง (ฐานราก/ฟุตติ้ง/เสา/คานใต้ดิน/ส่วนที่ฝังดิน):
   ✅ ปกติ — ห้ามฟ้องเป็น defect:
   - ผิวขรุขระจากแบบไม้ (form texture) = ปกติ 100% สำหรับงานใต้ดิน
   - รอยต่อแบบหล่อ (form joint lines) = ปกติ
   - สีเทาอ่อนไม่สม่ำเสมอ = ปกติสำหรับคอนกรีตหล่อใหม่
   - ฝุ่น/ดินบนผิวงาน = ปกติในไซต์ก่อสร้าง
   - เหล็กมีสนิมออกไซด์แดงเล็กน้อย = ปกติ ไม่กระทบกำลัง
   ❌ Defect จริงที่ต้องรายงาน (เท่านั้น):
   - Honeycombing ชัดเจน (ช่องอากาศ ≥ 1 ซม. ในเนื้อคอนกรีต)
   - รอยแตกร้าวขวางหน้าตัด (ไม่ใช่รอยผิวหรือรอยหดตัว)
   - คอนกรีตหลุดร่อนเป็นชิ้นขนาดใหญ่ เผยให้เห็นเหล็ก
   - โครงสร้างเอียงหรือผิดรูปอย่างเห็นได้ชัด
   - เหล็กเสริมมีระยะ cover ไม่ถึง 2.5 ซม.

B) คอนกรีตผิวจราจร/พื้นบ้าน (ที่ต้องการผิวเรียบ):
   ❌ Defect: ผิวขรุขระผิดปกติ, รอยแตกร้าวข้ามหน้าตัด, การยุบตัว

C) ก่อนเทคอนกรีต (Pre-pour — เห็นเหล็กเสริมและแบบหล่อ):
   ตรวจ: ระยะห่างเหล็กสม่ำเสมอ, มี cover block รองรับ, แบบหล่อแน่น, ไม่มีเศษวัสดุในแบบ
   ✅ ปกติ: เหล็กมีสนิมเล็กน้อย, แบบไม้เก่าใช้ซ้ำ, ดินรอบหลุมขุด

ระดับ severity: none | low | medium | high | critical

กติกาทั่วไป:
1. ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON
2. โฟกัสที่คุณภาพงานช่าง ไม่ใช่ความปลอดภัยส่วนตัวคนงาน
3. ถ้ารูปไม่ใช่งานก่อสร้าง/รีโนเวท ให้ pass=true severity=none defects=[] ai_summary="รูปไม่ใช่หน้างาน"
4. defects เรียงจากสำคัญสุดลงมา สูงสุด 5 รายการ
5. description ให้ specific: เช่น "รอยร้าวลายแตกที่มุมขวาบนฝ้า ยาว ~20 ซม." ไม่ใช่ "มีรอยร้าว"
6. suggested_action ต้องทำได้จริง: เช่น "ฉาบ skim coat ปาดเรียบ ทาสีทับ"
7. ถ้า defect severity เป็น high หรือ critical อย่างน้อย 1 รายการ → pass=false
8. ให้ประโยชน์ของข้อสงสัยแก่งานที่อยู่ระหว่างก่อสร้าง — ถ้าไม่แน่ใจว่า defect จริง ให้เป็นปกติ

Schema ที่ต้องตอบ:
{"pass":boolean,"severity":"none|low|medium|high|critical","confidence":0.0-1.0,"ai_summary":"1-2 ประโยคภาษาไทย สรุปคุณภาพงาน","defects":[{"category":"concrete","description":"...","severity":"...","location_hint":"...","suggested_action":"..."}]}`;

function qcExtractSiteCode(caption = "") {
  const m = caption.match(/\b[A-Z]{2,4}-\d{2,4}\b/);
  return m ? m[0] : null;
}

async function qcResolveSite(caption, lineUserId) {
  const code = qcExtractSiteCode(caption || "");
  if (code) {
    const r = await supabaseRequest(`sites?code=eq.${encodeURIComponent(code)}&select=id,code,stage&limit=1`);
    if (r.ok && r.data?.[0]) return r.data[0];
  }
  if (lineUserId) {
    const r = await supabaseRequest(`line_users?line_id=eq.${encodeURIComponent(lineUserId)}&select=default_site_id&limit=1`);
    const siteId = r.data?.[0]?.default_site_id;
    if (siteId) {
      const s = await supabaseRequest(`sites?id=eq.${siteId}&select=id,code,stage&limit=1`);
      if (s.ok && s.data?.[0]) return s.data[0];
    }
  }
  return null;
}

// Resolve the current active Deal through the operational Site.
// This is intentionally conservative: if more than one non-closed deal shares
// the site, leave deal_id null rather than guessing.
async function qcResolveDeal(siteId) {
  if (!siteId) return null;
  const r = await supabaseRequest(
    `reno_deals?site_id=eq.${encodeURIComponent(siteId)}&stage=neq.closed&select=id,name,stage&order=updated_at.desc&limit=2`
  );
  if (!r.ok || !Array.isArray(r.data) || r.data.length !== 1) return null;
  return r.data[0];
}

async function qcUpsertLineUser(lineUserId) {
  if (!lineUserId) return;
  await supabaseUpsert("line_users", { line_id: lineUserId, last_seen_at: new Date().toISOString() }, "line_id");
}

async function qcFindExisting(lineMessageId) {
  const r = await supabaseRequest(`qc_inspections?line_message_id=eq.${encodeURIComponent(lineMessageId)}&select=id,pass,severity,ai_summary,confidence&limit=1`);
  return r.data?.[0] || null;
}

async function qcGetDailyUsage() {
  const day = new Date().toISOString().slice(0, 10);
  const r = await supabaseRequest(`qc_daily_usage?day=eq.${day}&limit=1`);
  return r.data?.[0] || { inspections: 0, est_cost_thb: 0 };
}

async function qcBumpDailyUsage(tokensIn, tokensOut, costThb) {
  const day = new Date().toISOString().slice(0, 10);
  const cur = await qcGetDailyUsage();
  await supabaseUpsert("qc_daily_usage", {
    day,
    inspections:  (cur.inspections   || 0) + 1,
    ai_tokens_in: (cur.ai_tokens_in  || 0) + tokensIn,
    ai_tokens_out:(cur.ai_tokens_out || 0) + tokensOut,
    est_cost_thb: Number(cur.est_cost_thb || 0) + costThb
  }, "day");
}

// ── QC Standards cache (lazy-loaded) ──────────────────────────────────────
let _qcStandardsCache = null;
let _qcStandardsCacheAt = 0;
async function qcGetStandards() {
  // Refresh cache every 10 minutes
  if (_qcStandardsCache && Date.now() - _qcStandardsCacheAt < 600_000) return _qcStandardsCache;
  const r = await supabaseRequest("qc_standards?active=eq.true&select=category,label_th,photo_url,description");
  _qcStandardsCache = (r.ok && Array.isArray(r.data)) ? r.data : [];
  _qcStandardsCacheAt = Date.now();
  return _qcStandardsCache;
}

// Guess category from caption keywords (Thai + English)
function qcGuessCategory(caption = "") {
  const t = caption.toLowerCase();
  if (/ฉาบ|plaster|ก่อ/.test(t))          return "plaster";
  if (/คอนกรีต|concrete|เท|เสา|คาน/.test(t)) return "concrete";
  if (/สี|paint/.test(t))                  return "paint";
  if (/ระดับ|level|เส้น|mark/.test(t))     return "level";
  if (/ไฟ|สาย|electric/.test(t))           return "electrical";
  if (/น้ำ|ท่อ|plumb/.test(t))             return "plumbing";
  if (/finish|ประตู|หน้าต่าง|กระเบื้อง/.test(t)) return "finishing";
  return null; // unknown → pass all references
}

async function qcCallOpenAI({ photoUrl, caption, stage, siteCode }) {
  // Fetch reference standards
  const standards   = await qcGetStandards();
  const guessed     = qcGuessCategory(caption);
  const refs        = guessed
    ? standards.filter(s => s.category === guessed)
    : standards; // pass all if unknown

  // Build system prompt — add comparison instruction if references exist
  const hasRefs = refs.length > 0;
  const systemPrompt = hasRefs
    ? QC_SYSTEM_PROMPT + `\n\nโหมด: เปรียบเทียบกับภาพมาตรฐาน
คุณจะได้รับภาพมาตรฐาน (reference) ก่อน แล้วตามด้วยภาพงานจริงที่ต้องตรวจ
ให้ระบุว่างานตรงกับมาตรฐานมากน้อยแค่ไหน และอธิบายความแตกต่างที่เห็นเป็น defects`
    : QC_SYSTEM_PROMPT;

  // Build user message content
  const userContent = [];

  // Add reference images first
  if (hasRefs) {
    refs.forEach(ref => {
      userContent.push({ type: "text", text: `📐 ภาพมาตรฐาน${ref.label_th ? ` (${ref.label_th})` : ""}: ${ref.description || ""}` });
      userContent.push({ type: "image_url", image_url: { url: ref.photo_url, detail: "low" } });
    });
    userContent.push({ type: "text", text: "─────────────────────" });
  }

  // Add submitted photo
  const contextText = [
    siteCode ? `Site: ${siteCode}` : "",
    stage    ? `Stage: ${stage}`   : "",
    caption  ? `Caption: ${caption}` : "",
    hasRefs
      ? "🔍 ภาพงานที่ต้องตรวจ — เปรียบเทียบกับมาตรฐานข้างต้นและตอบ JSON"
      : "โปรดตรวจรูปนี้และตอบ JSON ตาม schema"
  ].filter(Boolean).join("\n");
  userContent.push({ type: "text",      text: contextText });
  userContent.push({ type: "image_url", image_url: { url: photoUrl, detail: "high" } });

  const body = {
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent }
    ]
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

  const data  = await res.json();
  const raw   = data.choices?.[0]?.message?.content || "{}";
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`AI non-JSON: ${raw.slice(0, 200)}`); }

  parsed.pass       = !!parsed.pass;
  parsed.severity   = parsed.severity   || "none";
  parsed.confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
  parsed.ai_summary = parsed.ai_summary || "";
  parsed.defects    = Array.isArray(parsed.defects) ? parsed.defects.slice(0, 5) : [];

  return { ...parsed, _model: body.model, _raw: data,
    _tokens_in:  data.usage?.prompt_tokens     || 0,
    _tokens_out: data.usage?.completion_tokens || 0 };
}

// ── POST /api/qc/ingest ────────────────────────────────────────────────────
app.post("/api/qc/ingest", async (req, res) => {
  if (!HUB_SECRET || !timingSafeEq(req.headers["x-hub-token"] || "", HUB_SECRET))
    return res.status(401).json({ error: "unauthorized" });

  const started = Date.now();
  const { line_message_id, line_user_id, photo_url, caption } = req.body || {};
  if (!line_message_id || !photo_url)
    return res.status(400).json({ error: "line_message_id and photo_url required" });

  const existing = await qcFindExisting(line_message_id);
  if (existing) return res.json({ inspection_id: existing.id, duplicate: true, ...existing });

  const usage = await qcGetDailyUsage();
  if (Number(usage.est_cost_thb || 0) >= QC_DAILY_BUDGET_THB)
    return res.status(429).json({ error: "daily_budget_exceeded", usage });

  await qcUpsertLineUser(line_user_id);
  const site = await qcResolveSite(caption, line_user_id);
  const deal = await qcResolveDeal(site?.id);

  const ins = await supabaseInsert("qc_inspections", {
    line_message_id, line_user_id, photo_url,
    caption: caption || null,
    site_id: site?.id || null,
    deal_id: deal?.id || null,
    status: "processing"
  });
  if (!ins.ok) return res.status(500).json({ error: "db_error", detail: ins.error });
  const inspection = ins.data?.[0];

  let ai;
  try {
    ai = await qcCallOpenAI({ photoUrl: photo_url, caption, stage: site?.stage, siteCode: site?.code });
  } catch (err) {
    await supabaseUpdate("qc_inspections", { id: `eq.${inspection.id}` }, {
      status: "failed", error_message: String(err.message).slice(0, 500),
      latency_ms: Date.now() - started
    });
    return res.status(502).json({ error: "ai_failed", inspection_id: inspection.id, detail: String(err.message) });
  }

  await supabaseUpdate("qc_inspections", { id: `eq.${inspection.id}` }, {
    ai_summary: ai.ai_summary, pass: ai.pass, severity: ai.severity,
    confidence: ai.confidence, defects_json: ai.defects,
    ai_model: ai._model, ai_raw: ai._raw, status: "done",
    latency_ms: Date.now() - started
  });

  if (ai.defects.length) {
    const defectRows = ai.defects.map(d => ({
      inspection_id: inspection.id, category: d.category || "other",
      description: d.description || "", severity: d.severity || "low",
      location_hint: d.location_hint || null, suggested_action: d.suggested_action || null
    }));
    await supabaseInsert("qc_defects", defectRows);
  }

  const costThb = (ai._tokens_in / 1000) * QC_THB_PER_1K_IN + (ai._tokens_out / 1000) * QC_THB_PER_1K_OUT;
  await qcBumpDailyUsage(ai._tokens_in, ai._tokens_out, costThb);

  sendTelegram(
    `🏗️ QC ${ai.pass ? "✅ ผ่าน" : "❌ ไม่ผ่าน"} [${site?.code || "?"}]\n` +
    `Severity: ${ai.severity} | ${ai.defects.length} defect(s)\n${ai.ai_summary}`
  ).catch(() => {});

  res.json({
    inspection_id: inspection.id,
    site_code: site?.code || null,
    deal_id: deal?.id || null,
    pass: ai.pass, severity: ai.severity, confidence: ai.confidence,
    ai_summary: ai.ai_summary, defects: ai.defects,
    latency_ms: Date.now() - started
  });
});

// ── POST /api/qc/feedback ──────────────────────────────────────────────────
// Records whether a human confirmed the AI's QC verdict was correct.
// Called by n8n's wf_qc_line workflow when the inspector taps the
// "✅ ตรง" / "❌ ไม่ตรง" Quick Reply button in LINE.
app.post("/api/qc/feedback", async (req, res) => {
  if (!HUB_SECRET || !timingSafeEq(req.headers["x-hub-token"] || "", HUB_SECRET))
    return res.status(401).json({ error: "unauthorized" });

  const { line_message_id, feedback } = req.body || {};
  if (!line_message_id || !["correct", "incorrect"].includes(feedback))
    return res.status(400).json({ error: "line_message_id and feedback (correct|incorrect) required" });

  const existing = await qcFindExisting(line_message_id);
  if (!existing) return res.status(404).json({ error: "inspection_not_found" });

  const upd = await supabaseUpdate("qc_inspections", { id: `eq.${existing.id}` }, {
    human_feedback: feedback,
    human_feedback_at: new Date().toISOString()
  });
  if (!upd.ok) return res.status(500).json({ error: "db_error", detail: upd.error });

  res.json({ ok: true, inspection_id: existing.id, feedback });
});

// ── GET /api/qc/list ───────────────────────────────────────────────────────
app.get("/api/qc/list", async (req, res) => {
  if (!HUB_SECRET || !timingSafeEq(req.headers["x-hub-token"] || "", HUB_SECRET))
    return res.status(401).json({ error: "unauthorized" });

  const { site_id, from, to, limit } = req.query;
  const lim = Math.min(Number(limit) || 50, 500);
  let path = `qc_inspections_view?order=created_at.desc&limit=${lim}`;
  if (site_id) path += `&site_id=eq.${encodeURIComponent(site_id)}`;
  if (from)    path += `&created_at=gte.${encodeURIComponent(from)}`;
  if (to)      path += `&created_at=lte.${encodeURIComponent(to)}`;

  const r = await supabaseRequest(path);
  if (!r.ok) return res.status(500).json({ error: "db_error" });
  res.json({ items: r.data || [] });
});

// ── POST /api/qc/log-latency ───────────────────────────────────────────────
app.post("/api/qc/log-latency", async (req, res) => {
  if (!HUB_SECRET || !timingSafeEq(req.headers["x-hub-token"] || "", HUB_SECRET))
    return res.status(401).json({ error: "unauthorized" });

  const { line_message_id, total_ms } = req.body || {};
  if (!line_message_id) return res.status(400).json({ error: "missing" });
  const existing = await qcFindExisting(line_message_id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  await supabaseUpdate("qc_inspections", { id: `eq.${existing.id}` }, { latency_ms: total_ms });
  res.json({ ok: true });
});

// ── GET /api/qc/health ─────────────────────────────────────────────────────
app.get("/api/qc/health", (_req, res) => res.json({ ok: true, service: "qc" }));

// ══════════════════════════════════════════════════════════════════════════════
// ── ACTIVE HEALTH MONITOR ──────────────────────────────────────────────────
// Runs every 30 min, sends Telegram alert when issues detected
// ──────────────────────────────────────────────────────────────────────────

const HEALTH_INTERVAL_MS = 30 * 60 * 1000;  // 30 minutes
const BLOG_STUCK_MS      = 45 * 60 * 1000;  // 45 minutes = blog considered stuck
let _lastAlertHash = "";                      // dedupe consecutive alerts

async function runHealthMonitor() {
  try {
    const issues = [];

    // 1. Supabase connectivity
    const sb = await checkSupabaseHealth();
    if (!sb.ok) issues.push(`🔴 Supabase: ${sb.status}`);

    // 2. FB Backend reachability
    const fb = await checkUrlHealth(`${FB_BACKEND_URL}/health`, 3000);
    if (!fb.ok) issues.push(`🔴 FB Backend: ${fb.status}`);

    // 3. Blog Runner stuck (status=running too long)
    const state = await readState();
    if (state.blog?.status === "running" && state.blog?.startedAt) {
      const stuckMs = Date.now() - new Date(state.blog.startedAt).getTime();
      if (stuckMs > BLOG_STUCK_MS) {
        const staleRunId = String(state.blog.runId || "");
        const staleKeyword = String(state.blog.keyword || "");
        const stuckMinutes = Math.round(stuckMs / 60000);
        const errMsg = `Blog Runner auto-failed after ${stuckMinutes} minutes without terminal callback`;

        // Fail closed: a workflow/runtime error must never leave the Hub in "running" forever.
        // Only mutate the same run we just observed, so a newer run cannot be clobbered.
        const latest = await readState();
        if (latest.blog?.status === "running" && String(latest.blog?.runId || "") === staleRunId) {
          if (Array.isArray(latest.content_queue)) {
            const qi = latest.content_queue.find(i => i.runId === staleRunId && i.status === "running");
            if (qi) {
              qi.status = "failed";
              qi.updatedAt = nowIso();
            }
          }
          latest.blog.status = "failed";
          latest.blog.failed = 1;
          latest.blog.message = errMsg;
          latest.blog.finishedAt = nowIso();
          latest.blog.updatedAt = nowIso();
          latest.system.lastError = errMsg;
          pushHistory(latest, {
            type: "blog_stale_auto_failed",
            engine: "blog",
            runId: staleRunId,
            keyword: staleKeyword,
            status: "failed",
            message: errMsg,
          });
          await writeState(latest);
          issues.push(`🔴 Blog Runner auto-failed ${stuckMinutes} นาที (runId: ${staleRunId || "-"})`);
        }
      }
    }

    // 4. DLQ — new failures in last 2 hours
    const dlq = await getSupabaseDlq(10);
    const freshDlq = dlq.filter(d => {
      try { return Date.now() - new Date(d.created_at).getTime() < 7_200_000; } catch { return false; }
    });
    if (freshDlq.length > 0) issues.push(`⚠️ DLQ ${freshDlq.length} รายการใหม่ใน 2 ชม.`);

    if (issues.length === 0) return; // all healthy

    const alertHash = [...issues].sort().join("|");
    if (alertHash === _lastAlertHash) return; // same as last alert, skip
    _lastAlertHash = alertHash;

    const ts = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const msg = [`🚨 Hub Health Alert — ${ts}`, ...issues].join("\n");
    await sendTelegram(msg);
    logEvent("warn", "health_monitor_alert", { issues });
  } catch (e) {
    logEvent("error", "health_monitor_error", { message: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════

const boqRouter = require('./boq.routes');
app.use('/api/boq', boqRouter);

app.listen(PORT, HUB_HOST, async () => {
  const state = await readState();
  await writeState(state);
  const validation = getEnvValidation();
  logEvent(validation.ok ? "info" : "warn", "startup_env_validation", {
    correlationId: "startup",
    ok: validation.ok,
    missing: validation.missing,
  });
  console.log(`Backend Hub v2 running at ${HUB_PUBLIC_BASE_URL}`);
  console.log(`Routes: /action/blog/queue/build|clear|run-next + /action/fb/queue/build|clear|run-next`);
  console.log(`n8n blog webhook: ${N8N_BLOG_WEBHOOK_URL}`);
  console.log(`fb backend: ${FB_BACKEND_URL}`);
  console.log(`State store: Supabase hub_state key=${HUB_STATE_KEY}`);

  // Start active health monitor
  setTimeout(runHealthMonitor, 5 * 60 * 1000); // first check 5 min after startup
  setInterval(runHealthMonitor, HEALTH_INTERVAL_MS);
  console.log(`Health monitor: every ${HEALTH_INTERVAL_MS / 60000} min → Telegram`);
});
 
