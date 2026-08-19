# Cross-Reference — Component ↔ Department

| Component | Marketing AI | Construction AI | Investment AI |
|---|---|---|---|
| `AIContent.tsx` | Content AI, Lead Generation, Customer Intelligence (partial) | — | — |
| `CRM.tsx` | CRM, Lead Generation, Customer Intelligence (Nurture tab) | — | — |
| `Marketing.tsx` (Blog Runner) | Content AI, Lead Generation | — | — |
| `MarketIntel.tsx` | Market Intelligence, Customer Intelligence | — | — |
| `PropertyReview.tsx` | Lead Generation | — | — |
| `Deals.tsx` | — | Project Management (partial) | Fix & Flip Analysis, ROI, Cash Flow (partial) |
| `LandAnalyzer.tsx` | — | BOQ & Cost Estimation (partial), Project Management (partial) | Land Analysis, ROI Analysis, Financial Planning (partial) |
| `QcAccuracy.tsx` + QC Line (LINE) | — | Quality Control | — |
| `DashboardOS.tsx` | Sales Analytics, Market Intel | — | Investment Dashboard (partial) |
| `OperationalDashboard.tsx` | cross-department | cross-department | cross-department |

**Reading this table**: a single technical component frequently serves more
than one department's sub-module — this is a naming/organization mismatch
(components are named after technical layer, not business function), not a
duplication of effort. See each department's `overview.md` for the
department-first view of the same information.
