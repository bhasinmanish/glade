import { createClient } from "@/lib/supabase/server";
import { DashboardHub } from "@/components/dashboard/DashboardHub";
import type { Alert, DailySummary, ScanResult, Trade, TradeIdea, Watchlist } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: scanResults },
    { data: alerts },
    { data: trades },
    { data: dailySummary },
    { data: tradeIdeas },
    { data: watchlists },
  ] = await Promise.all([
    supabase
      .from("scan_results")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", today)
      .order("rvol", { ascending: false })
      .limit(5),
    supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_read", false)
      .order("triggered_at", { ascending: false })
      .limit(5),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", user!.id)
      .order("entry_date", { ascending: false }),
    supabase
      .from("daily_summaries")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("trade_ideas")
      .select("*")
      .eq("user_id", user!.id)
      .in("status", ["watching", "active"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("watchlists")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <DashboardHub
      scanResults={(scanResults as ScanResult[]) ?? []}
      alerts={(alerts as Alert[]) ?? []}
      trades={(trades as Trade[]) ?? []}
      dailySummary={dailySummary as DailySummary | null}
      tradeIdeas={(tradeIdeas as TradeIdea[]) ?? []}
      watchlists={(watchlists as Watchlist[]) ?? []}
      userId={user!.id}
    />
  );
}
