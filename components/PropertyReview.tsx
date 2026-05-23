"use client";

import { useEffect, useState, useCallback } from "react";

interface LineImage { media_id: number; url: string; }

interface Property {
  id: string;
  title: string;
  property_type: string | null;
  asking_price: number | null;
  location: string | null;
  zone: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  land_sqm: number | null;
  notes: string | null;
  line_user_id: string | null;
  listed_at: string;
  status: string;
  wp_post_id?: number | null;
  line_images?: LineImage[] | null;
}

interface EditState {
  title: string;
  property_type: string;
  asking_price: string;
  location: string;
  zone: string;
  bedrooms: string;
  bathrooms: string;
  area_sqm: string;
  land_sqm: string;
  notes: string;
}

function toEditState(p: Property): EditState {
  return {
    title:         p.title ?? "",
    property_type: p.property_type ?? "",
    asking_price:  p.asking_price != null ? String(p.asking_price) : "",
    location:      p.location ?? "",
    zone:          p.zone ?? "",
    bedrooms:      p.bedrooms != null ? String(p.bedrooms) : "",
    bathrooms:     p.bathrooms != null ? String(p.bathrooms) : "",
    area_sqm:      p.area_sqm != null ? String(p.area_sqm) : "",
    land_sqm:      p.land_sqm != null ? String(p.land_sqm) : "",
    notes:         p.notes ?? "",
  };
}

