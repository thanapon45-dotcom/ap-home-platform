"use client";
import { useState, useEffect, useCallback } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://ap-home-platform-production.up.railway.app";
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

type BlogState = {
  status: string; runId: string; keyword: string; category: number;
  postId: string; postUrl: string; message: string;
  startedAt: string; updatedAt: string;
  pipeline?: PipelineState;
  visionRetries?: number;
  publishChecks?: Record<string, boolean>;
};
type FbState = {
  status: string; queue: number; drafts: number; published: number; lastUpdate: string | null;
  postUrl?: string;
};

const MOCK_BLOG: BlogState = {
  status: "idle", runId: "", keyword: "", category: 13,
  postId: "", postUrl: "", message: "Ready",
  startedAt: "", updatedAt: "",
};
const MOCK_FB: FbState = { status: "unknown", queue: 0, drafts: 0, published: 0, lastUpdate: null };

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
  const [fb, setFb]               = useState<FbState>(MOCK_FB);
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

  // FB Composer
  const [fbContent, setFbContent] = useState("");
  const [fbBusy, setFbBusy]       = useState(false);

  // Auto-select first keyword when category changes
  useEffect(() => {
    const pool = KEYWORD_POOLS[category];
    if (pool) setKeyword(pool.keywords[0]);
  }, [category]);

  // ── Poll Backend Hub ──────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/api/state`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setBlog(d.blog ?? MOCK_BLOG);
      setFb(d.fb ?? MOCK_FB);
      setLastError(d.system?.lastError ?? "");
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
      const r = await fetch(`${HUB}/action/blog/run`, {
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
      const r = await fetch(`${HUB}/action/blog/reset`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast("Reset แล้ว ✓", "success");
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally { setBusy(false); }
  }

  // ── FB Templates ─────────────────────────────────────────────────────────
  const FB_TEMPLATES = [
    {
      label: "🏗️ รับสร้างบ้าน",
      color: "#f59e0b",
      text: `🏡 สร้างบ้านในฝันกับ Finnhouses\n\n✅ ออกแบบตามไลฟ์สไตล์คุณ\n✅ งบ 5–15 ล้านบาท ควบคุมได้จริง\n✅ ทีมช่างมืออาชีพ พร้อม BOQ ชัดเจน\n\n📞 ปรึกษาฟรี ไม่มีค่าใช้จ่าย\nLine: @finnhouses หรือโทร 08X-XXX-XXXX\n\n#สร้างบ้าน #Finnhouses #บ้านในฝัน #รับสร้างบ้าน`,
    },
    {
      label: "🔨 รีโนเวทเพื่อขาย",
      color: "#10b981",
      text: `🔨 รีโนเวทบ้านเพื่อขาย ทำกำไรได้จริง!\n\n💰 ซื้อทรัพย์ราคาต่ำ → รีโนเวท → ขายต่อมีกำไร\n📊 เราช่วยประเมินต้นทุนและมาร์จิน\n🏠 มีทรัพย์น่าสนใจอัปเดตทุกสัปดาห์\n\n📞 สนใจร่วมลงทุน ติดต่อได้เลย\nLine: @finnhouses\n\n#รีโนเวทบ้าน #ลงทุนอสังหา #Finnhouses #FlipHouse`,
    },
    {
      label: "🏠 ฝากขายบ้าน",
      color: "#6366f1",
      text: `🏠 ฝากขายบ้านและที่ดิน กับ Finnhouses\n\n✨ ทีม Marketing ช่วยโปรโมทให้ฟรี\n✨ มีฐานลูกค้าพร้อมซื้อรอคิวอยู่\n✨ ปิดการขายเร็ว ค่าคอมมิชชั่นมาตรฐาน\n\n📸 ถ่ายภาพและทำ Listing สวยๆ ให้ฟรี!\n\n📞 ติดต่อ Line: @finnhouses\n\n#ฝากขายบ้าน #ขายบ้าน #Finnhouses #อสังหาริมทรัพย์`,
    },
  ];

  async function handleFbPost() {
    if (!fbContent.trim()) { showToast("กรุณาเขียนเนื้อหาก่อน", "error"); return; }
    try {
      setFbBusy(true);
      const r = await fetch(`${HUB}/action/fb/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fbContent.trim(), source: "dashboard-react" }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast("โพสต์ FB สำเร็จ ✓", "success");
      await poll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally { setFbBusy(false); }
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

      {/* ── FB Post Composer ── */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#1877f2,#42b0ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            f
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600 }}>
              FB POST COMPOSER
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif" }}>
              โพสต์ Facebook Page โดยตรง
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(24,119,242,.1)", border: "1px solid rgba(24,119,242,.25)", borderRadius: 12, padding: "5px 12px" }}>
            <Dot color={live ? "#1877f2" : "#334155"} />
            <span style={{ fontSize: 11, color: live ? "#60a5fa" : "#475569", fontWeight: 600 }}>
              {live ? "FB Backend Live" : "Offline"}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

          {/* Left: Textarea + templates */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <textarea
                value={fbContent}
                onChange={e => setFbContent(e.target.value)}
                rows={8}
                placeholder="เขียนข้อความสำหรับ Facebook Page..."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: 1.7,
                  minHeight: 180,
                }}
              />
              <div style={{
                position: "absolute", bottom: 10, right: 14,
                fontSize: 10, color: fbContent.length > 2000 ? "#f43f5e" : "#475569",
                fontFamily: "monospace",
              }}>
                {fbContent.length} / 2000
              </div>
            </div>

            {/* Template picker */}
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>
                📋 Templates
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {FB_TEMPLATES.map((tpl, i) => (
                  <button key={i} onClick={() => setFbContent(tpl.text)} style={{
                    padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: `${tpl.color}12`,
                    border: `1px solid ${tpl.color}40`,
                    color: tpl.color,
                    transition: "all .2s",
                  }}>
                    {tpl.label}
                  </button>
                ))}
                {fbContent && (
                  <button onClick={() => setFbContent("")} style={{
                    padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", color: "#64748b",
                  }}>
                    ✕ ล้าง
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Post button + status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={handleFbPost} disabled={fbBusy || !fbContent.trim()} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: fbBusy || !fbContent.trim() ? "not-allowed" : "pointer",
              background: fbBusy || !fbContent.trim()
                ? "rgba(255,255,255,.04)"
                : "linear-gradient(135deg,#1877f2,#42b0ff)",
              border: "none",
              color: fbBusy || !fbContent.trim() ? "#475569" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              transition: "all .2s",
            }}>
              {fbBusy
                ? <><span className="animate-spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%" }} />กำลังโพสต์...</>
                : "📤 โพสต์ลง Facebook"}
            </button>

            {/* FB state panel */}
            <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".12em" }}>สถานะ FB Engine</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {[["Queue", fb.queue, "#f59e0b"], ["Drafts", fb.drafts, "#6366f1"], ["Published", fb.published, "#10b981"]].map(([k, v, c]) => (
                  <div key={String(k)} style={{ textAlign: "center", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: String(c), marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 12px", borderRadius: 10,
                background: fb.status === "published" ? "rgba(16,185,129,.07)" : "rgba(255,255,255,.02)",
                border: `1px solid ${fb.status === "published" ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"}`,
              }}>
                <Dot color={
                  fb.status === "published" ? "#10b981" :
                  fb.status === "failed" ? "#f43f5e" :
                  fb.status === "running" ? "#22d3ee" : "#334155"
                } />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "capitalize" }}>
                  {fb.status ?? "unknown"}
                </span>
              </div>

              {/* Post URL if available */}
              {fb.postUrl && (
                <div style={{ background: "rgba(24,119,242,.06)", border: "1px solid rgba(24,119,242,.2)", borderRadius: 10, padding: "9px 12px" }}>
                  <div style={{ fontSize: 9, color: "#60a5fa", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".1em" }}>✅ โพสต์ล่าสุด</div>
                  <a href={fb.postUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: "#93c5fd", wordBreak: "break-all", textDecoration: "none" }}>
                    {fb.postUrl}
                  </a>
                </div>
              )}

              {fb.lastUpdate && (
                <div style={{ fontSize: 10, color: "#334155" }}>
                  Last update: {new Date(fb.lastUpdate).toLocaleTimeString("th-TH")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Publish Guard + FB + Connection ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 20 }}>

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

        {/* FB Engine */}
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>FB CONTENT ENGINE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 14, fontFamily: "'DM Serif Display',serif" }}>Facebook Page</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[["Queue", fb.queue], ["Drafts", fb.drafts], ["Published", fb.published]].map(([k, v]) => (
              <div key={String(k)} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#6366f1", marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
          {fb.lastUpdate && (
            <div style={{ fontSize: 11, color: "#334155", marginTop: 10 }}>
              Last update: {new Date(fb.lastUpdate).toLocaleTimeString("th-TH")}
            </div>
          )}
        </div>

        {/* Connection status */}
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>CONNECTION STATUS</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14, fontFamily: "'DM Serif Display',serif" }}>Live Integration</div>
          {[
            { label: "Backend Hub",   port: ":4000", ok: live,               color: "#22d3ee" },
            { label: "n8n Webhook",   port: ":5678", ok: !!blog.updatedAt,   color: "#10b981" },
            { label: "WordPress",     port: "REST",  ok: !!blog.postId,      color: "#6366f1" },
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
    </div>
  );
}
