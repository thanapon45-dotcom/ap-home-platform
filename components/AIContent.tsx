"use client";
import { useState, useEffect, useCallback } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? "https://ap-home-platform-production.up.railway.app";
const BRAND = "Finnhouses";
const BRAND_FACTS = `ข้อมูลแบรนด์ที่ต้องใช้เท่านั้น (ห้ามปั้นตัวเลขหรือข้อมูลที่ไม่ได้ระบุ):
- ชื่อแบรนด์: Finnhouses
- ประเภทธุรกิจ: บริษัทรับสร้างบ้านคุณภาพสูง
- พื้นที่ให้บริการ: กรุงเทพฯ และปริมณฑล
- CTA ที่แนะนำ: "ลองดูผลงานที่ finnhouses.com" / "ทักมาปรึกษาเลย 0627946152" / "คอมเมนต์ไว้ได้เลย"
- เบอร์โทร: 0627946152
- เว็บไซต์: finnhouses.com
- ห้ามพูดถึง: ราคาเฉพาะเจาะจง, จำนวนปีประสบการณ์ที่ไม่รู้จริง, จังหวัดที่ไม่ใช่ กทม./ปริมณฑล`;

// ── Keywords ─────────────────────────────────────────────────────────────────
const KEYWORDS = [
  "สร้างบ้านงบ 5 ล้านต้องวางแผนอะไรบ้าง",
  "บ้าน Contemporary ดีไซน์สวยงามทันสมัย",
  "แบบบ้าน Tropical Modern กลางป่าในเมือง",
  "บ้าน Minimal สไตล์ญี่ปุ่น เรียบ ลงตัว",
  "ความเสี่ยงที่พบบ่อยเมื่อจ้างสร้างบ้าน",
  "วิธีเลือกผู้รับเหมาสร้างบ้านที่ดี",
  "วิธีเลือกที่ดินสร้างบ้านให้คุ้มค่าที่สุด",
  "BOQ สำคัญอย่างไรในการสร้างบ้าน",
  "ขั้นตอนสร้างบ้านตั้งแต่ต้นจนจบ",
  "บ้านสไตล์ Nordic งบ 4–6 ล้าน",
  "ออกแบบบ้าน Work From Home ยุคใหม่",
  "งบสร้างบ้านบานปลายเกิดจากอะไร",
];

const STYLES = [
  { value: "contemporary",    label: "Contemporary",    emoji: "🏙️" },
  { value: "nordic",          label: "Nordic",          emoji: "❄️" },
  { value: "modern_tropical", label: "Modern Tropical", emoji: "🌿" },
  { value: "minimal",         label: "Minimal",         emoji: "⬜" },
  { value: "luxury",          label: "Luxury",          emoji: "✨" },
];

const TONES = [
  {
    value: "casual",
    label: "เป็นกันเอง",
    emoji: "😊",
    color: "#f59e0b",
    desc: "อบอุ่น พูดคุยเหมือนเพื่อน",
    instruction: "เขียนแบบเพื่อนคุยกัน อบอุ่น เป็นกันเอง ใช้ภาษาพูดทั่วไป ไม่เป็นทางการ เหมือนแนะนำบ้านให้เพื่อนฟัง",
  },
  {
    value: "professional",
    label: "มืออาชีพ",
    emoji: "💼",
    color: "#6366f1",
    desc: "น่าเชื่อถือ ดูเป็น premium brand",
    instruction: "เขียนในโทนมืออาชีพ น่าเชื่อถือ แสดงความเชี่ยวชาญของแบรนด์ ภาษากึ่งทางการ อ่านแล้วรู้สึกว่าแบรนด์นี้จริงจังและมีคุณภาพ",
  },
  {
    value: "educate",
    label: "Educate",
    emoji: "📚",
    color: "#22d3ee",
    desc: "ให้ความรู้ สร้าง trust",
    instruction: "เขียนในโทนให้ความรู้ อธิบายเหตุผลและข้อมูลที่เป็นประโยชน์ ช่วยให้ผู้อ่านตัดสินใจได้ดีขึ้น แต่ไม่แห้งเกินไป ยังคง engage",
  },
  {
    value: "fun",
    label: "สนุกสนาน",
    emoji: "🎉",
    color: "#10b981",
    desc: "ขำขัน สดใส ดึง engagement",
    instruction: "เขียนแบบสนุกสนาน มีอารมณ์ขัน เบาสมอง ใช้ภาษาวัยรุ่น emoji เยอะหน่อย เหมือนเพื่อนที่ฮาและแนะนำของดี ๆ ให้",
  },
];

