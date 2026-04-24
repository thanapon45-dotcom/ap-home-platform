"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(Math.round(n));
const PRICE_PER_SQM = 18000;

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 14,
  width: "100%", outline: "none", fontFamily: "inherit",
};

export default function BudgetPage() {
  const [area, setArea]     = useState("");
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [step, setStep]     = useState<1 | 2>(1);

  const budget = area ? Number(area) * PRICE_PER_SQM : null;

  const submit = async () => {
    if (!name || !phone || !area) return;
    setSaving(true);
    await supabase.from("leads").insert([{ name, phone, area: Number(area), budget }]);
    await fetch("/api/telegram", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, area, budget }),
    });
    setSaving(false); setDone(true);
  };

  return (
    <div style={{ padding: 24, maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="animate-fadeUp" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "24px 28px" }}>
        <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#10b981", fontWeight: 700 }}>💰 BUDGET TOOL</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "6px 0 0", fontFamily: "'DM Serif Display',serif" }}>คำนวณงบสร้างบ้าน</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>ใส่พื้นที่ใช้สอยที่ต้องการ — ระบบจะประมาณงบสร้างบ้านให้ทันที</p>
      </div>

      {done ? (
        <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 20, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 12 }}>ส่งข้อมูลสำเร็จ!</div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>ทีมงาน Finnhouses จะติดต่อกลับภายใน 24 ชั่วโมง</div>
          <button onClick={() => { setDone(false); setName(""); setPhone(""); setArea(""); setStep(1); }}
            style={{ marginTop: 20, padding: "10px 24px", borderRadius: 12, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", color: "#10b981", fontSize: 14, cursor: "pointer" }}>
            คำนวณใหม่
          </button>
        </div>
      ) : (
        <>
          {/* Calculator */}
          <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 8 }}>
                พื้นที่ใช้สอยที่ต้องการ (ตร.ม.)
              </label>
              <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="เช่น 120"
                style={{ ...inputStyle, fontSize: 20, padding: "14px 16px" }} />
            </div>

            {budget && (
              <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".15em" }}>งบประมาณโดยประมาณ</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#10b981", marginTop: 6 }}>{fmt(budget)}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>บาท ({fmt(PRICE_PER_SQM)} บาท/ตร.ม.)</div>
              </div>
            )}

            {budget && step === 1 && (
              <button onClick={() => setStep(2)} style={{ padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff" }}>
                รับคำปรึกษาฟรี →
              </button>
            )}
          </div>

          {/* Lead form */}
          {step === 2 && budget && (
            <div className="animate-fadeUp" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>ข้อมูลสำหรับติดต่อกลับ</div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>ชื่อ-นามสกุล</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="คุณสมชาย ใจดี" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>เบอร์โทรศัพท์</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputStyle} />
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", fontSize: 13, color: "#94a3b8" }}>
                🏠 พื้นที่ <strong style={{ color: "#f1f5f9" }}>{area} ตร.ม.</strong> · งบประมาณ <strong style={{ color: "#10b981" }}>{fmt(budget)} บาท</strong>
              </div>
              <button onClick={submit} disabled={!name || !phone || saving} style={{
                padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: saving ? "default" : "pointer",
                background: name && phone ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,.05)",
                border: "none", color: name && phone ? "#fff" : "#475569",
              }}>
                {saving ? "กำลังส่ง..." : "✅ ส่งข้อมูล — ขอรับคำปรึกษาฟรี"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { icon: "🏠", label: "ขนาดเล็ก", range: "80-100 ตร.ม.", price: "1.4-1.8M" },
          { icon: "🏡", label: "ขนาดกลาง", range: "120-150 ตร.ม.", price: "2.2-2.7M" },
          { icon: "🏰", label: "ขนาดใหญ่", range: "200+ ตร.ม.", price: "3.6M+" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginTop: 8 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{c.range}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginTop: 6 }}>{c.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
