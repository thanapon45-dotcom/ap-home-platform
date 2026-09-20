"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
// NOTE (session 25, Jul 16 2026): projects CRUD moved server-side to /api/projects
// — direct supabase.from("projects") calls with the public anon key were removed
// here because RLS on `projects` is now locked down (deny anon entirely).
// See docs/issues-log.md ISSUE-013.

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

const S = (styles: React.CSSProperties) => styles;

type Form = {
  landPrice: number | ""; landSize: number | ""; devCost: number;
  plots: number | ""; area: number; buildCost: number;
  profit: number; market: number | ""; note: string;
};
const DEFAULT: Form = { landPrice: "", landSize: "", devCost: 2000, plots: "", area: 120, buildCost: 10000, profit: 20, market: "", note: "" };

type Project = {
  id: string; name: string; type: string; pin: { lat: number; lng: number } | null; result: number; created_at: string;
  land_price: number | null; build_cost: number | null; area: number | null; plots: number | null;
  market_price: number | null; roi: number | null; area_name: string | null;
};

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
        {label} {sub && <span style={{ color: "#475569", fontSize: 11 }}>{sub}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = S({ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "9px 12px", color: "#f1f5f9", fontSize: 14, width: "100%", outline: "none" });

function NI({ value, onChange, placeholder }: { value: number | ""; onChange: (v: number | "") => void; placeholder?: string }) {
  return (
    <input
      type="number" value={value} placeholder={placeholder ?? "0"}
      style={inputStyle}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    />
  );
}

function Row({ label, value, hi, accent }: { label: string; value: string; hi?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderRadius: 10, background: hi ? "rgba(34,211,238,.08)" : accent ? "rgba(16,185,129,.08)" : "rgba(255,255,255,.02)", border: `1px solid ${hi ? "rgba(34,211,238,.2)" : accent ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.05)"}`, marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: hi || accent ? 700 : 500, color: hi ? "#22d3ee" : accent ? "#10b981" : "#f1f5f9" }}>{value}</span>
    </div>
  );
}

