/**
 * Debug Market Scraper — ดู HTML structure ของแต่ละเว็บ
 * รัน: node scripts/debug-market.js
 * ผลลัพธ์: scripts/debug-output.txt + screenshot PNG แต่ละเว็บ
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITES = [
  {
    name: "DDproperty",
    url: "https://www.ddproperty.com/th/property-for-sale?freetext=%E0%B8%A5%E0%B8%B3%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%81%E0%B8%B2&property_type_code[]=HP",
  },
  {
    name: "Baania",
    url: "https://www.baania.com/th/search?keyword=ลำลูกกา&for_sale=1",
  },
  {
    name: "Livinginsider",
    url: "https://www.livinginsider.com/searchagent/ทาวน์เฮ้าส์/buy/ลำลูกกา",
  },
  {
    name: "Kaidee",
    url: "https://www.kaidee.com/property?q=ลำลูกกา&category=40",
  },
];

const OUT_DIR = path.join(__dirname);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    locale: "th-TH",
  });
  const page = await context.newPage();
  let report = "";

  for (const site of SITES) {
    console.log(`\n🔍 กำลังเปิด ${site.name}...`);
    try {
      await page.goto(site.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);

      // Screenshot
      const screenshotPath = path.join(OUT_DIR, `debug-${site.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Screenshot: ${screenshotPath}`);

      // ดึง HTML จาก main content area
      const info = await page.evaluate(() => {
        // หา container ที่น่าจะเป็น listing
        const candidates = [
          "main", "article", "#content", ".content",
          "[class*='listing']", "[class*='property']",
          "[class*='card']", "[class*='item']",
          "[data-testid]",
        ];

        let found = null;
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.children.length > 2) {
            found = el;
            break;
          }
        }

        // ดึงทุก element ที่มีราคา (ล้าน/บาท)
        const priceEls = [];
        document.querySelectorAll("*").forEach((el) => {
          if (el.children.length === 0 && /ล้าน|,000/.test(el.textContent)) {
            priceEls.push({
              tag: el.tagName,
              class: el.className?.slice(0, 80),
              text: el.textContent.trim().slice(0, 80),
              parentClass: el.parentElement?.className?.slice(0, 80),
              grandClass: el.parentElement?.parentElement?.className?.slice(0, 80),
            });
          }
        });

        // ดึง anchor ทั้งหมดที่น่าจะเป็น listing link
        const links = [];
        document.querySelectorAll("a[href]").forEach((a) => {
          const href = a.getAttribute("href");
          if (href && (href.includes("property") || href.includes("listing") || href.includes("house") || href.includes("บ้าน"))) {
            links.push({ href: href.slice(0, 100), class: a.className?.slice(0, 60) });
          }
        });

        return {
          title: document.title,
          url: location.href,
          bodyClass: document.body.className?.slice(0, 100),
          containerTag: found?.tagName,
          containerClass: found?.className?.slice(0, 100),
          containerHTML: found?.innerHTML?.slice(0, 2000),
          priceElements: priceEls.slice(0, 10),
          propertyLinks: links.slice(0, 5),
        };
      });

      const block = `
═══════════════════════════════════════════════════
${site.name.toUpperCase()}
URL: ${info.url}
Title: ${info.title}
Body class: ${info.bodyClass}
Container: <${info.containerTag} class="${info.containerClass}">

── Price Elements (ที่มีข้อความ ล้าน/,000) ──
${info.priceElements.map((p, i) =>
  `[${i+1}] <${p.tag} class="${p.class}"> "${p.text}"\n     parent: "${p.parentClass}"\n     grandparent: "${p.grandClass}"`
).join("\n")}

── Property Links ──
${info.propertyLinks.map(l => `  <a class="${l.class}"> ${l.href}`).join("\n")}

── Container HTML (500 chars) ──
${(info.containerHTML || "(ไม่พบ)").slice(0, 500)}
═══════════════════════════════════════════════════
`;
      report += block;
      console.log(block);

    } catch (err) {
      const errBlock = `\n❌ ${site.name}: ${err.message}\n`;
      report += errBlock;
      console.log(errBlock);
    }
  }

  const outPath = path.join(OUT_DIR, "debug-output.txt");
  fs.writeFileSync(outPath, report, "utf8");
  console.log(`\n✅ บันทึกรายงานที่: ${outPath}`);
  console.log("📌 ส่ง debug-output.txt + screenshot ให้ดูเพื่อแก้ selector\n");

  await browser.close();
})();
