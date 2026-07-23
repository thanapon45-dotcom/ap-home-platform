"use client";
export const dynamic = "force-dynamic";
// CLOSED (session 29, Jul 23 2026, ADR-018 follow-up): this page used to be a public
// "cost to build a new home" calculator + lead form for Unit 1 (รับสร้างบ้านใหม่), which
// was discontinued per ADR-010/012. Archi confirmed to close it rather than repurpose it.
// Kept as a graceful notice (not a raw 404) in case old links/ads still point here.
// Sidebar nav entry for this page was also removed — see components/Sidebar.tsx.

export default function BudgetPage() {
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "36px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🙏</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "16px 0 0", fontFamily: "'DM Serif Display',serif" }}>
          ขออภัย เครื่องมือนี้ปิดให้บริการแล้ว
        </h1>
        <p style={{ margin: "10px 0 0", color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>
          Finnhouses ไม่ได้รับสร้างบ้านใหม่เองแล้ว — ปัจจุบันเราให้บริการ
          <strong style={{ color: "#f1f5f9" }}> รีโนเวทบ้านเพื่อขาย (Fix &amp; Flip)</strong>,
          <strong style={{ color: "#f1f5f9" }}> ที่ปรึกษา/ตรวจสอบงานก่อสร้าง</strong>
          {" "}และ<strong style={{ color: "#f1f5f9" }}> รับฝากขายบ้านและที่ดิน</strong>
        </p>
        <p style={{ margin: "16px 0 0", color: "#64748b", fontSize: 13 }}>
          สนใจบริการด้านบน ทักแชทหรือโทรหาทีมงานได้เลย ทีมงานจะช่วยแนะนำบริการที่ตรงกับความต้องการของคุณ
        </p>
      </div>
    </div>
  );
}
