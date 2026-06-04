/**
 * Finnhouses — Market Data Scraper (baan.kaidee.com)
 * ดึงข้อมูลประกาศบ้าน/ทาวน์เฮาส์ → Supabase market_listings
 *
 * รัน: node scripts/scrape-market.js
 */

const { chromium } = require("playwright");

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL  || "https://omvpagvqyfmkkhzuuzda.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdnBhZ3ZxeWZta2toenV1emRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc2NTIsImV4cCI6MjA5MTk5MzY1Mn0.E4u29jOMUzoKP_cgJBb1n0FmkdULjVEh8YapDSaYoUw";

const SEARCHES = [
  { area: "ลำลูกกา",     type: "บ้านเดี่ยว",  slug: "c16-realestate-house",      keyword: "ลำลูกกา" },
  { area: "ลำลูกกา",     type: "ทาวน์เฮาส์", slug: "c16-realestate-townhouse",  keyword: "ลำลูกกา" },
  { area: "รังสิต",       type: "บ้านเดี่ยว",  slug: "c16-realestate-house",      keyword: "รังสิต" },
  { area: "รังสิต",       type: "ทาวน์เฮาส์", slug: "c16-realestate-townhouse",  keyword: "รังสิต" },
  { area: "คลองหลวง",    type: "บ้านเดี่ยว",  slug: "c16-realestate-house",      keyword: "คลองหลวง" },
  { area: "คลองหลวง",    type: "ทาวน์เฮาส์", slug: "c16-realestate-townhouse",  keyword: "คลองหลวง" },
  { area: "ลาดหลุมแก้ว", type: "บ้านเดี่ยว",  slug: "c16-realestate-house",      keyword: "ลาดหลุมแก้ว" },
  { area: "ลาดหลุมแก้ว", type: "ทาวน์เฮาส์", slug: "c16-realestate-townhouse",  keyword: "ลาดหลุมแก้ว" },
];

const MAX_PAGES = 3;
const DELAY_MS  = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Parse helpers ────────────────────────────────────────────────────────────
function parsePrice(raw) {
  if (!raw) return null;
  const t = raw.replace(/\s/g, "").replace(/฿/g, "");
  if (/ล้าน/.test(t)) {
    const n = parseFloat(t.replace(/[^\d.]/g, ""));
    return isNaN(n) ? null : Math.round(n * 1_000_000);
  }
  const n = parseFloat(t.replace(/,/g, "").replace(/[^\d.]/g, ""));
  return isNaN(n) || n < 100_000 ? null : Math.round(n);
}

function parseSize(raw) {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/,/g, "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

// ─── Supabase insert ──────────────────────────────────────────────────────────
async function saveListings(rows) {
  if (!rows.length) return { ok: true };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_listings?on_conflict=url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer":        "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`    ❌ Supabase error: ${body}`);
  }
  return { ok: res.ok, status: res.status };
}

// ─── Scrape one page ──────────────────────────────────────────────────────────
async function scrapePage(page, search, pageNum) {
  const url = `https://baan.kaidee.com/${search.slug}?keyword=${encodeURIComponent(search.keyword)}&page=${pageNum}`;
  console.log(`    → ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(DELAY_MS);

  const results = await page.evaluate(() => {
    const items = [];

    // ── หา <a> ที่ wrap [data-testid='ad-card'] จากข้างนอก ──
    // ad-card ไม่มี <a> ข้างใน — link อยู่เป็น ancestor แทน
    const adCards = Array.from(document.querySelectorAll("[data-testid='ad-card']"));

    const anchorCards = adCards.map(card => {
      let el = card.parentElement;
      let depth = 0;
      while (el && el.tagName !== "A" && el.tagName !== "BODY" && depth < 6) {
        el = el.parentElement;
        depth++;
      }
      return el?.tagName === "A" ? { anchor: el, card } : null;
    }).filter(Boolean);

    anchorCards.forEach(({ anchor, card }) => {
      const href = anchor.getAttribute("href") || "";
      if (!href || !href.includes("product-")) return;

      // ราคา
      const priceEl = card.querySelector("[data-testid='ad-card-price']");
      const priceRaw = priceEl ? priceEl.textContent.trim() : "";

      // ที่ดิน ตร.ว.
      const areaEl = card.querySelector("[data-testid='area-attr']");
      const areaRaw = areaEl ? areaEl.textContent.trim() : "";

      // ห้องนอน
      const bedEl = card.querySelector("[data-testid='bedroom-attr']");
      const bedRaw = bedEl ? bedEl.textContent.trim() : "";

      // title
      const allText = card.innerText || card.textContent || "";
      const lines = allText.split("\n").map(l => l.trim()).filter(l => l && !/^฿|^HOT$/.test(l));
      const title = lines.find(l => l.length > 10) || lines[0] || allText.slice(0, 100);

      // house_size ตร.ม. จาก text
      const houseSizeMatch = allText.match(/([\d,.]+)\s*ตร\.ม/);

      items.push({
        title:        title.slice(0, 200),
        priceRaw,
        areaRaw,
        bedRaw,
        houseSizeRaw: houseSizeMatch?.[1] || "",
        href: href.startsWith("http") ? href : "https://baan.kaidee.com" + href,
      });
    });

    return {
      count: items.length,
      items,
      total_ad_cards: adCards.length,
    };
  });

  console.log(`      ad-cards: ${results.total_ad_cards} | valid: ${results.count}`);

  const now = new Date().toISOString();
  return results.items.map((it) => ({
    title:         it.title,
    price:         parsePrice(it.priceRaw),
    price_raw:     it.priceRaw,
    land_size:     parseSize(it.areaRaw),
    house_size:    parseSize(it.houseSizeRaw),
    bedrooms:      it.bedRaw ? parseInt(it.bedRaw.replace(/[^\d]/g, "")) || null : null,
    area:          search.area,
    property_type: search.type,
    source:        "Kaidee",
    url:           it.href,
    scraped_at:    now,
  })).filter(r => r.url && r.price && r.price > 500_000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("\n==============================================");
  console.log(" Finnhouses Market Scraper — baan.kaidee.com");
  console.log("==============================================\n");

  const browser = await chromium.launch({
    headless: false,
    args: ["--lang=th-TH"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    locale: "th-TH",
  });
  const page = await context.newPage();

  const summary = [];
  let totalSaved = 0;

  for (const search of SEARCHES) {
    console.log(`\n📍 ${search.area} — ${search.type}`);
    const allListings = [];

    for (let p = 1; p <= MAX_PAGES; p++) {
      try {
        const listings = await scrapePage(page, search, p);
        console.log(`    หน้า ${p}: ${listings.length} รายการ`);
        allListings.push(...listings);
        if (listings.length < 5) break;
      } catch (err) {
        console.warn(`    ❌ หน้า ${p} error: ${err.message}`);
        break;
      }
      await sleep(1000);
    }

    if (allListings.length) {
      const result = await saveListings(allListings);
      console.log(`  Supabase: ${result.ok ? "✅" : "❌"} ${allListings.length} รายการ (status: ${result.status})`);
      if (result.ok) totalSaved += allListings.length;
    }

    summary.push({ area: search.area, type: search.type, count: allListings.length });
    await sleep(1500);
  }

  await browser.close();

  console.log("\n==============================================");
  console.log(" สรุป");
  console.log("==============================================");
  summary.forEach(s => console.log(` ${s.area} | ${s.type}: ${s.count} รายการ`));
  console.log(`\n รวม: ${totalSaved} รายการ → Supabase market_listings`);
  console.log("==============================================\n");
})();
