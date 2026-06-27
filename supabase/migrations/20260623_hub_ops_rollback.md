# Rollback: Hub Operational Tables

## Application rollback

1. Redeploy the previous Hub version that does not read `hub_dlq`.
2. The dashboard ops tab can remain deployed; it will show no DLQ entries until the new Hub is back.

## Database rollback

If you must remove the DLQ table, run:

```sql
DROP TRIGGER IF EXISTS set_hub_dlq_updated_at ON hub_dlq;
DROP TABLE IF EXISTS hub_dlq;
```

Keep the table if possible. It preserves retry history and makes post-incident review much easier.
