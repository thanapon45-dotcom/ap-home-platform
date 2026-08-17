# PROJECT LIGHTHOUSE — Finnhouses Competitor Intelligence v0.1

**Scope executed:** Step 1 (candidate discovery) completed via WebSearch with real, sourced data. Claude-in-Chrome was later connected successfully, enabling live browser verification of 12 of the 20 candidate pages across three rounds (Bangkok Asset, SpyEstates, Mahanakornhome, Bangkok Asset Center, CS Property, Pen House, Bahn Mahanakorn, Home.ban2, FazWaz, CBRE Thailand, CheckRaka, REIC — plus TJ Singlehome, whose page returned a "content unavailable" error) — real follower counts, real posts, and real engagement numbers (reactions/comments/shares/views) as displayed by Facebook. When a candidate's exact Facebook URL wasn't already known, Facebook's own page search was used to find and confirm it. Steps 2–5 remain at **reduced scope** for the other 8 pages — Facebook's feed only rendered 1-2 posts per page before stalling on loading placeholders, even with live access, so this is a real but small sample rather than the full 50-posts-x-20-pages census the spec calls for.

**Constraint honored:** Evidence only. No assumptions. Every data point below is either (a) sourced from a real WebSearch result, cited inline, or (b) explicitly marked `UNVERIFIED — not found via WebSearch in this pass`. Nothing was estimated or fabricated to fill a gap.

---

## What this pass actually delivers

1. **`competitor_database.json`** — 20 candidate Thai real-estate Facebook pages relevant to Finnhouses' niche (house resale, renovation-for-resale, property investment/education). Follower counts and provinces are filled in only where a WebSearch result stated them; all others are marked unverified.
2. **`content_patterns.json`** — Post-level hook/topic/CTA/engagement data. **This is the most limited file.** WebSearch surfaces page-level snippets, not scrollable post feeds, so per-post metrics (views, comments, shares, video length) could not be reliably collected for 50 posts × 20 pages as the original spec required. What's included is real content-pattern evidence pulled from search snippets and page descriptions — flagged per entry as `sample_evidence`, not a full 50-post census.
3. **`hook_library.json`** — Real hook/headline phrases observed in search snippets (not a full Top 100 — see limitations).
4. **`audience_questions.json`** — Real customer questions/pain points found in searchable content (comments, captions); far short of a full Top 100 given the access constraint.
5. **`opportunity_matrix.md`** — Built from the verified evidence only; several rows explicitly marked `insufficient evidence` rather than guessed.

## Why the scope is still reduced from the original spec

The original spec (Steps 2–3) requires per-post scraping of the latest 50 posts across 20 Facebook Pages — engagement counts, video lengths, save counts. Claude-in-Chrome is now connected and was used to visit 3 pages directly, confirming real, current data (follower counts, ratings, live post captions, and real engagement numbers). However, Facebook's own feed only rendered 1-2 posts per page before further scrolling returned unresolved loading skeletons — so even with live access, pulling a full 50-post history per page across all 20 pages wasn't achieved in this pass. This remains a real, evidence-backed sample rather than a full census, and is reported as such rather than extrapolated into a false Top 100.

## Recommended next step to complete the original spec

