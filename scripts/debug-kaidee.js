/**
 * Debug Kaidee — ดู HTML ข้างใน [data-testid='ad-card']
 * รัน: node scripts/debug-kaidee.js
 * ผลลัพธ์: scripts/debug-kaidee-output.txt
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "https://baan.kaidee.com/c16-realestate-house?keyword=%E0%B8%A5%E0%B8%B3%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%81%E0%B8%B2&page=1";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    locale: "th-TH",
  });
  const page = await context.newPage();

  console.log("🔍 เปิด baan.kaidee.com...");
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(__dirname, "debug-kaidee.png"), fullPage: false });
  console.log("📸 screenshot: scripts/debug-kaidee.png");

  const result = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("[data-testid='ad-card']"));

    // ── ดู card แรก 3 ใบ แบบละเอียด ──
    const cardDetails = cards.slice(0, 3).map((card, i) => {
      const allLinks = Array.from(card.querySelectorAll("a[href]")).map(a => a.getAttribute("href"));
      const allText  = card.innerText || card.textContent || "";

      // หา elements ที่มีราคา
      const priceEls = Array.from(card.querySelectorAll("*"))
        .filter(el => el.children.length === 0 && /ล้าน|,\d{3}|฿/.test(el.textContent))
        .map(el => ({
          tag: el.tagName,
          cls: el.className?.slice(0, 80),
          text: el.textContent.trim().slice(0, 60),
        }));

      return {
        index: i + 1,
        innerHTML_300: card.innerHTML.slice(0, 300),
        allLinks,
        allText_200: allText.slice(0, 200),
        priceEls,
        dataTestIds: Array.from(card.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid")),
      };
    });

    // ── ดู anchor ทั้งหมดใน page ที่น่าจะเป็น listing ──
    const listingLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => {
        const h = a.getAttribute("href") || "";
        return /\/(p|listing|realestate)-\d+|\/[\w-]+-\d{5,}/.test(h);
      })
      .slice(0, 10)
      .map(a => ({
        href: a.getAttribute("href"),
        text: a.textContent.trim().slice(0, 50),
        cls: a.className?.slice(0, 60),
      }));

    // ── ดู data-testid ทั้งหมดใน page ──
    const allTestIds = [...new Set(
      Array.from(document.querySelectorAll("[data-testid]"))
        .map(el => el.getAttribute("data-testid"))
    )];

    return {
      cardCount: cards.length,
      cardDetails,
      listingLinks,
      allTestIds: allTestIds.slice(0, 30),
    };
  });

  let report = `
════════════════════════════════════════════════
 baan.kaidee.com — ad-card HTML Inspector
════════════════════════════════════════════════
จำนวน [data-testid='ad-card']: ${result.cardCount}

── data-testid ทั้งหมดใน page ──
${result.allTestIds.join(" | ")}

── Listing Links (href pattern /p-XXXXX) ──
${result.listingLinks.map(l => `  href: ${l.href}\n  text: ${l.text}\n  cls: ${l.cls}`).join("\n---\n")}
`;

  result.cardDetails.forEach(c => {
    report += `
════ CARD #${c.index} ════
innerHTML (300 chars):
${c.innerHTML_300}

allLinks: ${JSON.stringify(c.allLinks)}
allText (200 chars): ${c.allText_200}

priceEls:
${c.priceEls.map(p => `  <${p.tag} class="${p.cls}"> "${p.text}"`).join("\n")}

dataTestIds inside: ${JSON.stringify(c.dataTestIds)}
`;
  });

  const outPath = path.join(__dirname, "debug-kaidee-output.txt");
  fs.writeFileSync(outPath, report, "utf8");
  console.log("\n" + report);
  console.log(`\n✅ บันทึกที่: ${outPath}`);
  console.log("📌 ส่งไฟล์นี้กลับมาเพื่อแก้ selector\n");

  await browser.close();
})();
