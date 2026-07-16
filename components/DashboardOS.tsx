"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// NOTE (session 25, Jul 16 2026): lead counts now read via /api/leads (server-side,
// service_role key) — direct supabase.from("leads") with the public anon key was
// removed because RLS on `leads` is now locked down. See docs/issues-log.md ISSUE-013.
import PropertyReview from "@/components/PropertyReview";
import OperationalDashboard from "@/components/OperationalDashboard";

const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://ap-home-platform-production.up.railway.app";
const POLL_MS = 10_000;

const MOCK = {
  blog:  { status: "Running", queue: 8,  published: 2, failed: 1 },
  fb:    { status: "Active",  queue: 12, drafts: 5,   published: 3 },
  leads: { total: 0, new: 0, byBusiness: { build: 0, reno: 0, list: 0 } },
  alerts: [
    { level: "high",   text: "n8n workflow error: image upload needs review" },
    { level: "medium", text: "Facebook content queue nearly full" },
    { level: "low",    text: "3 leads still waiting first contact" },
  ],
};

// อ่าน lead counts จาก Supabase โดยตรง — refresh ทุก 30s
function useLeadCounts() {
  const [counts, setCounts] = useState({
    total: 0, new: 0, followup: 0, qualified: 0, closed: 0,
    byBusiness: { build: 0, reno: 0, list: 0 },
  });

  useEffect(() => {
    async function fetch_() {
      const res = await fetch("/api/leads");
      const json = await res.json();
      const data = (json.ok !== false ? json.data : null) as { stage?: string; business_unit?: string }[] | null;
      if (!data) return;
      const bu = (l: { business_unit?: string }) => l.business_unit || "build";
      setCounts({
        total:     data.length,
        new:       data.filter(l => l.stage === "new").length,
        followup:  data.filter(l => l.stage === "followup").length,
        qualified: data.filter(l => l.stage === "qualified").length,
        closed:    data.filter(l => l.stage === "closed").length,
        byBusiness: {
          build: data.filter(l => bu(l) === "build").length,
          reno:  data.filter(l => bu(l) === "reno").length,
          list:  data.filter(l => bu(l) === "list").length,
        },
      });
    }
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, []);

  return counts;
}

function useLiveData() {
  const [data, setData]     = useState<typeof MOCK>(MOCK);
  const [live, setLive]     = useState(false);
  const [lastSync, setSync] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/api/state`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) throw new Error();
      setData(await r.json()); setLive(true); setSync(new Date());
    } catch { setLive(false); }
  }, []);

  useEffect(() => { fetch_(); const id = setInterval(fetch_, POLL_MS); return () => clearInterval(id); }, [fetch_]);
  return { data, live, lastSync };
}

function useAnimNum(target: number, dur = 800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let s: number | null = null;
    const step = (ts: number) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, dur]);
  return n;
}

function Dot({ color }: { color: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: color, opacity: .4, animation: "ping 1.4s cubic-bezier(0,0,.2,1) infinite" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function EngineCard({ title, subtitle, statusText, metrics, channel, actions, accent, actionLinks }: {
  title: string; subtitle: string; statusText: string;
  metrics: [string, number | string][]; channel: string; actions: string[]; accent: string;
  actionLinks?: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <div style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${accent}22`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: accent, fontWeight: 600 }}>{subtitle}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginTop: 4, fontFamily: "'DM Serif Display',serif" }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 20, padding: "4px 10px" }}>
          <Dot color={accent} />
          <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{statusText}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {metrics.map(([k, v]) => (
          <div key={k} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".1em" }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 14px" }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>CHANNEL</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{channel}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>Next Actions</div>
        {actions.map((a, i) => {
          const link = actionLinks?.[a];
          return (
            <div
              key={i}
              onClick={link ? () => router.push(link) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: link ? `${accent}0a` : "rgba(255,255,255,.02)",
                border: `1px solid ${link ? accent + "30" : "rgba(255,255,255,.05)"}`,
                borderRadius: 10, padding: "8px 12px", fontSize: 12,
                color: link ? accent : "#94a3b8", marginBottom: 6,
                cursor: link ? "pointer" : "default",
                transition: "all .2s",
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0 }} />
              {a}
              {link && <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BIZ_META: Record<string, { title: string; icon: string; color: string; focus: string; tasks: string[] }> = {
  build: { title: "รับสร้างบ้าน",          icon: "🏗️", color: "#f59e0b", focus: "บ้าน 5–15 ล้านบาท",      tasks: ["ติดตาม lead ด่วน", "สรุป BOQ เบื้องต้น", "นัดคุย 30 นาที"] },
  reno:  { title: "รีโนเวทบ้านเพื่อขาย",  icon: "🔨", color: "#10b981", focus: "คัดทรัพย์ + ปรับมูลค่า",  tasks: ["ประเมินต้นทุนรีโนเวท", "เช็กมาร์จินขายต่อ", "สรุปทรัพย์น่าสนใจ"] },
  list:  { title: "รับฝากขายบ้านและที่ดิน", icon: "🏠", color: "#6366f1", focus: "Listing + Buyer Matching", tasks: ["ลงประกาศเพิ่ม", "ติดตาม inquiry", "นัดชมทรัพย์"] },
};

function BizCard({ id, count }: { id: string; count: number }) {
  const { title, icon, color, focus, tasks } = BIZ_META[id];
  const n = useAnimNum(count);
  return (
    <div style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${color}18`, borderRadius: 20, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
          <div style={{ fontSize: 11, color, marginTop: 2 }}>{focus}</div>
        </div>
      </div>
      <div style={{ textAlign: "center", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "12px 8px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Leads</div>
        <div style={{ fontSize: 32, fontWeight: 800, color, marginTop: 4 }}>{n}</div>
      </div>
      {tasks.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />{t}
        </div>
      ))}
    </div>
  );
}

// ── Market Intel Tab ─────────────────────────────────────────────────────────
const N8N_INTEL_URL = "/api/market-intel";

const AREA_LIST = [
  "ลาดหลุมแก้ว", "รังสิต", "คลองสาม", "ธัญบุรี", "ลำลูกกา",
  "ปทุมธานี", "นนทบุรี", "บางใหญ่", "บางบัวทอง", "สาทร",
  "ลาดพร้าว", "มีนบุรี", "หนองจอก", "อื่นๆ",
];

const TIMING_LIST = [
  { v: "none",       l: "ทั่วไป" },
  { v: "bonus",      l: "📈 โบนัสออก" },
  { v: "rate_up",    l: "💸 ดอกเบี้ยขึ้น" },
  { v: "rainy",      l: "🌧️ หน้าฝน" },
  { v: "new_year",   l: "🎊 ปีใหม่" },
  { v: "marriage",   l: "💍 เพิ่งแต่งงาน" },
  { v: "land_ready", l: "📐 มีที่ดินแล้ว" },
];

function MarketIntelTab() {
  const [text, setText]     = useState("");
  const [area, setArea]     = useState("ลาดหลุมแก้ว");
  const [timing, setTiming] = useState("none");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<"ok" | "error" | null>(null);
  const [history, setHistory] = useState<{ text: string; area: string; timing: string; ts: string }[]>([]);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(N8N_INTEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), area, timing }),
      });
      const ok = r.ok || r.status === 200;
      setResult(ok ? "ok" : "error");
      if (ok) {
        setHistory(prev => [
          { text: text.trim(), area, timing, ts: new Date().toLocaleString("th-TH") },
          ...prev.slice(0, 9),
        ]);
        setText("");
      }
    } catch {
      setResult("error");
    } finally { setLoading(false); }
  }

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 14, padding: "20px 22px",
  };

  return (
    <div style={{ display: "flex", gap: 20, maxWidth: 900 }}>
      {/* Left: Form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#e879f9", letterSpacing: ".1em" }}>
          🧠 MARKET INTELLIGENCE — บันทึกสิ่งที่เห็นในตลาด
        </div>

        {/* Text */}
        <div style={card}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>สิ่งที่สังเกตเห็น / ข้อมูลลูกค้า</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="เช่น: ลูกค้าถามเรื่องน้ำท่วมก่อนเลย, บ้าน Modern ปิดไว, ลูกค้าส่วนใหญ่ทำงานนิคมสหรัตน์..."
            rows={4}
            style={{
              width: "100%", background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.1)", borderRadius: 10,
              color: "#e2e8f0", fontSize: 13, padding: "10px 12px",
              outline: "none", resize: "vertical", fontFamily: "inherit",
              lineHeight: 1.6, boxSizing: "border-box",
            }}
          />
        </div>

        {/* Area + Timing */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>พื้นที่</div>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              style={{
                width: "100%", background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.1)", borderRadius: 10,
                color: "#e2e8f0", fontSize: 13, padding: "9px 12px", outline: "none",
              }}
            >
              {AREA_LIST.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Timing Signal</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {TIMING_LIST.map(t => (
                <button
                  key={t.v}
                  onClick={() => setTiming(t.v)}
                  style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: timing === t.v ? "rgba(232,121,249,.15)" : "rgba(255,255,255,.04)",
                    color: timing === t.v ? "#e879f9" : "#64748b",
                    border: timing === t.v ? "1px solid rgba(232,121,249,.3)" : "1px solid rgba(255,255,255,.06)",
                  }}
                >{t.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading || !text.trim()}
          style={{
            padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: loading || !text.trim() ? "not-allowed" : "pointer",
            background: loading ? "rgba(232,121,249,.05)" : "rgba(232,121,249,.15)",
            color: loading || !text.trim() ? "#334155" : "#e879f9",
            border: "1px solid rgba(232,121,249,.3)",
          }}
        >
          {loading ? "⏳ กำลังส่ง..." : "🧠 บันทึก Market Intel"}
        </button>

        {result === "ok" && (
          <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#34d399" }}>
            ✅ บันทึกสำเร็จ! AI กำลังวิเคราะห์ → Positioned Content จะส่งมาใน Telegram
          </div>
        )}
        {result === "error" && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#f87171" }}>
            ❌ ส่งไม่สำเร็จ — ตรวจสอบว่า n8n Market Intel workflow ถูก Publish แล้วหรือยัง
          </div>
        )}

        {/* Info */}
        <div style={{ background: "rgba(232,121,249,.05)", border: "1px solid rgba(232,121,249,.15)", borderRadius: 10, padding: "12px 16px", fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
          <div style={{ color: "#e879f9", fontWeight: 700, marginBottom: 4 }}>💡 บันทึกอะไรได้บ้าง?</div>
          · สิ่งที่ลูกค้าถามหรือกังวล เช่น "ถามน้ำท่วมก่อนเลย"<br/>
          · พฤติกรรมตลาด เช่น "บ้าน Modern ปิดไวกว่าปกติ"<br/>
          · Demand pattern เช่น "ลูกค้าส่วนใหญ่ทำงานนิคมสหรัตน์"<br/>
          · Timing เช่น "ช่วงโบนัสออก มีคนทักเยอะผิดปกติ"
        </div>
      </div>

      {/* Right: History */}
      {history.length > 0 && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: ".08em", marginBottom: 10 }}>
            📋 ส่งไปแล้ว (session นี้)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#e879f9", fontWeight: 700 }}>📍 {h.area}</span>
                  <span style={{ fontSize: 10, color: "#334155" }}>{h.ts}</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  {h.text.slice(0, 80)}{h.text.length > 80 ? "..." : ""}
                </div>
                {h.timing !== "none" && (
                  <div style={{ fontSize: 10, color: "#e879f9", marginTop: 4 }}>
                    {TIMING_LIST.find(t => t.v === h.timing)?.l}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardOS() {
  const { data, live, lastSync } = useLiveData();
  const leadCounts = useLeadCounts();
  const [clock, setClock] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "properties" | "intel" | "ops">("overview");
  useEffect(() => {
    setClock(new Date());
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { blog, fb, alerts } = data as any;
  // leads มาจาก Supabase โดยตรง — ไม่ผ่าน Hub
  const leads = leadCounts;
  const totalLeads = useAnimNum(leads.new);

  // pipeline ดึงจาก Supabase ทั้งหมด — Traffic ยังไม่มี source (Vercel Analytics ยังไม่ enable)
  const pipeline: { label: string; value: number | null; icon: string; color: string; noSource?: boolean }[] = [
    { label: "Traffic",   value: null,              icon: "📡", color: "#22d3ee", noSource: true },
    { label: "Leads",     value: leads.new,         icon: "🎯", color: "#6366f1" },
    { label: "Appts",     value: leads.followup,    icon: "📅", color: "#f59e0b" },
    { label: "Proposals", value: leads.qualified,   icon: "📋", color: "#10b981" },
    { label: "Closed",    value: leads.closed,      icon: "✅", color: "#f43f5e" },
  ];
  const pipelineMax = Math.max(...pipeline.map(p => p.value ?? 0), 1);

  const TAB_STYLE = (active: boolean) => ({
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all .2s",
    background: active ? "#22d3ee18" : "transparent",
    color: active ? "#22d3ee" : "#64748b",
    borderBottom: active ? "2px solid #22d3ee" : "2px solid transparent",
  });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TAB BAR */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,.07)", paddingBottom: 0 }}>
        <button style={TAB_STYLE(activeTab === "overview")} onClick={() => setActiveTab("overview")}>
          📊 Overview
        </button>
        <button style={TAB_STYLE(activeTab === "properties")} onClick={() => setActiveTab("properties")}>
          🏠 ทรัพย์รอ Review
        </button>
        <button style={TAB_STYLE(activeTab === "intel")} onClick={() => setActiveTab("intel")}>
          🧠 Market Intel
        </button>
        <button style={TAB_STYLE(activeTab === "ops")} onClick={() => setActiveTab("ops")}>
          📊 Ops
        </button>
      </div>

      {/* PROPERTIES TAB */}
      {activeTab === "properties" && <PropertyReview />}

      {/* MARKET INTEL TAB */}
      {activeTab === "intel" && <MarketIntelTab />}

      {/* OPS TAB */}
      {activeTab === "ops" && <OperationalDashboard />}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && <>

      {/* HEADER */}
      <div className="animate-fadeUp" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 24, padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Dot color={live ? "#22d3ee" : "#f43f5e"} />
              <span suppressHydrationWarning>{live ? `LIVE — sync ${lastSync?.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "OFFLINE — แสดงข้อมูล mock"}</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", fontFamily: "'DM Serif Display',serif", background: "linear-gradient(135deg,#f1f5f9 40%,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Finnhouses Real Estate OS
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>ศูนย์ควบคุม 2 content engines + 3 ธุรกิจหลัก</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", fontVariantNumeric: "tabular-nums" }} suppressHydrationWarning>
              {clock ? clock.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }} suppressHydrationWarning>
              {clock ? clock.toLocaleDateString("th-TH", { weekday: "long", month: "long", day: "numeric" }) : "—"}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "FB Engine",   value: fb?.status  ?? "—", color: "#22d3ee" },
            { label: "Blog Engine", value: blog?.status ?? "—", color: "#10b981" },
            { label: "New Leads",   value: String(totalLeads),  color: "#f59e0b" },
            { label: "Errors",      value: String(blog?.failed ?? 0), color: "#f43f5e" },
          ].map(c => (
            <div key={c.label} style={{ background: `${c.color}0f`, border: `1px solid ${c.color}25`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: c.color, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ENGINES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <EngineCard
          title="FB Content Engine" subtitle="Web App / VS Code"
          statusText={fb?.status ?? "—"}
          metrics={[["Queue", fb?.queue ?? 0], ["Drafts", fb?.drafts ?? 0], ["Published", fb?.published ?? 0], ["Host", "Railway"]]}
          channel="Facebook Page · Railway (fb-backend)"
          actions={["เตรียมโพสต์ขายบ้าน", "จัดคิว content 7 วัน", "เช็ก CTA finnhouses.com"]}
          actionLinks={{ "จัดคิว content 7 วัน": "/ai-content" }}
          accent="#22d3ee"
        />
        <EngineCard
          title="Blog Content Engine" subtitle="n8n / finnhouses.com"
          statusText={blog?.status ?? "—"}
          metrics={[["Queue", blog?.queue ?? 0], ["Published", blog?.published ?? 0], ["Failed", blog?.failed ?? 0], ["Host", "Railway"]]}
          channel="finnhouses.com via n8n · Railway (primary)"
          actions={["บทความ SEO รอ publish", "ตรวจ featured image flow", "เช็ก internal link"]}
          actionLinks={{ "บทความ SEO รอ publish": "/marketing" }}
          accent="#10b981"
        />
      </div>

      {/* PIPELINE */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>REVENUE PIPELINE</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>Traffic → Leads → Sales</div>
        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {pipeline.map(p => (
            <div key={p.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20 }}>{p.icon}</div>
              <div style={{ width: "100%", height: 80, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 10, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                {p.noSource ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: ".08em" }}>no source</span>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: `${Math.max(4, ((p.value ?? 0) / pipelineMax) * 100)}%`, background: `linear-gradient(to top,${p.color},${p.color}88)`, borderRadius: 8 }} />
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: p.noSource ? "#475569" : p.color }}>
                {p.noSource ? "—" : p.value}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BIZ CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        <BizCard id="build" count={leads.byBusiness.build} />
        <BizCard id="reno"  count={leads.byBusiness.reno}  />
        <BizCard id="list"  count={leads.byBusiness.list}  />
      </div>

      {/* ALERTS + CONNECTIONS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#f43f5e", fontWeight: 600, marginBottom: 4 }}>ALERTS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>สิ่งที่ต้องรีบดู</div>
          {(alerts ?? []).map((a: any, i: number) => {
            const c = ({ high: "#f43f5e", medium: "#f59e0b", low: "#22d3ee" } as any)[a.level];
            return (
              <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: `${c}0c`, border: `1px solid ${c}30`, marginBottom: 8, fontSize: 13, color: "#cbd5e1" }}>
                {a.text}
              </div>
            );
          })}
        </div>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>CONNECTIONS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Live Integration Status</div>
          {[
            { label: "Backend Hub",    port: "Railway", ok: live,                        color: "#22d3ee" },
            { label: "n8n Webhook",    port: "Railway", ok: live && !!(blog as any)?.updatedAt, color: "#10b981" },
            { label: "FB App Webhook", port: "Railway", ok: live && !!(fb as any)?.updatedAt,   color: "#6366f1" },
            { label: "Lead Sync",      port: "Supabase",ok: !!(leads as any)?.total && (leads as any).total > 0, color: "#f59e0b" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Dot color={row.ok ? row.color : "#475569"} />
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 11, color: row.ok ? row.color : "#475569", fontFamily: "monospace" }}>{row.port}</span>
            </div>
          ))}
        </div>
      </div>

      </> }
    </div>
  );
}
