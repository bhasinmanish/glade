"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  alerts: Alert[];
  userId: string;
}

// ─── Alert metadata ───────────────────────────────────────────────────────────

const ALERT_META: Record<string, { label: string; dot: string; section: "news" | "scanner" | "price" }> = {
  // Market-wide news (top section)
  news_earnings:   { label: "Earnings",    dot: "bg-purple-400", section: "news"    },
  news_fda:        { label: "FDA",          dot: "bg-pink-400",   section: "news"    },
  news_ma:         { label: "M&A",          dot: "bg-green-400",  section: "news"    },
  news_analyst:    { label: "Analyst",      dot: "bg-cyan-400",   section: "news"    },
  news_regulatory: { label: "Regulatory",   dot: "bg-red-400",    section: "news"    },
  news_corporate:  { label: "Corporate",    dot: "bg-indigo-400", section: "news"    },
  news_general:    { label: "News",         dot: "bg-gray-400",   section: "news"    },
  // Scanner-specific (bottom section)
  scanner_entry:   { label: "Scanner",      dot: "bg-blue-400",   section: "scanner" },
  high_rvol:       { label: "High RVOL",    dot: "bg-orange-400", section: "scanner" },
  big_gap:         { label: "Big Gap",      dot: "bg-yellow-400", section: "scanner" },
  // User-defined price alerts
  price_alert:     { label: "Price Alert",  dot: "bg-primary",    section: "price"   },
};

function getMeta(type: string) {
  return ALERT_META[type] ?? { label: type, dot: "bg-gray-400", section: "news" as const };
}

// ─── Single alert row ─────────────────────────────────────────────────────────

function AlertRow({ a }: { a: Alert }) {
  const meta = getMeta(a.type);
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border",
        !a.is_read && "border-primary/30 bg-primary/5"
      )}
    >
      <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", meta.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {meta.label}
          </Badge>
          {a.symbol && (
            <span className="font-semibold text-sm">{a.symbol}</span>
          )}
        </div>
        {a.condition && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {a.condition}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] text-muted-foreground">{count}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertFeed({ alerts: initial, userId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initial);

  // Real-time: new alerts appear instantly without refresh
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  }

  // ── Split into sections ────────────────────────────────────────────────────

  const newsAlerts    = alerts.filter(a => getMeta(a.type).section === "news");
  const scannerAlerts = alerts.filter(a => getMeta(a.type).section === "scanner");
  const priceAlerts   = alerts.filter(a => getMeta(a.type).section === "price");
  const unread = alerts.filter(a => !a.is_read).length;

  // ── Empty state ────────────────────────────────────────────────────────────

  if (alerts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Alert Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <BellOff className="h-6 w-6" />
          <p className="text-sm">No alerts yet</p>
          <p className="text-xs text-center max-w-[200px]">
            Market news (M&A, earnings, FDA) and scanner alerts will appear here automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Feed ───────────────────────────────────────────────────────────────────

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alert Feed
          </span>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Badge variant="secondary">{unread} new</Badge>
            )}
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">

            {/* ── Breaking News ─────────────────────────────────────────── */}
            {newsAlerts.length > 0 && (
              <>
                <SectionHeader label="Breaking News" count={newsAlerts.length} />
                {newsAlerts.map(a => <AlertRow key={a.id} a={a} />)}
              </>
            )}

            {/* ── Scanner Alerts ────────────────────────────────────────── */}
            {scannerAlerts.length > 0 && (
              <>
                <SectionHeader label="Your Scanner" count={scannerAlerts.length} />
                {scannerAlerts.map(a => <AlertRow key={a.id} a={a} />)}
              </>
            )}

            {/* ── Price Alerts (user-defined) ───────────────────────────── */}
            {priceAlerts.length > 0 && (
              <>
                <SectionHeader label="Your Alerts" count={priceAlerts.length} />
                {priceAlerts.map(a => <AlertRow key={a.id} a={a} />)}
              </>
            )}

          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
