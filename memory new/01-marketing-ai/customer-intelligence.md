# Customer Intelligence

**Coverage: 50% — Partial (gap)**

## Current state

Lives inside `BRAND_FACTS` in `AIContent.tsx` (Buyer Psychology 3 levels,
Buyer Segments) and Architecture Blueprint Ch3's "Buyer Intelligence" section
— not a dedicated module or dashboard.

## Gap

No standalone Customer Intelligence dashboard exists. Buyer signals are
captured in three disconnected places (`buyer_context_signals` from CRM Note
Parser, `buyer_profiles` from Market Intelligence, `BRAND_FACTS` static text in
Content AI) with no unified view.

## Suggested next step (not yet scoped)

A read-only dashboard tab surfacing `buyer_context_signals` +
`buyer_profiles` together, before attempting to feed either into Content AI
generation.
