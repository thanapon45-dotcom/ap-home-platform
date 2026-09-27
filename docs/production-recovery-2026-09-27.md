# Production recovery — 2026-09-27

## Verified baseline

- Production blog traffic uses `server.cjs`, `hub_state.default`, `x-hub-token`, `/action/blog/*`.
- The separate TypeScript shadow service uses `hub_state.v2` and `x-hub-secret`.
- Railway `blog-state-reset-checker` was a one-shot Bun function (no cron schedule). Its v2 path/header targeted v1, causing HTTP 401. It was not a continuously running monitor.
- v2 run `run_da089n87`, started 2026-06-30, was still running. A conditional SQL update on the exact key/run/start/status marked it failed on 2026-09-27, preserving run identity and failure evidence. Subsequent health checks retained the repaired state.
- `content_queue` is an array inside `hub_state.value`, not a standalone table.
- Dashboard selects from a static keyword pool. The prior build endpoint reset every submitted item to pending without publication checks.
- WordPress post 1005, published 2026-07-05, has the exact title `ปทุมธานี โซนไหนราคาที่ดินขึ้นเร็วที่สุด 5 ปีที่ผ่านมา`.
- The 2026-09-29 topic previously failed on 2026-09-15 with `brand_guardrail_violation`. That is not proof of publication. WordPress search returned zero posts for `วิธีประเมินราคาบ้านมือสองก่อนรีโนเวท`; the only published Lam Luk Ka search match had another title. Keep the scheduled item, checking publication evidence again at dispatch.

## Changes

- Plain-text Telegram payloads remove Markdown entity parsing errors. Failed sends do not consume the health alert cooldown. v1 now detects Telegram API failure responses rather than claiming successful delivery.
- Queue build and dispatch check all published WordPress pages, Supabase content_posts, and confirmed Hub outcomes. Exact normalized titles/keywords and explicit duplicate-slug guard outcomes are evidence; unrelated failed attempts and Facebook history are not.
- Confirmed outcomes are retained in `blog_dedupe` across queue rebuilds/history truncation. Unknown/evidence outages fail closed before WF1. Existing Publish Guard stays active.
- Build rejects duplicates within a batch; all-duplicate submissions preserve the current queue. Protected audit can inspect or quarantine pending duplicates without starting WF1.
- The existing single Hub replica serializes blog actions and refuses dispatch/rebuild while a run is active. This is not a distributed lock; multiple replicas require a database claim/lease.
- Checker uses the correct v1 contract and a Railway reference to the production Hub secret. It validates reset in dry-run, only resets a matching stale running job, audits queued items, and verifies a known duplicate in build dry-run. It remains a one-shot job with bounded failure retries, not an added recurring service.
- Reset supports expectedRunId and closes only the matching running queue item. Terminal outcomes are not reset by the checker.
- Dashboard reports skipped duplicates and removes an outdated construction-service anchor label.

## Validation and limits

- `npm run build --prefix services/backend-hub`
- `node --test services/backend-hub/tests/production-recovery.test.cjs` (14 regression cases)
- Syntax check of touched frontend/proxy files and `git diff --check`.
- Deploy verification: Railway deployment status and checker logs, live hub_state and pending queue, shadow health logs, Vercel deployment state.
- No test article or Facebook post is published. Telegram formatting is verified with a mocked API payload; a live alert-delivery test is not claimed without an actual delivery receipt.
- Exact evidence does not establish semantic similarity of differently worded articles. WF1 Publish Guard remains the final slug/content check.
