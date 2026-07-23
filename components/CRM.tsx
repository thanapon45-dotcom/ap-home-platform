"use client";
import { useState, useEffect } from "react";
// NOTE (session 25, Jul 16 2026): leads CRUD moved server-side to /api/leads/*
// — direct supabase.from("leads") calls with the public anon key were removed
// here because RLS on `leads` is now locked down (deny anon entirely).
// See docs/issues-log.md ISSUE-013.

const BRAND_NAME = "Finnhouses";

// ─── Lead Stages ──────────────────────────────────────────────────────────────
const STAGES = [
  { key: "new",       label: "New Lead",    color: "#22d3ee", bg: "rgba(34,211,238,.08)"  },
  { key: "followup",  label: "Follow Up",   color: "#f59e0b", bg: "rgba(245,158,11,.08)"  },
  { key: "qualified", label: "Qualified",   color: "#a855f7", bg: "rgba(168,85,247,.08)"  },
  { key: "closed",    label: "Closed ✅",   color: "#10b981", bg: "rgba(16,185,129,.08)"  },
];

// ─── Lead Sources ─────────────────────────────────────────────────────────────
const SOURCES = [
  "Budget Tool",
  "Facebook Ads",
  "FB Content",
  "Blog / SEO",
  "LINE OA",
  "Website",
  "Referral",
  "Google Ads",
  "TikTok",
  "Instagram",
  "งาน Expo",
  "Walk-in",
];

const STYLES = ["Modern Minimal", "Nordic", "Luxury", "Contemporary", "Loft", "Tropical Modern", "Minimal"];

const INTENTS = [
  { value: "build",    label: "🏗️ สร้างบ้าน" },
  { value: "buy",      label: "🏠 ซื้อบ้าน" },
  { value: "sell",     label: "💼 ฝากขาย" },
  { value: "renovate", label: "🔨 รีโนเวท" },
  { value: "invest",   label: "📈 ลงทุน" },
];

const URGENCIES = [
  { value: "hot",  label: "🔥 Hot",  color: "#f43f5e" },
  { value: "warm", label: "🌡️ Warm", color: "#f59e0b" },
  { value: "cold", label: "🧊 Cold", color: "#22d3ee" },
];

const OUTCOMES = ["pending", "won", "lost"];

const NURTURE_SEQUENCES = [
  { day: 0,  action: "ส่ง Welcome Package + Portfolio PDF",                 icon: "📧" },
  { day: 3,  action: "โทรติดตาม + นัดชม Showroom",                          icon: "📞" },
  { day: 7,  action: "ส่งวิดีโอ Walkthrough บ้านที่เพิ่งสร้างเสร็จ",       icon: "🎬" },
  { day: 14, action: "แชร์บทความ 'คำถามที่ควรถามก่อนสร้างบ้าน'",          icon: "📄" },
  { day: 21, action: "ส่ง Testimonial จากลูกค้าในพื้นที่เดียวกัน",         icon: "⭐" },
  { day: 30, action: "เสนอโปรโมชั่นพิเศษ + กำหนดวันหมดอายุ",             icon: "🎁" },
];

