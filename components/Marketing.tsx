"use client";
import { useState, useEffect, useCallback } from "react";

// Use Vercel server-side routes to avoid CORS/browser→Railway issues
const HUB = "";
const POLL_MS = 5_000;

// ── Topic Engine PRO — 32 Keywords ─────────────────────────────────────────
const KEYWORD_POOLS: Record<number, { label: string; color: string; emoji: string; keywords: string[] }> = {
  10: {
    label: "Budget (งบสร้างบ้าน)", color: "#f59e0b", emoji: "💰",
    keywords: [
      "สร้างบ้านงบ 5 ล้านต้องวางแผนอะไรบ้าง",
      "งบสร้างบ้านบานปลายเกิดจากอะไร",
      "สร้างบ้าน 2 ชั้นงบ 5–10 ล้านได้บ้านแบบไหน",
      "ค่าใช้จ่ายซ่อนเร้นที่ต้องรู้ก่อนสร้างบ้าน",
      "BOQ สำคัญอย่างไรในการสร้างบ้าน",
      "จะคุมงบสร้างบ้านไม่ให้บาน ทำอย่างไร",
      "สร้างบ้านงบ 7 ล้านได้บ้านขนาดไหน",
      "งบประมาณเผื่อฉุกเฉินในการสร้างบ้านควรเป็นเท่าไหร่",
    ],
  },
  13: {
    label: "Design (ออกแบบบ้าน)", color: "#22d3ee", emoji: "🏠",
    keywords: [
      "บ้าน Contemporary ดีไซน์สวยงามทันสมัย",
      "แบบบ้าน Tropical Modern กลางป่าในเมือง",
      "บ้าน Minimal สไตล์ญี่ปุ่น เรียบ ลงตัว",
      "ออกแบบบ้านชั้นเดียวใช้งานได้จริง",
      "บ้านสไตล์ Nordic งบ 4–6 ล้าน",
      "แบบบ้าน 2 ชั้น ดีไซน์เปิดโล่ง",
      "ออกแบบบ้าน Work From Home ยุคใหม่",
      "บ้าน Smart Home ระบบ IoT ราคาจริง",
    ],
  },
  12: {
    label: "Service (บริการสร้างบ้าน)", color: "#a78bfa", emoji: "🔨",
    keywords: [
      "วิธีเลือกผู้รับเหมาสร้างบ้านที่ดี",
      "สัญญาสร้างบ้านควรมีข้อไหนบ้าง",
      "รับสร้างบ้านแบบเบ็ดเสร็จคืออะไร",
      "ความเสี่ยงที่พบบ่อยเมื่อจ้างสร้างบ้าน",
      "ขั้นตอนสร้างบ้านตั้งแต่ต้นจนจบ",
      "วัสดุก่อสร้างคุณภาพสูงราคาคุ้ม",
      "ตรวจรับงานก่อนสร้างบ้านเสร็จ ดูอะไรบ้าง",
      "ระยะเวลาสร้างบ้านมาตรฐานกี่เดือน",
    ],
  },
  14: {
    label: "Land (ที่ดิน & ทำเล)", color: "#10b981", emoji: "🗺️",
    keywords: [
      "วิธีเลือกที่ดินสร้างบ้านให้คุ้มค่าที่สุด",
      "ทำเลที่ดีสำหรับสร้างบ้านนอกเมือง",
      "ที่ดินติดถนนหรือลึกเข้าไป ดีกว่ากัน",
      "ข้อควรระวังก่อนซื้อที่ดินสร้างบ้าน",
      "ที่ดินในกรุงเทพฯ รอบนอก ราคาปี 2025",
      "ลงทุนที่ดินสร้างบ้านขาย กำไรดีแค่ไหน",
      "ตรวจสอบโฉนดที่ดินก่อนซื้อ ต้องดูอะไร",
      "ที่ดินน้ำท่วมหรือเปล่า ดูอย่างไร",
    ],
  },
};

// ── Visual Styles ───────────────────────────────────────────────────────────
const VISUAL_STYLES = [
  { value: "minimal",          label: "Minimal",           color: "#94a3b8", emoji: "⬜" },
  { value: "contemporary",     label: "Contemporary",      color: "#22d3ee", emoji: "🏙️" },
  { value: "modern_tropical",  label: "Modern Tropical",   color: "#10b981", emoji: "🌿" },
];

