# Chapter 13 — Architecture Governance

Status: **Final**
Trace Matrix: Decision Principles 1-4 (Ch10), Roadmap Guardrails 1-4 (Ch12), Major Finding 5.1/6.1/7.1/8.1/9.1 (the recurring fragmentation pattern this chapter exists to prevent recurring)

**Note on evidence standard**: This chapter is prescriptive design, not audit — there is no current governance model to grade against Evidence A/B/C, since none exists (confirmed absence, Ch4 §6, Ch8 AO-8.3/8.4). Claims here are proposals, labeled as such.

## 1. Governance Objective

```
Build Faster  →  Build → Govern → Learn → Improve
```
Not a rejection of build speed — Decision Principle 1 and Guardrail 4 both explicitly protect it.

## 2. Architecture Governance Model (proposed)

```
                  Architecture Owner
                         |
                  Architecture Review
                         |
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
 AI Governance     Data Governance   Runtime Governance
       |                 |                 |
 Agent Registry     Data Contract     Deployment Policy
 Decision Log        Access Policy    Version Control
 Evaluation           Schema Rules     Rollback
```
Sized specifically to the three fragmentation axes found in Ch4-6.

## 3. AI Governance Framework — Minimum Agent Contract (proposed)

```
Agent Identity + Purpose + Input Data + Output Type +
Decision Impact + Evaluation Method + Owner
```
Production entry gate:
```
Agent Registration → Permission Review → Evaluation Dataset → Production Approval
```
Operationalizes Gate 1/Gate 2 as a standing process rather than a one-time migration checkpoint.

## 4. Architecture Decision Process — ADR Lifecycle (proposed)

```
Idea → ADR Draft → Impact Review → Decision → Implementation → Verification → Archive
```

## 5. Change Classification (proposed)

| Level | Examples | Governance Requirement |
|---|---|---|
| L1 — Experiment | n8n workflow trials, prompt experiments, model comparisons | None — sandbox only |
| L2 — Controlled Change | New agent capability, new production workflow | Must pass Architecture Review |
| L3 — Architecture Change | AI execution boundary change, Hub strategy change, data contract change | Must produce an ADR |

Directly resolves ADR-Candidate-6.3 — gives n8n workflows a classification path they currently lack.

## 6. Governance Roles (proposed, sized to actual team, not a generic org chart)

```
Business Owner (Archi)       — final approval on Level 3 changes
Architecture Advisor          — impact review, ADR quality
AI/Technical Review           — agent contract compliance, evaluation design
Engineering Owner             — implementation, rollback, monitoring
```
**Confidence: Low** — this role model is proposed, not validated against Finnhouses' actual team size/capacity. Flagged as an Open Question for the Final Summary rather than assumed solved here.

## 7. Governance Metrics (proposed KPIs)

| Metric | Target |
|---|---|
| Registered AI Agents | 100% |
| Decisions with Evaluation | 100% |
| Production Workflows with Owner | 100% |
| Secrets without Owner | 0 |
| Critical Systems without Rollback | 0 |
| Unreviewed AI Changes | 0 |

## 8. Governance Evolution Model (proposed)

```
Stage 1 — Founder Governance (Current)
    Archi approves + Simple ADR + Agent Contract

Stage 2 — Platform Governance
    Named owners + Review cadence + Automated checks

Stage 3 — Intelligence Governance
    AI evaluates AI + Policy enforcement + Continuous improvement
```
Finnhouses should not adopt Enterprise-scale governance on day one. Stage 1 is the only stage this Blueprint recommends adopting now; Stages 2-3 are a maturity path, not a current requirement.

## ADR Candidates

**ADR-Candidate-13.1**: Should Architecture Governance roles be formally assigned now (even informally) before Track A begins, or can S0 proceed with roles implicit? Decision Driver: Section 6's Confidence: Low flag — premature role assignment may create disproportionate overhead for a 1-2 person team; no owner risks repeating the Ch5 AO-5.5 pattern (orphaned capability).

**ADR-Candidate-13.2 — Governance Maturity Level**: What minimum governance maturity level (Stage 1/2/3) should Finnhouses require before introducing additional AI agents beyond the current 5? Decision Drivers: team capacity, operational overhead, speed vs. control balance, number of production agents, business criticality of AI decisions involved.

## Closing the Chapter Arc

Chapter 13 is the direct answer to Major Finding 5.1/6.1/7.1/8.1/9.1's shared root cause — it specifies the standing mechanism (Change Classification + ADR Lifecycle + Agent Contract) that prevents the fragmentation pattern from recurring once the Ch11/12 migration is executed.
