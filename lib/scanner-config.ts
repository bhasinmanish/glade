// ─── Filter & Column configuration for the Scanner ────────────────────────────

export interface FilterRule {
  id: string;
  field: string;
  op: string;
  value: number;
}

export interface ScannerPreset {
  id: string;
  name: string;
  filters: FilterRule[];
  columns: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  pageSize: number;
}

export interface ColumnDef {
  key: string;
  label: string;
  tvField: string | null;
  always?: boolean;
  format: "symbol" | "price" | "percent" | "multiple" | "volume" | "market_cap" | "number" | "text" | "badge";
  align?: "left" | "right";
}

// ─── Filterable fields (maps to TradingView scanner field names) ───────────────

export const FILTER_FIELDS = [
  // Price & Volume
  { key: "close",                     label: "Price ($)",            category: "Price & Volume" },
  { key: "change",                    label: "Change %",             category: "Price & Volume" },
  { key: "gap",                       label: "Gap %",                category: "Price & Volume" },
  { key: "change_from_open",          label: "Change from Open %",   category: "Price & Volume" },
  { key: "volume",                    label: "Volume",               category: "Price & Volume" },
  { key: "average_volume_10d_calc",   label: "Avg Volume (10d)",     category: "Price & Volume" },
  { key: "relative_volume_10d_calc",  label: "Rel. Volume (RVOL)",   category: "Price & Volume" },
  // Performance
  { key: "Perf.1W",                   label: "1-Week Return %",      category: "Performance" },
  { key: "Perf.1M",                   label: "1-Month Return %",     category: "Performance" },
  { key: "Perf.3M",                   label: "3-Month Return %",     category: "Performance" },
  { key: "Perf.52W",                  label: "52-Week Return %",     category: "Performance" },
  // Volatility
  { key: "ATR",                       label: "ATR",                  category: "Volatility" },
  { key: "beta_1_year",               label: "Beta (1Y)",            category: "Volatility" },
  // Technical
  { key: "RSI",                       label: "RSI (14)",             category: "Technical" },
  { key: "short_ratio",               label: "Short Ratio (days)",   category: "Technical" },
  // Fundamentals
  { key: "market_cap_basic",          label: "Market Cap ($)",       category: "Fundamentals" },
  { key: "float_shares_outstanding",  label: "Float Shares",         category: "Fundamentals" },
  { key: "EPS_diluted_TTM",           label: "EPS (TTM)",            category: "Fundamentals" },
  { key: "P/E",                       label: "P/E Ratio",            category: "Fundamentals" },
  { key: "return_on_equity",          label: "ROE %",                category: "Fundamentals" },
  { key: "debt_to_equity",            label: "Debt/Equity",          category: "Fundamentals" },
  { key: "gross_margin",              label: "Gross Margin %",       category: "Fundamentals" },
  { key: "net_margin",                label: "Net Margin %",         category: "Fundamentals" },
  { key: "revenue_growth_1y",         label: "Revenue Growth (1Y) %", category: "Fundamentals" },
] as const;

// ─── Filter operators ─────────────────────────────────────────────────────────

export const OPERATORS = [
  { key: "greater",          label: ">" },
  { key: "greater_or_equal", label: ">=" },
  { key: "less",             label: "<" },
  { key: "less_or_equal",    label: "<=" },
  { key: "equal",            label: "=" },
  { key: "not_equal",        label: "≠" },
] as const;

// ─── Display columns ──────────────────────────────────────────────────────────

