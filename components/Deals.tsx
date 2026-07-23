"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
// Fix & Flip Deals — deal pipeline tracker for Business Unit 3 (60% of revenue).
// Built on the pre-existing but previously unused `reno_deals` Supabase table.
// CRUD goes through /api/deals/* (service_role server-side) — see ISSUE-013
// pattern: RLS enabled with zero policies, no direct client-side Supabase calls.
// See docs/decisions.md for the ADR covering this module.

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

type Stage = "evaluating" | "renovating" | "listed" | "closed";

type Deal = {
  id: string;
  name: string | null;
  property_address: string | null;
  stage: Stage;
  purchase_price: number | null;
  reno_budget: number | null;
  reno_cost: number | null;
  list_price: number | null;
  sale_price: number | null;
  roi_pct: number | null;
  days_to_sell: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  land_project_id: string | null;
};

// ADR-022 (session 29, item #3 of the "system proves itself correct" plan) —
// deals can optionally be linked back to the Land Analyzer project they came
// from (via the "🔗 สร้างดีล Fix & Flip" button there). When linked, we can
// compare the project's estimated ROI against this deal's actual ROI once
// it closes — reusing the same variance() pattern as cost/price above.
type LandProject = { id: string; roi: number | null };

const STAGES: { key: Stage; label: string; color: string; bg: string }[] = [
  { key: "evaluating", label: "กำลังประเมิน", color: "#f59e0b", bg: "rgba(245,158,11,.08)" },
  { key: "renovating", label: "กำลังรีโนเวท", color: "#6366f1", bg: "rgba(99,102,241,.08)" },
  { key: "listed",     label: "ประกาศขาย",   color: "#22d3ee", bg: "rgba(34,211,238,.08)" },
  { key: "closed",     label: "ปิดดีลแล้ว",   color: "#10b981", bg: "rgba(16,185,129,.08)" },
];

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10, padding: "9px 12px", color: "#f1f5f9", fontSize: 14, width: "100%", outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const emptyForm = {
  name: "", property_address: "", purchase_price: "", reno_budget: "", list_price: "", notes: "",
};

const emptyActuals = { reno_cost: "", sale_price: "" };

// ROI = (กำไรจริง) / (เงินลงทุนจริงทั้งหมด) * 100
function computeRoi(purchasePrice: number | null, renoCost: number, salePrice: number): number | null {
  const invested = (Number(purchasePrice) || 0) + renoCost;
  if (invested <= 0 || salePrice <= 0) return null;
  return ((salePrice - invested) / invested) * 100;
}

