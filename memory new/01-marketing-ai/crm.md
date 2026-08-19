# CRM

**Coverage: 100% — Production**

## Implementing components

- `CRM.tsx` (Pipeline, Nurture, Overview tabs)
- CRM Note Parser (n8n, `wf_crm_note_parser.json`) — Claude Haiku parses
  `leads.notes` → `trigger_type`, `awareness_level`, `emotional_need`,
  `content_angle`, `urgency` → writes `buyer_context_signals`

## Stages

`new → followup → qualified → closed` (hardcoded in `DashboardOS.tsx`
`useLeadCounts` and CRM Kanban — do not rename without migrating both).

## Cross-link

`buyer_context_signals` written here is not currently read by Content AI — see
[customer-intelligence.md](customer-intelligence.md) gap note.