const POST_TYPES = [
  { value: "fb_post",   label: "FB Post",    emoji: "📘" },
  { value: "fb_story",  label: "FB Story",   emoji: "📱" },
  { value: "instagram", label: "Instagram",  emoji: "📸" },
];

// ── Types ────────────────────────────────────────────────────────────────────
type ContentItem = {
  id: number;
  keyword: string;
  style: string;
  type: string;
  content: string;
  imageUrl: string;
  date: string;
  source: "keyword" | "blog";
};

type FbState = {
  status: string;
  queue: number;
  drafts: number;
  published: number;
  lastUpdate: string | null;
};

// ── API Helpers ───────────────────────────────────────────────────────────────
async function callClaude(system: string, prompt: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, maxTokens: 800 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Claude API error");
  return data.text ?? "";
}

async function generateImage(topic: string, style: string): Promise<string | null> {
  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, style, model: "gemini" }),
    });
    const data = await res.json();
    if (!data.ok) { console.error("[Image]", data.error); return null; }
    return data.url ?? null;
  } catch (e) { console.error("[Image]", e); return null; }
}

// ── Mini Components ───────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
      background: `${color}18`, color, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "2px 8px",
    }}>{label}</span>
  );
}

// ── Tab: Keyword → FB Post ────────────────────────────────────────────────────
function KeywordTab({ onSave }: { onSave: (item: ContentItem) => void }) {
  const [keyword, setKeyword]   = useState(KEYWORDS[0]);
  const [custom, setCustom]     = useState("");
  const [style, setStyle]       = useState("contemporary");
  const [tone, setTone]         = useState("casual");
  const [type, setType]         = useState("fb_post");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [genImg, setGenImg]     = useState(false);
  const [copied, setCopied]     = useState(false);
  const [posting, setPosting]   = useState(false);
  const [postResult, setPostResult] = useState<"ok"|"error"|null>(null);

  const finalKeyword  = custom.trim() || keyword;
  const selectedTone  = TONES.find(t => t.value === tone) ?? TONES[0];

  async function postToFacebook() {
    if (!result) return;
    setPosting(true); setPostResult(null);
    try {
      // Use Vercel server-side route — bypasses Hub & CORS issues
      const r = await fetch(`/api/fb/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result, source: "ai-content" }),
      });
      const data = await r.json();
      setPostResult(r.ok && data.ok !== false ? "ok" : "error");
    } catch {
      setPostResult("error");
    } finally {
      setPosting(false);
    }
  }

  async function generate() {
    setLoading(true); setResult(""); setImageUrl("");
    const styleLabel = STYLES.find(s => s.value === style)?.label ?? style;
    const typeLabel  = POST_TYPES.find(t => t.value === type)?.label ?? type;
    const system = `คุณเป็น copywriter ภาษาไทยของแบรนด์ ${BRAND} บริษัทรับสร้างบ้านคุณภาพสูงในไทย
งานของคุณคือเขียน Facebook Post ภาษาไทยที่คนไทยอ่านแล้วรู้สึก "เป็นธรรมชาติ" ไม่ใช่แปลจากภาษาอื่น

โทนการเขียนที่ต้องใช้: ${selectedTone.label} (${selectedTone.desc})
${selectedTone.instruction}

${BRAND_FACTS}

กฎภาษาที่เข้มงวด:
❌ ห้ามใช้สรรพนาม "ชั้น" "ผม" "ฉัน" — เขียนในนามแบรนด์ ไม่ใช่ตัวบุคคล
❌ ห้ามปั้นตัวเลข เช่น "10+ ปี" หรือสถิติที่ไม่รู้จริง
❌ ห้ามระบุจังหวัดที่ไม่ใช่ กทม./ปริมณฑล ใน hashtag หรือเนื้อหา
❌ ห้ามสร้างคำประสมผิดความหมาย ตรวจสอบทุกคำก่อนใส่
❌ ห้าม markdown headers, ห้ามเส้น ---, ห้ามเกิน 220 คำ
✅ hashtag ต้องมีความหมายเชิงบวก ตรวจสอบทุกตัวก่อนใส่
✅ สไตล์บ้าน ${styleLabel} คือแกนหลัก — ทุก bullet ต้องสะท้อนลักษณะเด่นของ ${styleLabel} เท่านั้น ห้ามพูดถึงสไตล์อื่น`;
    const prompt = `เขียน ${typeLabel} ลง Facebook page ของ ${BRAND}

หัวข้อ: "${finalKeyword}"
สไตล์บ้าน: ${styleLabel}
โทน: ${selectedTone.label} — ${selectedTone.instruction}

โครงสร้าง (เขียนต่อกัน ไม่มี label นำหน้า):
บรรทัด 1-2: Hook — คำถามหรือประโยคสั้นที่โดนใจคนสนใจบ้านสไตล์ ${styleLabel} (ใช้โทน ${selectedTone.label})
3-4 บรรทัด emoji: จุดเด่นของบ้านสไตล์ ${styleLabel} ที่เชื่อมกับ "${finalKeyword}" โดยตรง
1-2 ประโยคปิด: ทำไม ${BRAND} ถึงเป็นตัวเลือกที่ดี + CTA (ใช้ "ลองดูผลงานที่ finnhouses.com" หรือ "ทักมาปรึกษาเลย 0627946152")
Hashtag 6-8 อัน: ทุกตัวต้องมีความหมายดี เช่น #Finnhouses #บ้าน${styleLabel.replace(/\s+/g, "")} #สร้างบ้าน #ออกแบบบ้าน #บ้านสวย

ตรวจสอบก่อนตอบ: อ่านทุกคำแล้วถามตัวเองว่า "คนไทยใช้คำนี้จริงไหม? hashtag นี้มีความหมายดีไหม?"`;

    const text = await callClaude(system, prompt).catch(e => `❌ Error: ${e.message}`);
    setResult(text);
    if (genImg && !text.startsWith("❌")) {
      const img = await generateImage(finalKeyword, style);
      if (img) setImageUrl(img);
    }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    if (!result) return;
    onSave({
      id: Date.now(), keyword: finalKeyword, style, type,
      content: result, imageUrl, date: new Date().toLocaleDateString("th-TH"),
      source: "keyword",
    });
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Left: Settings */}
      <Card style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em" }}>⚙️ SETTINGS</div>

        {/* Keyword */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>KEYWORD / หัวข้อ</div>
          <select value={keyword} onChange={e => setKeyword(e.target.value)} style={selectStyle}>
            {KEYWORDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "#475569", margin: "8px 0 4px" }}>หรือพิมพ์เอง:</div>
          <input
            value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="กรอก keyword..."
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </div>

        {/* Style */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>สไตล์บ้าน</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STYLES.map(s => (
              <button key={s.value} onClick={() => setStyle(s.value)} style={{
                padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: style === s.value ? "rgba(34,211,238,.15)" : "rgba(255,255,255,.04)",
                color: style === s.value ? "#22d3ee" : "#64748b",
                border: style === s.value ? "1px solid rgba(34,211,238,.3)" : "1px solid rgba(255,255,255,.06)",
              }}>{s.emoji} {s.label}</button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>โทนการเขียน</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {TONES.map(t => (
              <button key={t.value} onClick={() => setTone(t.value)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left",
                background: tone === t.value ? `${t.color}18` : "rgba(255,255,255,.03)",
                color: tone === t.value ? t.color : "#64748b",
                border: tone === t.value ? `1px solid ${t.color}40` : "1px solid rgba(255,255,255,.06)",
                transition: "all .15s",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{t.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: tone === t.value ? t.color : "#475569", marginLeft: 6 }}>{t.desc}</span>
                </div>
                {tone === t.value && <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>ประเภท Content</div>
          <div style={{ display: "flex", gap: 6 }}>
            {POST_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: type === t.value ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
                color: type === t.value ? "#818cf8" : "#64748b",
                border: type === t.value ? "1px solid rgba(99,102,241,.3)" : "1px solid rgba(255,255,255,.06)",
                textAlign: "center",
              }}>{t.emoji}<br />{t.label}</button>
            ))}
          </div>
        </div>

        {/* Options */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={genImg} onChange={e => setGenImg(e.target.checked)} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>สร้างภาพประกอบด้วย</span>
        </label>

        <button onClick={generate} disabled={loading} style={{
          background: loading ? "rgba(34,211,238,.05)" : "rgba(34,211,238,.12)",
          color: loading ? "#334155" : "#22d3ee",
          border: "1px solid rgba(34,211,238,.25)", borderRadius: 12,
          padding: "12px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ กำลังสร้าง..." : "✨ Generate"}
        </button>
      </Card>

      {/* Right: Result */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {result ? (
          <>
            <Card style={{ flex: 1, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Tag label={POST_TYPES.find(t => t.value === type)?.label ?? type} color="#818cf8" />
                  <Tag label={STYLES.find(s => s.value === style)?.label ?? style} color="#22d3ee" />
                  <Tag label={`${selectedTone.emoji} ${selectedTone.label}`} color={selectedTone.color} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copy} style={btnStyle("#22d3ee")}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={save} style={btnStyle("#10b981")}>💾 Save</button>
                  <button onClick={postToFacebook} disabled={posting} style={btnStyle(postResult === "ok" ? "#10b981" : postResult === "error" ? "#f43f5e" : "#6366f1")}>
                    {posting ? "⏳ กำลังโพสต์..." : postResult === "ok" ? "✅ โพสต์แล้ว!" : postResult === "error" ? "❌ ผิดพลาด" : "📤 Post to Facebook"}
                  </button>
                </div>
              </div>
              <pre style={{
                whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0",
                lineHeight: 1.7, margin: 0, fontFamily: "inherit",
              }}>{result}</pre>
            </Card>
            {imageUrl && (
              <Card style={{ padding: 12 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label="FB Post 1200×630" color="#22d3ee" />
                    <span style={{ fontSize: 10, color: "#475569" }}>อัตราส่วน 1.91:1</span>
                  </div>
                  <button
                    onClick={() => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = 1200; canvas.height = 630;
                        const ctx = canvas.getContext("2d")!;
                        // Center-crop to 1.91:1
                        const srcRatio = img.width / img.height;
                        const dstRatio = 1200 / 630;
                        let sx = 0, sy = 0, sw = img.width, sh = img.height;
                        if (srcRatio > dstRatio) { sw = img.height * dstRatio; sx = (img.width - sw) / 2; }
                        else { sh = img.width / dstRatio; sy = (img.height - sh) / 2; }
                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1200, 630);
                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/jpeg", 0.92);
                        a.download = `finnhouses_fb_${Date.now()}.jpg`;
                        a.click();
                      };
                      img.src = imageUrl;
                    }}
                    style={btnStyle("#10b981")}
                  >⬇️ ดาวน์โหลด FB</button>
                </div>
                {/* Image preview — FB 1.91:1 crop */}
                <div style={{ width: "100%", aspectRatio: "1.91/1", overflow: "hidden", borderRadius: 12, background: "#0a0f1e" }}>
                  <img
                    src={imageUrl}
                    alt="FB post image"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 6, textAlign: "center" }}>
                  Preview ขนาด FB Post · กดดาวน์โหลดเพื่อได้ไฟล์ 1200×630px
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 48 }}>✨</div>
            <div style={{ fontSize: 14, color: "#475569" }}>เลือก keyword และกด Generate</div>
            <div style={{ fontSize: 11, color: "#334155" }}>AI จะสร้าง FB content พร้อม hashtag ให้อัตโนมัติ</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Tab: Blog → FB Post ───────────────────────────────────────────────────────
function BlogConvertTab({ onSave }: { onSave: (item: ContentItem) => void }) {
  const [blogText, setBlogText]   = useState("");
  const [type, setType]           = useState("fb_post");
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [result, setResult]       = useState("");
  const [copied, setCopied]       = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isUrl = blogText.trim().startsWith("http");

  async function fetchFromUrl() {
    setFetching(true); setFetchError("");
    try {
      const res = await fetch("/api/fetch-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blogText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFetchError(data.error ?? "ดึงบทความไม่สำเร็จ"); }
      else { setBlogText(data.text ?? ""); }
    } catch { setFetchError("เกิดข้อผิดพลาด ลองใหม่"); }
    setFetching(false);
  }

  async function convert() {
    if (!blogText.trim()) return;
    setLoading(true); setResult("");
    const typeLabel = POST_TYPES.find(t => t.value === type)?.label ?? type;
    const system = `คุณเป็น Social Media Editor ของแบรนด์ ${BRAND} งานของคุณคือแปลงบทความ SEO ยาวเป็น Facebook Post สั้นๆ ที่คนอยากอ่าน
เขียนเฉพาะ Facebook Post เท่านั้น — ไม่ใช่บทความ ไม่ใช่ summary ทางวิชาการ

กฎเหล็ก (ห้ามละเมิด):
❌ ห้ามคัดลอกโครงสร้างของบทความต้นฉบับ (บทนำ เนื้อหา สรุป)
❌ ห้ามใช้ markdown headers (## หรือ **ชื่อหัวข้อ:**)
❌ ห้ามใช้เส้น --- แบ่งส่วน
❌ ห้ามเขียนยาวเกิน 220 คำ
✅ สกัดแค่ insight ที่น่าสนใจที่สุด 1-3 จุด มาเล่าใน FB style
✅ ภาษาพูดธรรมชาติ เหมือน real post`;
    const prompt = `บทความต้นฉบับ (อ่านเพื่อเข้าใจ แต่ห้ามเลียนแบบรูปแบบ):

${blogText.slice(0, 2000)}

---
ผลลัพธ์ที่ต้องการ: ${typeLabel} สำหรับ Facebook page ของ ${BRAND}

รูปแบบ Facebook Post:
• บรรทัด 1-2: Hook ดึงใจ — hook ที่ดึงดูดคนที่สนใจเรื่องนี้
• 3-4 bullet emoji: insight / จุดเด่นที่ถูก distill จากบทความ (แต่ละ bullet 1 บรรทัด)
• CTA: ชวนอ่านต่อ / ติดต่อ / ดูผลงาน
• Hashtag 5-7 อัน รวม #Finnhouses #สร้างบ้าน

เขียนเนื้อหาตรงๆ ห้ามใส่ label "Hook:" "CTA:" นำหน้า`;
    const text = await callClaude(system, prompt).catch(e => `❌ Error: ${e.message}`);
    setResult(text);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    if (!result || result.startsWith("❌")) return;
    onSave({
      id: Date.now(), keyword: "แปลงจาก Blog", style: "—", type,
      content: result, imageUrl: "", date: new Date().toLocaleDateString("th-TH"),
      source: "blog",
    });
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      <Card style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: ".1em" }}>📝 BLOG CONTENT</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>วาง URL หรือเนื้อหาบทความจาก finnhouses.com</div>
        <textarea
          value={blogText}
          onChange={e => { setBlogText(e.target.value); setFetchError(""); }}
          placeholder="วาง URL บทความ หรือวางเนื้อหาบทความตรง ๆ ก็ได้..."
          rows={12}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
        />

        {/* URL detected → show fetch button */}
        {isUrl && (
          <div>
            <button
              onClick={fetchFromUrl}
              disabled={fetching}
              style={{
                width: "100%", padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: fetching ? "not-allowed" : "pointer",
                background: fetching ? "rgba(255,255,255,.04)" : "rgba(34,211,238,.1)",
                color: fetching ? "#334155" : "#22d3ee",
                border: "1px solid rgba(34,211,238,.25)",
              }}
            >
              {fetching ? "⏳ กำลังดึงบทความ..." : "🔗 ดึงบทความจาก URL"}
            </button>
            {fetchError && (
              <div style={{ fontSize: 11, color: "#f43f5e", marginTop: 6, padding: "6px 10px", background: "rgba(244,63,94,.08)", borderRadius: 8 }}>
                ❌ {fetchError}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>แปลงเป็น</div>
          <div style={{ display: "flex", gap: 6 }}>
            {POST_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: type === t.value ? "rgba(167,139,250,.15)" : "rgba(255,255,255,.04)",
                color: type === t.value ? "#a78bfa" : "#64748b",
                border: type === t.value ? "1px solid rgba(167,139,250,.3)" : "1px solid rgba(255,255,255,.06)",
                textAlign: "center",
              }}>{t.emoji}<br />{t.label}</button>
            ))}
          </div>
        </div>
        <button onClick={convert} disabled={loading || !blogText.trim()} style={{
          background: loading ? "rgba(167,139,250,.05)" : "rgba(167,139,250,.12)",
          color: loading ? "#334155" : "#a78bfa",
          border: "1px solid rgba(167,139,250,.25)", borderRadius: 12,
          padding: "12px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ กำลังแปลง..." : "🔄 แปลงเป็น FB Post"}
        </button>
      </Card>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {result ? (
          <Card style={{ flex: 1, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag label={`Blog → ${POST_TYPES.find(t => t.value === type)?.label}`} color="#a78bfa" />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copy} style={btnStyle("#22d3ee")}>{copied ? "✅ Copied!" : "📋 Copy"}</button>
                <button onClick={save} style={btnStyle("#10b981")}>💾 Save</button>
              </div>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, margin: 0, fontFamily: "inherit" }}>{result}</pre>
          </Card>
        ) : (
          <Card style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 48 }}>📰</div>
            <div style={{ fontSize: 14, color: "#475569" }}>วางบทความแล้วกด "แปลงเป็น FB Post"</div>
            <div style={{ fontSize: 11, color: "#334155" }}>AI จะสรุปและปรับเป็น format FB ให้อัตโนมัติ</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Tab: Saved & FB Status ────────────────────────────────────────────────────
function HistoryTab({ saved, onDelete }: { saved: ContentItem[]; onDelete: (id: number) => void }) {
  const [fb, setFb] = useState<FbState>({ status: "unknown", queue: 0, drafts: 0, published: 0, lastUpdate: null });

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/api/state`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      if (d.fb) setFb(d.fb);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { poll(); const t = setInterval(poll, 6000); return () => clearInterval(t); }, [poll]);

  const statusColor: Record<string, string> = {
    idle: "#64748b", running: "#f59e0b", published: "#10b981", failed: "#f43f5e", unknown: "#334155",
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* FB Engine Status */}
      <Card style={{ width: 260, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee", letterSpacing: ".1em", marginBottom: 16 }}>📡 FB ENGINE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Status</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[fb.status] ?? "#64748b", textTransform: "uppercase" }}>{fb.status}</span>
          </div>
          {[
            { label: "Queue",     value: fb.queue,     color: "#f59e0b" },
            { label: "Drafts",    value: fb.drafts,    color: "#818cf8" },
            { label: "Published", value: fb.published, color: "#10b981" },
          ].map(r => (
            <div key={r.label} style={{ background: `${r.color}0f`, border: `1px solid ${r.color}20`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>{r.label}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{r.value}</span>
            </div>
          ))}
          {fb.lastUpdate && (
            <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 4 }}>
              อัปเดต: {new Date(fb.lastUpdate).toLocaleString("th-TH")}
            </div>
          )}
        </div>
      </Card>

      {/* Saved Content List */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em" }}>
            💾 SAVED CONTENT ({saved.length})
          </div>
        </div>
        {saved.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, color: "#475569" }}>ยังไม่มี content ที่ save ไว้</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {saved.map(item => (
              <Card key={item.id} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Tag label={item.source === "blog" ? "Blog→FB" : "Keyword"} color={item.source === "blog" ? "#a78bfa" : "#22d3ee"} />
                    <Tag label={POST_TYPES.find(t => t.value === item.type)?.label ?? item.type} color="#818cf8" />
                    <span style={{ fontSize: 11, color: "#334155" }}>{item.date}</span>
                  </div>
                  <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>{item.keyword}</div>
                <pre style={{ fontSize: 11, color: "#94a3b8", margin: 0, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden", fontFamily: "inherit" }}>
                  {item.content.slice(0, 200)}{item.content.length > 200 ? "..." : ""}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(item.content)}
                  style={{ marginTop: 8, background: "none", border: "none", color: "#22d3ee", cursor: "pointer", fontSize: 11 }}
                >📋 Copy</button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  color: "#e2e8f0", fontSize: 12, padding: "8px 10px", outline: "none",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  color: "#e2e8f0", fontSize: 12, padding: "8px 10px", outline: "none",
  boxSizing: "border-box",
};
function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}12`, color, border: `1px solid ${color}30`,
    borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "keyword", label: "สร้างจาก Keyword", icon: "✨" },
  { key: "blog",    label: "แปลงจาก Blog",      icon: "📰" },
  { key: "history", label: "History & Status",   icon: "📡" },
  { key: "queue",   label: "Content Queue",      icon: "📅" },
];

// ── FB Queue Types & Helpers ───────────────────────────────────────────────────
type FbQueueItem = {
  id: string;
  date: string;
  content: string;
  status: "pending" | "running" | "published" | "failed";
  postUrl: string;
};

function genId() { return Math.random().toString(36).slice(2, 10); }

const FB_QUEUE_TEMPLATES = [
  `🏡 สร้างบ้านในฝันกับ Finnhouses\n\n✅ ออกแบบตามไลฟ์สไตล์คุณ\n✅ งบ 5–15 ล้านบาท ควบคุมได้จริง\n✅ ทีมช่างมืออาชีพ พร้อม BOQ ชัดเจน\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#สร้างบ้าน #Finnhouses #บ้านในฝัน`,
  `🔨 รีโนเวทบ้านเพื่อขาย ทำกำไรได้จริง!\n\n💰 ซื้อทรัพย์ราคาต่ำ → รีโนเวท → ขายต่อมีกำไร\n📊 เราช่วยประเมินต้นทุนและมาร์จิน\n\nทักมาปรึกษาเลย 0627946152\n\n#รีโนเวทบ้าน #ลงทุนอสังหา #Finnhouses`,
  `🏠 ฝากขายบ้านและที่ดิน กับ Finnhouses\n\n✨ ทีม Marketing ช่วยโปรโมทให้ฟรี\n✨ มีฐานลูกค้าพร้อมซื้อรอคิวอยู่\n📸 ถ่ายภาพและทำ Listing สวยๆ ให้ฟรี!\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#ฝากขายบ้าน #Finnhouses`,
  `💡 รู้หรือเปล่า? BOQ คืออะไร\n\nBOQ (Bill of Quantities) คือเอกสารที่รวมรายการวัสดุ + ค่าแรง ทุกรายการในการสร้างบ้าน\n\n✅ ป้องกันงบบาน\n✅ เปรียบเทียบผู้รับเหมาได้ถูกต้อง\n\nทักมาปรึกษาเลย 0627946152\n\n#BOQ #สร้างบ้าน #Finnhouses`,
  `🌟 ทำไมต้องเลือก Finnhouses?\n\n🏗️ ประสบการณ์สร้างบ้านกว่า 50 หลัง\n📐 ออกแบบโดยทีมสถาปนิกมืออาชีพ\n💯 รับประกันงาน 2 ปี\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#Finnhouses #สร้างบ้าน #บ้านคุณภาพ`,
  `📊 งบ 5 ล้าน สร้างบ้านได้ขนาดไหน?\n\n🏠 พื้นที่ใช้สอย: 120–150 ตร.ม.\n🛏️ 3 ห้องนอน 2 ห้องน้ำ\n🚗 ที่จอดรถ 2 คัน\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#งบสร้างบ้าน #Finnhouses #บ้าน5ล้าน`,
  `🌅 เช้าวันนี้ขอแชร์บ้านสวยจาก Finnhouses!\n\nทุกหลังออกแบบให้เหมาะกับสภาพอากาศไทย\n🌿 ระบายอากาศดี\n☀️ แสงธรรมชาติเต็มบ้าน\n💧 วัสดุทนทาน ไม่กลัวฝน\n\nลองดูผลงานที่ finnhouses.com หรือทักมาปรึกษาเลย 0627946152\n\n#บ้านสวย #Finnhouses #ออกแบบบ้าน`,
];

// ── FB Queue Tab Component ─────────────────────────────────────────────────────
function FbQueueTab() {
  const [fbQueue, setFbQueue]       = useState<FbQueueItem[]>([]);
  const [drafts, setDrafts]         = useState<FbQueueItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Poll Hub for fb_queue state
  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/blog/state", { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const d = await r.json();
      setFbQueue(Array.isArray(d.fb_queue) ? d.fb_queue : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [poll]);

  function initDrafts(): FbQueueItem[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + 1 + i);
      return {
        id: genId(),
        date: d.toISOString().split("T")[0],
        content: FB_QUEUE_TEMPLATES[i % FB_QUEUE_TEMPLATES.length],
        status: "pending" as const,
        postUrl: "",
      };
    });
  }

  function openEditor() {
    setDrafts(fbQueue.length > 0 ? fbQueue.map(i => ({ ...i })) : initDrafts());
    setEditorOpen(true);
  }

  async function handleSave() {
    try {
      setBusy(true);
      const r = await fetch("/api/fb/queue/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: drafts }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      showToast(`📅 FB Queue ${j.count} วัน บันทึกสำเร็จ`, true);
      await poll();
      setEditorOpen(false);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error saving queue", false);
    } finally { setBusy(false); }
  }

  async function handleClear() {
    try {
      setBusy(true);
      await fetch("/api/fb/queue/clear", { method: "POST" });
      showToast("FB Queue ล้างแล้ว ✓", true);
      await poll();
    } catch {
      showToast("Error clearing queue", false);
    } finally { setBusy(false); }
  }

  const statusColor: Record<string, string> = { pending: "#64748b", running: "#22d3ee", published: "#1877f2", failed: "#f43f5e" };
  const statusLabel: Record<string, string> = { pending: "⏳ รอ", running: "▶ Posting", published: "✅ Posted", failed: "❌ Failed" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: toast.ok ? "rgba(24,119,242,.9)" : "rgba(244,63,94,.9)", color: "#fff",
        }}>{toast.msg}</div>
      )}

      {/* Header card */}
      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(24,119,242,.3)", borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#1877f2,#42b0ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📅</div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#60a5fa", fontWeight: 700 }}>FB CONTENT QUEUE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Serif Display',serif" }}>วางแผนโพสต์ Facebook 7 วัน</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fbQueue.length > 0 && (
              <span style={{ fontSize: 12, color: "#60a5fa", background: "rgba(24,119,242,.1)", border: "1px solid rgba(24,119,242,.25)", borderRadius: 20, padding: "3px 12px" }}>
                {fbQueue.filter(i => i.status === "published").length}/{fbQueue.length} โพสต์แล้ว
              </span>
            )}
            {fbQueue.length > 0 && !editorOpen && (
              <button onClick={handleClear} disabled={busy} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.25)", color: "#f43f5e",
              }}>🗑 ล้าง Queue</button>
            )}
            <button onClick={editorOpen ? () => setEditorOpen(false) : openEditor} style={{
              padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: editorOpen ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#1877f2,#42b0ff)",
              border: editorOpen ? "1px solid rgba(255,255,255,.1)" : "none",
              color: editorOpen ? "#94a3b8" : "#fff",
            }}>
              {editorOpen ? "✕ ปิด" : fbQueue.length > 0 ? "✏️ แก้ไข Queue" : "✨ สร้าง Queue 7 วัน"}
            </button>
          </div>
        </div>
      </div>

      {/* Queue summary cards */}
      {!editorOpen && fbQueue.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {fbQueue.map((item, i) => {
            const c = statusColor[item.status] ?? "#64748b";
            const dateLabel = new Date(item.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={item.id} style={{
                background: item.status === "published" ? "rgba(24,119,242,.08)" : "rgba(255,255,255,.02)",
                border: `1px solid ${c}33`, borderRadius: 14, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>วันที่ {i + 1} — {dateLabel}</span>
                  <span style={{ fontSize: 10, color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {item.content.slice(0, 100)}…
                </div>
                {item.postUrl && (
                  <a href={item.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#1877f2", marginTop: 6, display: "block" }}>→ ดูโพสต์บน Facebook</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!editorOpen && fbQueue.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#475569" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>ยังไม่มี FB Content Queue</div>
          <div style={{ fontSize: 12 }}>กด &ldquo;สร้าง Queue 7 วัน&rdquo; เพื่อวางแผนโพสต์ Facebook ล่วงหน้า</div>
        </div>
      )}

      {/* Editor */}
      {editorOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {drafts.map((item, i) => {
            const dateLabel = new Date(item.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
            return (
              <div key={item.id} style={{ background: "rgba(24,119,242,.04)", border: "1px solid rgba(24,119,242,.15)", borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1877f2,#42b0ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd" }}>{dateLabel}</span>
                  <input
                    type="date" value={item.date}
                    onChange={e => setDrafts(prev => prev.map((d, di) => di === i ? { ...d, date: e.target.value } : d))}
                    style={{ marginLeft: "auto", background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "3px 8px", color: "#94a3b8", fontSize: 11 }}
                  />
                </div>
                <textarea
                  value={item.content}
                  onChange={e => setDrafts(prev => prev.map((d, di) => di === i ? { ...d, content: e.target.value } : d))}
                  rows={5}
                  style={{
                    width: "100%", background: "rgba(0,0,0,.3)", border: "1px solid rgba(24,119,242,.2)",
                    borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 12,
                    lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 10, color: "#334155", marginTop: 4, textAlign: "right" }}>{item.content.length} ตัวอักษร</div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEditorOpen(false)} style={{
              flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 13, cursor: "pointer",
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b",
            }}>ยกเลิก</button>
            <button onClick={handleSave} disabled={busy} style={{
              flex: 3, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              background: busy ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,#1877f2,#42b0ff)",
              border: "none", color: busy ? "#475569" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {busy
                ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />กำลังบันทึก...</>
                : "💾 บันทึก Queue 7 วัน"}
            </button>
          </div>

          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(24,119,242,.06)", border: "1px solid rgba(24,119,242,.15)" }}>
            <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, marginBottom: 4 }}>⚡ Auto-run — n8n Schedule Trigger</div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
              n8n: <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>Schedule Trigger (09:00 daily)</span>
              {" → "}
              <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>HTTP POST /api/fb/queue/run-next</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LS_KEY = "finnhouses_ai_content_v1";

function loadSaved(): ContentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistSaved(items: ContentItem[]) {
  try {
    // Store text only — skip large base64 images to avoid localStorage quota
    const lite = items.map(i => ({ ...i, imageUrl: "" }));
    localStorage.setItem(LS_KEY, JSON.stringify(lite.slice(0, 50)));
  } catch { /* quota exceeded — skip */ }
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AIContent() {
  const [tab, setTab]     = useState("keyword");
  const [saved, setSaved] = useState<ContentItem[]>(loadSaved);

  function handleSave(item: ContentItem) {
    setSaved(prev => {
      const next = [item, ...prev].slice(0, 50);
      persistSaved(next);
      return next;
    });
  }
  function handleDelete(id: number) {
    setSaved(prev => {
      const next = prev.filter(i => i.id !== id);
      persistSaved(next);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
          AI Content Engine
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>FB Content Studio</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>สร้าง content สำหรับ Facebook page · Finnhouses</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,.03)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: tab === t.key ? "rgba(34,211,238,.12)" : "transparent",
            color: tab === t.key ? "#22d3ee" : "#475569",
            border: tab === t.key ? "1px solid rgba(34,211,238,.25)" : "1px solid transparent",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "keyword" && <KeywordTab onSave={handleSave} />}
        {tab === "blog"    && <BlogConvertTab onSave={handleSave} />}
        {tab === "history" && <HistoryTab saved={saved} onDelete={handleDelete} />}
        {tab === "queue"   && <FbQueueTab />}
      </div>
    </div>
  );
}
