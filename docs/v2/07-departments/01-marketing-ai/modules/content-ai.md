# Content AI

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: 100% - Production-grade

---

## What It Does

Content AI is the content production engine - generates Facebook posts from
multiple input types:
- Keyword-driven posts (preset topics, 32 keywords across 6 categories)
- Blog conversion (transform existing WordPress articles)
- Property listings (real estate listings from properties table)

All content respects BRAND_FACTS - business unit, areas served, CTA
conventions, 3T philosophy (Transfer, Trust, Take Care), buyer psychology,
buyer intelligence (persona + pain points + conversion triggers).

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Keyword-driven FB posts | 100% | 32 keywords in 6 categories |
| Blog to FB conversion | 100% | URL fetch + Claude rewrite |
| Property to FB listing | 100% | Reads from properties table |
| Positioned content (segment-specific) | 100% | Buyer segment + awareness level + timing signal |
| Image generation | 100% | OpenAI primary, Gemini fallback |
| Reference taste library | 100% | Save good outputs as references for future prompts |
| Multiple tone options | 100% | Casual, Professional, Educate, Fun, Heartfelt, 3T Story, Positioned |
| Quality Gate (AI content check) | Partial | Live per ADR-016, feedback loop pending ADR-021 |

---

## Key Features

Buyer Segments (current):
- resale (buy/list) - fear of not selling / getting lowballed
- inspection (consulting/inspection) - fear of contractor fraud

---

## ADRs

- ADR-009: Buyer Segment decoupling from Positioned tone - ../../../04-decisions/accepted/ADR-009.md
- ADR-010: Finnhouses business model correction - ../../../04-decisions/accepted/ADR-010.md
- ADR-012: Thai language quality + Sonnet model fix - ../../../04-decisions/accepted/ADR-012.md
- ADR-016: WF1 AI Quality Gate - ../../../04-decisions/accepted/ADR-016.md
- ADR-021: WF1 Quality Gate feedback loop - ../../../04-decisions/accepted/ADR-021.md

---

## Known Issues

- ISSUE-016: AI Content Studio Thai language issues - ../../../05-incidents/ISSUE-016.md

---

## Strategic Gap

Fix and Flip content missing:
- AI Content Studio currently has NO reno/Fix and Flip segment (per ADR-019)
- Fix and Flip is 60 percent of revenue but content engine doesn't support it
- Status: Pending Archi decision

---

## Related Department Sub-modules

- Market Intelligence (market-intelligence.md) - Primary consumer for positioned_content table
- CRM (crm.md) - Lead context informs content tone