function formatPrice(val: number | null) {
  if (!val) return "—";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} ล้าน ฿`;
  return `${val.toLocaleString("th-TH")} ฿`;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#666", display: "block", marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  color: "#eee", borderRadius: 5, fontSize: 13,
  boxSizing: "border-box",
};

export default function PropertyReview() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMap, setEditMap] = useState<Record<string, EditState>>({});
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState<Record<string, { url: string; wp_post_id: number }>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<Record<string, boolean>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, Array<{ media_id: number; url: string }>>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, Record<number, boolean>>>({});

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/property/pending");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "fetch failed");
      setProperties(json.data ?? []);
      const editMap: Record<string, EditState> = {};
      const mediaInit: Record<string, Array<{ media_id: number; url: string }>> = {};
      for (const p of json.data ?? []) {
        editMap[p.id] = toEditState(p);
        if (p.line_images?.length) mediaInit[p.id] = p.line_images.slice(0, 4);
      }
      setEditMap(editMap);
      setMediaMap(mediaInit);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  function updateField(id: string, field: keyof EditState, value: string) {
    setEditMap(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleImageUpload(propId: string, slotIdx: number, file: File) {
    setUploadingSlots(prev => ({
      ...prev, [propId]: { ...(prev[propId] ?? {}), [slotIdx]: true },
    }));
    try {
      const r = await fetch("/api/property/upload-image", {
        method: "POST",
        headers: { "Content-Type": file.type, "x-filename": file.name },
        body: file,
      });
      const json = await r.json();
      if (!json.ok) throw new Error(json.error ?? "upload failed");
      setMediaMap(prev => {
        const arr = [...(prev[propId] ?? [])];
        arr[slotIdx] = { media_id: json.media_id, url: json.url };
        return { ...prev, [propId]: arr };
      });
    } catch (e: unknown) {
      alert(`อัพรูปไม่สำเร็จ: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setUploadingSlots(prev => ({
        ...prev, [propId]: { ...(prev[propId] ?? {}), [slotIdx]: false },
      }));
    }
  }

  function removeImage(propId: string, slotIdx: number) {
    setMediaMap(prev => {
      const arr = [...(prev[propId] ?? [])];
      arr[slotIdx] = undefined as unknown as { media_id: number; url: string };
      return { ...prev, [propId]: arr };
    });
  }

  async function handleDismiss(p: Property) {
    setDismissing(prev => ({ ...prev, [p.id]: true }));
    try {
      const res = await fetch("/api/property/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabase_id: p.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "dismiss failed");
      // Remove from UI only after Supabase confirmed
      setDismissed(prev => new Set([...prev, p.id]));
    } catch (e: unknown) {
      alert(`Dismiss ไม่สำเร็จ: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setDismissing(prev => ({ ...prev, [p.id]: false }));
    }
  }

  async function handlePublish(p: Property) {
    const edit = editMap[p.id];
    setPublishing(prev => ({ ...prev, [p.id]: true }));
    try {
      const res = await fetch("/api/property/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabase_id:    p.id,
          title:          edit.title,
          property_type:  edit.property_type || null,
          asking_price:   edit.asking_price ? Number(edit.asking_price) : null,
          location:       edit.location || null,
          zone:           edit.zone || null,
          bedrooms:       edit.bedrooms ? Number(edit.bedrooms) : null,
          bathrooms:      edit.bathrooms ? Number(edit.bathrooms) : null,
          area_sqm:       edit.area_sqm ? Number(edit.area_sqm) : null,
          land_sqm:       edit.land_sqm ? Number(edit.land_sqm) : null,
          notes:          edit.notes || null,
          featured_media: (mediaMap[p.id] ?? []).find(Boolean)?.media_id ?? null,
          gallery_ids:    (mediaMap[p.id] ?? []).slice(1).filter(Boolean).map(i => i.media_id),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "publish failed");
      setPublished(prev => ({ ...prev, [p.id]: { url: json.url, wp_post_id: json.wp_post_id } }));
    } catch (e: unknown) {
      alert(`Publish ไม่สำเร็จ: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setPublishing(prev => ({ ...prev, [p.id]: false }));
    }
  }

  const visible = properties.filter(p => !dismissed.has(p.id));

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#eee", fontFamily: "'Prompt', sans-serif", padding: "32px 24px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#C9A84C" }}>Property Review</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>ทรัพย์ฝากขายจาก LINE — รอ Approve ก่อนขึ้นเว็บ</p>
        </div>
        <button onClick={fetchPending} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#aaa", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: "#666" }}>กำลังโหลด...</div>}

      {error && <div style={{ background: "#2a1a1a", border: "1px solid #8b2222", borderRadius: 8, padding: 16, color: "#f87171", marginBottom: 20 }}>{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, color: "#444" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
          <div style={{ fontSize: 15 }}>ไม่มีทรัพย์รอ Review</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {visible.map(p => {
          const edit = editMap[p.id] ?? toEditState(p);
          const isPub = !!published[p.id];
          const isPublishing = !!publishing[p.id];
          const isDismissing = !!dismissing[p.id];
          const pubData = published[p.id];
          const images = mediaMap[p.id] ?? [];
          const slots = uploadingSlots[p.id] ?? {};
          const lineImgCount = p.line_images?.length ?? 0;

          return (
            <div key={p.id} style={{ background: "#141414", border: `1px solid ${isPub ? "#1a4a1a" : "#222"}`, borderRadius: 10, padding: 24, position: "relative" }}>

              {isPub && (
                <div style={{ position: "absolute", top: 16, right: 16, background: "#14532d", color: "#4ade80", padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>
                  Published
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#555", background: "#1a1a1a", padding: "3px 8px", borderRadius: 4 }}>
                  LINE: {p.line_user_id ? p.line_user_id.slice(0, 10) + "..." : "—"}
                </span>
                <span style={{ fontSize: 11, color: "#555", background: "#1a1a1a", padding: "3px 8px", borderRadius: 4 }}>
                  {new Date(p.listed_at).toLocaleString("th-TH")}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>ชื่อทรัพย์ *</label>
                  <input value={edit.title} onChange={e => updateField(p.id, "title", e.target.value)} style={inputStyle} disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>ประเภท</label>
                  <select value={edit.property_type} onChange={e => updateField(p.id, "property_type", e.target.value)} style={inputStyle} disabled={isPub}>
                    <option value="">— เลือก —</option>
                    {["บ้านเดี่ยว", "ทาวน์เฮ้าส์", "คอนโด", "ที่ดิน", "อาคารพาณิชย์"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ราคา (บาท)</label>
                  <input type="number" value={edit.asking_price} onChange={e => updateField(p.id, "asking_price", e.target.value)} style={inputStyle} placeholder="3500000" disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>ทำเล / ย่าน</label>
                  <input value={edit.location} onChange={e => updateField(p.id, "location", e.target.value)} style={inputStyle} placeholder="ลำลูกกา" disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>โซน</label>
                  <input value={edit.zone} onChange={e => updateField(p.id, "zone", e.target.value)} style={inputStyle} placeholder="รังสิต" disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>ห้องนอน</label>
                  <input type="number" value={edit.bedrooms} onChange={e => updateField(p.id, "bedrooms", e.target.value)} style={inputStyle} min={0} max={20} disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>ห้องน้ำ</label>
                  <input type="number" value={edit.bathrooms} onChange={e => updateField(p.id, "bathrooms", e.target.value)} style={inputStyle} min={0} max={20} disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>พื้นที่ใช้สอย (ตร.ม.)</label>
                  <input type="number" value={edit.area_sqm} onChange={e => updateField(p.id, "area_sqm", e.target.value)} style={inputStyle} disabled={isPub} />
                </div>
                <div>
                  <label style={labelStyle}>ที่ดิน (ตร.ม.)</label>
                  <input type="number" value={edit.land_sqm} onChange={e => updateField(p.id, "land_sqm", e.target.value)} style={inputStyle} disabled={isPub} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>หมายเหตุ / ข้อความต้นฉบับจาก LINE</label>
                  <textarea value={edit.notes} onChange={e => updateField(p.id, "notes", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} disabled={isPub} />
                </div>
              </div>

              <div style={{ fontSize: 13, color: "#C9A84C", marginBottom: 16 }}>
                {formatPrice(edit.asking_price ? Number(edit.asking_price) : null)}
                {edit.bedrooms ? ` · ${edit.bedrooms} bd` : ""}
                {edit.bathrooms ? ` · ${edit.bathrooms} ba` : ""}
                {edit.location ? ` · ${edit.location}` : ""}
              </div>

              {!isPub && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#666" }}>รูปภาพ (สูงสุด 4 รูป)</span>
                    <span style={{ fontSize: 10, color: "#444" }}>· รูปแรก = หน้าปก, ทั้งหมด = แกลเลอรี่</span>
                    {lineImgCount > 0 && (
                      <span style={{ fontSize: 10, background: "#1a3a2a", color: "#4ade80", padding: "2px 7px", borderRadius: 10 }}>
                        📱 {lineImgCount} รูปจาก LINE
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[0, 1, 2, 3].map(slotIdx => {
                      const img = images[slotIdx];
                      const isUp = !!slots[slotIdx];
                      return (
                        <div key={slotIdx} style={{ position: "relative" }}>
                          {img ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={`slot ${slotIdx}`}
                                style={{ width: 110, height: 75, objectFit: "cover", borderRadius: 6, border: slotIdx === 0 ? "2px solid #C9A84C" : "1px solid #2a2a2a", display: "block" }} />
                              {slotIdx === 0 && (
                                <span style={{ position: "absolute", bottom: 4, left: 4, fontSize: 9, background: "#C9A84C", color: "#000", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>COVER</span>
                              )}
                              {slotIdx < lineImgCount && (
                                <span style={{ position: "absolute", top: 4, left: 4, fontSize: 9, background: "#166534", color: "#4ade80", borderRadius: 3, padding: "1px 5px" }}>LINE</span>
                              )}
                              <button onClick={() => removeImage(p.id, slotIdx)}
                                style={{ position: "absolute", top: -6, right: -6, background: "#f43f5e", border: "none", borderRadius: "50%", width: 18, height: 18, color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: "18px", textAlign: "center" }}>
                                x
                              </button>
                            </>
                          ) : (
                            <label htmlFor={`img-${p.id}-${slotIdx}`} style={{ cursor: isUp ? "wait" : "pointer", display: "block" }}>
                              <div style={{ width: 110, height: 75, background: "#1a1a1a", border: `1px dashed ${slotIdx === 0 ? "#C9A84C55" : "#2a2a2a"}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                {isUp ? (
                                  <span style={{ fontSize: 10, color: "#666" }}>uploading...</span>
                                ) : (
                                  <>
                                    <div style={{ fontSize: 18, color: slotIdx === 0 ? "#C9A84C" : "#444" }}>+</div>
                                    <div style={{ fontSize: 9, color: slotIdx === 0 ? "#C9A84C88" : "#444" }}>{slotIdx === 0 ? "หน้าปก" : `รูป ${slotIdx + 1}`}</div>
                                  </>
                                )}
                              </div>
                              <input id={`img-${p.id}-${slotIdx}`} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(p.id, slotIdx, f); e.target.value = ""; }} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: images.filter(Boolean).length > 0 ? "#4ade80" : "#444", alignSelf: "center", marginLeft: 4 }}>
                      {images.filter(Boolean).length > 0
                        ? `✓ ${images.filter(Boolean).length} รูป พร้อม publish`
                        : "ไม่มีรูปก็ publish ได้"}
                    </div>
                  </div>
                </div>
              )}

              {!isPub ? (
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => handlePublish(p)}
                    disabled={isPublishing}
                    style={{ background: isPublishing ? "#333" : "#C9A84C", color: isPublishing ? "#666" : "#0d0d0d", border: "none", padding: "10px 24px", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: isPublishing ? "not-allowed" : "pointer" }}
                  >
                    {isPublishing ? "กำลัง Publish..." : "Approve & Publish to Website"}
                  </button>
                  <button
                    onClick={() => handleDismiss(p)}
                    disabled={isDismissing}
                    style={{ background: "transparent", border: "1px solid #333", color: isDismissing ? "#444" : "#666", padding: "10px 16px", borderRadius: 6, cursor: isDismissing ? "not-allowed" : "pointer", fontSize: 14 }}
                  >
                    {isDismissing ? "กำลัง Dismiss..." : "Dismiss"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <a href={pubData.url} target="_blank" rel="noreferrer"
                    style={{ background: "#14532d", color: "#4ade80", padding: "10px 20px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                    ดูบนเว็บ
                  </a>
                  <span style={{ fontSize: 12, color: "#555" }}>WP Post #{pubData.wp_post_id}</span>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
