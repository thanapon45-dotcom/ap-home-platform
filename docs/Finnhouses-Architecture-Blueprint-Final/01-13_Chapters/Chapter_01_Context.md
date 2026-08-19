# Chapter 1 — Executive Summary & Business Context

Status: **Final**
*(Reconstructed from session record — see README provenance note.)*

## Executive Overview

Finnhouses (บจก.อาชิดา) operates a Thai real estate platform (AP-Home Platform OS) across 3 active business units — Fix & Flip (60% of revenue), Consulting/Inspection (30%), Brokerage (10%) — plus one discontinued unit (new-home construction, Unit 1). The platform combines a Next.js dashboard, two Hub backends (v1 production, v2 shadow), an n8n orchestration layer, and Supabase as the primary data store, supporting 5 AI agents across content generation, quality gating, construction QC vision, market intelligence, and CRM note parsing.

## Current Business Profile

Capabilities developed sequentially over time, connected via central components (Hub, Dashboard) as needs arose — not designed upfront as a unified platform. This is stated as an evidence-neutral observation, not an implied criticism: sequential capability development is common and not itself a defect.

## Business Objectives (3-level split)

- **Vision**: AI-native, Human-Centered Real Estate Intelligence Operating System.
- **Business Outcomes** (Confirmed): sustained Fix & Flip revenue, functioning content/marketing pipeline, working QC/inspection process.
- **Architecture Outcomes** (Pending, this Blueprint's subject): whether the platform's AI/data/application architecture is structurally capable of supporting the stated Vision over a 3-5 year horizon.

*Footnote: business-mix percentages (60/30/10) are Archi's own operational estimate, not derived from audited financial statements — treated as Evidence E.*

## Architecture Alignment Observations (preliminary; see Ch2-3 for full evidence)

Some current-state characteristics do not fully align with Architecture Principle 1 (business rules in data/code, not prompts) — most concretely evidenced later in Ch4 (BR-3.3). This is noted here as a forward reference to Chapter 2's System Context, not restated in full.

## Strategic Opportunities (neutral framing)

- Existing AI agent inventory and data collection represent real, reusable capability, not a starting point of zero.
- The gap identified across this Blueprint is primarily one of connecting existing capability, not building new capability from scratch.

## Recommendation-to-Chapter Mapping

| Recommendation Area | Chapter |
|---|---|
| AI agent governance | Ch4, Ch13 |
| Data model consolidation | Ch5 |
| Application/runtime boundaries | Ch6 |
| Intelligence loop closure | Ch7 |
| Security/credential governance | Ch8 |
| Operational reliability | Ch9 |
| Strategic options | Ch10 |
| Execution | Ch11-12 |

*Priority column: TBD — priority sequencing is addressed in Ch10-12, not assigned here.*
