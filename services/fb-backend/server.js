require("dotenv").config();
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "2mb" }));
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

const PORT = Number(process.env.PORT || 3001);
const HUB_WEBHOOK_URL = process.env.HUB_FB_WEBHOOK_URL || "http://127.0.0.1:4000/webhook/fb";
const HUB_SECRET = process.env.HUB_SECRET || "";

// Facebook Graph API config
// ตั้งค่าใน .env: FB_PAGE_ACCESS_TOKEN และ FB_PAGE_ID
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const FB_PAGE_ID = process.env.FB_PAGE_ID || "";
const FB_API_VERSION = process.env.FB_API_VERSION || "v21.0";

function nowIso() {
  return new Date().toISOString();
}

function timingSafeEq(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function hmacHex(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function createCorrelationId(req) {
  return String(req.headers["x-correlation-id"] || crypto.randomUUID());
}

function logEvent(level, message, details = {}) {
  const entry = {
    at: nowIso(),
    service: "fb-backend",
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

function getEnvValidation() {
  const entries = [
    { name: "HUB_SECRET", configured: Boolean(HUB_SECRET), required: true, description: "Shared Hub auth secret" },
    { name: "HUB_WEBHOOK_URL", configured: Boolean(HUB_WEBHOOK_URL), required: true, description: "Hub callback URL" },
    { name: "FB_PAGE_ACCESS_TOKEN", configured: Boolean(FB_PAGE_ACCESS_TOKEN), required: false, description: "Facebook publish token" },
    { name: "FB_PAGE_ID", configured: Boolean(FB_PAGE_ID), required: false, description: "Facebook page ID" },
  ];
  return {
    ok: entries.filter(item => item.required).every(item => item.configured),
    entries,
    missing: entries.filter(item => item.required && !item.configured).map(item => item.name),
    generatedAt: nowIso(),
  };
}

function canonicalWebhookPayload(payload) {
  return JSON.stringify({
    engine: String(payload.engine || "fb"),
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
}

function signWebhookPayload(payload, timestamp) {
  if (!HUB_SECRET) return "";
  return hmacHex(`${timestamp}.${canonicalWebhookPayload(payload)}`, HUB_SECRET);
}

// Auth middleware — ทุก route ยกเว้น /health
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (req.path.startsWith("/health")) return next();
  if (!HUB_SECRET) {
    return res.status(500).json({ ok: false, error: "HUB_SECRET not configured" });
  }
  const token = String(req.headers["x-hub-token"] || "");
  if (!timingSafeEq(token, HUB_SECRET)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

function safeText(text) {
  try {
    return Buffer.from(text || "", "utf-8").toString("utf-8");
  } catch {
    return text || "";
  }
}

async function pushStatus(payload) {
  const timestamp = String(Date.now());
  await fetch(HUB_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Webhook-Timestamp": timestamp,
      "X-Webhook-Signature": signWebhookPayload(payload, timestamp),
      "X-Correlation-Id": String(payload.correlationId || ""),
    },
    body: JSON.stringify(payload),
  });
}

// โพสต์ไปยัง Facebook Page จริง ผ่าน Graph API
// imageUrl: public https:// URL → post with photo | base64/null → text only
async function postToFacebook(message, imageUrl) {
  if (!FB_PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error("FB_PAGE_ACCESS_TOKEN หรือ FB_PAGE_ID ยังไม่ได้ตั้งค่าใน .env");
  }

  const isPublicUrl = imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("https://");

  if (isPublicUrl) {
    // Post as photo with caption — shows image + text on timeline
    const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/photos`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        caption: message,
        access_token: FB_PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `Graph API HTTP ${res.status}`);
    // photos endpoint returns post_id
    return data.post_id || data.id;
  }

  // Text-only post (no image, or image is base64 which FB can't fetch)
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/feed`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      access_token: FB_PAGE_ACCESS_TOKEN,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `Graph API HTTP ${res.status}`);
  return data.id;
}

app.get("/health", (req, res) => {
  const configured = !!(FB_PAGE_ACCESS_TOKEN && FB_PAGE_ID);
  res.json({
    ok: true,
    service: "fb-backend",
    fb_configured: configured,
    page_id: FB_PAGE_ID || "(not set)",
    time: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

app.get("/health/live", (req, res) => {
  res.json({
    ok: true,
    service: "fb-backend",
    live: true,
    time: nowIso(),
    correlationId: req.correlationId,
  });
});

app.get("/health/config", (req, res) => {
  const validation = getEnvValidation();
  res.status(validation.ok ? 200 : 500).json({
    ok: validation.ok,
    service: "fb-backend",
    validation,
    correlationId: req.correlationId,
  });
});

app.get("/health/ready", (req, res) => {
  const validation = getEnvValidation();
  const ok = validation.ok;
  res.status(ok ? 200 : 503).json({
    ok,
    service: "fb-backend",
    ready: ok,
    validation,
    correlationId: req.correlationId,
  });
});

app.post("/api/fb/publish", async (req, res) => {
  const runId    = String(req.body?.runId || "");
  const content  = String(req.body?.content || "");
  const imageUrl = req.body?.imageUrl || null;  // optional public image URL

  console.log("\n==============================");
  console.log("FB PUBLISH REQUEST");
  console.log("==============================");
  console.log(safeText(content));
  console.log("==============================\n");

  // ถ้ายังไม่มี token → STUB mode: log แล้วตอบสำเร็จ (เหมือนเดิม)
  if (!FB_PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    console.warn("[STUB MODE] FB_PAGE_ACCESS_TOKEN / FB_PAGE_ID ไม่ได้ตั้งค่า — ข้ามการโพสต์จริง");
    try {
      await pushStatus({
        engine: "fb",
        runId,
        status: "published",
        queue: 0,
        drafts: 0,
        published: 1,
        failed: 0,
        lastAction: "publish",
        lastUpdate: new Date().toISOString(),
        message: "[STUB] FB post logged (no token configured)",
        correlationId: req.correlationId,
      });
    } catch {}
    return res.json({ ok: true, action: "publish", published: true, runId, stub: true });
  }

  // LIVE mode: โพสต์จริง
  try {
    const postId = await postToFacebook(safeText(content), imageUrl);
    const postUrl = `https://www.facebook.com/${postId.replace("_", "/posts/")}`;

    console.log(`[FB] Posted OK → Post ID: ${postId}`);
    console.log(`[FB] URL: ${postUrl}`);

    await pushStatus({
      engine: "fb",
      runId,
      status: "published",
      queue: 0,
      drafts: 0,
      published: 1,
      failed: 0,
      postUrl,
      lastAction: "publish",
      lastUpdate: new Date().toISOString(),
      message: `Published → ${postUrl}`,
      correlationId: req.correlationId,
    });

    res.json({ ok: true, action: "publish", published: true, runId, postId, postUrl });

  } catch (err) {
    console.error("[FB] Publish Error:", err.message);
    try {
      await pushStatus({
        engine: "fb",
        runId,
        status: "failed",
        queue: 0,
        drafts: 0,
        published: 0,
        failed: 1,
        lastAction: "publish",
        lastUpdate: new Date().toISOString(),
        message: err.message,
        correlationId: req.correlationId,
      });
    } catch {}

    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  const configured = !!(FB_PAGE_ACCESS_TOKEN && FB_PAGE_ID);
  const validation = getEnvValidation();
  logEvent(validation.ok ? "info" : "warn", "startup_env_validation", {
    correlationId: "startup",
    ok: validation.ok,
    missing: validation.missing,
  });
  console.log(`FB Backend running at http://127.0.0.1:${PORT} (UTF-8 READY)`);
  console.log(`Hub webhook: ${HUB_WEBHOOK_URL}`);
  console.log(`Facebook API: ${configured ? `LIVE → Page ${FB_PAGE_ID}` : "STUB MODE (set FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID to enable)"}`);
});