// ── Pipeline Stages ─────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: "context",       label: "Build Context",   icon: "📋", desc: "System context + inputs" },
  { key: "topic_engine",  label: "Topic Engine",    icon: "🧠", desc: "PRO keyword selector" },
  { key: "article_gen",   label: "Article Gen",     icon: "✍️", desc: "GPT-4.1-mini" },
  { key: "image_gen",     label: "Image Gen",       icon: "🖼️", desc: "DALL-E sketch" },
  { key: "vision_qa",     label: "Vision QA",       icon: "👁️", desc: "GPT-4o Thai roof check" },
  { key: "binary_guard",  label: "Binary Guard",    icon: "🔒", desc: "Image validation" },
  { key: "upload_media",  label: "Upload Media",    icon: "📤", desc: "WordPress media" },
  { key: "publish_guard", label: "Publish Guard",   icon: "🛡️", desc: "10-condition check" },
  { key: "create_post",   label: "Create Post",     icon: "📝", desc: "WordPress REST API" },
  { key: "notify_hub",    label: "Notify Hub",      icon: "📡", desc: "POST /webhook/n8n" },
];

// ── Publish Guard — 10 conditions ───────────────────────────────────────────
const PUBLISH_CHECKS = [
  "Title length ≥ 30 chars",
  "Content length ≥ 1,500 words",
  "Slug format valid (no spaces)",
  "featured_media ID set",
  "Categories assigned",
  "No duplicate slug on site",
  "H1 tag present in content",
  "Title not repeated in body",
  "FAQ schema block present",
  "≥ 2 internal links",
];

// ── Types ───────────────────────────────────────────────────────────────────
type StageStatus = "idle" | "running" | "success" | "failed" | "skipped";
type PipelineState = Record<string, StageStatus>;

type QueueItem = {
  id: string;
  date: string;
  slot: "morning" | "evening";
  keyword: string;
  category: number;
  visual_hint: string;
  status: "pending" | "running" | "published" | "failed";
  runId: string;
  postUrl: string;
};

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

type BlogState = {
  status: string; runId: string; keyword: string; category: number;
  postId: string; postUrl: string; message: string;
  startedAt: string; updatedAt: string;
  pipeline?: PipelineState;
  visionRetries?: number;
  publishChecks?: Record<string, boolean>;
};
const MOCK_BLOG: BlogState = {
  status: "idle", runId: "", keyword: "", category: 13,
  postId: "", postUrl: "", message: "Ready",
  startedAt: "", updatedAt: "",
};
// ── Sub-components ──────────────────────────────────────────────────────────
function Dot({ color = "#22d3ee" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.4s cubic-bezier(0,0,.2,1) infinite" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function Toast({ msg, type }: { msg: string; type: string }) {
  const ok = type !== "error";
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 1000,
      background: ok ? "rgba(16,185,129,.15)" : "rgba(244,63,94,.15)",
      border: `1px solid ${ok ? "#10b98144" : "#f43f5e44"}`,
      borderRadius: 12, padding: "12px 18px", fontSize: 13,
      color: ok ? "#6ee7b7" : "#fda4af",
    }}>
      {msg}
    </div>
  );
}

