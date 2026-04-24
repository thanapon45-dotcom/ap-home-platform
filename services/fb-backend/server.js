require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 3001);
const HUB_WEBHOOK_URL = process.env.HUB_FB_WEBHOOK_URL || "http://127.0.0.1:4000/webhook/fb";

// Facebook Graph API config
// ตั้งค่าใน .env: FB_PAGE_ACCESS_TOKEN และ FB_PAGE_ID
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const FB_PAGE_ID = process.env.FB_PAGE_ID || "";
const FB_API_VERSION = process.env.FB_API_VERSION || "v21.0";

function safeText(text) {
  try {
    return Buffer.from(text || "", "utf-8").toString("utf-8");
  } catch {
    return text || "";
  }
}

async function pushStatus(payload) {
  await fetch(HUB_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

// โพสต์ไปยัง Facebook Page จริง ผ่าน Graph API
async function postToFacebook(message) {
  if (!FB_PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error("FB_PAGE_ACCESS_TOKEN หรือ FB_PAGE_ID ยังไม่ได้ตั้งค่าใน .env");
  }

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

  if (!res.ok || data.error) {
    const errMsg = data.error?.message || `Graph API HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  // data.id = "PAGE_ID_POST_ID" เช่น "123456_789012"
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
  });
});

app.post("/api/fb/publish", async (req, res) => {
  const runId = String(req.body?.runId || "");
  const content = String(req.body?.content || "");

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
      });
    } catch {}
    return res.json({ ok: true, action: "publish", published: true, runId, stub: true });
  }

  // LIVE mode: โพสต์จริง
  try {
    const postId = await postToFacebook(safeText(content));
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
      });
    } catch {}

    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  const configured = !!(FB_PAGE_ACCESS_TOKEN && FB_PAGE_ID);
  console.log(`FB Backend running at http://127.0.0.1:${PORT} (UTF-8 READY)`);
  console.log(`Hub webhook: ${HUB_WEBHOOK_URL}`);
  console.log(`Facebook API: ${configured ? `LIVE → Page ${FB_PAGE_ID}` : "STUB MODE (set FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID to enable)"}`);
});
