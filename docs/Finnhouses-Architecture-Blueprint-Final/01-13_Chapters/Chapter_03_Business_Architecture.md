# Chapter 3 — Business Architecture

Status: **Final**
*(Reconstructed from session record — see README provenance note.)*

## Table 3.1 — Business Capability Map (Capability separated from supporting Application)

| ID | Business Capability | Supporting Application (not conflated with the capability itself) |
|---|---|---|
| BC-3.1 | Lead Qualification | CRM (`components/CRM.tsx`), CRM Note Parser |
| BC-3.2 | Property Listing Management | Properties module, PropertyReview |
| BC-3.3 | Renovation/Fix & Flip Execution | Deals module (`components/Deals.tsx`) |
| BC-3.4 | Construction Quality Assurance | QC Line (LINE + Hub `/api/qc`) |
| BC-3.5 | Content Production | AI Content Studio (`AIContent.tsx`) |
| BC-3.6 | Market/Buyer Sensing | Market Intelligence Collector (n8n) |
| BC-3.7 | Land / Investment Evaluation | Land Analyzer (Build-to-Sell) + Deals (Renovate-to-Resell) |
| BC-3.8 | AI Decision Governance | AI Quality Gate (n8n WF1) |

## Business Domains (BD-3.x, named in ubiquitous business language, not component names)

- **BD-3.1 — Customer Acquisition**: leads, buyer signals, qualification.
- **BD-3.2 — Property Transaction**: listings, brokerage, sale/purchase.
- **BD-3.3 — Fix & Flip Execution** *(distinct from BD-3.1 — see AO-3.1)*: renovation deal pipeline for **Renovate-to-Resell**, sourced independently of CRM.
- **BD-3.7 — Build-to-Sell Development**: Land Analyzer / `projects` for evaluating land and development economics for building houses to sell. This is a separate investment stream from BD-3.3.
- **BD-3.4 — Construction Quality**: QC inspections, defects, standards.
- **BD-3.5 — Content & Marketing**: content generation, publishing, performance.
- **BD-3.6 — Market Intelligence**: market signals, area memory, buyer context.

## AO-3.1 — Two Structurally Separate Value Streams (Major Architectural Finding)

Evidence: A (`lib/businessUnit.ts`, `components/Deals.tsx`, ADR-018/019 code comments)
Finding: The business does not have one universal Lead → Sale funnel. Fix & Flip (60% of revenue, BD-3.3) is sourced and executed entirely through the Deals module, never passing through CRM leads at all — `businessUnit.ts` explicitly excludes "reno" from the CRM `BusinessUnit` type by deliberate design (per ADR-018/019).
This is recorded as an Architecture Discovery, elevated in the Final Summary's Key Architecture Discoveries as the lead item — not merely one Business Rule among others.

## Business Rules

**BR-3.1** — Fix & Flip deals are excluded from CRM's `business_unit` classification by design (Evidence A, `businessUnit.ts` code comments referencing ADR-018/019).
**BR-3.4** — Land Analyzer and Fix & Flip are separate investment streams: Land Analyzer = **Build-to-Sell** (`projects`); Fix & Flip = **Renovate-to-Resell** (`reno_deals`). They must not be represented as a parent/child or source/derived relationship in the data model.
**BR-3.2** — When a lead's business unit cannot be classified by keyword, the system falls back to `"list"` (Brokerage) as a single-point default (Evidence A, `FALLBACK_BUSINESS_UNIT` constant) — explicitly flagged in code as "a single-handed decision," to be revisited if misclassification proves frequent.
**BR-3.3** — Finnhouses does not perform new-home construction (Unit 1, discontinued); this brand/positioning rule is enforced only inside the AI Quality Gate's n8n prompt (see Ch4 for full BR↔AI mapping and severity classification).

## AO-3.2 — Executive Dashboard Metric Representativeness

Evidence: B/C; Confidence: Medium (not all dashboard widgets were exhaustively surveyed)
Finding: The Overview dashboard may over-index on Lead-based metrics (count, stage, conversion) that do not represent BD-3.3 (Fix & Flip), the majority-revenue business unit, since Fix & Flip deals never appear as CRM leads (AO-3.1). This is stated with "may," not asserted as confirmed across every widget.

## Architecture Alignment Clarification

Where cross-domain complexity appears in this chapter's capability/domain mapping (e.g. BD-3.1 and BD-3.6 both touching `buyer_context_signals`), this reflects the business's actual nature — multiple domains legitimately caring about the same buyer — rather than a design defect, unless a chapter's evidence specifically indicates otherwise.

## ADR Candidates

**ADR-Candidate-3.1 — Dashboard Value Stream Representation**: Should the Executive Dashboard represent both Value Streams (CRM-routed and Fix & Flip) explicitly, rather than defaulting to Lead-centric metrics? Decision Drivers: reporting accuracy, cognitive load for operators, migration cost of restructuring dashboard widgets, business criticality of Fix & Flip visibility given its revenue share.