export const ALL_COLUMNS: ColumnDef[] = [
  // Always shown
  { key: "symbol",           label: "Symbol",       tvField: null,                        always: true, format: "symbol",     align: "left"  },
  // Price & Volume
  { key: "price",            label: "Price",        tvField: "close",                     format: "price",      align: "right" },
  { key: "change_pct",       label: "Chg %",        tvField: "change",                    format: "percent",    align: "right" },
  { key: "gap_pct",          label: "Gap %",        tvField: "gap",                       format: "percent",    align: "right" },
  { key: "change_from_open", label: "Chg/Open %",   tvField: "change_from_open",          format: "percent",    align: "right" },
  { key: "rvol",             label: "RVOL",         tvField: "relative_volume_10d_calc",  format: "multiple",   align: "right" },
  { key: "volume",           label: "Volume",       tvField: "volume",                    format: "volume",     align: "right" },
  { key: "avg_volume",       label: "Avg Vol",      tvField: "average_volume_10d_calc",   format: "volume",     align: "right" },
  { key: "atr",              label: "ATR",          tvField: "ATR",                       format: "price",      align: "right" },
  // Performance
  { key: "perf_1w",          label: "1W Ret %",     tvField: "Perf.1W",                   format: "percent",    align: "right" },
  { key: "perf_1m",          label: "1M Ret %",     tvField: "Perf.1M",                   format: "percent",    align: "right" },
  // Technicals
  { key: "rsi",              label: "RSI",          tvField: "RSI",                       format: "number",     align: "right" },
  { key: "beta",             label: "Beta",         tvField: "beta_1_year",               format: "number",     align: "right" },
  { key: "short_ratio",      label: "Short Ratio",  tvField: "short_ratio",               format: "number",     align: "right" },
  // Fundamentals
  { key: "market_cap",       label: "Mkt Cap",      tvField: "market_cap_basic",          format: "market_cap", align: "right" },
  { key: "float_shares",     label: "Float",        tvField: "float_shares_outstanding",  format: "volume",     align: "right" },
  { key: "eps",              label: "EPS",          tvField: "EPS_diluted_TTM",           format: "price",      align: "right" },
  { key: "pe",               label: "P/E",          tvField: "P/E",                       format: "number",     align: "right" },
  { key: "roe",              label: "ROE %",        tvField: "return_on_equity",          format: "percent",    align: "right" },
  { key: "debt_equity",      label: "D/E",          tvField: "debt_to_equity",            format: "number",     align: "right" },
  { key: "gross_margin",     label: "Gross Mg %",   tvField: "gross_margin",              format: "percent",    align: "right" },
  { key: "net_margin",       label: "Net Mg %",     tvField: "net_margin",                format: "percent",    align: "right" },
  // Other
  { key: "sector",           label: "Sector",       tvField: "sector",                    format: "text",       align: "left"  },
  { key: "catalyst_tag",     label: "Catalyst",     tvField: null,                        format: "badge",      align: "left"  },
];

// ─── Column preset groups ─────────────────────────────────────────────────────

export const COLUMN_PRESETS: Record<string, { label: string; columns: string[] }> = {
  default: {
    label: "Default",
    columns: ["price", "change_pct", "gap_pct", "rvol", "atr", "sector", "catalyst_tag"],
  },
  technical: {
    label: "Technical",
    columns: ["price", "change_pct", "gap_pct", "rvol", "atr", "volume", "rsi", "beta", "short_ratio"],
  },
  fundamentals: {
    label: "Fundamentals",
    columns: ["price", "market_cap", "float_shares", "eps", "pe", "roe", "debt_equity", "gross_margin", "net_margin", "sector"],
  },
  all: {
    label: "All",
    columns: ALL_COLUMNS.filter(c => !c.always).map(c => c.key),
  },
};

// ─── Page size options ────────────────────────────────────────────────────────

export const PAGE_SIZES = [25, 50, 100, 250, 500] as const;

// ─── Built-in preset scanners (stable IDs required to avoid hydration mismatch) ─

export const DEFAULT_PRESETS: ScannerPreset[] = [
  {
    id: "gap-momentum",
    name: "Gap & Momentum",
    filters: [
      { id: "gm-f1", field: "gap", op: "greater", value: 3 },
      { id: "gm-f2", field: "average_volume_10d_calc", op: "greater", value: 500000 },
      { id: "gm-f3", field: "ATR", op: "greater", value: 0.5 },
    ],
    columns: COLUMN_PRESETS.default.columns,
    sortBy: "relative_volume_10d_calc",
    sortOrder: "desc",
    pageSize: 50,
  },
  {
    id: "high-vol-movers",
    name: "High Vol Movers",
    filters: [
      { id: "hv-f1", field: "relative_volume_10d_calc", op: "greater", value: 2 },
      { id: "hv-f2", field: "change", op: "greater", value: 2 },
      { id: "hv-f3", field: "average_volume_10d_calc", op: "greater", value: 1000000 },
    ],
    columns: COLUMN_PRESETS.technical.columns,
    sortBy: "relative_volume_10d_calc",
    sortOrder: "desc",
    pageSize: 50,
  },
  {
    id: "value-stocks",
    name: "Value Stocks",
    filters: [
      { id: "vs-f1", field: "P/E", op: "less", value: 20 },
      { id: "vs-f2", field: "P/E", op: "greater", value: 0 },
      { id: "vs-f3", field: "return_on_equity", op: "greater", value: 15 },
      { id: "vs-f4", field: "debt_to_equity", op: "less", value: 0.5 },
    ],
    columns: COLUMN_PRESETS.fundamentals.columns,
    sortBy: "return_on_equity",
    sortOrder: "desc",
    pageSize: 50,
  },
];
