// Keep IDENTICAL to the slug logic in n8n WF1 node "Prepare SEO + Tracking".
// If that node changes, change this too — the queue dedupe depends on them matching.
export function keywordToSlug(keyword: string): string {
  return (keyword || "")
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
