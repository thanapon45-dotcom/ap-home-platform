# Lead Generation

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: 100% - Production-grade

---

## What It Does

Lead Generation handles inbound property listings - customers who want to
list their property for sale, coming through multiple channels (LINE OA, Web
form, phone call), requiring review before publishing.

Flow:
1. LINE seller sends photos + info -> n8n workflow -> properties table
2. Admin (Archi) reviews in Property Review UI -> edit + upload cover + gallery photos
3. Approve -> publish to WordPress (finnhouses.com)

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| LINE OA intake | 100% | wf_qc_line 2 workflow captures photos + text |
| Pending review UI | 100% | PropertyReview.tsx with full edit form |
| Image upload to WP | 100% | /api/property/upload-image |
| Publish to website | 100% | /api/property/publish with featured + gallery |
| Dismiss (not for sale) | 100% | /api/property/dismiss |

---

## Channel Sources

| Source | Captured by | Routed to |
|--------|-------------|-----------|
| LINE OA | n8n workflow | properties table (pending) |
| Web Form | /api/leads (CRM) | leads table -> CRM Pipeline |
| FB Content (engagement) | AI Content Studio | Future: re-engagement flow |
| Budget Tool | /budget page | DISABLED (Unit 1 discontinued) |

---

## ADRs

- ADR-001: LINE Seller Intake v6 - not yet split into 04-decisions (predates ADR-001 in this repo's decisions.md numbering; verify before linking)

---

## Known Issues

None critical.

---

## Related Department Sub-modules

- CRM (crm.md) - Receives + manages leads from all sources
- Content AI (content-ai.md) - Drives engagement that leads to listings