function StageRow({ stage, status, retries }: { stage: typeof PIPELINE_STAGES[0]; status: StageStatus; retries?: number }) {
  const colorMap: Record<StageStatus, string> = {
    idle: "#334155", running: "#22d3ee", success: "#10b981", failed: "#f43f5e", skipped: "#64748b",
  };
  const bgMap: Record<StageStatus, string> = {
    idle: "rgba(51,65,85,.3)", running: "rgba(34,211,238,.1)", success: "rgba(16,185,129,.08)", failed: "rgba(244,63,94,.08)", skipped: "rgba(100,116,139,.05)",
  };
  const c = colorMap[status];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px", borderRadius: 10,
      background: bgMap[status],
      border: `1px solid ${c}33`,
      transition: "all .3s",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{stage.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{stage.label}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{stage.desc}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {status === "running" && <Dot color={c} />}
        {stage.key === "vision_qa" && retries !== undefined && retries > 0 && (
          <span style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 8, padding: "2px 7px" }}>
            retry {retries}/2
          </span>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: "monospace", textTransform: "uppercase" }}>
          {status}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Marketing() {
  const [blog, setBlog]           = useState<BlogState>(MOCK_BLOG);
  const [lastError, setLastError] = useState("");
  const [live, setLive]           = useState(false);
  const [lastSync, setSync]       = useState<Date | null>(null);

  // Trigger inputs
  const [category, setCategory]   = useState(13);
  const [keyword, setKeyword]     = useState("");
  const [slot, setSlot]           = useState<"morning" | "evening">("morning");
  const [visualStyle, setVisual]  = useState("contemporary");
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: string } | null>(null);

  // Content Queue
  const [contentQueue, setContentQueue] = useState<QueueItem[]>([]);
  const [queueBusy, setQueueBusy] = useState(false);

  // Auto-select first keyword when category changes
  useEffect(() => {
    const pool = KEYWORD_POOLS[category];
    if (pool) setKeyword(pool.keywords[0]);
  }, [category]);

  // ── Poll Backend Hub ──────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/blog/state`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setBlog(d.blog ?? MOCK_BLOG);
      setLastError(d.system?.lastError ?? "");
      setContentQueue(Array.isArray(d.content_queue) ? d.content_queue : []);
      setLive(true);
      setSync(new Date());
    } catch { setLive(false); }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Run Blog ──────────────────────────────────────────────────────────────
  async function handleRun() {
    if (!keyword.trim()) { showToast("เลือก keyword ก่อน", "error"); return; }
    try {
      setBusy(true);
      const r = await fetch(`/api/blog/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          category,
          slot,
          visual_hint: visualStyle,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast(`▶ Triggered! Run ID: ${j.runId}`, "success");
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally { setBusy(false); }
  }

  async function handleReset() {
    try {
      setBusy(true);
      const r = await fetch(`/api/blog/reset`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast("Reset แล้ว ✓", "success");
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally { setBusy(false); }
  }

  // ── Content Queue ─────────────────────────────────────────────────────────
  function generateQueueItems(): QueueItem[] {
    // Collect all keywords from all pools
    const all: { keyword: string; category: number; visual_hint: string }[] = [];
    Object.entries(KEYWORD_POOLS).forEach(([catId, cat]) => {
      cat.keywords.forEach(kw => all.push({
        keyword: kw, category: Number(catId), visual_hint: "contemporary",
      }));
    });
    // Shuffle and pick 7
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 7);
    return shuffled.map((item, i) => {
      const d = new Date();
      d.setDate(d.getDate() + 1 + i); // start tomorrow
      return {
        id: genId(),
        date: d.toISOString().split("T")[0],
        slot: "morning" as const,
        keyword: item.keyword,
        category: item.category,
        visual_hint: item.visual_hint,
        status: "pending" as const,
        runId: "", postUrl: "",
      };
    });
  }

  async function handleBuildQueue() {
    try {
      setQueueBusy(true);
      const items = generateQueueItems();
      const r = await fetch("/api/blog/queue/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast(`📅 Queue ${j.count} วัน สร้างสำเร็จ`, "success");
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally { setQueueBusy(false); }
  }

  async function handleClearQueue() {
    try {
      setQueueBusy(true);
      await fetch("/api/blog/queue/clear", { method: "POST" });
      showToast("Queue ล้างแล้ว ✓", "success");
      await poll();
    } catch {
      showToast("Error clearing queue", "error");
    } finally { setQueueBusy(false); }
  }

  const statusColor: Record<string, string> = {
    idle: "#64748b", running: "#22d3ee", published: "#10b981", failed: "#f43f5e",
  };
  const statusLabel: Record<string, string> = {
    idle: "Idle", running: "Running...", published: "Published ✓", failed: "Failed ✗",
  };
  const sc   = statusColor[blog.status] ?? "#64748b";
  const sl   = statusLabel[blog.status] ?? blog.status;
  const isRunning = blog.status === "running";

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 13,
    width: "100%", outline: "none", fontFamily: "inherit",
  };

  const pool = KEYWORD_POOLS[category];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1200 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header ── */}
      <div className="animate-fadeUp" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Dot color={live ? "#22d3ee" : "#f43f5e"} />
              <span suppressHydrationWarning>
                {live
                  ? `LIVE · sync ${lastSync?.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "OFFLINE — Hub ไม่ตอบสนอง"}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "6px 0 0", fontFamily: "'DM Serif Display',serif" }}>
              Blog Content Runner
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
              n8n V3.2 → finnhouses.com · Topic Engine PRO · GPT-4.1-mini · DALL-E · Vision QA
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${sc}18`, border: `1px solid ${sc}40`, borderRadius: 20, padding: "6px 14px" }}>
            <Dot color={sc} />
            <span style={{ fontSize: 13, color: sc, fontWeight: 700 }}>{sl}</span>
          </div>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Col 1: Control Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Category picker */}
          <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600, marginBottom: 14 }}>
              📂 Category Pool
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(KEYWORD_POOLS).map(([catId, cat]) => {
                const active = category === Number(catId);
                return (
                  <button key={catId} onClick={() => setCategory(Number(catId))} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    background: active ? `${cat.color}18` : "rgba(255,255,255,.02)",
                    border: `1px solid ${active ? cat.color + "40" : "rgba(255,255,255,.06)"}`,
                    transition: "all .2s",
                  }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: active ? cat.color : "#94a3b8" }}>{cat.label}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>Cat {catId} · {cat.keywords.length} keywords</div>
                    </div>
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot + Visual style */}
          <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600, marginBottom: 14 }}>
              ⚙️ Run Settings
            </div>

            {/* Slot */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>🕐 Slot</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(["morning", "evening"] as const).map(s => (
                  <button key={s} onClick={() => setSlot(s)} style={{
                    padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 13,
                    background: slot === s ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.03)",
                    border: `1px solid ${slot === s ? "rgba(34,211,238,.35)" : "rgba(255,255,255,.07)"}`,
                    color: slot === s ? "#22d3ee" : "#64748b", fontWeight: slot === s ? 700 : 400,
                  }}>
                    {s === "morning" ? "🌅 Morning" : "🌙 Evening"}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual style */}
            <div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>🎨 Visual Style</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {VISUAL_STYLES.map(vs => (
                  <button key={vs.value} onClick={() => setVisual(vs.value)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px", borderRadius: 10, cursor: "pointer",
                    background: visualStyle === vs.value ? `${vs.color}14` : "rgba(255,255,255,.02)",
                    border: `1px solid ${visualStyle === vs.value ? vs.color + "40" : "rgba(255,255,255,.06)"}`,
                  }}>
                    <span>{vs.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: visualStyle === vs.value ? vs.color : "#64748b" }}>{vs.label}</span>
                    {visualStyle === vs.value && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: vs.color }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset} disabled={busy || isRunning} style={{
              flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
              cursor: busy || isRunning ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b",
            }}>
              ↺ Reset
            </button>
            <button onClick={handleRun} disabled={busy || isRunning || !keyword.trim()} style={{
              flex: 2, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: busy || isRunning || !keyword.trim() ? "not-allowed" : "pointer",
              background: busy || isRunning || !keyword.trim()
                ? "rgba(255,255,255,.05)"
                : "linear-gradient(135deg,#22d3ee,#0891b2)",
              border: "none", color: busy || isRunning || !keyword.trim() ? "#475569" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {isRunning
                ? <><span className="animate-spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%" }} />Running...</>
                : "▶ Run Workflow"}
            </button>
          </div>
        </div>

        {/* ── Col 2: Keyword Pool + Pipeline ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Keyword selector */}
          <div style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${pool?.color}33`, borderRadius: 20, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{pool?.emoji}</span>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: pool?.color ?? "#22d3ee", fontWeight: 600 }}>
                  Keyword Pool
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{pool?.label}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {pool?.keywords.map((kw, i) => (
                <button key={i} onClick={() => setKeyword(kw)} style={{
                  padding: "8px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  background: keyword === kw ? `${pool.color}14` : "rgba(255,255,255,.02)",
                  border: `1px solid ${keyword === kw ? pool.color + "40" : "rgba(255,255,255,.05)"}`,
                  transition: "all .2s",
                }}>
                  <span style={{ fontSize: 12, color: keyword === kw ? pool.color : "#94a3b8", fontWeight: keyword === kw ? 700 : 400, lineHeight: 1.4 }}>
                    {kw}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected run params */}
          {keyword && (
            <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 10 }}>
                📤 Run Payload
              </div>
              <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                <div><span style={{ color: "#6366f1" }}>keyword:</span> <span style={{ color: "#f1f5f9" }}>{keyword.slice(0, 40)}{keyword.length > 40 ? "…" : ""}</span></div>
                <div><span style={{ color: "#6366f1" }}>category:</span> <span style={{ color: "#f59e0b" }}>{category}</span></div>
                <div><span style={{ color: "#6366f1" }}>slot:</span> <span style={{ color: "#22d3ee" }}>{slot}</span></div>
                <div><span style={{ color: "#6366f1" }}>visual_hint:</span> <span style={{ color: "#10b981" }}>{visualStyle}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ── Col 3: Pipeline Status + Result ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Pipeline stages */}
          <div style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${sc}33`, borderRadius: 20, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600 }}>
                🔄 Pipeline Stages
              </div>
              {isRunning && <Dot color="#22d3ee" />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PIPELINE_STAGES.map(stage => {
                const stageStatus: StageStatus = blog.pipeline?.[stage.key] ?? "idle";
                const retries = stage.key === "vision_qa" ? (blog.visionRetries ?? 0) : undefined;
                return (
                  <StageRow key={stage.key} stage={stage} status={stageStatus} retries={retries} />
                );
              })}
            </div>
          </div>

          {/* Blog result */}
          {(blog.postUrl || blog.postId || lastError || blog.message !== "Ready") && (
            <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 22 }}>
              <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600, marginBottom: 14 }}>
                📊 Last Run Result
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  ["Post ID", blog.postId || "—"],
                  ["Category", blog.category || "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 10, padding: "9px 12px", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>MESSAGE</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{blog.message || "—"}</div>
              </div>

              {blog.postUrl && (
                <div style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 10, padding: "9px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#10b981", marginBottom: 3 }}>✅ POST URL</div>
                  <a href={blog.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#6ee7b7", wordBreak: "break-all", textDecoration: "none" }}>
                    {blog.postUrl}
                  </a>
                </div>
              )}

              {lastError && (
                <div style={{ background: "rgba(244,63,94,.06)", border: "1px solid rgba(244,63,94,.25)", borderRadius: 10, padding: "9px 12px" }}>
                  <div style={{ fontSize: 10, color: "#f43f5e", marginBottom: 3 }}>LAST ERROR</div>
                  <div style={{ fontSize: 11, color: "#fda4af" }}>{lastError}</div>
                </div>
              )}

              {blog.updatedAt && (
                <div style={{ fontSize: 10, color: "#334155", marginTop: 8 }}>
                  Updated: {new Date(blog.updatedAt).toLocaleTimeString("th-TH")}
                  {blog.startedAt && ` · Started: ${new Date(blog.startedAt).toLocaleTimeString("th-TH")}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Publish Guard + Connection ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>

        {/* Publish Guard checks */}
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 14 }}>
            🛡️ Publish Guard — 10 Conditions
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {PUBLISH_CHECKS.map((check, i) => {
              const passed = blog.publishChecks?.[`check_${i}`];
              const isPending = blog.status !== "published";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 7,
                  padding: "7px 10px", borderRadius: 9,
                  background: !isPending && passed ? "rgba(16,185,129,.06)" : "rgba(255,255,255,.02)",
                  border: `1px solid ${!isPending && passed ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.05)"}`,
                }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>
                    {isPending ? "◻️" : passed ? "✅" : "❌"}
                  </span>
                  <span style={{ fontSize: 11, color: !isPending && passed ? "#6ee7b7" : "#64748b", lineHeight: 1.4 }}>
                    {check}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connection status */}
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>CONNECTION STATUS</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14, fontFamily: "'DM Serif Display',serif" }}>Live Integration</div>
          {[
            { label: "Backend Hub",   port: "Railway", ok: live,               color: "#22d3ee" },
            { label: "n8n Webhook",   port: "Railway", ok: !!blog.updatedAt,   color: "#10b981" },
            { label: "WordPress",     port: "REST",    ok: !!blog.postId,      color: "#6366f1" },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 14px", borderRadius: 12,
              background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)",
              marginBottom: 7,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Dot color={row.ok ? row.color : "#334155"} />
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 11, color: row.ok ? row.color : "#475569", fontFamily: "monospace" }}>{row.port}</span>
            </div>
          ))}
          <div style={{ marginTop: 4, padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)", fontSize: 10, color: "#334155" }}>
            Poll: 5s · Hub: {HUB}
          </div>
        </div>
      </div>

      {/* ── Content Queue — 7 วัน ── */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              📅
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#f59e0b", fontWeight: 600 }}>
                CONTENT QUEUE
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif" }}>
                วางแผน Content ล่วงหน้า 7 วัน
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {contentQueue.length > 0 && (
              <button onClick={handleClearQueue} disabled={queueBusy} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: queueBusy ? "not-allowed" : "pointer",
                background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.25)", color: "#f43f5e",
              }}>
                🗑 ล้าง Queue
              </button>
            )}
            <button onClick={handleBuildQueue} disabled={queueBusy} style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: queueBusy ? "not-allowed" : "pointer",
              background: queueBusy ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,#f59e0b,#d97706)",
              border: "none", color: queueBusy ? "#475569" : "#fff",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {queueBusy
                ? <><span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%" }} />กำลังสร้าง...</>
                : contentQueue.length > 0 ? "🔄 สร้าง Queue ใหม่" : "✨ สร้าง Queue 7 วัน"}
            </button>
          </div>
        </div>

        {contentQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#475569", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div style={{ fontWeight: 600, color: "#64748b", marginBottom: 4 }}>ยังไม่มี Content Queue</div>
            <div style={{ fontSize: 12 }}>กด &quot;สร้าง Queue 7 วัน&quot; เพื่อวางแผน content อัตโนมัติจาก Keyword Pool</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {contentQueue.map((item, i) => {
              const qStatusColor: Record<string, string> = {
                pending: "#64748b", running: "#22d3ee", published: "#10b981", failed: "#f43f5e",
              };
              const qStatusLabel: Record<string, string> = {
                pending: "⏳ รอ", running: "▶ Running", published: "✅ Published", failed: "❌ Failed",
              };
              const catInfo = KEYWORD_POOLS[item.category];
              const qSc = qStatusColor[item.status] ?? "#64748b";
              const dateLabel = new Date(item.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
              return (
                <div key={item.id} style={{
                  background: item.status === "published" ? "rgba(16,185,129,.06)" : "rgba(255,255,255,.02)",
                  border: `1px solid ${qSc}33`,
                  borderRadius: 14, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{catInfo?.emoji ?? "📝"}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>วันที่ {i + 1} — {dateLabel}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{item.slot === "morning" ? "🌅 Morning" : "🌙 Evening"} · {catInfo?.label ?? `Cat ${item.category}`}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: qSc,
                      background: `${qSc}15`, border: `1px solid ${qSc}30`,
                      borderRadius: 8, padding: "3px 8px",
                    }}>
                      {qStatusLabel[item.status] ?? item.status}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: item.status === "published" ? "#6ee7b7" : "#94a3b8",
                    background: "rgba(0,0,0,.2)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5,
                  }}>
                    {item.keyword}
                  </div>
                  {item.postUrl && (
                    <a href={item.postUrl} target="_blank" rel="noreferrer" style={{
                      fontSize: 10, color: "#10b981", textDecoration: "none",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      🔗 {item.postUrl}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)" }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>⚡ Auto-run — n8n Schedule Trigger</div>
          <div style={{ fontSize: 11, color: "#78716c", lineHeight: 1.6 }}>
            สร้าง n8n workflow ใหม่:{" "}
            <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>Schedule Trigger (09:00 daily)</span>
            {" → "}
            <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>HTTP POST /api/blog/queue/run-next</span>
            {" "}— ระบบจะ run keyword ถัดไปในคิวอัตโนมัติทุกวัน
          </div>
        </div>
      </div>
    </div>
  );
}
