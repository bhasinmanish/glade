"""
Market-wide news monitor — runs every 15 minutes independently of the scanner.

Covers:
  - Top 50 most active US stocks by volume (catches anything with a news catalyst)
  - Every stock in the user's watchlist(s)

Only fires alerts for HIGH-PRIORITY news types:
  news_earnings, news_fda, news_ma, news_analyst, news_regulatory

Scanner-specific alert types (scanner_entry, high_rvol, big_gap) are handled
by alert_triggers.py, not here.
"""

import os
import logging
import datetime
from typing import Any

import httpx
from supabase import create_client

from news import fetch_news_for_symbols
from alert_triggers import _db, _existing_keys, _make_alert
from email_sender import send_alert_email, get_notif_prefs, get_user_email

log = logging.getLogger(__name__)

# Only these categories are surfaced in the market monitor
HIGH_PRIORITY = {"news_earnings", "news_fda", "news_ma", "news_analyst", "news_regulatory"}

TRADINGVIEW_URL = "https://scanner.tradingview.com/america/scan"

# Broad scan: top 50 stocks by volume (gainers + losers combined)
_BROAD_GAINERS = {
    "filter": [
        {"left": "volume", "operation": "greater", "right": 1_000_000},
        {"left": "change", "operation": "greater", "right": 1},
    ],
    "columns": ["name"],
    "sort": {"sortBy": "volume", "sortOrder": "desc"},
    "range": [0, 25],
}

_BROAD_LOSERS = {
    "filter": [
        {"left": "volume", "operation": "greater", "right": 1_000_000},
        {"left": "change", "operation": "less", "right": -1},
    ],
    "columns": ["name"],
    "sort": {"sortBy": "volume", "sortOrder": "desc"},
    "range": [0, 25],
}


async def _broad_symbols() -> list[str]:
    """Return top 50 actively traded US stocks (gainers + losers)."""
    symbols: list[str] = []
    async with httpx.AsyncClient(timeout=12) as client:
        for payload in (_BROAD_GAINERS, _BROAD_LOSERS):
            try:
                resp = await client.post(TRADINGVIEW_URL, json=payload)
                resp.raise_for_status()
                for item in resp.json().get("data", []):
                    s = (item.get("s", "") or "").split(":")[-1]
                    if s and s not in symbols:
                        symbols.append(s)
            except Exception as exc:
                log.warning("Broad scan query failed: %s", exc)
    return symbols


def _watchlist_symbols(user_id: str) -> list[str]:
    """Return all symbols across the user's watchlists."""
    db = _db()
    result = (
        db.table("watchlists")
        .select("symbols")
        .eq("user_id", user_id)
        .execute()
    )
    symbols: list[str] = []
    for row in result.data or []:
        for sym in row.get("symbols") or []:
            if sym and sym not in symbols:
                symbols.append(sym)
    return symbols


async def run_market_monitor(user_ids: list[str]) -> None:
    """
    Main entry point called by the scheduler.

    Fetches news once for the combined symbol universe, then creates
    per-user alerts avoiding any already-fired today.
    """
    if not user_ids:
        return

    now = datetime.datetime.utcnow().isoformat()

    # ── 1. Build the symbol universe ─────────────────────────────────────────

    broad = await _broad_symbols()

    # Collect watchlist symbols across all users
    watchlist_by_user: dict[str, list[str]] = {}
    extra_symbols: list[str] = []
    for uid in user_ids:
        wl = _watchlist_symbols(uid)
        watchlist_by_user[uid] = wl
        for sym in wl:
            if sym not in broad and sym not in extra_symbols:
                extra_symbols.append(sym)

    all_symbols = broad + extra_symbols
    if not all_symbols:
        return

    log.info("Market monitor scanning %d symbols for %d user(s)", len(all_symbols), len(user_ids))

    # ── 2. Fetch news once for all symbols ────────────────────────────────────

    try:
        news_map = await fetch_news_for_symbols(all_symbols, since_hours=2)
    except Exception as exc:
        log.error("Market monitor news fetch failed: %s", exc)
        return

    # Flatten to (symbol, article) pairs that matter
    candidates: list[tuple[str, dict[str, Any]]] = []
    for sym, articles in news_map.items():
        for article in articles:
            if article.get("category") in HIGH_PRIORITY:
                candidates.append((sym, article))

    if not candidates:
        log.info("Market monitor: no high-priority news found")
        return

    log.info("Market monitor: %d high-priority news items found", len(candidates))

    # ── 3. Create per-user alerts ─────────────────────────────────────────────

    db = _db()

    for uid in user_ids:
        existing = _existing_keys(db, uid)
        new_alerts: list[dict[str, Any]] = []

        for sym, article in candidates:
            category  = article["category"]
            title     = article.get("title", "")
            publisher = article.get("publisher", "")

            key = (category, sym)
            if key not in existing:
                existing.add(key)
                condition = f"{publisher}: {title}" if publisher else title
                new_alerts.append(_make_alert(uid, category, sym, condition, now))

        if new_alerts:
            try:
                db.table("alerts").insert(new_alerts).execute()
                log.info(
                    "Market monitor: inserted %d alert(s) for user %s",
                    len(new_alerts), uid,
                )

                # ── Email notifications ────────────────────────────────────
                prefs = get_notif_prefs(db, uid)
                if prefs.get("email_enabled") and prefs.get("email_news", True):
                    user_email = get_user_email(db, uid)
                    if user_email:
                        for alert_row in new_alerts:
                            await send_alert_email(
                                to=user_email,
                                alert_type=alert_row["type"],
                                symbol=alert_row.get("symbol"),
                                condition=alert_row.get("condition"),
                            )

            except Exception as exc:
                log.error("Market monitor insert failed for %s: %s", uid, exc)
