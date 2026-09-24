"use client";

import { useEffect, useState } from "react";

type Context = {
  scope: string;
  market: { recent_insights: { area: string; insight: string; created_at: string }[] };
  land_analysis: {
    status: "available" | "unavailable";
    projects: {
      id: string; name: string; area_name: string | null;
      land_price: number | null; build_cost: number | null;
    }[];
  };
};

type State = { area: string; status: "loading" | "ready" | "error"; data?: Context };
const money = (value: number | null) => value == null ? "ไม่ระบุ" : new Intl.NumberFormat("th-TH").format(value);

export default function LandBusinessContext({ area }: { area: string }) {
  const selectedArea = area.trim();
  const [state, setState] = useState<State | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!selectedArea) return;
    const controller = new AbortController();
    setState({ area: selectedArea, status: "loading" });
    // Debounce typing; abort old requests so a previous area never replaces this one.
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ area: selectedArea, limit: "5" });
        const res = await fetch(`/api/brains/context?${params}`, {
          signal: controller.signal, cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || data.ok !== true || data.scope !== selectedArea ||
            !Array.isArray(data.market?.recent_insights) ||
            !Array.isArray(data.land_analysis?.projects) ||
            !["available", "unavailable"].includes(data.land_analysis?.status)) {
          throw new Error("Context unavailable");
        }
        if (!controller.signal.aborted) setState({ area: selectedArea, status: "ready", data });
      } catch {
        if (!controller.signal.aborted) setState({ area: selectedArea, status: "error" });
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [selectedArea, retry]);

  // Hide stale results immediately, before the replacement request's effect runs.
  const current = state?.area === selectedArea ? state : null;
  const data = current?.status === "ready" ? current.data : undefined;
  const insights = data?.market.recent_insights.filter(r => r.area === selectedArea) ?? [];
  const projects = data?.land_analysis.projects.filter(r => r.area_name === selectedArea) ?? [];

  return (
    <section aria-label="ความรู้จาก Brains สำหรับทำเลนี้" style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(99,102,241,.3)", borderRadius: 20, padding: 24, color: "#cbd5e1", fontSize: 13 }}>
      <h2 style={{ fontSize: 15, margin: "0 0 12px", color: "#a5b4fc" }}>บริบททำเลจาก Brains</h2>
      <div aria-live="polite">
        {!selectedArea ? <p>ระบุทำเล/พื้นที่ เพื่ออ่านข้อมูลตลาดและงบโปรเจกต์ที่บันทึกไว้ในทำเลเดียวกัน</p> :
          !current || current.status === "loading" ? <p>กำลังอ่านข้อมูลของ {selectedArea}…</p> :
          current.status === "error" ? <p>ดึงข้อมูลทำเลไม่ได้ในขณะนี้ ยังสามารถคำนวณและบันทึกโปรเจกต์ได้ตามปกติ</p> :
          data ? <>
            <p style={{ color: "#f1f5f9" }}>ทำเล: {selectedArea}</p>
            <h3 style={{ fontSize: 13 }}>ข้อมูลตลาดที่บันทึกไว้</h3>
            {insights.length === 0 ? <p>ไม่พบข้อมูลตลาดในทำเลนี้</p> : <ul style={{ paddingLeft: 20 }}>
              {insights.map((row, index) => <li key={`${row.created_at}-${index}`} style={{ marginBottom: 8 }}>{row.insight}</li>)}
            </ul>}
            <h3 style={{ fontSize: 13 }}>งบประมาณจากโปรเจกต์สร้างบ้านขายที่บันทึกไว้</h3>
            {data.land_analysis.status === "unavailable" ? <p>ดึงข้อมูลโปรเจกต์ไม่ได้ จึงยังสรุปไม่ได้ว่ามีโปรเจกต์ในทำเลนี้หรือไม่</p> :
              projects.length === 0 ? <p>ไม่พบโปรเจกต์ที่บันทึกในทำเลนี้</p> : <ul style={{ paddingLeft: 20 }}>
                {projects.map(project => <li key={project.id} style={{ marginBottom: 8 }}>
                  {project.name} — ราคาที่ดิน {money(project.land_price)} บาท · งบก่อสร้าง {money(project.build_cost)} บาท/ตร.ม.
                </li>)}
              </ul>}
            <p>ข้อมูลอ้างอิงจากรายการที่บันทึกในระบบ งบเป็นประมาณการของผู้ใช้ ไม่ใช่ต้นทุนจริงหรือราคาตลาดที่ยืนยันแล้ว และไม่เปลี่ยนตัวเลขในแบบคำนวณให้อัตโนมัติ</p>
          </> : null}
      </div>
      {selectedArea ? <button type="button" onClick={() => setRetry(r => r + 1)} disabled={current?.status === "loading"}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #6366f1", background: "transparent", color: "#a5b4fc", cursor: "pointer" }}>
        อ่านข้อมูลอีกครั้ง
      </button> : null}
    </section>
  );
}
