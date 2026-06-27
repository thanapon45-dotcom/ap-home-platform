"""
Market Analyst Agent — ap-home-platform
Reads from Memory Hub (Supabase) → Analyzes → Writes to agent_reports

Tasks:
  1. Price Analysis   — market_listings vs properties
  2. Lead Scoring     — re-score leads from signals
  3. Content Suggestions — top angles from buyer_context_signals
  4. Sales Forecast   — pipeline projection

Usage:
  python market_analyst_agent.py           # run all
  python market_analyst_agent.py --task price
  python market_analyst_agent.py --task leads
  python market_analyst_agent.py --task content
  python market_analyst_agent.py --task forecast
"""

import os
import json
import argparse
from datetime import date, datetime, timedelta
from supabase import create_client, Client

# ── Config ───────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://omvpagvqyfmkkhzuuzda.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # set via env: service_role key recommended

if not SUPABASE_KEY:
    raise EnvironmentError("Set SUPABASE_KEY environment variable (service_role key)")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

TODAY = date.today()
PERIOD_START = TODAY - timedelta(days=90)


# ── 1. Price Analysis ─────────────────────────────────────────────────────────
def run_price_analysis() -> dict:
    """
    Compare market_listings (competitor prices) vs properties (our sold/asking).
    Output: price bands, avg price/sqm by area, under/over-priced signals.
    """
    listings = sb.table("market_listings").select(
        "area, property_type, price, land_size, house_size"
    ).execute().data

    properties = sb.table("properties").select(
        "location, property_type, asking_price, sold_price, area_sqm, land_sqm, status"
    ).execute().data

    # --- Market stats by area ---
    from collections import defaultdict
    market_by_area: dict = defaultdict(list)
    for row in listings:
        if row.get("price") and row.get("land_size") and float(row["land_size"]) > 0:
            ppm = float(row["price"]) / float(row["land_size"])
            market_by_area[row.get("area", "unknown")].append(ppm)

    area_stats = {}
    for area, ppms in market_by_area.items():
        area_stats[area] = {
            "count": len(ppms),
            "avg_price_per_sqm": round(sum(ppms) / len(ppms)),
            "min_price_per_sqm": round(min(ppms)),
            "max_price_per_sqm": round(max(ppms)),
        }

    # --- Price bands (market_listings) ---
    prices = [r["price"] for r in listings if r.get("price")]
    bands = {
        "under_2M":   sum(1 for p in prices if p < 2_000_000),
        "2M_5M":      sum(1 for p in prices if 2_000_000 <= p < 5_000_000),
        "5M_10M":     sum(1 for p in prices if 5_000_000 <= p < 10_000_000),
        "over_10M":   sum(1 for p in prices if p >= 10_000_000),
    }

    # --- Our properties vs market ---
    our_signals = []
    for prop in properties:
        price = prop.get("sold_price") or prop.get("asking_price")
        sqm   = prop.get("area_sqm") or prop.get("land_sqm")
        if price and sqm and float(sqm) > 0:
            our_ppm = float(price) / float(sqm)
            area    = prop.get("location", "unknown")
            mkt     = area_stats.get(area, {}).get("avg_price_per_sqm")
            if mkt:
                diff_pct = round((our_ppm - mkt) / mkt * 100, 1)
                our_signals.append({
                    "location": area,
                    "our_price_per_sqm": round(our_ppm),
                    "market_avg_per_sqm": mkt,
                    "diff_pct": diff_pct,
                    "signal": "overpriced" if diff_pct > 10 else "underpriced" if diff_pct < -10 else "aligned",
                })

    payload = {
        "area_stats": area_stats,
        "price_bands": bands,
        "our_vs_market": our_signals,
        "total_market_listings": len(listings),
        "total_our_properties": len(properties),
    }

    summary = (
        f"ตลาดมี {len(listings)} รายการ | "
        f"ราคาเฉลี่ย {list(area_stats.values())[0]['avg_price_per_sqm']:,} บ./ตร.ม. | "
        f"ส่วนใหญ่อยู่ช่วง 2-5M ({bands['2M_5M']} รายการ)"
        if area_stats else "ไม่มีข้อมูลตลาดเพียงพอ"
    )

    _save_report("price_analysis", payload, summary)
    print(f"[price_analysis] ✓ {summary}")
    return payload


