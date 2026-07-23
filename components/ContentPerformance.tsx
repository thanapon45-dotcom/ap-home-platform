"use client";
import { useState, useEffect } from "react";

/**
 * Content Performance Dashboard — follow-up to ADR-020 (session 29 ต่อๆๆ).
 * Reads /api/content/performance.
 *
 * Same honest-empty-state pattern as QcAccuracy.tsx / Deals ROI: while
 * `post_performance` has 0 rows with real data (waiting on the "FB Post
 * Performance Tracker" n8n workflow fix + a real service_role key — see
 * ADR-020), this shows "ยังไม่มีข้อมูลพอสรุป" instead of a misleading 0%/blank
 * chart. This is the UI half of closing the "AI Content Studio never proved
 * itself" gap found during the module-by-module self-proof audit.
 */

type Data = {
  total_posts: number;
  with_real_data: number;
  coverage_pct: number;
  leads_generated: number;
  reliable: boolean;
  threshold: number;
  avg_reach: number | null;
  avg_engagement_rate: number | null;
  top_posts: { topic: string | null; keyword: string | null; source_channel: string | null; published_at: string | null; reach: number; engagement_rate: number; link_clicks: number }[];
  window: { first: string; last: string } | null;
  recent: { topic: string | null; keyword: string | null; source_channel: string | null; published_at: string | null; has_real_data: boolean; reach: number | null; engagement_rate: number | null }[];
};

const card: React.CSSProperties = {
  background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 20, padding: 24,
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function ContentPerformance() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/content/performance");
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
    return <div style={{ ...card, color: "#64748b", fontSize: 13 }}>⏳ กำลังโหลดข้อมูล Content Performance...</div>;
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
          AI CONTENT — PERFORMANCE
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif", marginBottom: 6 }}>
          เนื้อหาที่ AI สร้างจริงๆ ทำผลงานเป็นยังไง?
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          คำนวณจากตัวเลขจริงที่ดึงมาจาก Facebook Graph API (ตาราง <code>post_performance</code>) — ไม่ใช่ตัวเลข placeholder ที่ log ตอน publish
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
            มีโพสต์ทั้งหมด <b style={{ color: "#f1f5f9" }}>{data.total_posts}</b> โพสต์
            {data.window && <> ({fmtDate(data.window.first)} – {fmtDate(data.window.last)})</>}
            {" "}แต่มีแค่ <b style={{ color: "#f1f5f9" }}>{data.with_real_data}</b> โพสต์ที่มีตัวเลขจริงจาก FB —
            ต้องมีอย่างน้อย <b style={{ color: "#f1f5f9" }}>{data.threshold}</b> โพสต์ก่อนถึงจะสรุปค่าเฉลี่ยได้อย่างมีความหมาย
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
            สาเหตุที่ยังไม่มีข้อมูล: workflow &quot;FB Post Performance Tracker&quot; ใช้ anon key ที่ชนกับ RLS มาตลอด (ดู ADR-020) —
            หน้านี้เป็น infrastructure ที่พร้อมใช้ทันทีที่ workflow เขียนข้อมูลจริงได้สำเร็จ ไม่ใช่ค้างเพราะหน้านี้พัง
          </div>
        </div>
      ) : (
        <div style={{ ...card, border: "1px solid rgba(16,185,129,.3)" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Reach เฉลี่ย</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399" }}>{data.avg_reach?.toLocaleString() ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Engagement เฉลี่ย</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#22d3ee" }}>{data.avg_engagement_rate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "โพสต์ทั้งหมด", value: data.total_posts, color: "#22d3ee" },
          { label: "มีข้อมูลจริง", value: data.with_real_data, color: "#6366f1" },
          { label: "% coverage", value: `${data.coverage_pct}%`, color: "#f59e0b" },
          { label: "Lead ที่ได้จากโพสต์", value: data.leads_generated, color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: s.color, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* TOP POSTS */}
      {data.top_posts.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>
            ผลงานดีที่สุด
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Top Posts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.top_posts.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>{p.topic ?? p.keyword ?? "(ไม่มีชื่อ)"}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Reach {p.reach.toLocaleString()} · Eng {p.engagement_rate}% · คลิก {p.link_clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT */}
      {data.recent.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>
            โพสต์ล่าสุด
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Recent Posts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.recent.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", fontSize: 12 }}>
                <span style={{ color: "#64748b" }}>{fmtDate(r.published_at)}</span>
                <span style={{ color: "#94a3b8" }}>{r.topic ?? r.keyword ?? "—"}</span>
                <span style={{ color: "#475569" }}>{r.source_channel ?? "—"}</span>
                <span style={{ color: r.has_real_data ? "#34d399" : "#475569", fontWeight: 600 }}>
                  {r.has_real_data ? `Reach ${r.reach?.toLocaleString()} · Eng ${r.engagement_rate}%` : "ยังไม่มีข้อมูลจริง"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