function variance(estimate: number | null | undefined, actual: number | null | undefined) {
  const e = Number(estimate) || 0;
  const a = Number(actual) || 0;
  if (!e || !a) return null;
  const diff = a - e;
  const pct = (diff / e) * 100;
  return { diff, pct };
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [landProjects, setLandProjects] = useState<Record<string, LandProject>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editingActualsId, setEditingActualsId] = useState<string | null>(null);
  const [actuals, setActuals] = useState(emptyActuals);
  const [savingActuals, setSavingActuals] = useState(false);

  const msg = (m: string, ok = true) => { setToast({ msg: m, ok }); setTimeout(() => setToast(null), 3000); };

  const loadDeals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/deals");
    const json = await res.json();
    const rows = (json.ok !== false ? (json.data ?? []) : []) as Deal[];
    setDeals(rows);
    setLoading(false);

    const projectIds = Array.from(new Set(rows.map(d => d.land_project_id).filter(Boolean))) as string[];
    if (projectIds.length > 0) {
      const pRes = await fetch(`/api/projects?ids=${projectIds.join(",")}`);
      const pJson = await pRes.json();
      if (pJson.ok !== false) {
        const map: Record<string, LandProject> = {};
        for (const p of (pJson.data ?? []) as LandProject[]) map[p.id] = p;
        setLandProjects(map);
      }
    } else {
      setLandProjects({});
    }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const byStage = useMemo(() => {
    const map: Record<Stage, Deal[]> = { evaluating: [], renovating: [], listed: [], closed: [] };
    for (const d of deals) (map[d.stage] ?? map.evaluating).push(d);
    return map;
  }, [deals]);

  const metrics = useMemo(() => {
    const active = deals.filter(d => d.stage !== "closed");
    const closed = deals.filter(d => d.stage === "closed");
    const capitalDeployed = active.reduce((s, d) => s + (Number(d.purchase_price) || 0) + (Number(d.reno_cost ?? d.reno_budget) || 0), 0);
    const avgRoi = closed.length ? closed.reduce((s, d) => s + (Number(d.roi_pct) || 0), 0) / closed.length : 0;

    // Actual-vs-estimate accuracy — only counts deals where BOTH estimate and actual exist.
    const costComparable = deals.filter(d => d.reno_budget != null && d.reno_cost != null);
    const priceComparable = deals.filter(d => d.list_price != null && d.sale_price != null);
    const avgCostVariancePct = costComparable.length
      ? costComparable.reduce((s, d) => s + ((Number(d.reno_cost) - Number(d.reno_budget)) / Number(d.reno_budget)) * 100, 0) / costComparable.length
      : null;
    const avgPriceVariancePct = priceComparable.length
      ? priceComparable.reduce((s, d) => s + ((Number(d.sale_price) - Number(d.list_price)) / Number(d.list_price)) * 100, 0) / priceComparable.length
      : null;

    // ROI estimate (Land Analyzer, at land-purchase time) vs actual ROI (this deal, at sale) —
    // only counts deals linked to a project AND with both numbers present.
    const roiComparable = deals.filter(d => {
      const proj = d.land_project_id ? landProjects[d.land_project_id] : null;
      return proj?.roi != null && d.roi_pct != null;
    });
    const avgRoiVariancePct = roiComparable.length
      ? roiComparable.reduce((s, d) => {
          const proj = landProjects[d.land_project_id as string];
          return s + (Number(d.roi_pct) - Number(proj.roi));
        }, 0) / roiComparable.length
      : null;

    return {
      activeCount: active.length, closedCount: closed.length, capitalDeployed, avgRoi,
      avgCostVariancePct, avgPriceVariancePct, avgRoiVariancePct,
      costComparableCount: costComparable.length, priceComparableCount: priceComparable.length,
      roiComparableCount: roiComparable.length,
    };
  }, [deals, landProjects]);

  const createDeal = async () => {
    if (!form.name.trim()) { msg("กรุณาใส่ชื่อดีล", false); return; }
    setSaving(true);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        property_address: form.property_address || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        reno_budget: form.reno_budget ? Number(form.reno_budget) : null,
        list_price: form.list_price ? Number(form.list_price) : null,
        notes: form.notes || null,
        stage: "evaluating",
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.ok === false) { msg("บันทึกไม่สำเร็จ: " + (json.error ?? `HTTP ${res.status}`), false); return; }
    msg("เพิ่มดีลสำเร็จ ✓");
    setForm(emptyForm);
    setShowForm(false);
    loadDeals();
  };

  const moveStage = async (deal: Deal, dir: 1 | -1) => {
    const idx = STAGES.findIndex(s => s.key === deal.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next.key, updated_at: new Date().toISOString() }),
    });
    const json = await res.json();
    if (!res.ok || json.ok === false) { msg("ย้ายสถานะไม่สำเร็จ: " + (json.error ?? `HTTP ${res.status}`), false); return; }
    loadDeals();
  };

  const removeDeal = async (id: string) => {
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || json.ok === false) { msg("ลบไม่สำเร็จ: " + (json.error ?? `HTTP ${res.status}`), false); return; }
    msg("ลบดีลแล้ว");
    loadDeals();
  };

  const openActuals = (d: Deal) => {
    setEditingActualsId(d.id);
    setActuals({
      reno_cost: d.reno_cost != null ? String(d.reno_cost) : "",
      sale_price: d.sale_price != null ? String(d.sale_price) : "",
    });
  };

  const saveActuals = async (d: Deal) => {
    const reno_cost = actuals.reno_cost ? Number(actuals.reno_cost) : null;
    const sale_price = actuals.sale_price ? Number(actuals.sale_price) : null;
    const roi_pct = reno_cost != null && sale_price != null
      ? computeRoi(d.purchase_price, reno_cost, sale_price)
      : null;
    setSavingActuals(true);
    const res = await fetch(`/api/deals/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reno_cost, sale_price, roi_pct, updated_at: new Date().toISOString() }),
    });
    const json = await res.json();
    setSavingActuals(false);
    if (!res.ok || json.ok === false) { msg("บันทึกตัวเลขจริงไม่สำเร็จ: " + (json.error ?? `HTTP ${res.status}`), false); return; }
    msg("บันทึกต้นทุน/ราคาขายจริงแล้ว ✓");
    setEditingActualsId(null);
    loadDeals();
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".25em", textTransform: "uppercase", color: "#10b981", fontWeight: 700 }}>🏗️ FIX &amp; FLIP DEALS</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "6px 0 0", fontFamily: "'DM Serif Display',serif" }}>Deal Pipeline</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>ติดตามดีล renovation-for-resale ตั้งแต่ประเมินจนถึงปิดการขาย</p>
          </div>
          <button onClick={() => setShowForm(s => !s)} style={{
            background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 12,
            padding: "10px 18px", color: "#10b981", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            {showForm ? "✕ ปิดฟอร์ม" : "+ เพิ่มดีลใหม่"}
          </button>
        </div>

        {/* Summary metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
          {[
            { label: "ดีลที่กำลังดำเนินการ", value: `${metrics.activeCount}`, color: "#6366f1" },
            { label: "ดีลที่ปิดแล้ว", value: `${metrics.closedCount}`, color: "#10b981" },
            { label: "เงินทุนที่ใช้อยู่ (active)", value: `฿${fmt(metrics.capitalDeployed)}`, color: "#f59e0b" },
            { label: "ROI เฉลี่ย (ดีลที่ปิดแล้ว)", value: metrics.closedCount ? `${metrics.avgRoi.toFixed(1)}%` : "—", color: "#22d3ee" },
          ].map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginTop: 4 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Estimate accuracy — actual vs estimated, honest low-data state (same pattern as QC Accuracy dashboard) */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>ความแม่นยำของการประมาณการ (จริง vs ที่ประเมินไว้)</div>
          {metrics.costComparableCount === 0 && metrics.priceComparableCount === 0 && metrics.roiComparableCount === 0 ? (
            <div style={{ fontSize: 12, color: "#f59e0b", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: "8px 12px" }}>
              ⚠️ ยังไม่มีข้อมูลพอสรุป — ยังไม่มีดีลไหนกรอกทั้งตัวเลขประเมินและตัวเลขจริงครบคู่ (กดปุ่ม &quot;ใส่ต้นทุน/ราคาขายจริง&quot; ที่การ์ดดีลเพื่อเริ่มเก็บข้อมูล)
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>ต้นทุนรีโนเวท เกิน/ต่ำกว่างบเฉลี่ย (n={metrics.costComparableCount})</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: (metrics.avgCostVariancePct ?? 0) > 0 ? "#f43f5e" : "#10b981" }}>
                  {metrics.avgCostVariancePct == null ? "—" : `${metrics.avgCostVariancePct > 0 ? "+" : ""}${metrics.avgCostVariancePct.toFixed(1)}%`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>ราคาขายจริง สูง/ต่ำกว่าประกาศเฉลี่ย (n={metrics.priceComparableCount})</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: (metrics.avgPriceVariancePct ?? 0) >= 0 ? "#10b981" : "#f43f5e" }}>
                  {metrics.avgPriceVariancePct == null ? "—" : `${metrics.avgPriceVariancePct > 0 ? "+" : ""}${metrics.avgPriceVariancePct.toFixed(1)}%`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>ROI จริง สูง/ต่ำกว่าที่ประเมินไว้ตอนวิเคราะห์ที่ดิน (n={metrics.roiComparableCount})</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: (metrics.avgRoiVariancePct ?? 0) >= 0 ? "#10b981" : "#f43f5e" }}>
                  {metrics.avgRoiVariancePct == null ? "ยังไม่มีข้อมูลพอสรุป" : `${metrics.avgRoiVariancePct > 0 ? "+" : ""}${metrics.avgRoiVariancePct.toFixed(1)} จุด`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New deal form */}
      {showForm && (
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: ".12em" }}>เพิ่มดีลใหม่</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ชื่อดีล *">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="เช่น บ้านซอยลาดพร้าว 42" />
            </Field>
            <Field label="ที่อยู่ทรัพย์">
              <input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="ราคาซื้อ (บาท)">
              <input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="งบรีโนเวท (บาท)">
              <input type="number" value={form.reno_budget} onChange={e => setForm(f => ({ ...f, reno_budget: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="ราคาประกาศขาย (บาท)">
              <input type="number" value={form.list_price} onChange={e => setForm(f => ({ ...f, list_price: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <Field label="หมายเหตุ">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
          <button onClick={createDeal} disabled={saving} style={{
            alignSelf: "flex-start", background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)",
            borderRadius: 10, padding: "9px 20px", color: "#10b981", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            {saving ? "กำลังบันทึก..." : "💾 บันทึกดีล"}
          </button>
        </div>
      )}

      {toast && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: toast.ok ? "rgba(16,185,129,.1)" : "rgba(244,63,94,.1)", border: `1px solid ${toast.ok ? "rgba(16,185,129,.3)" : "rgba(244,63,94,.3)"}`, fontSize: 13, color: toast.ok ? "#10b981" : "#f43f5e" }}>
          {toast.msg}
        </div>
      )}

      {/* Kanban board */}
      {loading ? (
        <div style={{ color: "#64748b", fontSize: 13, padding: 20 }}>กำลังโหลด...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {STAGES.map((stage, stageIdx) => (
            <div key={stage.key} style={{ background: "rgba(15,20,40,.6)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: ".08em" }}>{stage.label}</div>
                <div style={{ fontSize: 11, color: "#475569", background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "2px 8px" }}>{byStage[stage.key].length}</div>
              </div>

              {byStage[stage.key].length === 0 ? (
                <div style={{ color: "#334155", fontSize: 12, padding: "20px 0", textAlign: "center" }}>ไม่มีดีล</div>
              ) : byStage[stage.key].map(d => {
                const budget = Number(d.reno_budget) || 0;
                const spent = Number(d.reno_cost) || 0;
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const costVar = variance(d.reno_budget, d.reno_cost);
                const priceVar = variance(d.list_price, d.sale_price);
                const isEditing = editingActualsId === d.id;
                return (
                  <div key={d.id} style={{ background: stage.bg, border: `1px solid ${stage.color}33`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{d.name || "(ไม่มีชื่อ)"}</div>
                    {d.property_address && <div style={{ fontSize: 11, color: "#64748b" }}>{d.property_address}</div>}

                    {d.purchase_price != null && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>ซื้อ: ฿{fmt(d.purchase_price)}</div>
                    )}

                    {budget > 0 && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 3 }}>
                          <span>งบรีโนเวท (ประมาณ vs จริง)</span><span>฿{fmt(spent)} / ฿{fmt(budget)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct > 100 ? "#f43f5e" : stage.color, borderRadius: 4 }} />
                        </div>
                        {costVar && (
                          <div style={{ fontSize: 10, marginTop: 2, color: costVar.diff > 0 ? "#f43f5e" : "#10b981" }}>
                            {costVar.diff > 0 ? "เกินงบ" : "ต่ำกว่างบ"} ฿{fmt(Math.abs(costVar.diff))} ({costVar.pct > 0 ? "+" : ""}{costVar.pct.toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    )}

                    {d.list_price != null && d.sale_price != null && (
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        ประกาศ ฿{fmt(d.list_price)} → ขายจริง ฿{fmt(d.sale_price)}
                        {priceVar && (
                          <span style={{ color: priceVar.diff >= 0 ? "#10b981" : "#f43f5e", marginLeft: 6 }}>
                            ({priceVar.diff >= 0 ? "+" : ""}{priceVar.pct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}

                    {d.roi_pct != null && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: Number(d.roi_pct) >= 20 ? "#10b981" : "#f59e0b" }}>ROI จริง {Number(d.roi_pct).toFixed(1)}%</div>
                    )}

                    {d.land_project_id && landProjects[d.land_project_id]?.roi != null && (
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        🔗 ROI ประเมิน (Land Analyzer) {Number(landProjects[d.land_project_id].roi).toFixed(1)}%
                        {d.roi_pct != null && (() => {
                          const v = variance(landProjects[d.land_project_id!].roi, d.roi_pct);
                          return v ? (
                            <span style={{ color: v.diff >= 0 ? "#10b981" : "#f43f5e", marginLeft: 6 }}>
                              ({v.diff >= 0 ? "+" : ""}{v.diff.toFixed(1)} จุด)
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(0,0,0,.15)", borderRadius: 8, padding: 8, marginTop: 2 }}>
                        <Field label="ต้นทุนรีโนเวทจริง (บาท)">
                          <input type="number" value={actuals.reno_cost} onChange={e => setActuals(a => ({ ...a, reno_cost: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }} />
                        </Field>
                        <Field label="ราคาขายจริง (บาท)">
                          <input type="number" value={actuals.sale_price} onChange={e => setActuals(a => ({ ...a, sale_price: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }} />
                        </Field>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => saveActuals(d)} disabled={savingActuals} style={{ flex: 1, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "6px 0", color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            {savingActuals ? "กำลังบันทึก..." : "💾 บันทึก"}
                          </button>
                          <button onClick={() => setEditingActualsId(null)} style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 0", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => openActuals(d)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#22d3ee", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        ✎ ใส่ต้นทุน/ราคาขายจริง
                      </button>
                    )}

                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {stageIdx > 0 && (
                        <button onClick={() => moveStage(d, -1)} title="ย้อนกลับ" style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "5px 0", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>◀</button>
                      )}
                      {stageIdx < STAGES.length - 1 && (
                        <button onClick={() => moveStage(d, 1)} title="ไปขั้นถัดไป" style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "5px 0", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>▶</button>
                      )}
                      <button onClick={() => removeDeal(d.id)} title="ลบ" style={{ background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.2)", borderRadius: 8, padding: "5px 8px", color: "#f43f5e", fontSize: 11, cursor: "pointer" }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
