"use client";
import { useState, useEffect, useCallback } from "react";

const AREAS = [
  "ลาดหลุมแก้ว", "รังสิต", "คลองสาม", "ธัญบุรี", "ลำลูกกา",
  "บางใหญ่", "นนทบุรี", "ปทุมธานี", "บางบัวทอง", "สามโคก",
  "อื่นๆ (พิมพ์เอง)",
];

const TIMING_SIGNALS = [
  { value: "none", label: "ทั่วไป" },
  { value: "bonus", label: "📈 โบนัสออก" },
  { value: "rate_up", label: "💸 ดอกเบี้ยขึ้น" },
  { value: "rainy", label: "🌧️ หน้าฝน" },
  { value: "new_year", label: "🎊 ปีใหม่" },
  { value: "marriage", label: "💍 เพิ่งแต่งงาน" },
  { value: "land_ready", label: "📐 มีที่ดินแล้ว" },
];

const CATEGORY_COLORS: Record<string, string> = {
  risk_perception:  "#f87171",
  demand_pattern:   "#60a5fa",
  liquidity_signal: "#34d399",
  price_behavior:   "#fbbf24",
  competitor_gap:   "#a78bfa",
};

const CATEGORY_TH: Record<string, string> = {
  risk_perception:  "ความเสี่ยง",
  demand_pattern:   "Demand",
  liquidity_signal: "สภาพคล่อง",
  price_behavior:   "ราคา",
  competitor_gap:   "ช่องว่างตลาด",
};

// ── Styles ───────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 16,
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 13,
  padding: "10px 12px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Insight = {
  id: number;
  created_at: string;
  area: string;
  insight: string;
  category: string;
  confidence: number;
  source_type: string;
  notes?: string;
};

