# Market Intelligence

**Coverage: 100% — Production**

## Implementing components

- `MarketIntel.tsx` (Dashboard tab)
- `market-intel-v2` pipeline (n8n + Supabase + Claude, 9-signal schema: Demand,
  Price, Liquidity, Offer, Finance, Value, Location, Urgency, Seller Motivation)
- Supabase tables: `market_insights` (135 rows), `area_memory` (8 rows)

## What it does

Ingests FB posts and manual observations, parses them into structured area-level
market signals via Claude, and stores them for reuse in content and pricing
decisions.

## Known limitation

Market Intel data is not currently read by the Content Agent (AG-4.1) when
generating copy — see the Architecture Blueprint Ch7 "cross-agent intelligence
reuse" finding. This is a data-flow gap, not a Market Intelligence gap itself.
