# Land Analyzer and Brains

Land Analyzer saves Build-to-Sell estimates in `projects`. Brains now reads those existing records under `land_analysis`; it does not create a second knowledge store or infer any identity with Fix & Flip `reno_deals` (ADR-027).

## Data flow

1. Land Analyzer saves its existing form through `POST /api/projects`.
2. `GET /api/brains/context` reads saved projects and their budget fields on demand, with the existing limit and an exact `area_name` filter when `area` is supplied.
3. Assistant's existing `get_brains_context` tool can access those records. Its prompt distinguishes saved estimates from actual costs and verified market prices.
4. Land Analyzer reads the same Brains endpoint to display market insights and saved project budgets for the entered area. This is reference context; it does not modify calculation inputs or investment formulas.

The new panel debounces area input by 500 ms, aborts obsolete requests, hides stale-area results, and offers retry. Empty, failed, and loading reads are distinct. A project-source failure returns `land_analysis.status = unavailable` and `count = null`, preserving the other sources rather than claiming there are no projects.

## Scope

- Existing API fields remain intact; `land_analysis` is additive.
- No database migration, RLS change, new credentials, or extra LLM call.
- One additional bounded database read per Brains request. Area input is debounced.
- Projects without `area_name` appear in unfiltered context but cannot be matched to a named area. No location is inferred from project names.
- `/budget` remains closed per its existing ADR-018 notice. Budget data here means saved `projects` estimates, not reopening the retired public calculator.
- Existing Brains source failures still fail the full request; only the new projects source is isolated.
- This does not add Assistant project writes, persistent chat memory, automatic knowledge learning, or a project-to-deal relationship.

## Validation

- `node --test tests/brains-land-context.test.cjs`: 6 passing cases covering save/read round-trip with a mocked database, area encoding/filtering and limit cap, empty reads, projects-source failure isolation, original source failure, and missing configuration.
- `npx tsc --noEmit`: passed in the local validation checkout.
- A local React component harness passed blank-area, matching-area rendering, unrelated-record exclusion, stale-response cancellation, partial source failure, request failure, retry, and area-clearing checks. This harness used a temporary test renderer and does not replace browser verification.
- Read-only SQL verified all selected project columns against the connected AP-Home database and successfully ran the proposed project select. No production rows were written.
- Browser verification is not complete: the agent-browser daemon failed to start and the Chromium download returned an invalid archive in this environment. The database write/read round-trip above uses a mock; it is not a production end-to-end test.

## Deployment check

After deploying the PR, open Land Analyzer, enter an exact stored area, and confirm the panel shows matching market records and saved project budgets. Save a project, then ask Assistant about saved Build-to-Sell projects in that area. Verify `land_analysis.projects` includes the saved row and `/budget` still shows its closed-service notice. Check empty-area, network-error and rapid area-change behavior in a browser before declaring the production flow verified.
