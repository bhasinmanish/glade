"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, X, ChevronDown, ChevronRight, Pencil, Trash2, Check,
  Bell, BellOff, BellRing,
} from "lucide-react";
import type { Watchlist, PriceAlert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateAlertDialog, ALERT_FIELD_LABELS, CONDITION_SYMBOLS } from "@/components/alerts/CreateAlertDialog";

interface Props {
  watchlists: Watchlist[];
  userId: string;
  initialPriceAlerts: PriceAlert[];
}

export function WatchlistSidebar({ watchlists: initial, initialPriceAlerts }: Props) {
  const router = useRouter();

  // ── Watchlist state ────────────────────────────────────────────────────────
  const [watchlists, setWatchlists] = useState<Watchlist[]>(initial);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set(initial.map(w => w.id)));
  const [newSymbol,  setNewSymbol]  = useState<Record<string, string>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [creating,      setCreating]   = useState(false);
  const [newListName,   setNewListName] = useState("");
  const [renamingId,    setRenamingId]  = useState<string | null>(null);
  const [renameValue,   setRenameValue] = useState("");

  // ── Price alert state ──────────────────────────────────────────────────────
  const [priceAlerts, setPriceAlerts]   = useState<PriceAlert[]>(initialPriceAlerts);
  const [alertsOpen,  setAlertsOpen]    = useState(true);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDefaultSymbol,    setAlertDefaultSymbol]    = useState<string | undefined>();
  const [alertDefaultWatchlist, setAlertDefaultWatchlist] = useState<string | undefined>();

  // ── Watchlist helpers ──────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectSymbol(symbol: string) {
    setSelectedSymbol(symbol);
    router.push(`/charts?symbol=${symbol}`);
  }

  async function createWatchlist() {
    const name = newListName.trim();
    if (!name) { setCreating(false); return; }
    const res = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, symbols: [] }),
    });
    if (res.ok) {
      const wl = await res.json() as Watchlist;
      setWatchlists(prev => [...prev, wl]);
      setExpanded(prev => { const next = new Set(prev); next.add(wl.id); return next; });
    }
    setNewListName("");
    setCreating(false);
  }

  async function deleteWatchlist(id: string) {
    const res = await fetch(`/api/watchlists?id=${id}`, { method: "DELETE" });
    if (res.ok) setWatchlists(prev => prev.filter(w => w.id !== id));
  }

  async function renameWatchlist(id: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    const res = await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (res.ok) setWatchlists(prev => prev.map(w => w.id === id ? { ...w, name } : w));
  }

  async function addSymbol(watchlistId: string) {
    const symbol = (newSymbol[watchlistId] ?? "").trim().toUpperCase();
    if (!symbol) return;
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (!watchlist || watchlist.symbols.includes(symbol)) return;
    const updated = [...watchlist.symbols, symbol];
    const res = await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: watchlistId, symbols: updated }),
    });
    if (res.ok) {
      setWatchlists(wls => wls.map(w => w.id === watchlistId ? { ...w, symbols: updated } : w));
      setNewSymbol(prev => ({ ...prev, [watchlistId]: "" }));
    }
  }

  async function removeSymbol(watchlistId: string, symbol: string) {
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (!watchlist) return;
    const updated = watchlist.symbols.filter(s => s !== symbol);
    const res = await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: watchlistId, symbols: updated }),
    });
    if (res.ok) setWatchlists(wls => wls.map(w => w.id === watchlistId ? { ...w, symbols: updated } : w));
  }

  // ── Price alert helpers ────────────────────────────────────────────────────

  function openAlertDialog(symbol?: string, watchlistId?: string) {
    setAlertDefaultSymbol(symbol);
    setAlertDefaultWatchlist(watchlistId);
    setAlertDialogOpen(true);
  }

  async function togglePriceAlert(id: string, isActive: boolean) {
    const res = await fetch("/api/price-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    if (res.ok) setPriceAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
  }

  async function deletePriceAlert(id: string) {
    const res = await fetch(`/api/price-alerts?id=${id}`, { method: "DELETE" });
    if (res.ok) setPriceAlerts(prev => prev.filter(a => a.id !== id));
  }

  function describeAlert(alert: PriceAlert): string {
    const target = alert.symbol
      ?? watchlists.find(w => w.id === alert.watchlist_id)?.name
      ?? "?";
    const field  = ALERT_FIELD_LABELS[alert.field] ?? alert.field;
    const sym    = CONDITION_SYMBOLS[alert.condition] ?? alert.condition;
    return `${target}: ${field} ${sym} ${alert.value}`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="w-60 border-r border-border flex flex-col shrink-0">

        {/* ── Watchlists header ──────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Watchlists
          </span>
          <button
            onClick={() => { setCreating(true); setNewListName(""); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="New watchlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-2">

            {/* Inline new-watchlist form */}
            {creating && (
              <div className="px-3 py-2 flex items-center gap-1.5">
                <Input
                  autoFocus
                  placeholder="Watchlist name…"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") createWatchlist();
                    if (e.key === "Escape") { setCreating(false); setNewListName(""); }
                  }}
                  className="h-7 text-xs flex-1"
                />
                <button onClick={createWatchlist} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => { setCreating(false); setNewListName(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* ── Watchlist rows ─────────────────────────────────────────── */}
            {watchlists.map(wl => (
              <div key={wl.id}>
                {/* Header row */}
                <div className="group flex items-center gap-1 px-3 py-2 hover:bg-accent/50 transition-colors">
                  <button
                    onClick={() => toggleExpand(wl.id)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    {expanded.has(wl.id)
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    }
                    {renamingId === wl.id ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") renameWatchlist(wl.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => renameWatchlist(wl.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-5 text-xs px-1 py-0 border-primary/50"
                      />
                    ) : (
                      <span className="text-sm font-medium truncate">{wl.name}</span>
                    )}
                  </button>

                  {renamingId !== wl.id && (
                    <>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {wl.symbols.length}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingId(wl.id); setRenameValue(wl.name); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                        title="Rename watchlist"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openAlertDialog(undefined, wl.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        title="Create alert for this watchlist"
                      >
                        <Bell className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-loss shrink-0"
                        title="Delete watchlist"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Symbol list */}
                {expanded.has(wl.id) && (
                  <div className="pb-1">
                    {wl.symbols.length === 0 && (
                      <p className="px-9 py-1 text-xs text-muted-foreground italic">No symbols yet</p>
                    )}
                    {wl.symbols.map(sym => (
                      <div
                        key={sym}
                        onClick={() => selectSymbol(sym)}
                        className={cn(
                          "group/sym flex items-center justify-between px-9 py-1.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors",
                          selectedSymbol === sym && "bg-accent text-foreground"
                        )}
                      >
                        <span className="font-mono font-medium">{sym}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover/sym:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); openAlertDialog(sym); }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title={`Create alert for ${sym}`}
                          >
                            <Bell className="h-3 w-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); removeSymbol(wl.id, sym); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add ticker */}
                    <div className="flex gap-1 px-4 mt-1.5 mb-1">
                      <Input
                        placeholder="Add ticker…"
                        value={newSymbol[wl.id] ?? ""}
                        onChange={e => setNewSymbol(prev => ({ ...prev, [wl.id]: e.target.value.toUpperCase() }))}
                        onKeyDown={e => e.key === "Enter" && addSymbol(wl.id)}
                        className="h-7 text-xs"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => addSymbol(wl.id)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {watchlists.length === 0 && !creating && (
              <p className="px-4 py-4 text-xs text-muted-foreground text-center leading-relaxed">
                No watchlists yet.<br />Click the + above to create one.
              </p>
            )}

            {/* ── Price Alerts section ───────────────────────────────────── */}
            <div className="mt-2 border-t border-border">
              <div className="flex items-center justify-between px-4 py-2.5">
                <button
                  onClick={() => setAlertsOpen(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {alertsOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />
                  }
                  Price Alerts
                  {priceAlerts.filter(a => a.is_active).length > 0 && (
                    <span className="ml-1 text-[10px] bg-primary/20 text-primary rounded-full px-1.5 font-medium normal-case tracking-normal">
                      {priceAlerts.filter(a => a.is_active).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => openAlertDialog()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Create new alert"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {alertsOpen && (
                <div className="pb-2 space-y-1 px-3">
                  {priceAlerts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3 italic">
                      No alerts yet.<br />Click + or hover a stock to create one.
                    </p>
                  )}
                  {priceAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "group/alert flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                        alert.is_active ? "bg-primary/5 border border-primary/20" : "bg-muted/20 border border-border opacity-60"
                      )}
                    >
                      {alert.is_active
                        ? <BellRing className="h-3 w-3 text-primary shrink-0" />
                        : <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />
                      }
                      <span className="flex-1 min-w-0 truncate text-[11px]" title={describeAlert(alert)}>
                        {describeAlert(alert)}
                      </span>
                      <button
                        onClick={() => togglePriceAlert(alert.id, alert.is_active)}
                        className="opacity-0 group-hover/alert:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                        title={alert.is_active ? "Pause alert" : "Resume alert"}
                      >
                        {alert.is_active ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => deletePriceAlert(alert.id)}
                        className="opacity-0 group-hover/alert:opacity-100 transition-opacity text-muted-foreground hover:text-loss shrink-0"
                        title="Delete alert"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* Alert creation dialog — rendered outside scroll area */}
      <CreateAlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        onCreated={alert => setPriceAlerts(prev => [alert, ...prev])}
        watchlists={watchlists}
        defaultSymbol={alertDefaultSymbol}
        defaultWatchlistId={alertDefaultWatchlist}
      />
    </>
  );
}
