export type WidgetKey =
  | "top-setups"
  | "alerts"
  | "trade-log"
  | "daily-review"
  | "ideas"
  | "watchlists";

export interface DashboardPrefs {
  cols: 2 | 3;
  widgetOrder: WidgetKey[];
}

export const DEFAULT_PREFS: DashboardPrefs = {
  cols: 3,
  widgetOrder: ["top-setups", "alerts", "trade-log", "daily-review", "ideas", "watchlists"],
};

const STORAGE_KEY = "glade:dashboard_prefs";
export const PREFS_EVENT = "glade:prefs_updated";

export function loadPrefs(): DashboardPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    return {
      cols: parsed.cols ?? DEFAULT_PREFS.cols,
      widgetOrder: parsed.widgetOrder ?? DEFAULT_PREFS.widgetOrder,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: DashboardPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(PREFS_EVENT));
}
