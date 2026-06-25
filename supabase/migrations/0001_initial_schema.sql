-- ============================================================
-- Glade — Initial Schema
-- All tables include user_id (FK to auth.users) for multi-user
-- isolation via Supabase Row Level Security.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

create type time_horizon as enum ('scalp', 'day_trade', 'swing', 'investment');
create type trade_source  as enum ('schwab', 'manual', 'chatbot');
create type idea_status   as enum ('watching', 'active', 'closed');

-- ── Watchlists ───────────────────────────────────────────────

create table watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  symbols    text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table watchlists enable row level security;
create policy "users own their watchlists"
  on watchlists for all using (auth.uid() = user_id);

-- ── Scan results ─────────────────────────────────────────────

create table scan_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  symbol       text not null,
  gap_pct      numeric(8,4) not null,
  rvol         numeric(8,2) not null,
  atr          numeric(10,4) not null,
  price        numeric(12,4) not null,
  change_pct   numeric(8,4) not null,
  catalyst_tag text,
  sector       text,
  raw_json     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (user_id, date, symbol)
);

create index scan_results_user_date on scan_results (user_id, date);
alter table scan_results enable row level security;
create policy "users own their scan results"
  on scan_results for all using (auth.uid() = user_id);

-- ── Alerts ───────────────────────────────────────────────────

create table alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  type         text not null,
  symbol       text,
  condition    text,
  triggered_at timestamptz not null default now(),
  delivered_via text[] not null default '{}',
  is_read      boolean not null default false
);

create index alerts_user_unread on alerts (user_id, is_read, triggered_at desc);
alter table alerts enable row level security;
create policy "users own their alerts"
  on alerts for all using (auth.uid() = user_id);

-- ── Strategies ───────────────────────────────────────────────

create table strategies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  time_horizon  time_horizon not null,
  catalyst_type text,
  setup_pattern text,
  entry_rules   text,
  exit_rules    text,
  risk_params   jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table strategies enable row level security;
create policy "users own their strategies"
  on strategies for all using (auth.uid() = user_id);

-- ── Trades ───────────────────────────────────────────────────

create table trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  strategy_id     uuid references strategies(id) on delete set null,
  symbol          text not null,
  entry_date      timestamptz not null,
  exit_date       timestamptz,
  entry_price     numeric(12,4) not null,
  exit_price      numeric(12,4),
  qty             numeric(12,4) not null,
  side            text not null check (side in ('long','short')),
  pnl             numeric(14,2),
  account         text not null default 'default',
  trade_type      time_horizon not null,
  setup_notes     text,
  what_went_well  text,
  what_went_wrong text,
  what_to_change  text,
  source          trade_source not null default 'manual',
  created_at      timestamptz not null default now()
);

create index trades_user_date on trades (user_id, entry_date desc);
alter table trades enable row level security;
create policy "users own their trades"
  on trades for all using (auth.uid() = user_id);

-- ── Trade ideas ──────────────────────────────────────────────

create table trade_ideas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  strategy_id  uuid references strategies(id) on delete set null,
  symbol       text not null,
  thesis       text not null,
  time_horizon time_horizon not null,
  catalyst     text,
  status       idea_status not null default 'watching',
  created_at   timestamptz not null default now()
);

create index trade_ideas_user_status on trade_ideas (user_id, status);
alter table trade_ideas enable row level security;
create policy "users own their trade ideas"
  on trade_ideas for all using (auth.uid() = user_id);

-- ── Daily summaries ──────────────────────────────────────────

create table daily_summaries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  pnl           numeric(14,2) not null default 0,
  trades_count  int not null default 0,
  summary_text  text,
  raw_chat_json jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

alter table daily_summaries enable row level security;
create policy "users own their daily summaries"
  on daily_summaries for all using (auth.uid() = user_id);

-- ── Push subscriptions (web push) ────────────────────────────

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "users own their push subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);
