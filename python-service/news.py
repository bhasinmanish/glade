"""
News fetcher using yfinance (free, no API key required).

Fetches recent headlines for a list of stock symbols and categorizes them
by type (earnings, FDA, M&A, analyst, regulatory, corporate, general).
Only returns articles published within `since_hours` hours.
"""

import asyncio
import datetime
from typing import Any

# ─── Keyword → category mapping ───────────────────────────────────────────────

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "news_earnings": [
        "earnings", "eps", "revenue", "profit", "loss", "quarterly", "annual results",
        "beat", "miss", "guidance", "outlook", "forecast", "sales", "income",
    ],
    "news_fda": [
        "fda", "food and drug", "approval", "approved", "rejected", "cleared",
        "clinical trial", "phase 2", "phase 3", "drug", "therapy", "nda", "bla",
    ],
    "news_ma": [
        "merger", "acquisition", "acquires", "acquired", "buyout", "takeover",
        "deal", "bought by", "purchase agreement", "to buy", "to acquire",
    ],
    "news_analyst": [
        "upgrade", "downgrade", "outperform", "underperform", "price target",
        "overweight", "underweight", "buy rating", "sell rating", "initiates",
        "reiterates", "analyst", "rating",
    ],
    "news_regulatory": [
        "sec", "investigation", "lawsuit", "settlement", "fine", "penalty",
        "violation", "probe", "subpoena", "bankruptcy", "chapter 11", "delisted",
        "fraud", "recall",
    ],
    "news_corporate": [
        "dividend", "split", "buyback", "share repurchase", "spinoff",
        "ipo", "secondary offering", "ceo", "cfo", "chief executive",
    ],
}

# Any headline containing one of these is considered important enough to alert
_IMPORTANCE_KEYWORDS = [
    kw for kws in _CATEGORY_KEYWORDS.values() for kw in kws
]


def _categorize(title: str) -> str:
    lower = title.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return category
    return "news_general"


def _is_important(title: str) -> bool:
    lower = title.lower()
    return any(kw in lower for kw in _IMPORTANCE_KEYWORDS)


def _fetch_one(symbol: str, since_hours: int) -> list[dict[str, Any]]:
    """Blocking call — intended to be run via asyncio.to_thread."""
    try:
        import yfinance as yf  # import here so missing package doesn't crash on startup
        ticker = yf.Ticker(symbol)
        news: list[dict] = ticker.news or []
        cutoff = datetime.datetime.utcnow().timestamp() - since_hours * 3600
        return [
            {
                "title":     n.get("title", ""),
                "publisher": n.get("publisher", ""),
                "link":      n.get("link", ""),
                "published": n.get("providerPublishTime", 0),
                "category":  _categorize(n.get("title", "")),
            }
            for n in news
            if n.get("providerPublishTime", 0) >= cutoff
            and _is_important(n.get("title", ""))
        ]
    except Exception:
        return []


async def fetch_news_for_symbols(
    symbols: list[str],
    since_hours: int = 4,
) -> dict[str, list[dict[str, Any]]]:
    """Fetch important recent news for multiple symbols concurrently."""
    tasks = [asyncio.to_thread(_fetch_one, sym, since_hours) for sym in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        sym: (res if isinstance(res, list) else [])
        for sym, res in zip(symbols, results)
    }
