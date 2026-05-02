-- ════════════════════════════════════════════════════════════
-- Finnhouses — CRM to Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ════════════════════════════════════════════════════════════

-- 1. Add missing CRM columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS style         TEXT DEFAULT 'Modern Minimal',
  ADD COLUMN IF NOT EXISTS stage         TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS score         INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'Budget Tool',
  ADD COLUMN IF NOT EXISTS notes         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_unit TEXT DEFAULT 'build',
  ADD COLUMN IF NOT EXISTS lead_date     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- 2. budget column: convert numeric → text ("2.5M" format)
--    Run ONLY if budget is currently a numeric/bigint column.
--    If it's already text, skip this block.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads'
      AND column_name = 'budget'
      AND data_type IN ('integer','bigint','numeric','double precision','real')
  ) THEN
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_text TEXT;
    UPDATE leads
       SET budget_text = CASE
         WHEN budget IS NULL THEN '0M'
         ELSE CONCAT(ROUND(budget::numeric / 1000000, 1), 'M')
       END
     WHERE budget_text IS NULL;
    ALTER TABLE leads DROP COLUMN budget;
    ALTER TABLE leads RENAME COLUMN budget_text TO budget;
  END IF;
END $$;

-- 3. Backfill created_at for existing rows
UPDATE leads SET created_at = NOW() WHERE created_at IS NULL;

-- 4. Enable Row Level Security (if not already)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anon reads/writes (adjust as needed)
DROP POLICY IF EXISTS "allow_all" ON leads;
CREATE POLICY "allow_all" ON leads FOR ALL USING (true) WITH CHECK (true);
