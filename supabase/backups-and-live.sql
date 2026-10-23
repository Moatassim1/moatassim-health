-- 1) Weekly backups of everyone's log (kept 8 weeks), plus "back up now" from the app.
create table if not exists public.backups (
  id bigint generated always as identity primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  item_count int not null,
  data jsonb not null
);
create index if not exists backups_owner on public.backups (owner, taken_at desc);
alter table public.backups enable row level security;
drop policy if exists "backups read own" on public.backups;
create policy "backups read own" on public.backups for select to authenticated using (owner = auth.uid());

create or replace function public.mh_take_backups(only_owner uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.backups (owner, item_count, data)
  select owner, count(*), jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'profile', profile, 'day', day, 'data', data))
  from public.items where not deleted and (only_owner is null or owner = only_owner)
  group by owner;
  get diagnostics n = row_count;
  -- keep the newest 8 per person
  delete from public.backups b where b.id in (
    select id from (select id, row_number() over (partition by owner order by taken_at desc) rn from public.backups) x where x.rn > 8);
  return n;
end $$;
revoke all on function public.mh_take_backups(uuid) from public, anon, authenticated;

-- "Back up now" button: only your own data, at most once every 10 minutes.
create or replace function public.mh_backup_me() returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.backups where owner = auth.uid() and taken_at > now() - interval '10 minutes') then
    return json_build_object('ok', true, 'recent', true);
  end if;
  perform public.mh_take_backups(auth.uid());
  return json_build_object('ok', true);
end $$;
grant execute on function public.mh_backup_me() to authenticated;

create extension if not exists pg_cron;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'mh-weekly-backup') then perform cron.unschedule('mh-weekly-backup'); end if;
  perform cron.schedule('mh-weekly-backup', '0 3 * * 1', 'select public.mh_take_backups()');
end $$;
select public.mh_take_backups(); -- first backup straight away

-- 2) Live updates: tell the app instantly about notifications, friend requests and ranking changes.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friendships') then alter publication supabase_realtime add table public.friendships; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then alter publication supabase_realtime add table public.profiles; end if;
end $$;
