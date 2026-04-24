"use client";
import { useState, useEffect } from "react";

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

const INITIAL_LEADS: Lead[] = [
  { id: 1, name: "คุณสมชาย ใจดี",    phone: "081-234-5678", budget: "2.5M", style: "Modern Minimal", stage: "new",       score: 72, source: "Budget Tool",  date: "10 มี.ค.", area: "ปทุมธานี", notes: "สนใจบ้านชั้นเดียว",        business_unit: "build" },
  { id: 2, name: "คุณพิมพ์ใจ รักสวย", phone: "089-876-5432", budget: "3.8M", style: "Nordic",         stage: "followup",  score: 85, source: "FB Content",   date: "9 มี.ค.",  area: "นนทบุรี",  notes: "บ้าน 2 ชั้น มีห้องทำงาน",  business_unit: "build" },
  { id: 3, name: "คุณวีระ มั่งมี",    phone: "092-111-2222", budget: "5.2M", style: "Luxury",         stage: "qualified", score: 91, source: "Blog / SEO",  date: "8 มี.ค.",  area: "กรุงเทพฯ", notes: "สนใจ Smart Home",            business_unit: "reno"  },
  { id: 4, name: "คุณนภา สดใส",       phone: "086-333-4444", budget: "1.8M", style: "Minimal",        stage: "new",       score: 63, source: "LINE OA",     date: "7 มี.ค.",  area: "อยุธยา",   notes: "งบจำกัด บ้านเล็กแต่ครบ",   business_unit: "list"  },
  { id: 5, name: "คุณเดชา แก้วใส",    phone: "095-555-6666", budget: "4.1M", style: "Modern Minimal", stage: "closed",    score: 96, source: "Budget Tool",  date: "6 มี.ค.",  area: "ปทุมธานี", notes: "เซ็นสัญญาแล้ว ✅",           business_unit: "build" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Lead = {
  id: number; name: string; phone: string; budget: string; style: string;
  stage: string; score: number; source: string; date: string; area: string; notes: string;
  business_unit: "build" | "reno" | "list";
};

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
  const headers = ["ชื่อ", "เบอร์โทร", "งบประมาณ", "สไตล์", "พื้นที่", "แหล่งที่มา", "สถานะ", "Score", "วันที่", "หมายเหตุ"];
  const rows = leads.map(l => [l.name, l.phone, l.budget, l.style, l.area, l.source, l.stage, l.score, l.date, l.notes]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `finnhouses_leads_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function parseLeadsCSV(text: string): Lead[] {
  const lines = text.trim().split("\n").slice(1);
  return lines.map((line, i) => {
    const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
    const bu = cols[10] as "build" | "reno" | "list";
    return { id: Date.now() + i, name: cols[0] || "", phone: cols[1] || "", budget: cols[2] || "", style: cols[3] || "Modern Minimal", area: cols[4] || "", source: cols[5] || "CSV Import", stage: cols[6] || "new", score: parseInt(cols[7]) || 60, date: cols[8] || "", notes: cols[9] || "", business_unit: (["build","reno","list"].includes(bu) ? bu : "build") };
  }).filter(l => l.name);
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
  const [form, setForm] = useState({ name: "", phone: "", budget: "", style: "Modern Minimal", area: "", source: "Budget Tool", notes: "", stage: "new", business_unit: "build" as "build" | "reno" | "list" });
  const [error, setError] = useState("");
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.15)", fontSize: 13, boxSizing: "border-box" as const, background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontFamily: "inherit" };

  function submit() {
    if (!form.name || !form.phone || !form.budget || !form.area) { setError("กรุณากรอก ชื่อ, เบอร์, งบ, พื้นที่"); return; }
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const today = new Date();
    onAdd({ ...form, id: Date.now(), score: Math.floor(Math.random()*30)+55, date: `${today.getDate()} ${months[today.getMonth()]}` });
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
          {([ ["ชื่อ-นามสกุล","name","คุณสมชาย ใจดี"], ["เบอร์โทร","phone","081-xxx-xxxx"], ["งบประมาณ","budget","2.5M"], ["พื้นที่","area","ปทุมธานี"] ] as [string, keyof typeof form, string][]).map(([label, key, ph]) => (
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
              { value: "build", label: "🏗️ รับสร้างบ้าน",       color: "#f59e0b" },
              { value: "reno",  label: "🔨 รีโนเวท",             color: "#10b981" },
              { value: "list",  label: "🏠 ฝากขาย",              color: "#6366f1" },
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 5 }}>หมายเหตุ</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="ข้อมูลเพิ่มเติม..." />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>ยกเลิก</button>
          <button onClick={submit} style={{ flex: 2, background: "linear-gradient(135deg,#22d3ee,#0891b2)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✅ บันทึก Lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────
function PipelineTab({ leads, setLeads, deleteLead }: { leads: Lead[]; setLeads: React.Dispatch<React.SetStateAction<Lead[]>>; deleteLead: (id: number) => void }) {
  const [selected, setSelected]     = useState<Lead | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing]   = useState(false);
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);

  const filtered = leads.filter(l => l.name.includes(search) || l.area.includes(search) || l.source.toLowerCase().includes(search.toLowerCase()));

  async function analyzeLead(lead: Lead) {
    setSelected(lead); setAnalyzing(true); setAiAnalysis("");
    try {
      const text = await callClaude(
        `คุณคือผู้เชี่ยวชาญด้านการขายบ้านสำหรับ ${BRAND_NAME}`,
        `วิเคราะห์ Lead: ${lead.name} | งบ: ${lead.budget} | สไตล์: ${lead.style} | พื้นที่: ${lead.area} | แหล่งที่มา: ${lead.source} | Score: ${lead.score}% | Note: ${lead.notes}\n\nให้: 1)ประเมินความพร้อมซื้อ 2)Pain point ที่น่าจะมี 3)กลยุทธ์ปิดการขาย 3 ข้อ 4)Script โทรหา (1-2 ประโยค)`,
      );
      setAiAnalysis(text);
    } catch (e: unknown) { setAiAnalysis(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    setAnalyzing(false);
  }

  function moveStage(lead: Lead, dir: 1 | -1) {
    const idx = STAGES.findIndex(s => s.key === lead.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage: next.key } : l));
    if (selected?.id === lead.id) setSelected(prev => prev ? { ...prev, stage: next.key } : null);
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)",
    fontSize: 14, background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontFamily: "inherit", outline: "none",
  };

  // Source icon helper
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
              {/* Stage header */}
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
                      <span>💰 {lead.budget}</span>
                      <span>🏠 {lead.style}</span>
                      <span>📍 {lead.area}</span>
                      <span style={{ color: "#64748b" }}>{sourceIcon(lead.source)} {lead.source}</span>
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
              💰 {selected.budget}<br />
              📍 {selected.area}<br />
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
              <button onClick={() => navigator.clipboard.writeText(`${selected.name}\n${selected.phone}\n${selected.budget} | ${selected.area}`)} style={{ flex: 1, background: "rgba(34,211,238,.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.3)", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 คัดลอก</button>
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

  // Group by source
  const sourceCounts = SOURCES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.source === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { icon: "👥", label: "Lead ทั้งหมด",   value: total,                    sub: "ทุก stage รวมกัน",      color: "#22d3ee" },
          { icon: "✅", label: "Closed",          value: closed,                   sub: `${total ? Math.round(closed/total*100) : 0}% conversion`, color: "#10b981" },
          { icon: "🔥", label: "Hot Leads ≥80%",  value: hotLeads.length,          sub: "ส่งต่อฝ่ายขายได้เลย",  color: "#f43f5e" },
          { icon: "💰", label: "รายได้คาดการณ์", value: "35.2M",                  sub: "↑ 23% MoM",            color: "#f59e0b" },
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
        {/* Funnel */}
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

        {/* Source breakdown */}
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

        {/* Lead chart */}
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

        {/* Hot leads */}
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
              <div style={{ fontSize: 12, color: "#94a3b8" }}>💰 {lead.budget} · 📍 {lead.area} · {lead.source}</div>
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
        `สร้างแผน Lead Nurturing 30 วัน สำหรับ: ${selected.name} | งบ: ${selected.budget} | สไตล์: ${selected.style} | พื้นที่: ${selected.area} | แหล่งที่มา: ${selected.source} | Score: ${selected.score}%\n\nสร้างข้อความจริงสำหรับ touchpoint วัน 0, 3, 7, 14, 21, 30 ปรับให้เหมาะกับโปรไฟล์ลูกค้านี้ รวมถึงอ้างอิงแหล่งที่มาในการพูดคุย`,
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
                <div style={{ fontSize: 12, color: "#64748b" }}>{selected.area} | {selected.budget} | {selected.source}</div>
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
  const [showAdd, setShowAdd]     = useState(false);

  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("finnhouses_leads_v2") : null;
      return s ? JSON.parse(s) : INITIAL_LEADS;
    } catch { return INITIAL_LEADS; }
  });

  useEffect(() => {
    try { localStorage.setItem("finnhouses_leads_v2", JSON.stringify(leads)); } catch {}
  }, [leads]);

  function deleteLead(id: number) {
    if (window.confirm("ลบ Lead นี้?")) setLeads(ls => ls.filter(l => l.id !== id));
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseLeadsCSV(ev.target?.result as string);
      if (!parsed.length) { setImportMsg("❌ ไม่พบข้อมูล"); return; }
      setLeads(ls => [...parsed, ...ls]);
      setImportMsg(`✅ Import ${parsed.length} Lead`);
      setTimeout(() => setImportMsg(""), 3000);
    };
    reader.readAsText(file, "UTF-8"); e.target.value = "";
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 0 }}>
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={lead => { setLeads(ls => [lead, ...ls]); setShowAdd(false); }} />}

      {/* Header */}
      <div style={{ background: "rgba(15,20,40,.9)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700 }}>CRM</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif", marginTop: 2 }}>
            {BRAND_NAME} — Lead Pipeline
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>รับ Lead จาก Budget Tool · FB Content · Blog · ช่องทางอื่น ๆ</div>
        </div>

        {/* Tabs */}
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

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {importMsg && (
            <div style={{ background: importMsg.startsWith("✅") ? "rgba(16,185,129,.15)" : "rgba(244,63,94,.15)", color: importMsg.startsWith("✅") ? "#10b981" : "#f43f5e", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>{importMsg}</div>
          )}
          <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>➕ Lead</button>
          <label style={{ background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            📥 CSV <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: "none" }} />
          </label>
          <button onClick={() => exportLeadsCSV(leads)} style={{ background: "rgba(255,255,255,.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📤</button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "pipeline" && <PipelineTab leads={leads} setLeads={setLeads} deleteLead={deleteLead} />}
      {activeTab === "overview" && <OverviewTab leads={leads} />}
      {activeTab === "nurture"  && <NurtureTab leads={leads} />}
    </div>
  );
}
