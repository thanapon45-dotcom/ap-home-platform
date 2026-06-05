# Rollback: Hub State Supabase Migration

Use this only if the Hub deployment that reads/writes `hub_state` must be rolled back.

## Application rollback

1. Redeploy the previous Hub commit that still uses `services/backend-hub/hub-state.json`.
2. Remove or ignore the `SUPABASE_SERVICE_KEY` and `HUB_STATE_KEY` env vars only after the old Hub is healthy.
3. Confirm `GET /api/state` returns the expected state from the old Hub version.

## Database rollback

The migration is additive. Keeping the tables is safe and is the preferred rollback because it preserves captured state for a later retry.

If you must remove the new tables, run:

```sql
DROP TRIGGER IF EXISTS set_hub_queue_updated_at ON hub_queue;
DROP TRIGGER IF EXISTS set_hub_state_updated_at ON hub_state;

DROP TABLE IF EXISTS hub_queue;
DROP TABLE IF EXISTS hub_state;

-- Only drop this helper if no other tables use it.
DROP FUNCTION IF EXISTS set_updated_at();
```

## Data preservation

Before dropping tables, export the current Hub state:

```sql
SELECT key, value, updated_at
FROM hub_state
ORDER BY updated_at DESC;
```

Save the returned JSON externally if it needs to be restored to `hub-state.json` for the old Hub.