export default function LandAnalyzer() {
  const [type, setType] = useState<"small" | "large">("small");
  const [form, setForm] = useState<Form>(DEFAULT);
  const [pin, setPin]   = useState<{ lat: number; lng: number } | null>(null);
  const [pname, setPname] = useState("");
  const [areaName, setAreaName] = useState("");
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showList, setShowList] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const s = (k: keyof Form) => (v: any) => setForm(f => ({ ...f, [k]: v }));
  const msg = (m: string, ok = true) => { setToast({ msg: m, ok }); setTimeout(() => setToast(null), 3000); };

  const caPct  = type === "small" ? 0.1 : 0.3;
  const sellPct = 1 - caPct;

  const c = useMemo(() => {
    const lp = Number(form.landPrice) || 0, ls = Number(form.landSize) || 0;
    const dc = Number(form.devCost) || 0, pl = Number(form.plots) || 0;
    const ua = Number(form.area) || 0, bc = Number(form.buildCost) || 0;
    const pp = (Number(form.profit) || 20) / 100, mk = Number(form.market) || 0;
    const sa = ls * sellPct, ca = ls * caPct, caSqm = ca * 4;
    const tdc = dc * caSqm, tlp = lp + tdc;
    const lppu = pl > 0 ? tlp / pl : 0;
    const totalBuild = pl * ua * bc;
    const totalCost = tlp + totalBuild;
    const costPer = pl > 0 ? totalCost / pl : 0;
    const sellPrice = costPer > 0 ? costPer / (1 - pp) : 0;
    const marketPremium = mk > 0 ? mk - sellPrice : 0;
    const totalRev = pl * sellPrice, totalProfit = totalRev - totalCost;
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return { sa, ca, caSqm, tdc, tlp, lppu, totalBuild, totalCost, costPer, sellPrice, marketPremium, totalRev, totalProfit, roi };
  }, [form, caPct, sellPct]);


  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const json = await res.json();
    if (json.ok !== false) setProjects((json.data ?? []) as Project[]);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const save = async () => {
    if (!pname.trim()) { msg("กรุณาใส่ชื่อโปรเจค", false); return; }
    setSaving(true);
    // NOTE (session 25, Jul 16 2026): fixed pre-existing bug — this used to send
    // type/pin/form/result fields that never existed as columns on `projects`
    // (PGRST204 "column not found"). Table actually has normalized columns
    // (land_price, land_size, etc. + lat/lng) — map to those; `type`/`result`
    // were added as columns since the saved-projects list still reads them.
    const pl = Number(form.plots) || 0;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pname.trim(),
        type,
        result: Math.round(c.roi),
        land_price: Number(form.landPrice) || null,
        land_size: Number(form.landSize) || null,
        dev_cost: Number(form.devCost) || null,
        plots: pl || null,
        area: Number(form.area) || null,
        build_cost: Number(form.buildCost) || null,
        profit_per_plot: pl > 0 ? Math.round(c.totalProfit / pl) : null,
        market_price: Number(form.market) || null,
        roi: c.roi,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        area_name: areaName.trim() || null,
        notes: form.note || null,
        created_at: new Date().toISOString(),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.ok === false) { msg("บันทึกไม่สำเร็จ: " + (json.error ?? `HTTP ${res.status}`), false); }
    else { msg("บันทึกสำเร็จ ✓"); setPname(""); setAreaName(""); loadProjects(); }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      {/* Header */}
      <div className="animate-fadeUp" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#6366f1", fontWeight: 700 }}>🗺️ LAND ANALYZER</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "6px 0 0", fontFamily: "'DM Serif Display',serif" }}>วิเคราะห์ที่ดิน + คำนวณ ROI</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>ป้อนข้อมูลที่ดินและโปรเจค — ระบบจะคำนวณ margin, ROI, และราคาขายที่เหมาะสม</p>
          </div>
          <button onClick={() => setShowList(s => !s)} style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)", borderRadius: 12, padding: "8px 16px", color: "#818cf8", fontSize: 13, cursor: "pointer" }}>
            📁 โปรเจคที่บันทึก ({projects.length})
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {(["small", "large"] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: "8px 20px", borderRadius: 20, border: `1px solid ${type === t ? "#6366f1" : "rgba(255,255,255,.1)"}`,
              background: type === t ? "rgba(99,102,241,.15)" : "transparent",
              color: type === t ? "#818cf8" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {t === "small" ? "🏘️ แบ่งแปลงเล็ก (CA 10%)" : "🏙️ โครงการใหญ่ (CA 30%)"}
            </button>
          ))}
        </div>
      </div>

      {/* Saved projects list */}
      {showList && (
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>📁 โปรเจคที่บันทึกไว้</div>
          {projects.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>ยังไม่มีโปรเจค</div>
          ) : projects.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{new Date(p.created_at).toLocaleDateString("th-TH")} · {p.type}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: (p.result ?? 0) >= 20 ? "#10b981" : "#f59e0b" }}>{p.result ?? 0}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".12em" }}>ข้อมูลที่ดิน</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ราคาที่ดินรวม" sub="(บาท)"><NI value={form.landPrice} onChange={s("landPrice")} /></Field>
            <Field label="เนื้อที่รวม" sub="(ตร.ว.)"><NI value={form.landSize} onChange={s("landSize")} /></Field>
            <Field label="ค่าพัฒนา/ตร.ว. CA" sub="(บาท)"><NI value={form.devCost} onChange={s("devCost")} /></Field>
            <Field label="จำนวนแปลง/ยูนิต"><NI value={form.plots} onChange={s("plots")} /></Field>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".12em", marginTop: 4 }}>ข้อมูลก่อสร้าง</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="พื้นที่ใช้สอย/หลัง" sub="(ตร.ม.)"><NI value={form.area} onChange={s("area")} /></Field>
            <Field label="ต้นทุนก่อสร้าง/ตร.ม."><NI value={form.buildCost} onChange={s("buildCost")} /></Field>
            <Field label="กำไรเป้าหมาย" sub="(%)"><NI value={form.profit} onChange={s("profit")} /></Field>
            <Field label="ราคาตลาด/หลัง" sub="(บาท, optional)"><NI value={form.market} onChange={s("market")} /></Field>
          </div>

          <Field label="หมายเหตุ">
            <textarea value={form.note} onChange={e => s("note")(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
          </Field>

          {/* Map */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".12em" }}>📍 ปักหมุดตำแหน่ง</div>
          <MapPicker pin={pin} onPin={setPin} />
          {pin && <div style={{ fontSize: 11, color: "#22d3ee" }}>📍 {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</div>}
          <input value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="ทำเล/พื้นที่ เช่น ลาดหลุมแก้ว, รังสิต (ไม่บังคับ — ใช้จับคู่กับ Market Intelligence)"
            style={{ ...inputStyle }} />

          {/* Save */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input value={pname} onChange={e => setPname(e.target.value)} placeholder="ชื่อโปรเจค..."
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={save} disabled={saving} style={{
              background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", borderRadius: 10,
              padding: "9px 18px", color: "#818cf8", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
            }}>
              {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
            </button>
          </div>
          {toast && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: toast.ok ? "rgba(16,185,129,.1)" : "rgba(244,63,94,.1)", border: `1px solid ${toast.ok ? "rgba(16,185,129,.3)" : "rgba(244,63,94,.3)"}`, fontSize: 13, color: toast.ok ? "#10b981" : "#f43f5e" }}>
              {toast.msg}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 14 }}>📊 ผลการวิเคราะห์</div>
            <Row label="พื้นที่ขาย (Sellable)" value={`${fmt(c.sa)} ตร.ว.`} />
            <Row label="พื้นที่ CA" value={`${fmt(c.ca)} ตร.ว. (${fmt(c.caSqm)} ตร.ม.)`} />
            <Row label="ค่าพัฒนา CA" value={`${fmt(c.tdc)} บาท`} />
            <Row label="ต้นทุนที่ดินรวม" value={`${fmt(c.tlp)} บาท`} />
            <Row label="ต้นทุนที่ดิน/แปลง" value={`${fmt(c.lppu)} บาท`} />

            <div style={{ margin: "12px 0 8px", height: 1, background: "rgba(255,255,255,.06)" }} />

            <Row label="ต้นทุนก่อสร้างรวม" value={`${fmt(c.totalBuild)} บาท`} />
            <Row label="ต้นทุนรวมทั้งหมด" value={`${fmt(c.totalCost)} บาท`} />
            <Row label="ต้นทุน/หลัง" value={`${fmt(c.costPer)} บาท`} hi />

            <div style={{ margin: "12px 0 8px", height: 1, background: "rgba(255,255,255,.06)" }} />

            <Row label="ราคาขายที่แนะนำ/หลัง" value={`${fmt(c.sellPrice)} บาท`} hi />
            {Number(form.market) > 0 && (
              <Row label="ส่วนต่างจากตลาด" value={`${fmt(c.marketPremium)} บาท`} accent />
            )}
            <Row label="รายได้รวม (ทุกหลัง)" value={`${fmt(c.totalRev)} บาท`} />
            <Row label="กำไรรวม" value={`${fmt(c.totalProfit)} บาท`} accent />
          </div>

          {/* ROI gauge */}
          <div style={{ background: "rgba(15,20,40,.85)", border: `1px solid ${c.roi >= 20 ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.25)"}`, borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".15em" }}>ROI</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: c.roi >= 20 ? "#10b981" : c.roi >= 12 ? "#f59e0b" : "#f43f5e", marginTop: 4 }}>
              {isNaN(c.roi) ? "—" : `${c.roi.toFixed(1)}%`}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
              {c.roi >= 20 ? "✅ น่าลงทุน" : c.roi >= 12 ? "⚠️ ยอมรับได้" : "❌ ต่ำเกินไป"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
