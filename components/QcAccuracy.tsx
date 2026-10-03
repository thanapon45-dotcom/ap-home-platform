"use client";
import { useState, useEffect } from "react";

/**
 * QC Line Accuracy Dashboard — Phase 1 of the "system proves itself correct" plan
 * (session 28, Jul 22 2026). Reads /api/qc/accuracy.
 *
 * Deliberately does NOT show a confident headline % when the feedback sample
 * is too small (see RELIABILITY_THRESHOLD in the API route) — as of this
 * session there are only 20 total QC Line inspections (one test week,
 * 2026-06-26 to 2026-07-02) and just 1 has human_feedback set. This is built
 * as ready infrastructure that becomes meaningful once QC volume + feedback-
 * button adoption pick back up, not as a dashboard faking confidence today.
 */

type Data = {
  total_inspections: number;
  with_feedback: number;
  correct: number;
  incorrect: number;
  other_feedback: number;
  accuracy_pct: number | null;
  feedback_adoption_pct: number;
  reliable: boolean;
  threshold: number;
  current_engine: { model: string; total: number; with_feedback: number; correct: number; incorrect: number; accuracy_pct: number | null; reliable: boolean };
  by_model: { model: string; total: number; withFeedback: number; correct: number; incorrect: number; accuracy_pct: number | null }[];
  feedback_reasons: { reason: string; count: number }[];
  by_severity: { severity: string; total: number; withFeedback: number; correct: number; incorrect: number }[];
  window: { first: string; last: string } | null;
  recent: { id: string; created_at: string; severity: string | null; pass: boolean | null; human_feedback: string | null }[];
};

