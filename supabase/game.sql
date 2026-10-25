-- GG Gains: ranked ladder stats, profile pictures and reactions.
-- Safe to run more than once.

-- Ranked stats each person publishes for their friends (weekly/season points, tier, level, streaks, cosmetics).
alter table public.profiles add column if not exists game text;
-- Small profile picture (a ~150 px image stored as text, so no file storage is needed).
alter table public.profiles add column if not exists avatar text;
alter table public.profiles drop constraint if exists profiles_avatar_size;
alter table public.profiles add constraint profiles_avatar_size check (avatar is null or char_length(avatar) < 60000);
alter table public.profiles drop constraint if exists profiles_game_size;
alter table public.profiles add constraint profiles_game_size check (game is null or char_length(game) < 8000);

-- Reactions on a friend's day: 🔥 💪 GG 😂
create table if not exists public.reactions (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  emoji text not null check (emoji in ('fire', 'muscle', 'gg', 'laugh')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, day, emoji)
);
alter table public.reactions enable row level security;
drop policy if exists "reactions read" on public.reactions;
create policy "reactions read" on public.reactions for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.mh_are_friends(to_id, auth.uid()));
drop policy if exists "reactions add" on public.reactions;
create policy "reactions add" on public.reactions for insert to authenticated
  with check (from_id = auth.uid() and from_id <> to_id and public.mh_are_friends(to_id, auth.uid()));
drop policy if exists "reactions remove" on public.reactions;
create policy "reactions remove" on public.reactions for delete to authenticated using (from_id = auth.uid());
create index if not exists reactions_to_idx on public.reactions (to_id, created_at desc);

-- Live updates for reactions too.
do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null; end $$;