// ── Submit Tab ────────────────────────────────────────────────────────────────
function SubmitTab() {
  const [text, setText]           = useState("");
  const [area, setArea]           = useState("ลาดหลุมแก้ว");
  const [customArea, setCustomArea] = useState("");
  const [timing, setTiming]       = useState("none");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<"ok"|"error"|null>(null);
  const [generatedContent, setGeneratedContent] = useState("");
  const [lat, setLat]             = useState("");
  const [lng, setLng]             = useState("");

  const finalArea = area === "อื่นๆ (พิมพ์เอง)" ? customArea.trim() : area;

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const validGps  = !isNaN(parsedLat) && !isNaN(parsedLng) && lat.trim() !== "" && lng.trim() !== "";

  async function submit() {
    if (!text.trim() || !finalArea) return;
    setLoading(true); setResult(null); setGeneratedContent("");
    try {
      const res = await fetch("/api/market-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          area: finalArea,
          timing_signal: timing,
          ...(validGps ? { lat: parsedLat, lng: parsedLng } : {}),
        }),
      });
      const data = await res.json();
      setResult(res.ok && data.ok !== false ? "ok" : "error");
      if (res.ok) {
        setText("");
        setTiming("none");
      }
    } catch {
      setResult("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {/* Left: Form */}
      <div style={{ ...card, flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e879f9", letterSpacing: ".1em" }}>
          🧠 บันทึกสิ่งที่เห็นในตลาด
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          พิมพ์สิ่งที่เจอในตลาดวันนี้ — ลูกค้าพูดอะไร · สังเกตอะไร · เห็น listing แบบไหน
          <br/>ระบบจะ parse → บันทึก Supabase → สร้าง Positioned Content → แจ้ง Telegram
        </div>

        {/* Text area */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>สิ่งที่เห็น / ได้ยิน</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"เช่น: ลูกค้าที่มาดูบ้านแถวลาดหลุมแก้ว ถามเรื่องน้ำท่วมก่อนเลย กังวลมากเรื่องนี้\nหรือ: เห็น listing Modern คลองสาม ลดราคาแล้วปิดภายใน 3 วัน\nหรือ: ช่วงนี้มีคนทักเข้ามาถามเรื่องสร้างบ้านเยอะมากหลังโบนัสออก"}
            rows={6}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
          />
        </div>

        {/* Area */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>พื้นที่</div>
          <select value={area} onChange={e => setArea(e.target.value)} style={selectStyle}>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {area === "อื่นๆ (พิมพ์เอง)" && (
            <input
              value={customArea}
              onChange={e => setCustomArea(e.target.value)}
              placeholder="พิมพ์ชื่อพื้นที่..."
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        {/* GPS Location — Manual Input */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>พิกัด GPS (ไม่บังคับ)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={lat}
              onChange={e => setLat(e.target.value)}
              placeholder="Latitude เช่น 13.9826"
              style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 12 }}
            />
            <input
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="Longitude เช่น 100.6576"
              style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 12 }}
            />
            {validGps && (
              <a
                href={`https://www.google.com/maps?q=${parsedLat},${parsedLng}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: "#60a5fa", whiteSpace: "nowrap", flexShrink: 0 }}
              >ดูบน Maps ↗</a>
            )}
          </div>
        </div>

        {/* Timing Signal */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Timing Signal (ถ้ามี)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TIMING_SIGNALS.map(t => (
              <button
                key={t.value}
                onClick={() => setTiming(t.value)}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: timing === t.value ? "rgba(232,121,249,.15)" : "rgba(255,255,255,.04)",
                  color: timing === t.value ? "#e879f9" : "#64748b",
                  border: timing === t.value ? "1px solid rgba(232,121,249,.3)" : "1px solid rgba(255,255,255,.06)",
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading || !text.trim() || !finalArea}
          style={{
            background: loading ? "rgba(232,121,249,.05)" : "rgba(232,121,249,.12)",
            color: loading ? "#334155" : "#e879f9",
            border: "1px solid rgba(232,121,249,.25)",
            borderRadius: 12,
            padding: "13px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading || !text.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ กำลังส่ง..." : "🧠 บันทึก & วิเคราะห์"}
        </button>

        {result === "ok" && (
          <div style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#34d399" }}>
            ✅ ส่งสำเร็จแล้ว! n8n กำลัง parse → บันทึก Supabase → สร้าง content → แจ้ง Telegram
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>ดูผลได้ใน tab "Market Insights" และ Telegram</div>
          </div>
        )}
        {result === "error" && (
          <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#f87171" }}>
            ❌ เกิดข้อผิดพลาด — ตรวจสอบว่า n8n workflow Publish แล้ว และ Railway ทำงานปกติ
          </div>
        )}
      </div>

      {/* Right: Tips */}
      <div style={{ flex: "0 1 280px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...card, borderColor: "rgba(232,121,249,.15)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#e879f9", marginBottom: 10 }}>💡 ข้อมูลที่ควรบันทึก</div>
          {[
            "ลูกค้าถามเรื่องอะไรเป็นอันดับแรก",
            "ทรัพย์แบบไหนขายได้เร็ว / ช้า",
            "ราคาตลาดจริงในพื้นที่",
            "สิ่งที่คู่แข่งไม่พูดถึง",
            "สัญญาณ Timing พิเศษ (โบนัส/ฝน/ดอกเบี้ย)",
            "Feedback จากลูกค้าที่ไม่ซื้อ",
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: "#64748b", marginBottom: 6, display: "flex", gap: 8 }}>
              <span style={{ color: "#e879f9", flexShrink: 0 }}>▸</span>
              {tip}
            </div>
          ))}
        </div>

        <div style={{ ...card }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>🏆 Area Memory ที่มีอยู่</div>
          {[
            { area: "ลาดหลุมแก้ว", mem: "คนกลัวน้ำท่วม" },
            { area: "รังสิต", mem: "Commuter demand สูง" },
            { area: "คลองสาม", mem: "Modern ปิดไว" },
          ].map((a, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>📍 {a.area}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{a.mem}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterArea, setFilterArea] = useState("ทั้งหมด");
  const [filterCat, setFilterCat] = useState("ทั้งหมด");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market-intel/insights?table=market_insights");
      const data = await res.json();
      if (data.ok) setInsights(data.data ?? []);
      else setError(data.error ?? "โหลดไม่สำเร็จ");
    } catch { setError("เกิดข้อผิดพลาด"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const norm = (s: string | null | undefined) => (s ?? "").normalize("NFC").trim();
  const areas = ["ทั้งหมด", ...Array.from(new Set(insights.map(i => norm(i.area))))];
  const cats  = ["ทั้งหมด", ...Array.from(new Set(insights.map(i => norm(i.category))))];

  const filtered = insights.filter(i =>
    (filterArea === "ทั้งหมด" || norm(i.area) === norm(filterArea)) &&
    (filterCat === "ทั้งหมด" || norm(i.category) === norm(filterCat))
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          style={{ ...selectStyle, width: "auto", minWidth: 140, fontSize: 12 }}>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ ...selectStyle, width: "auto", minWidth: 160, fontSize: 12 }}>
          {cats.map(c => <option key={c}value={c}>{c === "ทั้งหมด" ? "ทั้งหมด" : (CATEGORY_TH[c] ?? c)}</option>)}
        </select>
        <button onClick={load} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(34,211,238,.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.25)" }}>
          🔄 Refresh
        </button>
        <span style={{ fontSize: 12, color: "#475569" }}>{filtered.length} รายการ</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>⏳ กำลังโหลด...</div>
      ) : error ? (
        <div style={{ color: "#f87171", padding: 20 }}>❌ {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 14 }}>ยังไม่มีข้อมูล — ส่งข้อสังเกตแรกได้เลย!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(ins => {
            const catColor = CATEGORY_COLORS[ins.category] ?? "#64748b";
            return (
              <div key={ins.id} style={{ ...card, borderLeft: `3px solid ${catColor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>📍 {ins.area}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`, borderRadius: 5, padding: "2px 7px" }}>
                      {CATEGORY_TH[ins.category] ?? ins.category}
                    </span>
                    <span style={{ fontSize: 10, color: "#475569", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 5, padding: "2px 7px" }}>
                      {"⭐".repeat(ins.confidence)}
                    </span>
                    <span style={{ fontSize: 10, color: "#334155" }}>
                      {ins.source_type === "social" ? "🌐 Social" : "👁️ Observation"}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#334155" }}>
                    {new Date(ins.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: ins.notes ? 8 : 0 }}>{ins.insight}</div>
                {ins.notes && (
                  <div style={{ fontSize: 11, color: "#475569", borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 8, marginTop: 8 }}>
                    {ins.notes.slice(0, 150)}{ins.notes.length > 150 ? "..." : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Calibration Tab ───────────────────────────────────────────────────────────
// Item #3 of the "system proves itself correct" follow-up plan (ADR-023,
// session 29). Checks whether the AI's own 1-5 confidence score is actually
// calibrated — do 5-star insights hold up more often than 3-star ones? —
// using human_feedback set right here (market_insights has no separate
// review channel of its own, same situation as the WF1 Quality Gate).
type CalRow = {
  id: number; created_at: string; area: string | null; insight: string | null;
  category: string | null; confidence: number; human_feedback: string | null;
};
type CalData = {
  total_insights: number; with_feedback: number; accurate: number; inaccurate: number;
  accuracy_pct: number | null; feedback_adoption_pct: number; reliable: boolean; threshold: number;
  by_confidence: { confidence: number; total: number; withFeedback: number; accurate: number; inaccurate: number; accuracy_pct: number | null }[];
  window: { first: string; last: string } | null;
  recent: CalRow[];
};

// Exported (not just used internally) so DashboardOS.tsx's embedded
// "🧠 Market Intel" tab can render the same calibration view without
// duplicating the fetch/feedback logic — see ADR-023 follow-up: Archi was
// looking for this inside the Dashboard OS shell, not the standalone
// /market-intel page, so it now needs to exist in both places.
export function CalibrationTab() {
  const [data, setData] = useState<CalData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/market-intel/calibration");
      const j = await r.json();
      if (j.ok) setData(j.data); else setErr(j.error ?? "โหลดข้อมูลไม่สำเร็จ");
    } catch {
      setErr("เชื่อมต่อ Supabase ไม่ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitFeedback(id: number, feedback: "accurate" | "inaccurate") {
    setSubmitting(id);
    try {
      const r = await fetch("/api/market-intel/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedback }),
      });
      const j = await r.json();
      if (j.ok) await load();
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <div style={{ color: "#64748b", fontSize: 13, padding: 20 }}>⏳ กำลังโหลด...</div>;
  if (err || !data) return <div style={{ color: "#f87171", padding: 20, fontSize: 13 }}>❌ {err ?? "ไม่พบข้อมูล"}</div>;

  const belowThreshold = !data.reliable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#e879f9", marginBottom: 6 }}>🎯 ความแม่นยำของ AI confidence score</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          AI ให้คะแนนความมั่นใจ 1-5 ดาวต่อ insight แต่ละอัน — กดปุ่ม &quot;✅ ตรง / ❌ ไม่ตรง&quot; ด้านล่างเพื่อยืนยันภายหลังว่า insight นั้นตรงจริงไหม
          จะได้รู้ว่า 5 ดาว แม่นกว่า 3 ดาวจริงหรือเปล่า
        </div>
      </div>

      {belowThreshold ? (
        <div style={{ ...card, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b" }}>ยังไม่มีข้อมูลพอสรุป</div>
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            มี insight ทั้งหมด <b style={{ color: "#f1f5f9" }}>{data.total_insights}</b> รายการ
            {data.window && <> ({new Date(data.window.first).toLocaleDateString("th-TH")} – {new Date(data.window.last).toLocaleDateString("th-TH")})</>}
            {" "}แต่มีแค่ <b style={{ color: "#f1f5f9" }}>{data.with_feedback}</b> รายการที่ยืนยันแล้ว —
            ต้องมีอย่างน้อย <b style={{ color: "#f1f5f9" }}>{data.threshold}</b> รายการก่อนถึงจะสรุปได้อย่างมีความหมาย
          </div>
        </div>
      ) : (
        <div style={{ ...card, border: "1px solid rgba(16,185,129,.3)" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>ความแม่นยำสะสม</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#34d399" }}>{data.accuracy_pct}%</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>ตรง {data.accurate} / ไม่ตรง {data.inaccurate} จาก {data.with_feedback} ที่ยืนยันแล้ว</div>
        </div>
      )}

      {/* By confidence level — the actual calibration check */}
      {data.by_confidence.some(c => c.withFeedback > 0) && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", marginBottom: 10 }}>แยกตามระดับความมั่นใจของ AI</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.by_confidence.map(c => (
              <div key={c.confidence} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{"⭐".repeat(c.confidence)}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {c.total} รายการ{c.withFeedback > 0 ? ` · ยืนยันแล้ว ${c.withFeedback} · แม่นยำ ${c.accuracy_pct}%` : " · ยังไม่มีคนยืนยัน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent — feedback buttons */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>รายการล่าสุด</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.recent.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {"⭐".repeat(r.confidence)} {r.insight}
                </div>
                <div style={{ fontSize: 10, color: "#475569" }}>{r.area} · {CATEGORY_TH[r.category ?? ""] ?? r.category}</div>
              </div>
              {r.human_feedback ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: r.human_feedback === "accurate" ? "#34d399" : "#fb7185" }}>
                  {r.human_feedback === "accurate" ? "✅ ยืนยันตรง" : "❌ ยืนยันไม่ตรง"}
                </span>
              ) : (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => submitFeedback(r.id, "accurate")} disabled={submitting === r.id}
                    style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, border: "1px solid rgba(16,185,129,.3)", background: "rgba(16,185,129,.08)", color: "#34d399", cursor: "pointer" }}>
                    ✅ ตรง
                  </button>
                  <button onClick={() => submitFeedback(r.id, "inaccurate")} disabled={submitting === r.id}
                    style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, border: "1px solid rgba(244,63,94,.3)", background: "rgba(244,63,94,.08)", color: "#fb7185", cursor: "pointer" }}>
                    ❌ ไม่ตรง
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────
function ContentTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number|null>(null);

  useEffect(() => {
    fetch("/api/market-intel/insights?table=content_frames")
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copy(text: string, id: number) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>⏳ กำลังโหลด...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, color: "#475569" }}>ยังไม่มี Positioned Content</div>
          <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>ส่งข้อมูลตลาดในแท็บ "บันทึก" เพื่อให้ระบบสร้าง content ให้</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ ...card, borderColor: "rgba(232,121,249,.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {item.target_segment && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#e879f9", background: "rgba(232,121,249,.12)", border: "1px solid rgba(232,121,249,.25)", borderRadius: 5, padding: "2px 7px" }}>
                      🎯 {item.target_segment}
                    </span>
                  )}
                  {item.keyword && (
                    <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 5, padding: "2px 7px" }}>
                      {item.keyword}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#334155" }}>
                    {new Date(item.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    onClick={() => copy(item.frame_text, item.id)}
                    style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(34,211,238,.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.25)" }}
                  >
                    {copiedId === item.id ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#e2e8f0", lineHeight: 1.7, margin: 0, fontFamily: "inherit" }}>
                {item.frame_text?.slice(0, 400)}{item.frame_text?.length > 400 ? "..." : ""}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { key: "submit",      label: "บันทึกข้อมูลตลาด", icon: "🧠" },
  { key: "insights",    label: "Market Insights",   icon: "🗺️" },
  { key: "content",     label: "Positioned Content", icon: "✨" },
  { key: "calibration", label: "Calibration",       icon: "🎯" },
];

export default function MarketIntel() {
  const [tab, setTab] = useState("submit");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#e879f9", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
          Intelligence Framework
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>🧠 Market Intelligence</div>
        <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>
          บันทึกสิ่งที่เห็นในตลาด → AI วิเคราะห์ → สะสม Area Memory → สร้าง Positioned Content
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: tab === t.key ? "rgba(232,121,249,.12)" : "transparent",
              color: tab === t.key ? "#e879f9" : "#475569",
              border: tab === t.key ? "1px solid rgba(232,121,249,.25)" : "1px solid transparent",
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "submit"      && <SubmitTab />}
        {tab === "insights"    && <InsightsTab />}
        {tab === "content"     && <ContentTab />}
        {tab === "calibration" && <CalibrationTab />}
      </div>
    </div>
  );
}
