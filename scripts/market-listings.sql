-- Supabase — สร้าง table: market_listings
-- รัน 1 ครั้งใน Supabase SQL Editor

CREATE TABLE IF NOT EXISTS market_listings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text,
  price         bigint,          -- ราคา (บาท)
  price_raw     text,            -- ราคา raw text จากเว็บ
  land_size     numeric,         -- ขนาดที่ดิน (ตร.ว.)
  house_size    numeric,         -- พื้นที่ใช้สอย (ตร.ม.)
  bedrooms      integer,
  area          text,            -- โซน: ลำลูกกา / รังสิต / คลองหลวง / ลาดหลุมแก้ว
  property_type text,            -- บ้านเดี่ยว / ทาวน์เฮาส์
  source        text DEFAULT 'DDproperty',
  url           text UNIQUE,     -- UNIQUE ป้องกัน duplicate
  scraped_at    timestamptz DEFAULT now()
);

-- Index สำหรับ query เร็วตาม area
CREATE INDEX IF NOT EXISTS idx_market_listings_area ON market_listings(area);
CREATE INDEX IF NOT EXISTS idx_market_listings_scraped_at ON market_listings(scraped_at DESC);

-- ดู summary หลัง scrape
-- SELECT area, property_type, COUNT(*) as count,
--        ROUND(AVG(price)/1000000.0, 2) as avg_price_M,
--        ROUND(MIN(price)/1000000.0, 2) as min_price_M,
--        ROUND(MAX(price)/1000000.0, 2) as max_price_M
-- FROM market_listings
-- GROUP BY area, property_type
-- ORDER BY area, property_type;
