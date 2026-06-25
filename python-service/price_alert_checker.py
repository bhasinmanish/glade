"""
Checks user-defined price alerts every 2 minutes during market hours.

Each price_alert row stores:
  - field      : TV screener field name (e.g. "close", "RSI")
  - condition  : "above" | "below" | "crosses_above" | "crosses_below"
  - value      : numeric threshold
  - symbol     : single stock (nullable)
  - watchlist_id: applies to every symbol in that watchlist (nullable)
  - trigger_mode: "once" (deactivate after first fire) | "every_time" (15-min cooldown)
  - symbol_states: jsonb — {symbol: last_checked_value} for crossing detection
"""

import asyncio
import datetime
import logging
import os
from typing import Any

import httpx
from supabase import create_client, Client

from email_sender import send_alert_email, get_notif_prefs, get_user_email

log = logging.getLogger(__name__)

TRADINGVIEW_URL = "https://scanner.tradingview.com/america/scan"
COOLDOWN_MINUTES = 15

# TV columns fetched for alert evaluation (same order matters)
_TV_COLS = [
    "name",                      # 0
    "close",                     # 1
    "change",                    # 2
    "gap",                       # 3
    "change_from_open",          # 4
    "volume",                    # 5
    "relative_volume_10d_calc",  # 6
    "RSI",                       # 7
]

_COL_INDEX = {col: i for i, col in enumerate(_TV_COLS)}

FIELD_LABELS = {
    "close":                    "Price",
    "change":                   "Day Change %",
    "gap":                      "Gap %",
    "change_from_open":         "Change from Open %",
    "volume":                   "Volume",
    "relative_volume_10d_calc": "RVOL",
    "RSI":                      "RSI",
}

CONDITION_LABELS = {
    "above":         "above",
    "below":         "below",
    "crosses_above": "crossed above",
    "crosses_below": "crossed below",
}


def _get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


async def _fetch_quotes(symbols: list[str]) -> dict[str, dict[str, float | None]]:
    """Return current field values for a batch of symbols from TradingView."""
    if not symbols:
        return {}

    payload: dict[str, Any] = {
        "filter":  [],
        "options": {"lang": "en"},
        "markets": ["america"],
        "symbols": {
            "query":   {"types": []},
            "tickers": symbols,
        },
        "columns": _TV_COLS,
        "sort":    {"sortBy": "name", "sortOrder": "asc"},
        "range":   [0, len(symbols) + 10],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(TRADINGVIEW_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        log.warning("TV quote fetch failed: %s", exc)
        return {}

    result: dict[str, dict[str, float | None]] = {}
    for item in data.get("data", []):
        d = item.get("d", [])
        raw_sym = (item.get("s") or "")
        sym = raw_sym.split(":")[-1]
        if not sym or len(d) < len(_TV_COLS):
            continue
        result[sym] = {col: d[i] for col, i in _COL_INDEX.items() if i > 0}
    return result


def _condition_met(
    condition: str,
    current: float,
    threshold: float,
    last_val: float | None,
) -> bool:
    if condition == "above":
        return current > threshold
    if condition == "below":
        return current < threshold
    if condition == "crosses_above":
        return current > threshold and (last_val is None or last_val <= threshold)
    if condition == "crosses_below":
        return current < threshold and (last_val is None or last_val >= threshold)
    return False


async def check_price_alerts() -> int:
    """Run all active price alerts and fire any that are triggered. Returns count fired."""
    db = _get_supabase()
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    # Per-run caches so we don't re-query Supabase for the same user repeatedly
    _notif_cache: dict[str, dict] = {}
    _email_cache: dict[str, str | None] = {}

    # Load active alerts with their watchlist symbols
    res = db.table("price_alerts") \
        .select("*, watchlists(symbols)") \
        .eq("is_active", True) \
        .execute()
    alerts: list[dict[str, Any]] = res.data or []

    if not alerts:
        return 0

    # Gather all symbols we need to quote
    symbols_needed: set[str] = set()
    for a in alerts:
        if a["symbol"]:
            symbols_needed.add(a["symbol"])
        wl = a.get("watchlists") or {}
        for sym in (wl.get("symbols") or []):
            symbols_needed.add(sym)

    if not symbols_needed:
        return 0

    quotes = await _fetch_quotes(list(symbols_needed))
    fired = 0

    for alert in alerts:
        # Determine which symbols this alert applies to
        if alert["symbol"]:
            targets = [alert["symbol"]]
        else:
            wl = alert.get("watchlists") or {}
            targets = wl.get("symbols") or []

        if not targets:
            continue

        field       = alert["field"]
        condition   = alert["condition"]
        threshold   = float(alert["value"])
        trigger     = alert.get("trigger_mode", "once")
        sym_states: dict[str, float | None] = alert.get("symbol_states") or {}
        alert_id    = alert["id"]
        user_id     = alert["user_id"]

        # Cooldown check for "every_time" alerts
        if trigger == "every_time" and alert.get("last_triggered_at"):
            last_t = datetime.datetime.fromisoformat(
                alert["last_triggered_at"].replace("Z", "+00:00")
            )
            if (now_utc - last_t).total_seconds() / 60 < COOLDOWN_MINUTES:
                continue

        deactivate = False

        for sym in targets:
            q = quotes.get(sym)
            if q is None:
                continue
            current = q.get(field)
            if current is None:
                continue

            last_val = sym_states.get(sym)

            if _condition_met(condition, current, threshold, last_val):
                field_lbl = FIELD_LABELS.get(field, field)
                cond_lbl  = CONDITION_LABELS.get(condition, condition)

                condition_str = f"{field_lbl} {cond_lbl} {threshold:g}"
                db.table("alerts").insert({
                    "user_id":       user_id,
                    "type":          "price_alert",
                    "symbol":        sym,
                    "condition":     condition_str,
                    "triggered_at":  now_utc.isoformat(),
                    "delivered_via": [],
                    "is_read":       False,
                }).execute()

                fired += 1
                if trigger == "once":
                    deactivate = True

                # ── Email notification ─────────────────────────────────────
                if user_id not in _notif_cache:
                    _notif_cache[user_id] = get_notif_prefs(db, user_id)
                prefs = _notif_cache[user_id]
                if prefs.get("email_enabled") and prefs.get("email_price_alerts", True):
                    if user_id not in _email_cache:
                        _email_cache[user_id] = get_user_email(db, user_id)
                    if _email_cache[user_id]:
                        await send_alert_email(
                            to=_email_cache[user_id],  # type: ignore[arg-type]
                            alert_type="price_alert",
                            symbol=sym,
                            condition=condition_str,
                        )

        # Update symbol_states with current values for next crossing check
        new_states = dict(sym_states)
        for sym in targets:
            q = quotes.get(sym)
            if q and field in q and q[field] is not None:
                new_states[sym] = q[field]  # type: ignore[assignment]

        update: dict[str, Any] = {"symbol_states": new_states}
        if deactivate:
            update["is_active"] = False
        if fired:
            update["last_triggered_at"] = now_utc.isoformat()

        db.table("price_alerts").update(update).eq("id", alert_id).execute()

    log.info("Price alert checker: %d alert(s) fired", fired)
    return fired
