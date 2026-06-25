"""
Alert trigger logic — runs after each scanner sweep.

Fires in-app alerts for:
  - scanner_entry   : stock newly appears in today's scan results
  - high_rvol       : relative volume >= RVOL_THRESHOLD (5×)
  - big_gap         : |gap%| >= GAP_THRESHOLD (6%)
  - news_earnings   : earnings / EPS headline in last 4 h
  - news_fda        : FDA decision headline
  - news_ma         : merger / acquisition headline
  - news_analyst    : analyst upgrade / downgrade
  - news_regulatory : SEC / lawsuit / bankruptcy headline
  - news_corporate  : dividend / split / buyback headline
  - news_general    : other important headline

Deduplication: one alert per (user_id, type, symbol) per calendar day.
"""

import os
import datetime
import logging
from typing import Any

from supabase import create_client
from news import fetch_news_for_symbols

log = logging.getLogger(__name__)

# ─── Thresholds ───────────────────────────────────────────────────────────────

RVOL_THRESHOLD   = 5.0   # × relative volume
GAP_THRESHOLD    = 6.0   # % gap (absolute)
NEWS_SCAN_LIMIT  = 12    # max symbols to check for news per sweep


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _db():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _existing_keys(db, user_id: str) -> set[tuple[str, str]]:
    """Return (type, symbol) pairs already alerted today."""
    today = datetime.date.today().isoformat()
    result = (
        db.table("alerts")
        .select("type,symbol")
        .eq("user_id", user_id)
        .gte("triggered_at", today)
        .execute()
    )
    return {(a["type"], a.get("symbol") or "") for a in result.data or []}


def _make_alert(
    user_id: str,
    alert_type: str,
    symbol: str,
    condition: str,
    now: str,
) -> dict[str, Any]:
    return {
        "user_id":      user_id,
        "type":         alert_type,
        "symbol":       symbol,
        "condition":    condition[:280],   # guard against very long strings
        "triggered_at": now,
        "delivered_via": [],
        "is_read":      False,
    }


# ─── Main trigger function ────────────────────────────────────────────────────

async def check_and_fire_alerts(
    user_id: str,
    rows: list[dict[str, Any]],
) -> int:
    """
    Evaluate rows from a completed scan and insert any new alerts.
    Returns the number of alerts created.
    """
    if not rows:
        return 0

    db = _db()
    now = datetime.datetime.utcnow().isoformat()
    existing = _existing_keys(db, user_id)
    new_alerts: list[dict[str, Any]] = []

    # ── Price / volume condition alerts ───────────────────────────────────────

    for row in rows:
        symbol  = row.get("symbol", "")
        gap     = row.get("gap_pct",  0) or 0
        rvol    = row.get("rvol",     0) or 0
        price   = row.get("price",    0) or 0

        if not symbol:
            continue

        # Scanner entry — first time this stock appears today
        key = ("scanner_entry", symbol)
        if key not in existing:
            existing.add(key)
            new_alerts.append(_make_alert(
                user_id, "scanner_entry", symbol,
                f"Gap {gap:+.1f}%  ·  RVOL {rvol:.1f}×  ·  ${price:.2f}",
                now,
            ))

        # Unusual volume
        if rvol >= RVOL_THRESHOLD:
            key = ("high_rvol", symbol)
            if key not in existing:
                existing.add(key)
                new_alerts.append(_make_alert(
                    user_id, "high_rvol", symbol,
                    f"Relative volume {rvol:.1f}× — unusually heavy trading activity",
                    now,
                ))

        # Large gap
        if abs(gap) >= GAP_THRESHOLD:
            key = ("big_gap", symbol)
            if key not in existing:
                existing.add(key)
                direction = "up" if gap > 0 else "down"
                new_alerts.append(_make_alert(
                    user_id, "big_gap", symbol,
                    f"Gap {gap:+.1f}% — significant pre-market move {direction}",
                    now,
                ))

    # ── News alerts ───────────────────────────────────────────────────────────

    top_symbols = [
        r["symbol"]
        for r in sorted(rows, key=lambda x: x.get("rvol", 0) or 0, reverse=True)
        if r.get("symbol")
    ][:NEWS_SCAN_LIMIT]

    try:
        news_map = await fetch_news_for_symbols(top_symbols, since_hours=4)
    except Exception as exc:
        log.warning("News fetch failed: %s", exc)
        news_map = {}

    for symbol, articles in news_map.items():
        for article in articles:
            category  = article.get("category", "news_general")
            title     = article.get("title", "")
            publisher = article.get("publisher", "")

            key = (category, symbol)
            if key not in existing:
                existing.add(key)
                condition = f"{publisher}: {title}" if publisher else title
                new_alerts.append(_make_alert(user_id, category, symbol, condition, now))

    # ── Bulk insert ───────────────────────────────────────────────────────────

    if new_alerts:
        try:
            db.table("alerts").insert(new_alerts).execute()
            log.info("Inserted %d alert(s) for user %s", len(new_alerts), user_id)
        except Exception as exc:
            log.error("Failed to insert alerts: %s", exc)
            return 0

    return len(new_alerts)
