# ROI Analysis

**Coverage: 100% — Production.**

## What exists

- `LandAnalyzer.tsx` — full ROI calculation for land/deal evaluation
  (dev_cost, build_cost, projected profit)
- `Deals.tsx` — actual-vs-estimate ROI tracking through the Fix & Flip
  pipeline, closing the loop between projected and realized returns

## Notes

This is one of the most complete sub-modules on the platform — projected ROI
(LandAnalyzer, pre-acquisition) and realized ROI (Deals, post-execution) are
both covered, which is a meaningfully different — and harder — thing to get
right than either alone.

## Cross-links

- Technical reference: `06-modules/` for `LandAnalyzer.tsx`, `Deals.tsx`
- Related: [fix-flip-analysis.md](./fix-flip-analysis.md), [land-analysis.md](./land-analysis.md)
