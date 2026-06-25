"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Watchlist, PriceAlert } from "@/lib/types";

// ─── Field / condition config ─────────────────────────────────────────────────

export const ALERT_FIELDS = [
  { key: "close",                    label: "Price ($)" },
  { key: "change",                   label: "Day Change %" },
  { key: "gap",                      label: "Gap %" },
  { key: "change_from_open",         label: "Change from Open %" },
  { key: "relative_volume_10d_calc", label: "RVOL" },
  { key: "volume",                   label: "Volume" },
  { key: "RSI",                      label: "RSI (14)" },
] as const;

export const ALERT_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  ALERT_FIELDS.map(f => [f.key, f.label])
);

const CONDITIONS = [
  { key: "crosses_above", label: "Crosses Above" },
  { key: "crosses_below", label: "Crosses Below" },
  { key: "above",         label: "Is Above" },
  { key: "below",         label: "Is Below" },
] as const;

export const CONDITION_SYMBOLS: Record<string, string> = {
  above:         ">",
  below:         "<",
  crosses_above: "↑",
  crosses_below: "↓",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (alert: PriceAlert) => void;
  watchlists: Watchlist[];
  defaultSymbol?: string;
  defaultWatchlistId?: string;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function CreateAlertDialog({
  open, onClose, onCreated, watchlists, defaultSymbol, defaultWatchlistId,
}: Props) {
  const [targetMode, setTargetMode] = useState<"symbol" | "watchlist">(
    defaultWatchlistId ? "watchlist" : "symbol"
  );
  const [symbol,      setSymbol]      = useState(defaultSymbol ?? "");
  const [watchlistId, setWatchlistId] = useState(defaultWatchlistId ?? (watchlists[0]?.id ?? ""));
  const [field,       setField]       = useState("close");
  const [condition,   setCondition]   = useState("crosses_above");
  const [value,       setValue]       = useState("");
  const [triggerMode, setTriggerMode] = useState<"once" | "every_time">("once");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  function reset() {
    setTargetMode(defaultWatchlistId ? "watchlist" : "symbol");
    setSymbol(defaultSymbol ?? "");
    setWatchlistId(defaultWatchlistId ?? (watchlists[0]?.id ?? ""));
    setField("close");
    setCondition("crosses_above");
    setValue("");
    setTriggerMode("once");
    setError("");
  }

  async function submit() {
    const v = parseFloat(value);
    if (!value || isNaN(v)) { setError("Enter a valid threshold value."); return; }
    if (targetMode === "symbol" && !symbol.trim()) { setError("Enter a symbol."); return; }
    if (targetMode === "watchlist" && !watchlistId) { setError("Select a watchlist."); return; }

    const fieldLabel = ALERT_FIELD_LABELS[field] ?? field;
    const condLabel  = CONDITIONS.find(c => c.key === condition)?.label ?? condition;
    const sym        = targetMode === "symbol" ? symbol.toUpperCase().trim() : null;
    const wlName     = watchlists.find(w => w.id === watchlistId)?.name;
    const autoName   = `${sym ?? wlName} — ${fieldLabel} ${condLabel} ${v}`;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         autoName,
          symbol:       sym,
          watchlist_id: targetMode === "watchlist" ? watchlistId : null,
          field,
          condition,
          value:        v,
          trigger_mode: triggerMode,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const alert = await res.json() as PriceAlert;
      onCreated(alert);
      reset();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Alert
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {/* Target type toggle */}
          <div className="space-y-1.5">
            <Label>Target</Label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              {(["symbol", "watchlist"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMode(m)}
                  className={cn(
                    "flex-1 text-sm transition-colors",
                    targetMode === m
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "symbol" ? "Single Stock" : "Watchlist"}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol or watchlist picker */}
          {targetMode === "symbol" ? (
            <div className="space-y-1.5">
              <Label htmlFor="alert-symbol">Symbol</Label>
              <Input
                id="alert-symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                className="font-mono"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Watchlist</Label>
              {watchlists.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No watchlists yet — create one first.
                </p>
              ) : (
                <Select value={watchlistId} onValueChange={setWatchlistId}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {watchlists.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Condition */}
          <div className="space-y-1.5">
            <Label>When</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_FIELDS.map(f => (
                    <SelectItem key={f.key} value={f.key} className="text-sm">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => (
                    <SelectItem key={c.key} value={c.key} className="text-sm">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              step="any"
              placeholder="Threshold value"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="h-9 font-mono"
            />
          </div>

          {/* Trigger mode */}
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              {([["once", "Once Only"], ["every_time", "Every Time"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTriggerMode(m)}
                  className={cn(
                    "flex-1 text-sm transition-colors",
                    triggerMode === m
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {triggerMode === "every_time" && (
              <p className="text-[11px] text-muted-foreground">
                Re-fires at most every 15 min while condition holds.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