# ── 2. Lead Scoring ───────────────────────────────────────────────────────────
def run_lead_scoring() -> dict:
    """
    Re-score all leads based on: budget size, urgency, stage, source quality.
    Update score field in leads table.
    """
    leads = sb.table("leads").select("*").execute().data

    scored = []
    for lead in leads:
        score = 40  # base

        # Budget signal
        budget_str = str(lead.get("budget") or "")
        budget_num = _parse_budget(budget_str)
        if budget_num >= 5_000_000:   score += 25
        elif budget_num >= 2_000_000: score += 15
        elif budget_num >= 1_000_000: score += 5

        # Urgency
        urgency = lead.get("urgency", "")
        if urgency == "hot":   score += 20
        elif urgency == "warm": score += 10
        elif urgency == "cold": score -= 5

        # Stage
        stage = lead.get("stage", "")
        stage_pts = {"new": 0, "contacted": 5, "qualified": 15, "closed": 0}
        score += stage_pts.get(stage, 0)

        # Source quality
        source = lead.get("source", "")
        if "Facebook" in source:  score += 5
        if "Referral" in source:  score += 10

        # Intent
        intent = lead.get("intent", "") or ""
        if "build" in intent.lower() or "สร้าง" in intent:  score += 10
        if "buy"   in intent.lower() or "ซื้อ"  in intent:  score += 8

        score = max(0, min(100, score))

        # Update in DB
        sb.table("leads").update({"score": score}).eq("id", lead["id"]).execute()

        scored.append({
            "id":     lead["id"],
            "name":   lead.get("name"),
            "score":  score,
            "stage":  stage,
            "budget": budget_str,
            "urgency": urgency,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)

    hot_leads    = [l for l in scored if l["score"] >= 70]
    medium_leads = [l for l in scored if 40 <= l["score"] < 70]
    cold_leads   = [l for l in scored if l["score"] < 40]

    payload = {
        "total": len(scored),
        "hot": hot_leads,
        "medium": medium_leads,
        "cold": cold_leads,
        "score_distribution": {
            "hot_count":    len(hot_leads),
            "medium_count": len(medium_leads),
            "cold_count":   len(cold_leads),
        },
    }

    summary = (
        f"Lead ทั้งหมด {len(scored)} คน | "
        f"Hot {len(hot_leads)} | Medium {len(medium_leads)} | Cold {len(cold_leads)}"
    )

    _save_report("lead_scoring", payload, summary)
    print(f"[lead_scoring] ✓ {summary}")
    return payload


# ── 3. Content Suggestions ────────────────────────────────────────────────────
def run_content_suggestions() -> dict:
    """
    Analyze buyer_context_signals + post_performance → suggest top content angles.
    """
    signals = sb.table("buyer_context_signals").select("*").execute().data
    posts   = sb.table("content_posts").select(
        "topic, keyword, format, source_channel, engagement, impressions, conversion_rate"
    ).execute().data

    # --- Top performing post topics ---
    post_scores = []
    for p in posts:
        eng = float(p.get("engagement") or 0)
        imp = float(p.get("impressions") or 1)
        conv = float(p.get("conversion_rate") or 0)
        performance = (eng / imp * 100) + conv * 20 if imp > 0 else 0
        post_scores.append({
            "topic": p.get("topic"),
            "keyword": p.get("keyword"),
            "format": p.get("format"),
            "channel": p.get("source_channel"),
            "performance_score": round(performance, 2),
        })
    post_scores.sort(key=lambda x: x["performance_score"], reverse=True)

    # --- Angles from buyer signals ---
    angles_by_awareness = {}
    for sig in signals:
        level = sig.get("awareness_level", "unknown")
        if level not in angles_by_awareness:
            angles_by_awareness[level] = []
        angles_by_awareness[level].append({
            "angle":       sig.get("content_angle"),
            "hook":        sig.get("example_hook"),
            "channel":     sig.get("channel"),
            "trigger":     sig.get("trigger_type"),
            "emotion":     sig.get("emotional_need"),
            "engagement":  float(sig.get("engagement_rate") or 0),
        })

    # --- Generate suggestions ---
    suggestions = []

    # High-priority: most_aware + solution_aware with high engagement
    priority_levels = ["most_aware", "solution_aware", "problem_aware", "unaware"]
    for level in priority_levels:
        for sig in angles_by_awareness.get(level, [])[:3]:
            suggestions.append({
                "priority": "high" if level in ["most_aware", "solution_aware"] else "medium",
                "awareness_level": level,
                "angle": sig["angle"],
                "hook":  sig["hook"],
                "channel": sig["channel"],
                "format": "video" if sig["channel"] in ["facebook", "youtube"] else "post",
                "reason": f"Engagement signal: {sig['trigger']} | Emotion: {sig['emotion']}",
            })

    # Add top performing topics as suggestions
    for post in post_scores[:3]:
        if post["performance_score"] > 0:
            suggestions.append({
                "priority": "high",
                "awareness_level": "proven",
                "angle": f"Repeat: {post['topic']}",
                "hook": post["keyword"],
                "channel": post["channel"],
                "format": post["format"],
                "reason": f"Past performance score: {post['performance_score']}",
            })

    payload = {
        "suggestions": suggestions[:10],
        "top_posts": post_scores[:5],
        "angles_by_awareness": angles_by_awareness,
        "total_signals": len(signals),
    }

    summary = (
        f"แนะนำ {len(suggestions[:10])} content angles | "
        f"จาก {len(signals)} buyer signals + {len(posts)} posts"
    )

    _save_report("content_suggestions", payload, summary)
    print(f"[content_suggestions] ✓ {summary}")
    return payload


# ── 4. Sales Forecast ─────────────────────────────────────────────────────────
def run_sales_forecast() -> dict:
    """
    Project revenue from current lead pipeline + properties.
    Base: historical conversion rate × avg deal size × time horizon.
    """
    leads      = sb.table("leads").select("*").execute().data
    properties = sb.table("properties").select(
        "asking_price, sold_price, status, listed_at, sold_at, property_type"
    ).execute().data

    # --- Historical conversion ---
    total_leads = len(leads)
    closed      = [l for l in leads if l.get("stage") == "closed"]
    qualified   = [l for l in leads if l.get("stage") == "qualified"]
    contacted   = [l for l in leads if l.get("stage") == "contacted"]
    new_leads   = [l for l in leads if l.get("stage") == "new"]

    conversion_rate = len(closed) / total_leads if total_leads > 0 else 0.15  # default 15%

    # --- Avg deal size from sold properties ---
    sold_prices = [float(p["sold_price"]) for p in properties if p.get("sold_price") and float(p.get("sold_price") or 0) > 0]
    ask_prices  = [float(p["asking_price"]) for p in properties if p.get("asking_price") and float(p.get("asking_price") or 0) > 0]

    avg_sold  = sum(sold_prices) / len(sold_prices)   if sold_prices else 0
    avg_asked = sum(ask_prices)  / len(ask_prices)    if ask_prices  else 3_500_000  # fallback

    avg_deal = avg_sold if avg_sold > 0 else avg_asked

    # --- Pipeline value ---
    def _budget_or_avg(lead):
        b = _parse_budget(str(lead.get("budget") or ""))
        return b if b > 0 else avg_deal

    pipeline = {
        "qualified_value": sum(_budget_or_avg(l) for l in qualified),
        "contacted_value":  sum(_budget_or_avg(l) for l in contacted) * 0.3,
        "new_value":        sum(_budget_or_avg(l) for l in new_leads)  * 0.1,
    }
    total_pipeline = sum(pipeline.values())

    # --- 30 / 60 / 90 day forecast ---
    forecast = {
        "30_day": {
            "expected_closes": max(1, len(qualified)),
            "revenue_low":  round(len(qualified) * avg_deal * 0.5),
            "revenue_mid":  round(len(qualified) * avg_deal),
            "revenue_high": round((len(qualified) + len(contacted) * 0.3) * avg_deal * 1.1),
        },
        "60_day": {
            "expected_closes": max(1, len(qualified) + round(len(contacted) * 0.3)),
            "revenue_low":  round(total_pipeline * 0.3),
            "revenue_mid":  round(total_pipeline * 0.5),
            "revenue_high": round(total_pipeline * 0.7),
        },
        "90_day": {
            "expected_closes": round(total_leads * conversion_rate) + 1,
            "revenue_low":  round(total_pipeline * 0.4),
            "revenue_mid":  round(total_pipeline * 0.65),
            "revenue_high": round(total_pipeline * 0.85),
        },
    }

    payload = {
        "pipeline": {
            "total_leads":    total_leads,
            "by_stage": {
                "new":       len(new_leads),
                "contacted": len(contacted),
                "qualified": len(qualified),
                "closed":    len(closed),
            },
            "pipeline_value":  round(total_pipeline),
            "avg_deal_size":   round(avg_deal),
            "conversion_rate": round(conversion_rate * 100, 1),
        },
        "forecast": forecast,
    }

    summary = (
        f"Pipeline {total_leads} leads | มูลค่า ฿{total_pipeline:,.0f} | "
        f"90d forecast mid: ฿{forecast['90_day']['revenue_mid']:,.0f}"
    )

    _save_report("sales_forecast", payload, summary)
    print(f"[sales_forecast] ✓ {summary}")
    return payload


# ── Helpers ───────────────────────────────────────────────────────────────────
def _parse_budget(s: str) -> float:
    """Parse budget strings like '5.3M', '1,500,000', '2.5ล้าน'"""
    s = s.replace(",", "").replace(" ", "").upper()
    try:
        if "M" in s:
            return float(s.replace("M", "")) * 1_000_000
        if "ล้าน" in s or "ล" in s:
            return float(s.replace("ล้าน", "").replace("ล", "")) * 1_000_000
        if "K" in s:
            return float(s.replace("K", "")) * 1_000
        return float(s)
    except (ValueError, AttributeError):
        return 0.0


def _save_report(report_type: str, payload: dict, summary: str):
    sb.table("agent_reports").insert({
        "report_type":  report_type,
        "payload":      payload,
        "summary":      summary,
        "period_start": str(PERIOD_START),
        "period_end":   str(TODAY),
    }).execute()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Market Analyst Agent")
    parser.add_argument("--task", choices=["price", "leads", "content", "forecast", "all"],
                        default="all")
    args = parser.parse_args()

    print(f"\n🤖 Market Analyst Agent — {TODAY}\n{'─'*50}")

    task_map = {
        "price":    run_price_analysis,
        "leads":    run_lead_scoring,
        "content":  run_content_suggestions,
        "forecast": run_sales_forecast,
    }

    if args.task == "all":
        for name, fn in task_map.items():
            try:
                fn()
            except Exception as e:
                print(f"[{name}] ✗ Error: {e}")
    else:
        task_map[args.task]()

    print(f"\n✅ Done — reports saved to agent_reports table\n")


if __name__ == "__main__":
    main()
