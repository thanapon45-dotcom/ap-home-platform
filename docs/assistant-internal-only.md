# Assistant: internal data only

User requirement: the Assistant must not answer from outside the system.

The server now constructs displayed answers from a request-local ledger of results
returned by its own allowlisted Hub/Supabase tools. Model-generated prose is never
used as the answer, even after a successful read. A fresh successful read alone
does not make a model's accompanying claims trustworthy.

## Behavior

- The model routes questions to existing tools. There is no web/search tool.
- Stored values are rendered with source names and retrieval timestamps.
- Previous browser tool results, user numbers and assistant messages do not
  populate the evidence ledger. Follow-up questions require new retrieval.
- Empty queries and upstream failures have distinct fixed responses.
- Missing fields stay missing, including missing queue state (not zero).
- Blog queue counts use the Hub's `content_queue` field.
- List responses state that they are limited query results, not portfolio totals.
- Existing write requests still use the confirmation UI; results are rendered
  from the executed Hub request, not from model claims of success.

## Deliberate current limitation

This is a strict **fact retrieval** stage, not free-form AI business analysis.
The assistant displays stored ROI as stored ROI; it does not endorse or repair the
existing calculation. There is no new deal-write or what-if calculation tool.
Next steps for analysis require deterministic, reviewed formulas with identified
input records and explicit missing-data checks. Do not re-enable unrestricted
model prose as a shortcut.

Data already stored in market_insights is internal evidence, including previously
imported observations; its correctness is not newly verified by this change.
Source timestamps indicate retrieval time, not the date a market observation became
true. Stored created_at/updated_at fields are displayed where returned.

Existing authentication and client-controlled confirmation weaknesses are not
resolved by this grounding change. RLS/server credentials are not user authentication.
This change does not authorize deployment or certify production security.

## Verification

Run `node --test tests/assistant-internal-only.test.mjs` on Node >=22.13.
Tests execute the actual TypeScript route and helper using Node's type stripping,
with NextResponse and network calls mocked. No production writes or AI charges.
These tests are not a full Next.js build or a production end-to-end test.
