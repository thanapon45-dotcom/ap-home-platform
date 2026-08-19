# Content AI

**Coverage: 100% — Production**

## Implementing components

- `AIContent.tsx` — 6 tabs: Keyword, Blog, Listing, History, Queue, Market Intel
- Blog Runner: n8n WF1 (Article + Publish) + WF2 (Image + Patch) → WordPress
- FB Content Engine: web app (port 3000) → Facebook Page

## What it does

Generates Thai-language SEO blog articles and Facebook posts using
`BRAND_FACTS` guardrails, a Taste Library (starred few-shot examples), and
tone/style selectors (3T Framework, Positioned tone, Heartfelt tone).

## Known limitation

Does not currently read `buyer_context_signals` (CRM) or `market_insights`
(Market Intelligence) as generation context — flagged as Major Finding 7.1 in
the Architecture Blueprint ("no cross-agent intelligence reuse").