const MARKET_DATA = [
  { month: "ต.ค.", leads: 38, revenue: 12.4 },
  { month: "พ.ย.", leads: 45, revenue: 16.8 },
  { month: "ธ.ค.", leads: 52, revenue: 23.1 },
  { month: "ม.ค.", leads: 41, revenue: 19.5 },
  { month: "ก.พ.", leads: 61, revenue: 28.7 },
  { month: "มี.ค.", leads: 74, revenue: 35.2 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Lead = {
  id: string;
  name: string; phone: string; budget: string; style: string;
  stage: string; score: number; source: string; lead_date: string; area: number | string | null; notes: string;
  business_unit: "reno" | "list" | "consult";
  intent?: string;
  urgency?: string;
  outcome?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLabel(): string {
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const d = new Date();
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// budget may arrive as "2.5M" (CRM-added) or "2160000" (old numeric) — normalise to "X.XM"
function normBudget(raw: unknown): string {
  if (typeof raw === "string" && raw.endsWith("M")) return raw;
  const n = parseFloat(String(raw));
  if (!isNaN(n) && n > 1000) return `${(n / 1_000_000).toFixed(1)}M`;
  return String(raw ?? "");
}

// ─── API Helpers ──────────────────────────────────────────────────────────────
async function callClaude(system: string, prompt: string, maxTokens = 1200): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Claude API error");
  return data.text;
}

// ─── Export Helpers ───────────────────────────────────────────────────────────
function exportLeadsCSV(leads: Lead[]) {
  const headers = ["ชื่อ", "เบอร์โทร", "งบประมาณ", "สไตล์", "พื้นที่", "แหล่งที่มา", "สถานะ", "Score", "วันที่", "หมายเหตุ", "Business Unit", "Intent", "Urgency", "Outcome", "Location"];
  const rows = leads.map(l => [l.name, l.phone, l.budget, l.style, l.area, l.source, l.stage, l.score, l.lead_date, l.notes, l.business_unit, l.intent ?? "", l.urgency ?? "", l.outcome ?? "", l.location ?? ""]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `finnhouses_leads_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Mini UI ──────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#EF5350" : score >= 70 ? "#FF9800" : "#66BB6A";
  return <span style={{ background: color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{score}%</span>;
}

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 8 }} />
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lead: Lead) => void }) {
  const [form, setForm] = useState({ name: "", phone: "", budget: "", style: "Modern Minimal", area: "", source: "Budget Tool", notes: "", stage: "new", business_unit: "reno" as "reno" | "list" | "consult", intent: "build", urgency: "warm", location: "", outcome: "pending" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.15)", fontSize: 13, boxSizing: "border-box" as const, background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontFamily: "inherit" };

  async function submit() {
    if (!form.name || !form.phone || !form.budget || !form.area) { setError("กรุณากรอก ชื่อ, เบอร์, งบ, พื้นที่"); return; }
    setSaving(true);
    // NOTE (session 25, Jul 16 2026): fixed pre-existing bug — `leads.area` is a
    // numeric column (square meters, populated by the Budget Tool) but this form's
    // "พื้นที่" field is a district name (text), causing "invalid input syntax for
    // type numeric" on every manual Add Lead. Fold the district text into `location`
    // instead (same concept as the "พื้นที่ที่สนใจ" field below) and leave the
    // numeric `area` column unset for manually-added leads.
    const payload = {
      name: form.name,
      phone: form.phone,
      budget: form.budget,
      style: form.style,
      source: form.source,
      notes: form.notes,
      stage: form.stage,
      business_unit: form.business_unit,
      intent: form.intent,
      urgency: form.urgency,
      location: form.location || form.area,
      outcome: form.outcome,
      score: Math.floor(Math.random() * 30) + 55,
      lead_date: todayLabel(),
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.ok === false) { setError(`บันทึกไม่สำเร็จ: ${json.error ?? `HTTP ${res.status}`}`); return; }
    onAdd(json.data as Lead);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0f1428", borderRadius: 20, padding: 32, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>➕ เพิ่ม Lead ใหม่</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.08)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
        </div>
        {error && <div style={{ background: "rgba(244,63,94,.12)", border: "1px solid rgba(244,63,94,.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#fda4af" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          {([ ["ชื่อ-นามสกุล","name","คุณสมชาย ใจดี"], ["เบอร์โทร","phone","081-xxx-xxxx"], ["งบประมาณ","budget","เช่น 2.5M"], ["พื้นที่","area","ปทุมธานี"] ] as [string, keyof typeof form, string][]).map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>{label} <span style={{ color: "#f43f5e" }}>*</span></label>
              <input value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>ธุรกิจ <span style={{ color: "#f43f5e" }}>*</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {([
              { value: "reno",    label: "🔨 รีโนเวท (Fix & Flip)", color: "#10b981" },
              { value: "consult", label: "🔍 ที่ปรึกษา/ตรวจสอบ",     color: "#f59e0b" },
              { value: "list",    label: "🏠 ฝากขาย",                color: "#6366f1" },
            ] as const).map(opt => (
              <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, business_unit: opt.value }))} style={{
                padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: form.business_unit === opt.value ? `${opt.color}18` : "rgba(255,255,255,.03)",
                border: `1.5px solid ${form.business_unit === opt.value ? opt.color + "60" : "rgba(255,255,255,.1)"}`,
                color: form.business_unit === opt.value ? opt.color : "#64748b",
              }}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>สไตล์บ้าน</label>
            <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} style={{ ...inputStyle, background: "rgba(8,12,28,.95)" }}>
              {STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>แหล่งที่มา</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={{ ...inputStyle, background: "rgba(8,12,28,.95)" }}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Intent */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>ความต้องการ (Intent)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
            {INTENTS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, intent: opt.value }))} style={{
                padding: "7px 4px", borderRadius: 8, cursor: "pointer", fontSize: 10, fontWeight: 600, textAlign: "center",
                background: form.intent === opt.value ? "rgba(34,211,238,.15)" : "rgba(255,255,255,.03)",
                border: `1.5px solid ${form.intent === opt.value ? "rgba(34,211,238,.5)" : "rgba(255,255,255,.1)"}`,
                color: form.intent === opt.value ? "#22d3ee" : "#64748b",
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Urgency + Location */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>ความเร่งด่วน</label>
            <div style={{ display: "flex", gap: 6 }}>
              {URGENCIES.map(u => (
                <button key={u.value} type="button" onClick={() => setForm(f => ({ ...f, urgency: u.value }))} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
                  background: form.urgency === u.value ? `${u.color}18` : "rgba(255,255,255,.03)",
                  border: `1.5px solid ${form.urgency === u.value ? u.color + "60" : "rgba(255,255,255,.1)"}`,
                  color: form.urgency === u.value ? u.color : "#64748b",
                }}>{u.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>พื้นที่ที่สนใจ</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="ลำลูกกา / รังสิต / นนทบุรี" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>หมายเหตุ</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="ข้อมูลเพิ่มเติม..." />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={submit} disabled={saving} style={{ flex: 2, background: saving ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#22d3ee,#0891b2)", color: saving ? "#64748b" : "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
            {saving ? "⏳ กำลังบันทึก..." : "✅ บันทึก Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────
function PipelineTab({ leads, setLeads, deleteLead }: { leads: Lead[]; setLeads: React.Dispatch<React.SetStateAction<Lead[]>>; deleteLead: (id: string) => void }) {
  const [selected, setSelected]     = useState<Lead | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing]   = useState(false);
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);

  // `area` is a numeric DB column (square meters) — can be a number, null, or (for
  // legacy/CSV rows) a string, so coerce before .includes() to avoid a TypeError crash.
  const filtered = leads.filter(l => l.name.includes(search) || String(l.area ?? "").includes(search) || l.source.toLowerCase().includes(search.toLowerCase()));

  async function analyzeLead(lead: Lead) {
    setSelected(lead); setAnalyzing(true); setAiAnalysis("");
    try {
      const text = await callClaude(
        `คุณคือผู้เชี่ยวชาญด้านการขายบ้านสำหรับ ${BRAND_NAME}`,
        `วิเคราะห์ Lead: ${lead.name} | งบ: ${lead.budget} | สไตล์: ${lead.style} | พื้นที่: ${lead.area} | Location: ${lead.location ?? "-"} | แหล่งที่มา: ${lead.source} | Score: ${lead.score}% | Intent: ${lead.intent ?? "-"} | Urgency: ${lead.urgency ?? "-"} | Note: ${lead.notes}\n\nให้: 1)ประเมินความพร้อมซื้อ 2)Pain point ที่น่าจะมี 3)กลยุทธ์ปิดการขาย 3 ข้อ 4)Script โทรหา (1-2 ประโยค)`,
      );
      setAiAnalysis(text);
    } catch (e: unknown) { setAiAnalysis(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    setAnalyzing(false);
  }

  async function moveStage(lead: Lead, dir: 1 | -1) {
    const idx = STAGES.findIndex(s => s.key === lead.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    await fetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next.key, updated_at: new Date().toISOString() }),
    });
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage: next.key } : l));
    if (selected?.id === lead.id) setSelected(prev => prev ? { ...prev, stage: next.key } : null);
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)",
    fontSize: 14, background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontFamily: "inherit", outline: "none",
  };

  function sourceIcon(src: string) {
    if (src.includes("Budget")) return "🧮";
    if (src.includes("FB Content") || src.includes("Facebook")) return "📘";
    if (src.includes("Blog")) return "📰";
    if (src.includes("LINE")) return "💚";
    if (src.includes("TikTok")) return "🎵";
    if (src.includes("Google")) return "🔍";
    if (src.includes("Referral")) return "🤝";
    if (src.includes("Instagram")) return "📸";
    return "📌";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={lead => { setLeads(ls => [lead, ...ls]); setShowAdd(false); }} />}

      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input placeholder="🔍 ค้นหาชื่อ / พื้นที่ / แหล่งที่มา..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
          <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>➕ เพิ่ม Lead</button>
          <button onClick={() => exportLeadsCSV(leads)} style={{ background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 14px", fontSize: 13, cursor: "pointer" }} title="Export CSV">📤</button>
        </div>

        {STAGES.map(stage => {
          const stageLeads = filtered.filter(l => l.stage === stage.key);
          return (
            <div key={stage.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", background: stage.bg, borderRadius: 10, border: `1px solid ${stage.color}30` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: stage.color }}>{stage.label}</span>
                <span style={{ background: `${stage.color}25`, color: stage.color, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{stageLeads.length}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "#475569" }}>
                  {stageLeads.length === 0 ? "ไม่มี Lead ในขั้นนี้" : `฿${stageLeads.reduce((s, l) => s + parseFloat(l.budget) || s, 0).toFixed(1)}M รวม`}
                </span>
              </div>

              {stageLeads.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)", borderRadius: 12, padding: "16px", textAlign: "center", color: "#334155", fontSize: 12 }}>
                  ยังไม่มี Lead ในขั้นนี้
                </div>
              ) : stageLeads.map(lead => (
                <div key={lead.id} onClick={() => analyzeLead(lead)} style={{
                  background: selected?.id === lead.id ? "rgba(34,211,238,.06)" : "rgba(15,20,40,.85)",
                  border: selected?.id === lead.id ? "2px solid rgba(34,211,238,.4)" : "1px solid rgba(255,255,255,.07)",
                  borderRadius: 13, padding: "12px 16px", cursor: "pointer", marginBottom: 7,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "all .15s",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{lead.name}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>💰 {normBudget(lead.budget)}</span>
                      <span>🏠 {lead.style}</span>
                      <span>📍 {lead.area}</span>
                      <span style={{ color: "#64748b" }}>{sourceIcon(lead.source)} {lead.source}</span>
                      {lead.urgency && (() => { const u = URGENCIES.find(x => x.value === lead.urgency); return u ? <span style={{ color: u.color, fontWeight: 700 }}>{u.label}</span> : null; })()}
                      {lead.intent && <span style={{ color: "#a855f7" }}>🎯 {lead.intent}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); moveStage(lead, -1); }} style={{ background: "rgba(255,255,255,.06)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 11, color: "#94a3b8" }} title="ย้อนกลับ">◀</button>
                    <button onClick={e => { e.stopPropagation(); moveStage(lead, 1); }} style={{ background: "rgba(255,255,255,.06)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 11, color: "#94a3b8" }} title="ขั้นถัดไป">▶</button>
                    <button onClick={e => { e.stopPropagation(); deleteLead(lead.id); }} style={{ background: "rgba(244,63,94,.1)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 11, color: "#f43f5e" }} title="ลบ">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      <Card style={{ alignSelf: "start", position: "sticky", top: 0 }}>
        {selected ? (
          <>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{selected.name}</h3>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
              <ScoreBadge score={selected.score} />
              <span style={{ background: "rgba(34,211,238,.12)", color: "#22d3ee", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{selected.style}</span>
              <span style={{ background: "rgba(255,255,255,.07)", color: "#94a3b8", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{selected.source}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 2, color: "#94a3b8", border: "1px solid rgba(255,255,255,.06)" }}>
              📞 {selected.phone}<br />
              💰 {normBudget(selected.budget)}<br />
              📍 {selected.area}<br />
              {selected.location && <span>🗺️ {selected.location}<br /></span>}
              {selected.intent && <span>🎯 Intent: <strong style={{ color: "#a855f7" }}>{selected.intent}</strong><br /></span>}
              {selected.urgency && (() => { const u = URGENCIES.find(x => x.value === selected.urgency); return u ? <span>⚡ Urgency: <strong style={{ color: u.color }}>{u.label}</strong><br /></span> : null; })()}
              {selected.outcome && <span>📋 Outcome: <strong style={{ color: selected.outcome === "won" ? "#10b981" : selected.outcome === "lost" ? "#f43f5e" : "#94a3b8" }}>{selected.outcome}</strong><br /></span>}
              {selected.notes && <span>📝 {selected.notes}</span>}
            </div>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>🤖 AI วิเคราะห์ Lead</h4>
            {analyzing ? (
              <div style={{ textAlign: "center", padding: 16, color: "#22d3ee", fontSize: 13 }}>⏳ กำลังวิเคราะห์...</div>
            ) : aiAnalysis ? (
              <div style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 12, padding: 12, fontSize: 12.5, lineHeight: 1.8, maxHeight: 280, overflowY: "auto", whiteSpace: "pre-wrap", color: "#fbbf24" }}>{aiAnalysis}</div>
            ) : (
              <div style={{ textAlign: "center", padding: 14, color: "#475569", fontSize: 12 }}>คลิก Lead เพื่อให้ AI วิเคราะห์ทันที</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <a href={`tel:${selected.phone}`} style={{ flex: 1, background: "#f43f5e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>📞 โทร</a>
              <button onClick={() => navigator.clipboard.writeText(`${selected.name}\n${selected.phone}\n${normBudget(selected.budget)} | ${selected.area}`)} style={{ flex: 1, background: "rgba(34,211,238,.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.3)", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 คัดลอก</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 50, color: "#475569" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👆</div>
            <div style={{ fontSize: 13 }}>คลิก Lead เพื่อดูรายละเอียด<br />และให้ AI วิเคราะห์</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ leads }: { leads: Lead[] }) {
  const total    = leads.length;
  const closed   = leads.filter(l => l.stage === "closed").length;
  const hotLeads = leads.filter(l => l.score >= 80).sort((a, b) => b.score - a.score);

  const sourceCounts = SOURCES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.source === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { icon: "👥", label: "Lead ทั้งหมด",   value: total,           sub: "ทุก stage รวมกัน",      color: "#22d3ee" },
          { icon: "✅", label: "Closed",          value: closed,          sub: `${total ? Math.round(closed/total*100) : 0}% conversion`, color: "#10b981" },
          { icon: "🔥", label: "Hot Leads ≥80%",  value: hotLeads.length, sub: "ส่งต่อฝ่ายขายได้เลย",  color: "#f43f5e" },
          { icon: "💰", label: "รายได้คาดการณ์", value: "35.2M",         sub: "↑ 23% MoM",            color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${s.color}25`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 32 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{s.label}</div>
              <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>🔻 Sales Funnel</h3>
          {STAGES.map(s => {
            const count = leads.filter(l => l.stage === s.key).length;
            return (
              <div key={s.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{count} ราย</span>
                </div>
                <SimpleBar value={count} max={total || 1} color={s.color} />
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>📥 Lead ตามแหล่งที่มา</h3>
          {SOURCES.filter(s => sourceCounts[s] > 0).map(s => (
            <div key={s} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12.5 }}>
                <span style={{ color: "#94a3b8" }}>{s}</span>
                <span style={{ fontWeight: 700, color: "#22d3ee" }}>{sourceCounts[s]}</span>
              </div>
              <SimpleBar value={sourceCounts[s]} max={total || 1} color="#22d3ee" />
            </div>
          ))}
          {SOURCES.every(s => sourceCounts[s] === 0) && (
            <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 20 }}>ยังไม่มีข้อมูล Lead</div>
          )}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>📅 Lead รายเดือน</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
            {MARKET_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#22d3ee" }}>{d.leads}</div>
                <div style={{ width: "100%", background: i === 5 ? "#22d3ee" : "rgba(34,211,238,.25)", borderRadius: "4px 4px 0 0", height: `${(d.leads / 80) * 110}px` }} />
                <div style={{ fontSize: 10, color: "#64748b" }}>{d.month}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>🔥 Hot Leads</h3>
          {hotLeads.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 20 }}>ยังไม่มี Hot Lead (score ≥ 80%)</div>
          ) : hotLeads.slice(0, 4).map(lead => (
            <div key={lead.id} style={{ background: "rgba(244,63,94,.05)", border: "1px solid rgba(244,63,94,.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{lead.name}</span>
                <ScoreBadge score={lead.score} />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>💰 {normBudget(lead.budget)} · 📍 {lead.area} · {lead.source}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Nurture Tab ──────────────────────────────────────────────────────────────
function NurtureTab({ leads }: { leads: Lead[] }) {
  const nurtureLeads = leads.filter(l => ["followup", "qualified"].includes(l.stage));
  const [selected, setSelected] = useState<Lead | null>(nurtureLeads[0] ?? null);
  const [msg, setMsg]           = useState("");
  const [loading, setLoading]   = useState(false);

  async function genSequence() {
    if (!selected) return;
    setLoading(true);
    try {
      const text = await callClaude(
        `คุณคือผู้เชี่ยวชาญ Lead Nurturing สำหรับ ${BRAND_NAME} บริษัทรับสร้างบ้านคุณภาพสูง`,
        `สร้างแผน Lead Nurturing 30 วัน สำหรับ: ${selected.name} | งบ: ${normBudget(selected.budget)} | สไตล์: ${selected.style} | พื้นที่: ${selected.area} | แหล่งที่มา: ${selected.source} | Score: ${selected.score}%\n\nสร้างข้อความจริงสำหรับ touchpoint วัน 0, 3, 7, 14, 21, 30 ปรับให้เหมาะกับโปรไฟล์ลูกค้านี้ รวมถึงอ้างอิงแหล่งที่มาในการพูดคุย`,
        1400
      );
      setMsg(text);
    } catch (e: unknown) { setMsg(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    setLoading(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>👥 Lead ที่กำลัง Follow Up</h3>
          {nurtureLeads.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 12 }}>ไม่มี Lead ใน Follow Up / Qualified</div>
          ) : nurtureLeads.map(lead => (
            <div key={lead.id} onClick={() => { setSelected(lead); setMsg(""); }} style={{
              background: selected?.id === lead.id ? "rgba(34,211,238,.08)" : "rgba(255,255,255,.02)",
              border: selected?.id === lead.id ? "1px solid rgba(34,211,238,.35)" : "1px solid rgba(255,255,255,.06)",
              borderRadius: 12, padding: 12, marginBottom: 7, cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{lead.name}</span>
                <ScoreBadge score={lead.score} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{lead.area} | {lead.source}</div>
            </div>
          ))}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>📅 Sequence Template</h3>
          {NURTURE_SEQUENCES.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{ background: "rgba(34,211,238,.15)", color: "#22d3ee", borderRadius: 20, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", marginTop: 2, border: "1px solid rgba(34,211,238,.3)" }}>D+{s.day}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{s.icon} {s.action}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        {selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>💌 Nurture Plan — {selected.name}</h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>{selected.area} | {normBudget(selected.budget)} | {selected.source}</div>
              </div>
              <button onClick={genSequence} disabled={loading} style={{
                background: loading ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
                color: loading ? "#64748b" : "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              }}>
                {loading ? "⏳ สร้าง..." : "🤖 AI สร้างแผน Personalized"}
              </button>
            </div>
            {msg ? (
              <>
                <div style={{ background: "rgba(168,85,247,.06)", borderRadius: 12, padding: 18, fontSize: 13, lineHeight: 1.9, color: "#e9d5ff", whiteSpace: "pre-wrap", maxHeight: 460, overflowY: "auto", border: "1px solid rgba(168,85,247,.2)" }}>{msg}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => navigator.clipboard.writeText(msg)} style={{ flex: 1, background: "rgba(34,211,238,.1)", color: "#22d3ee", border: "none", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 คัดลอก</button>
                </div>
              </>
            ) : (
              <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
                <div style={{ fontSize: 13, textAlign: "center" }}>กด AI สร้างแผน Personalized<br />สำหรับ {selected.name}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👈</div>
            เลือก Lead จากด้านซ้าย
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main CRM ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "pipeline", label: "Lead Pipeline", icon: "🎯" },
  { key: "overview", label: "ภาพรวม",        icon: "📊" },
  { key: "nurture",  label: "Follow Up",     icon: "💌" },
];

export default function CRM() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [importMsg, setImportMsg] = useState("");
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loadErr, setLoadErr]     = useState("");

  // ── Fetch from /api/leads on mount ──
  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(json => {
        if (json.ok === false) { setLoadErr(json.error ?? "โหลดไม่สำเร็จ"); return; }
        setLeads((json.data ?? []) as Lead[]);
      })
      .catch(e => setLoadErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"));
  }, []);

  async function deleteLead(id: string) {
    if (!window.confirm("ลบ Lead นี้?")) return;
    await fetch(`/api/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
    setLeads(ls => ls.filter(l => l.id !== id));
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").slice(1);
      const rows = lines.map(line => {
        const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
        const bu = cols[10] as "reno" | "list" | "consult";
        // `area` is a numeric DB column — CSV's "พื้นที่" column is often a district
        // name (text), which fails Postgres numeric validation. Only send it through
        // if it actually parses as a number; otherwise fold it into notes instead of
        // dropping it silently.
        const areaNum = cols[4] && !isNaN(Number(cols[4])) ? Number(cols[4]) : null;
        const areaNote = cols[4] && areaNum === null ? `พื้นที่: ${cols[4]}` : "";
        return {
          name: cols[0] || "", phone: cols[1] || "", budget: cols[2] || "",
          style: cols[3] || "Modern Minimal", area: areaNum,
          source: cols[5] || "CSV Import", stage: cols[6] || "new",
          score: parseInt(cols[7]) || 60, lead_date: cols[8] || "",
          notes: [cols[9], areaNote].filter(Boolean).join(" | "),
          // "build" (Unit 1, discontinued) ที่หลงเหลือจาก CSV เก่า fallback ไป "reno" แทน
          business_unit: (["reno","list","consult"].includes(bu) ? bu : "reno") as "reno" | "list" | "consult",
        };
      }).filter(r => r.name);

      if (!rows.length) { setImportMsg("❌ ไม่พบข้อมูล"); return; }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) { setImportMsg(`❌ ${json.error ?? `HTTP ${res.status}`}`); return; }
      setLeads(ls => [...(json.data as Lead[]), ...ls]);
      setImportMsg(`✅ Import ${rows.length} Lead`);
      setTimeout(() => setImportMsg(""), 3000);
    };
    reader.readAsText(file, "UTF-8"); e.target.value = "";
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ background: "rgba(15,20,40,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700 }}>CRM</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif", marginTop: 2 }}>
            {BRAND_NAME} — Lead Pipeline
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>รับ Lead จาก Budget Tool · FB Content · Blog · ช่องทางอื่น ๆ</div>
        </div>

        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 3 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: activeTab === tab.key ? "rgba(34,211,238,.18)" : "transparent",
              color: activeTab === tab.key ? "#22d3ee" : "#64748b",
              border: activeTab === tab.key ? "1px solid rgba(34,211,238,.3)" : "1px solid transparent",
              borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
              {tab.key === "pipeline" && <span style={{ background: "rgba(34,211,238,.2)", color: "#22d3ee", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{leads.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loadErr && <div style={{ background: "rgba(244,63,94,.15)", color: "#f43f5e", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>⚠️ {loadErr}</div>}
          {importMsg && (
            <div style={{ background: importMsg.startsWith("✅") ? "rgba(16,185,129,.15)" : "rgba(244,63,94,.15)", color: importMsg.startsWith("✅") ? "#10b981" : "#f43f5e", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>{importMsg}</div>
          )}
          <label style={{ background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            📥 CSV <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: "none" }} />
          </label>
          <button onClick={() => exportLeadsCSV(leads)} style={{ background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📤</button>
        </div>
      </div>

      {activeTab === "pipeline" && <PipelineTab leads={leads} setLeads={setLeads} deleteLead={deleteLead} />}
      {activeTab === "overview" && <OverviewTab leads={leads} />}
      {activeTab === "nurture"  && <NurtureTab leads={leads} />}
    </div>
  );
}
