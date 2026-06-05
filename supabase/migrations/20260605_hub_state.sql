-- Phase C: Move Backend Hub state from hub-state.json to Supabase.
-- Apply in Supabase SQL Editor before deploying the Hub code change.

CREATE TABLE IF NOT EXISTS hub_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hub_queue_queue_type_idx
  ON hub_queue (queue_type);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hub_state_updated_at ON hub_state;
CREATE TRIGGER set_hub_state_updated_at
BEFORE UPDATE ON hub_state
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_hub_queue_updated_at ON hub_queue;
CREATE TRIGGER set_hub_queue_updated_at
BEFORE UPDATE ON hub_queue
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE hub_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_queue ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are created intentionally.
-- The Backend Hub must access these tables with SUPABASE_SERVICE_KEY.
