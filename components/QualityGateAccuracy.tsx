"use client";
import { useState, useEffect } from "react";

/**
 * WF1 AI Quality Gate Accuracy Dashboard — item #2 of the "system proves
 * itself correct" follow-up plan (session 29, ADR-021). Reads
 * /api/quality-gate/accuracy, writes feedback via PATCH /api/quality-gate/feedback.
 *
 * Unlike QcAccuracy.tsx (fed by LINE quick-reply buttons), this gate has no
 * separate review channel — this dashboard IS the human-feedback mechanism,
 * so each recent decision has inline "✅ ถูกต้อง / ❌ ผิดพลาด" buttons.
 *
 * Same honest low-data-state pattern: quality_gate_log starts empty (the
 * n8n workflow fix — (11_gate_log).json — has not been imported/activated
 * yet as of this session), so this renders as ready infrastructure, not a
 * dashboard faking confidence on day one.
 */

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  pass: boolean;
  reasons: string[] | null;
  run_id: string | null;
  queue_item_id: string | null;
  created_at: string;
  human_feedback: string | null;
  human_feedback_at: string | null;
};

type Data = {
  total_decisions: number;
  passed: number;
  blocked: number;
  with_feedback: number;
  correct: number;
  incorrect: number;
  false_positives: number;
  false_negatives: number;
  accuracy_pct: number | null;
  feedback_adoption_pct: number;
  reliable: boolean;
  threshold: number;
  window: { first: string; last: string } | null;
  recent: Row[];
};

const card: React.CSSProperties = {
  background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 20, padding: 24,
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function QualityGateAccuracy() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/quality-gate/accuracy");
      const j = await r.json();
      if (j.ok) setData(j.data); else setErr(j.error ?? "โหลดข้อมูลไม่สำเร็จ");
    } catch {
      setErr("เชื่อมต่อ Supabase ไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitFeedback(id: string, feedback: "correct" | "incorrect") {
    setSubmitting(id);
    try {
      const r = await fetch("/api/quality-gate/feedback", {
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

  if (loading) {
    return <div style={{ ...card, color: "#64748b", fontSize: 13 }}>⏳ กำลังโหลดข้อมูล Quality Gate Accuracy...</div>;
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
          WF1 — AI QUALITY GATE ACCURACY
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif", marginBottom: 6 }}>
          AI Quality Gate บล็อก/ปล่อยผ่านบทความถูกกี่ % จริง?
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          ทุกครั้งที่ WF1 รัน AI Quality Gate (ADR-016) จะ log การตัดสินใจไว้ที่นี่ — กดปุ่ม &quot;✅ ถูกต้อง / ❌ ผิดพลาด&quot;
          ด้านล่างเพื่อยืนยันว่า AI ตัดสินใจถูกไหมในแต่ละครั้ง (ไม่มีช่องทางยืนยันอื่นเหมือน QC LINE — หน้านี้คือช่องทางเดียว)
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
            มีการตัดสินใจของ Gate ทั้งหมด <b style={{ color: "#f1f5f9" }}>{data.total_decisions}</b> ครั้ง
            {data.window && <> ({fmtDate(data.window.first)} – {fmtDate(data.window.last)})</>}
            {" "}แต่มีแค่ <b style={{ color: "#f1f5f9" }}>{data.with_feedback}</b> ครั้งที่ยืนยันแล้ว —
            ต้องมีอย่างน้อย <b style={{ color: "#f1f5f9" }}>{data.threshold}</b> ครั้งก่อนถึงจะสรุป % ความแม่นยำได้อย่างมีความหมาย
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
            หน้านี้เป็น infrastructure ที่พร้อมใช้ทันทีที่ workflow (11_gate_log) ถูก import + activate ใน n8n แล้วเริ่มมีบทความไหลผ่าน Gate —
            ไม่ใช่ค้างเพราะระบบพัง
          </div>
        </div>
      ) : (
        <div style={{ ...card, border: "1px solid rgba(16,185,129,.3)" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>ความแม่นยำสะสม</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399" }}>{data.accuracy_pct}%</div>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              ถูก {data.correct} / ผิด {data.incorrect} จากที่มีคนยืนยันแล้ว {data.with_feedback} ครั้ง<br />
              False positive (บล็อกผิด) {data.false_positives} · False negative (ปล่อยผ่านผิด) {data.false_negatives}
            </div>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "ตัดสินใจทั้งหมด", value: data.total_decisions, color: "#22d3ee" },
          { label: "ผ่าน / บล็อก", value: `${data.passed} / ${data.blocked}`, color: "#6366f1" },
          { label: "% ยืนยันแล้ว", value: `${data.feedback_adoption_pct}%`, color: "#f59e0b" },
          { label: "AI ถูกต้อง", value: data.accuracy_pct !== null ? `${data.accuracy_pct}%` : "—", color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: s.color, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* RECENT — with inline feedback buttons */}
      {data.recent.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>
            การตัดสินใจล่าสุด
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Recent Gate Decisions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.recent.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title ?? r.slug ?? "(ไม่มีชื่อ)"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {fmtDate(r.created_at)} ·{" "}
                    <span style={{ color: r.pass ? "#34d399" : "#fb7185", fontWeight: 600 }}>{r.pass ? "ผ่าน" : "บล็อก"}</span>
                    {!r.pass && r.reasons && r.reasons.length > 0 && <> — {r.reasons.join(", ")}</>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {r.human_feedback ? (
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: r.human_feedback === "correct" ? "#34d399" : "#fb7185",
                    }}>
                      {r.human_feedback === "correct" ? "✅ ยืนยันถูกต้อง" : "❌ ยืนยันว่าผิด"}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => submitFeedback(r.id, "correct")}
                        disabled={submitting === r.id}
                        style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,.3)", background: "rgba(16,185,129,.08)", color: "#34d399", cursor: "pointer" }}
                      >
                        ✅ ถูกต้อง
                      </button>
                      <button
                        onClick={() => submitFeedback(r.id, "incorrect")}
                        disabled={submitting === r.id}
                        style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(244,63,94,.3)", background: "rgba(244,63,94,.08)", color: "#fb7185", cursor: "pointer" }}
                      >
                        ❌ ผิดพลาด
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
