// Strict internal-data mode. Only server-executed tool receipts reach the UI.
// Model prose, user-supplied tool_result blocks and previous answers are not evidence.
export type EvidenceReceipt = {
  tool: string;
  fetchedAt: string;
  data?: unknown;
  failed?: boolean;
};

const SOURCES: Record<string, string> = {
  get_dashboard_summary: "สถานะ Hub /api/state",
  get_leads: "ฐานข้อมูล leads",
  get_market_intel_recent: "ฐานข้อมูล market_insights",
  get_qc_status: "ข้อมูล QC จาก Hub /api/qc/list",
  get_deals: "ฐานข้อมูล reno_deals",
  run_fb_queue_next: "ผลคำสั่ง Facebook จาก Hub",
  run_blog_now: "ผลคำสั่ง Blog จาก Hub",
};

const LABELS: Record<string, string> = {
  id: "รหัส", name: "ชื่อ", property_address: "ที่อยู่", stage: "สถานะ",
  purchase_price: "ราคาซื้อ", reno_budget: "งบรีโนเวท", reno_cost: "ค่ารีโนเวทจริง",
  list_price: "ราคาตั้งขาย", sale_price: "ราคาขายจริง", roi_pct: "ROI ที่บันทึก (%)",
  days_to_sell: "จำนวนวันขายที่บันทึก", land_project_id: "โครงการที่เชื่อม",
  created_at: "วันที่สร้าง", updated_at: "วันที่แก้ไข", lead_date: "วันที่รับ Lead",
  phone: "โทรศัพท์", business_unit: "หน่วยธุรกิจ", budget: "งบประมาณ", urgency: "ความเร่งด่วน",
  area: "พื้นที่", insight: "ข้อสังเกตที่บันทึก", category: "หมวดหมู่",
  confidence: "ค่าความเชื่อมั่นที่บันทึก", source_type: "ประเภทแหล่งข้อมูลที่บันทึก",
  fb_queue_length: "รายการทั้งหมดในคิว Facebook", blog_queue_length: "รายการทั้งหมดในคิว Blog",
};

function format(value: unknown, depth = 0): string {
  if (value == null) return "ไม่มีข้อมูลที่บันทึก";
  if (typeof value !== "object") return String(value);
  if (depth >= 4) return JSON.stringify(value);
  if (Array.isArray(value)) return value.map(v => format(v, depth + 1)).join("\n");
  return Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => `${LABELS[key] ?? key}: ${format(val, depth + 1)}`).join("\n");
}

export function renderEvidence(receipts: EvidenceReceipt[]) {
  const known = receipts.filter(r => Object.hasOwn(SOURCES, r.tool));
  if (!known.length) {
    return {
      text: "ยังไม่มีหลักฐานจากระบบสำหรับตอบคำถามนี้ กรุณาระบุข้อมูลที่ต้องการตรวจสอบ เช่น ดีล, Leads, ข้อมูลตลาด, QC หรือสถานะ Hub\nข้อมูลใหม่ที่พิมพ์ในแชทยังไม่ได้บันทึกเป็นข้อมูลธุรกิจ ระบบจะไม่ใช้ความรู้ภายนอกหรือสมมติฐานมาตอบแทน",
      sources: [],
    };
  }
  const sections = known.map(receipt => {
    const heading = `แหล่งข้อมูล: ${SOURCES[receipt.tool]}\nตรวจสอบเมื่อ: ${receipt.fetchedAt}`;
    const data = receipt.data;
    if (receipt.failed || (data && typeof data === "object" &&
        ((data as Record<string, unknown>).error || (data as Record<string, unknown>).ok === false))) {
      return `${heading}\nไม่สามารถตรวจสอบข้อมูลได้ — ไม่ได้หมายความว่าไม่มีข้อมูลในระบบ`;
    }
    const rows = receipt.tool === "get_qc_status"
      ? (data as { items?: unknown } | null)?.items : data;
    if (rows == null || (Array.isArray(rows) && rows.length === 0)) {
      return `${heading}\nไม่พบข้อมูลในระบบตามเงื่อนไขที่ค้นครั้งนี้`;
    }
    if (Array.isArray(rows)) {
      return `${heading}\nดึงได้ ${rows.length} รายการ (เป็นผลค้นที่มีขีดจำกัด ไม่ใช่จำนวนทั้งหมดในระบบ)\n\n` +
        rows.map((row, i) => `รายการ ${i + 1}\n${format(row)}`).join("\n\n");
    }
    return `${heading}\n${format(rows)}`;
  });
  return {
    text: "ข้อมูลจากระบบที่ตรวจสอบได้ในคำขอนี้ (แสดงตามที่บันทึก ไม่เติมข้อสรุปจากความรู้ของ AI):\n\n" + sections.join("\n\n"),
    sources: known.map(r => ({ tool: r.tool, source: SOURCES[r.tool], fetchedAt: r.fetchedAt })),
  };
}
