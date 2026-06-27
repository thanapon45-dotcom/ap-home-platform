-- Phase 2026-06-23: Operational dashboard + DLQ support for Backend Hub.

CREATE TABLE IF NOT EXISTS hub_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'POST',
  status TEXT NOT NULL DEFAULT 'open',
  attempts INTEGER NOT NULL DEFAULT 1,
  correlation_id TEXT NOT NULL DEFAULT '',
  request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NOT NULL DEFAULT '',
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hub_dlq_status_idx
  ON hub_dlq (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS hub_dlq_service_idx
  ON hub_dlq (service, updated_at DESC);

DROP TRIGGER IF EXISTS set_hub_dlq_updated_at ON hub_dlq;
CREATE TRIGGER set_hub_dlq_updated_at
BEFORE UPDATE ON hub_dlq
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE hub_dlq ENABLE ROW LEVEL SECURITY;

-- Service-role access only.
