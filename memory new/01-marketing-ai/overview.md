# Marketing AI Department

**Coverage: 85% — Strong** · Revenue share: ~10% (Unit 2, Brokerage) but content
infrastructure is used across all business units.

## Sub-modules

| Sub-module | Coverage | Status | Page |
|---|---|---|---|
| Market Intelligence | 100% | Production | [market-intelligence.md](market-intelligence.md) |
| Lead Generation | 100% | Production | [lead-generation.md](lead-generation.md) |
| CRM | 100% | Production | [crm.md](crm.md) |
| Content AI | 100% | Production | [content-ai.md](content-ai.md) |
| Customer Intelligence | 50% | Partial — lives inside `BRAND_FACTS`, no dedicated dashboard | [customer-intelligence.md](customer-intelligence.md) |
| Sales Analytics | 40% | Partial — scattered across `Deals.tsx` + `DashboardOS.tsx` | [sales-analytics.md](sales-analytics.md) |

## Summary

Four of six sub-modules are fully production. The two gaps (Customer
Intelligence, Sales Analytics) aren't missing capability so much as missing
*consolidation* — the underlying data mostly exists, it just isn't surfaced as
its own dashboard yet.

## Cross-links

- Cross-department hub: `DashboardOS.tsx` (Sales Analytics view), `OperationalDashboard.tsx`
- Technical reference: see `06-modules/` for `AIContent.tsx`, `CRM.tsx`, `Marketing.tsx`, `MarketIntel.tsx`
