# Chapter 4 — AI Architecture

Status: **Final**
Trace Matrix: BR-3.1, BR-3.2, BR-3.3, AO-3.1, AO-2.3

## 1. AI Capability Map

| ID | AI Capability | Realizes Business Capability |
|---|---|---|
| AI-4.1 | Content Generation | BC-3.5 Content Production |
| AI-4.2 | Brand/Quality Compliance | BC-3.8 AI Decision Governance |
| AI-4.3 | Visual Defect Detection | BC-3.4 Construction Quality Assurance |
| AI-4.4 | Market Signal Extraction | BC-3.6 Market/Buyer Sensing |
| AI-4.5 | Buyer Intent Parsing | BC-3.1 Lead Qualification |

## 2. AI Agent Inventory

| ID | Agent | Model (Evidence A) | Input | Output/Decision | Realizes |
|---|---|---|---|---|---|
| AG-4.1 | Content Agent | `claude-haiku-4-5-20251001` default / `claude-sonnet-4-6` forced at 3 call sites (`AIContent.tsx` L479, 814, 1083) | keyword, buyer segment, taste-library posts | FB/Blog copy | AI-4.1 |
| AG-4.2 | AI Quality Gate | `gpt-4o-mini` (n8n WF1) | article HTML | `{pass, reasons[]}` | AI-4.2 |
| AG-4.3 | QC Vision Agent | provider-agnostic via `AiGateway` (`QcUseCase.ts` L112) | site photo + `QC_PROMPT` | defect assessment | AI-4.3 |
| AG-4.4 | Market Intel Agent | Claude Haiku (parse) + Sonnet (generate) | FB post/manual text | `market_insights`, `buyer_context_signals`, `content_frames` | AI-4.4 |
| AG-4.5 | CRM Note Parser | Claude Haiku (n8n) | lead notes | `trigger_type`, `urgency`, etc. | AI-4.5 |

## 3. AI Decision Flow

AG-4.2 and AG-4.3 produce structured `{decision, reasons}` output, logged to `quality_gate_log`/`qc_inspections` respectively. AG-4.1 and AG-4.5 produce generative/classification output with no decision log at all. AG-4.4 has a log only for confidence calibration (`market_insights.human_feedback`), not for the extraction step itself.

## 4. AI Memory Flow

Each agent reads a domain-specific memory silo. No cross-agent read access was observed in code — e.g. AG-4.1 does not read `buyer_context_signals` written by AG-4.5, despite both concerning the same lead (Confidence: Medium).

## 5. Prompt vs Business Rules Analysis — BR ↔ AI Mapping

| Rule | Enforced by | Where (Evidence A) | Data or Prompt? |
|---|---|---|---|
| BR-3.1 (Fix & Flip excluded from CRM) | Application code | `businessUnit.ts` | Data/Code |
| BR-3.2 (fallback = "list") | Application code | `businessUnit.ts` L46 | Data/Code |
| BR-3.3 (brand guardrail) | AG-4.2 (AI Quality Gate) | n8n WF1 prompt string | **Prompt** |

**BR-3.3 Classification**:

| Rule Type | Status |
|---|---|
| Business identity rule ("Finnhouses ไม่รับสร้างบ้าน") | Critical |
| Brand positioning rule | Critical |
| Formatting/style rule | Acceptable in prompt |

BR-3.3 is classified as a **Critical Business Rule embedded in Prompt** — not a general prompt-quality issue, because it encodes company positioning, not AI behavioral preference.

## 6. AI Governance

Feedback/calibration artifacts exist for AG-4.2 (Quality Gate accuracy), AG-4.3 (QC accuracy), AG-4.4 (Market Intel calibration). No agent lifecycle governance exists — new agents are introduced via direct code deployment with no review checklist (Evidence D).

**Missing Artifact — AI Agent Registry**: recommend a registry (e.g. `ai_agents` table: id, name, purpose, model, owner, input_schema, output_schema, risk_level, approval_status, last_review) as the structural gap underlying the lack of lifecycle governance.

## 7. BR ↔ AI Mapping

(see Section 5)

## 8. Architectural Observations

**AO-4.1** (Evidence: A; Confidence: Medium-High) — Of the 5 agents examined, only AG-4.3 (QC Vision) shows direct evidence of using `AiGateway`. The remaining 4 hardcode model names at the call site. Not claimed as exhaustive — hidden usage elsewhere has not been ruled out.

**AO-4.2** (Evidence: A/B) — BR-3.3 is the one confirmed instance of a Critical Business Rule embedded in prompt rather than data, concretely grounding the Principle 1 concern raised in Chapter 1.

**AO-4.3** (Evidence: Medium) — AG-4.1 and AG-4.5 have no decision log/feedback loop, unlike AG-4.2/4.3/4.4. Audit coverage (Principle 2) is incomplete across the agent inventory.

**AO-4.4** (Evidence: Medium) — No cross-agent memory sharing observed despite business-level relatedness (same lead touched by AG-4.1 and AG-4.5).

**AO-4.5 — AI Memory Fragmentation**
Evidence: A/B (agent components + n8n workflows)
Finding: AI agent memory is partitioned by workflow/domain with no Shared Intelligence Layer, so buyer intent, market signal, and content knowledge cannot reinforce each other across agents.
Impact: AG-4.1 does not draw on real buyer pain signals captured by AG-4.5; AG-4.5 does not enrich from AG-4.4's market intelligence; AG-4.4 has no visibility into which content AG-4.1 produced or its outcome.
Relation: Architecture Principle 3 (Shared Knowledge Layer); carried forward into Chapter 7 and Chapter 10.

## 9. ADR Candidates

**ADR-Candidate-4.1** (AO-4.1): Should all agents be required to route through `AiGateway` or an equivalent? Decision Drivers: refactor cost across 4 remaining agents, model-switching flexibility gained, production risk during migration.

**ADR-Candidate-4.2** (AO-4.2, BR-3.3): Should the brand guardrail rule move from prompt to a data-backed rule store? Decision Drivers: frequency of business-rule change (high — recent false positive), rule-engine implementation complexity, downstream impact on Ch10/11.

**ADR-Candidate-4.3** (AO-4.3): Should decision logging extend to AG-4.1 and AG-4.5? Undecided — both are generative, not pass/fail, and would need a different schema than `quality_gate_log`.

**ADR-Candidate-4.4 — Shared AI Memory Layer**: Should Finnhouses introduce a Shared AI Memory Layer? Decision Drivers: cross-agent learning capability, data governance complexity, privacy/control requirements, implementation cost.
