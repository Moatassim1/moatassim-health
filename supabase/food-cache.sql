-- Shared cache for food searches, so many users don't hit Open Food Facts' limit.
-- Only the server function can read or write it (row level security with no policies).
create table if not exists public.food_cache (
  key text primary key,
  body text not null,
  fetched_at timestamptz not null default now()
);
alter table public.food_cache enable row level security;
create index if not exists food_cache_fetched on public.food_cache (fetched_at);