const card: React.CSSProperties = {
  background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 20, padding: 24,
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function QcAccuracy() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/qc/accuracy");
        const j = await r.json();
        if (cancelled) return;
        if (j.ok) setData(j.data); else setErr(j.error ?? "โหลดข้อมูลไม่สำเร็จ");
      } catch {
        if (!cancelled) setErr("เชื่อมต่อ Supabase ไม่ได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ ...card, color: "#64748b", fontSize: 13 }}>⏳ กำลังโหลดข้อมูล QC Accuracy...</div>;
  }
  if (err || !data) {
    return (
      <div style={{ ...card, border: "1px solid rgba(239,68,68,.25)" }}>
        <div style={{ color: "#f87171", fontSize: 13 }}>❌ {err ?? "ไม่พบข้อมูล"}</div>
      </div>
    );
  }

  const belowThreshold = !data.reliable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>

      {/* HEADER */}
      <div style={card}>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600, marginBottom: 4 }}>
          QC LINE — AI ACCURACY
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif", marginBottom: 6 }}>
          ระบบตรวจ QC ผ่าน LINE ถูกกี่ % จริง?
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          คำนวณจากปุ่ม &quot;✅ ตรง / ❌ ไม่ตรง&quot; ที่ผู้ตรวจกดยืนยันหลัง AI วิเคราะห์รูปแต่ละใบ — ไม่ใช่ความเห็นของ AI เอง
        </div>
      </div>

      {/* HEADLINE — honest low-data state */}
      {belowThreshold ? (
        <div style={{ ...card, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b" }}>ยังไม่มีข้อมูลพอสรุป</div>
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            มีการตรวจ QC ทั้งหมด <b style={{ color: "#f1f5f9" }}>{data.total_inspections}</b> ครั้ง
            {data.window && <> ({fmtDate(data.window.first)} – {fmtDate(data.window.last)})</>}
            {" "}แต่มีแค่ <b style={{ color: "#f1f5f9" }}>{data.with_feedback}</b> ครั้งที่ผู้ตรวจกดยืนยันผล —
            ต้องมีอย่างน้อย <b style={{ color: "#f1f5f9" }}>{data.threshold}</b> ครั้งก่อนถึงจะสรุป % ความแม่นยำได้อย่างมีความหมาย
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
            หน้านี้เป็น infrastructure ที่พร้อมใช้ทันทีที่มีงานตรวจ QC เข้ามาอีกครั้ง — ไม่ใช่ค้างเพราะระบบพัง
          </div>
        </div>
      ) : (
        <div style={{ ...card, border: "1px solid rgba(16,185,129,.3)" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>ความแม่นยำสะสม</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399" }}>{data.accuracy_pct}%</div>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              ถูก {data.correct} / ผิด {data.incorrect} จากที่มีคนยืนยันแล้ว {data.with_feedback} ครั้ง
            </div>
          </div>
        </div>
      )}

      {/* ACCURACY V2 — CURRENT ENGINE VS HISTORICAL */}
      <div style={card}>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 600, marginBottom: 12 }}>
          Accuracy v2 — Current Engine
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <div><div style={{ fontSize: 10, color: "#64748b" }}>MODEL</div><div style={{ fontSize: 13, color: "#f1f5f9", marginTop: 4 }}>{data.current_engine.model}</div></div>
          <div><div style={{ fontSize: 10, color: "#64748b" }}>ยืนยันแล้ว</div><div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{data.current_engine.with_feedback}</div></div>
          <div><div style={{ fontSize: 10, color: "#64748b" }}>ถูก / ผิด</div><div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{data.current_engine.correct} / {data.current_engine.incorrect}</div></div>
          <div><div style={{ fontSize: 10, color: "#64748b" }}>CURRENT ACCURACY</div><div style={{ fontSize: 22, fontWeight: 800, color: data.current_engine.reliable ? "#34d399" : "#f59e0b" }}>{data.current_engine.accuracy_pct === null ? "—" : `${data.current_engine.accuracy_pct}%`}</div></div>
        </div>
        {!data.current_engine.reliable && (
          <div style={{ marginTop: 12, fontSize: 11, color: "#f59e0b" }}>
            Current Engine ยังมี feedback น้อยกว่า {data.threshold} ครั้ง — แสดงค่าจริงเพื่อเฝ้าดู แต่ยังไม่ถือว่าเป็นค่าความแม่นยำที่เชื่อถือได้
          </div>
        )}
      </div>

      {data.by_model.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 12 }}>Current vs Historical Models</div>
          {data.by_model.map(m => (
            <div key={m.model} style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,1fr)", gap: 10, padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,.05)", fontSize: 12 }}>
              <span style={{ color: "#cbd5e1" }}>{m.model}</span>
              <span style={{ color: "#94a3b8" }}>ทั้งหมด {m.total}</span>
              <span style={{ color: "#94a3b8" }}>ยืนยัน {m.withFeedback}</span>
              <span style={{ color: "#34d399" }}>ถูก {m.correct}</span>
              <span style={{ color: m.incorrect ? "#fb7185" : "#64748b" }}>{m.accuracy_pct === null ? "—" : `${m.accuracy_pct}%`} · ผิด {m.incorrect}</span>
            </div>
          ))}
        </div>
      )}

      {data.feedback_reasons.length > 0 && (
        <div style={{ ...card, border: "1px solid rgba(244,63,94,.2)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#fb7185", fontWeight: 600, marginBottom: 12 }}>Incorrect Feedback Breakdown</div>
          {data.feedback_reasons.map(r => (
            <div key={r.reason} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
              <span style={{ color: "#cbd5e1" }}>{r.reason}</span><b style={{ color: "#fb7185" }}>{r.count}</b>
            </div>
          ))}
        </div>
      )}

      {/* STATS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "ตรวจทั้งหมด", value: data.total_inspections, color: "#22d3ee" },
          { label: "มีคนยืนยันผล", value: data.with_feedback, color: "#6366f1" },
          { label: "% กดยืนยัน (adoption)", value: `${data.feedback_adoption_pct}%`, color: "#f59e0b" },
          { label: "AI ถูกต้อง", value: data.accuracy_pct !== null ? `${data.accuracy_pct}%` : "—", color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: s.color, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {data.feedback_adoption_pct < 50 && data.total_inspections > 0 && (
        <div style={{ ...card, border: "1px solid rgba(244,63,94,.25)", background: "rgba(244,63,94,.04)" }}>
          <div style={{ fontSize: 12, color: "#fb7185", lineHeight: 1.7 }}>
            🔔 ผู้ตรวจกดปุ่ม &quot;✅/❌&quot; แค่ {data.feedback_adoption_pct}% ของงานตรวจทั้งหมด —
            ต่อให้ QC volume กลับมาเยอะ ถ้าไม่มีใครกดปุ่มยืนยัน dashboard นี้ก็จะยังสรุปอะไรไม่ได้
            ควรมี nudge เตือนผู้ตรวจให้กดปุ่มทุกครั้งควบคู่ไปด้วย
          </div>
        </div>
      )}

      {/* BY SEVERITY */}
      {data.by_severity.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>
            แยกตามระดับความรุนแรง
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>By Severity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.by_severity.map(s => (
              <div key={s.severity} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: "#cbd5e1", textTransform: "capitalize" }}>{s.severity}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {s.total} ครั้ง{s.withFeedback > 0 ? ` · ยืนยันแล้ว ${s.withFeedback} (ถูก ${s.correct} / ผิด ${s.incorrect})` : " · ยังไม่มีคนยืนยัน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT */}
      {data.recent.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>
            รายการล่าสุด
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Recent Inspections</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.recent.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", fontSize: 12 }}>
                <span style={{ color: "#64748b" }}>{fmtDate(r.created_at)}</span>
                <span style={{ color: "#94a3b8", textTransform: "capitalize" }}>{r.severity ?? "—"}</span>
                <span style={{ color: r.pass ? "#34d399" : "#fb7185" }}>{r.pass === null ? "—" : r.pass ? "ผ่าน" : "ไม่ผ่าน"}</span>
                <span style={{
                  color: r.human_feedback === "correct" ? "#34d399" : r.human_feedback === "incorrect" ? "#fb7185" : "#475569",
                  fontWeight: 600,
                }}>
                  {r.human_feedback === "correct" ? "✅ ตรง" : r.human_feedback === "incorrect" ? "❌ ไม่ตรง" : "ยังไม่ยืนยัน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