Continue the live-verification pass across the remaining 8 candidate pages (Estopolis.com, Realist, prop2morrow, Living Sneak Peek, CondoDiary, Review by O, Passion Realtor, plus the disambiguation-pending list from the earlier WebSearch round), retrying the scroll/wait cycle per page (Facebook's feed sometimes needs multiple retries to load past the first post or two), or authenticate the Nimble connector as an alternative bulk-scraping path. This would close the remaining gap between this v0.1 pass and the full Steps 2–5 spec.

## What live verification confirmed this pass

Visiting 12 pages directly confirmed real follower counts, real page ratings, and — most usefully — real per-post engagement numbers where posts were visible. The standout finding, consistent across 7 posts with visible engagement: engagement did not track follower count. SpyEstates' news/announcement-style post (21 reactions, 8 comments, 3 shares, ~210K followers) had the strongest engagement of any page checked, ahead of Bahn Mahanakorn's behind-the-scenes video (9 reactions, 2 shares, 164 views, ~110K followers) and Bangkok Asset's premium-listing post (5 reactions, 448 views, ~350K followers — the largest follower count of any resale-focused page checked, yet not the strongest engagement). The smallest pages using plain price-listing formats (Mahanakornhome, CS Property, Home.ban2) scored lowest across the board. This round also surfaced a distinct competitor category not previously represented: national real estate media/data/advisory pages (FazWaz ~36K, CBRE Thailand ~61K, CheckRaka ~160K, REIC ~23K), which serve different audiences (international investors, corporate clients, general news readers, and official market statistics respectively) rather than competing directly with Finnhouses' local home-building/resale audience. See `opportunity_matrix.md` for the full breakdown — this remains a small real sample, not a statistically proven pattern, but it's real evidence worth testing rather than a guess.

## Geo-focused round: Pathum Thani and Nonthaburi (added at user's request)

At the user's request, a targeted round searched specifically for resale-house pages in Pathum Thani and Nonthaburi — Finnhouses' actual service zones — rather than continuing down the original 20-candidate list. Eight pages were found and added to `competitor_database.json` under a new `geo_focused_candidates_pathum_thani_nonthaburi` section.

The new standout, found in a follow-up search: **"บ้านมือสอง กรุงเทพ-นนทบุรี ราคาถูก" (HOME888)** — 120,000 followers, the single largest resale competitor found anywhere in this entire project's geo-focused search, nearly 3x the previous flagship finding. Its current post feed shows real activity (most recent post 2 days old), but that post's engagement (3 reactions, 1,700 views) was modest relative to its huge follower count — the strongest reinforcement yet of the cross-page finding that engagement does not track follower count. The post also showed a real, directly observed oddity: the attached video was an unrelated stock-style wedding/bridal scene with no visible connection to the house-listing caption.

The prior standout, still highly relevant: **"บ้านมือสองนนทบุรี กรุงเทพฯและปริมณฑล สินเชื่อฟรี-by Perfect House Property"** — 41,000 followers, 100% recommend, professionally branded, established since November 2020, and actively maintained (profile updated 42 minutes before this check). By contrast, the largest dedicated Pathum Thani page found (10,000 followers, 94% recommend) shows posting activity that has slowed considerably — most recent posts were over a year old relative to this check. A further page found this round, **"คุณนัทบ้านสวยพร้อมอยู่ กรุงเทพ นนทบุรี ปทุมธานี ปริมณฑล"** (4,800 followers, Facebook-verified), is notable for being the only page whose name explicitly spans all three of Finnhouses' core service areas at once, though it has not yet been opened for a full visit.

A consistent value-add pattern was confirmed across both provinces: multiple independent pages bundle free loan/credit consultation service directly with their resale listings, not just photos and price — this appears to be a real, common practice in this specific market, not a novel differentiator Finnhouses could claim as unique.

## Two major findings worth flagging now

1. **Bangkok Asset and Bangkok Asset Center are confirmed to be the same company**, not unrelated competitors or a duplicate/typo as previously flagged as unresolved. A live-verified post on Bangkok Asset Center's page was explicitly attributed to "บริษัท บางกอก แอสเซท อินเตอร์กรุ๊ป จำกัด (มหาชน)" (Bangkok Asset Intergroup PUBLIC Company Limited), and both pages share an identical registered address in Bangkok. They appear to split functions: Bangkok Asset (~350K followers) handles resale marketing/premium listings and posts daily; Bangkok Asset Center (~5,000 followers) handles "we buy your house" cash acquisitions and posts far less often (most recent post was over a month stale).

2. **Bahn Mahanakorn (บ้านมหานคร รับสร้างบ้าน) is a custom home-BUILDING company** — not a resale/renovation page like most others in this database, despite its name resembling "Mahanakornhome" (a small, unrelated resale page also tracked here). At ~110,000 followers, Facebook-verified, and actively posting, this is the most strategically relevant competitor found so far, since it's the only one confirmed to share Finnhouses' actual core business model rather than buying/reselling/renovating existing houses. Worth a dedicated deeper look — see `opportunity_matrix.md`.

---

Sources for all data points are listed inline in `competitor_database.json` under each entry's `source_note` field — a mix of live Facebook page visits via Claude-in-Chrome (marked LIVE-VERIFIED) and direct WebSearch results, both from this session.
