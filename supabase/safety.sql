-- GG Gains: delete my account, block and report people, and a filter for offensive names.
-- Safe to run more than once.

-- ------------------------------------------------------------------ offensive name filter
-- Letters only, common look-alike swaps undone (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s).
create or replace function public.mh_name_ok(t text) returns boolean
language sql immutable as $$
  -- Usernames are checked with separators removed (so f.u.c.k is caught); display names word by word
  -- (so "Ash Ithaca" isn't read as a swear word).
  select t is null or not exists (
    select 1 from unnest(array[regexp_replace(translate(lower(t), '013457@$!|', 'oieastasii'), '[^a-z ]', '', 'g')]
      || string_to_array(regexp_replace(translate(lower(t), '013457@$!|', 'oieastasii'), '[^a-z ]', '', 'g'), ' ')) w
    where (case when t ~ ' ' then w !~ ' ' and w <> '' else true end)
      and replace(w, ' ', '') ~ '(fuck|fck|shit|cunt|bitch|biatch|whore|slut|nigg|faggot|retard|rapist|hitler|kike|chink|wanker|twat|pussy|porn|paedo|pedophile|paedophile|kkk|dickhead|motherf|cocksuck|bastard|tranny|spastic|raghead|towelhead|wetback|beaner)');
$$;
create or replace function public.mh_profiles_name_check() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then  -- never block a sign-up (e.g. a Google name): swap in a neutral name instead
    if not public.mh_name_ok(new.name) then new.name := 'New player'; end if;
    if not public.mh_name_ok(new.username) then new.username := null; end if;
    return new;
  end if;
  if not public.mh_name_ok(new.username) or not public.mh_name_ok(new.name) then
    raise exception 'That name isn''t allowed. Please choose another one.' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists mh_profiles_name_check on public.profiles;
create trigger mh_profiles_name_check before insert or update of username, name on public.profiles
  for each row execute function public.mh_profiles_name_check();

-- Username check for the app: 'ok', 'taken', 'not_allowed' or 'invalid'.
create or replace function public.mh_username_status(u text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when trim(u) !~ '^[a-z0-9_.]{3,20}$' then 'invalid'
    when not public.mh_name_ok(u) then 'not_allowed'
    when exists (select 1 from public.profiles where lower(username) = lower(trim(u)) and id <> auth.uid()) then 'taken'
    else 'ok' end;
$$;

-- ------------------------------------------------------------------ blocking
create table if not exists public.blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks own" on public.blocks;
create policy "blocks own" on public.blocks for select to authenticated using (blocker = auth.uid());

create or replace function public.mh_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

-- Block someone: removes the friendship, their reactions to you, and stops them finding or adding you.
create or replace function public.mh_block(target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or target is null or target = me then return json_build_object('ok', false); end if;
  insert into public.blocks (blocker, blocked) values (me, target) on conflict do nothing;
  delete from public.friendships where (requester = me and addressee = target) or (requester = target and addressee = me);
  delete from public.friend_perms where (owner = me and friend = target) or (owner = target and friend = me);
  delete from public.reactions where (from_id = target and to_id = me) or (from_id = me and to_id = target);
  delete from public.notifications where recipient = me and actor = target;
  return json_build_object('ok', true);
end $$;
create or replace function public.mh_unblock(target uuid) returns json
language sql security definer set search_path = public as $$
  delete from public.blocks where blocker = auth.uid() and blocked = target;
  select json_build_object('ok', true);
$$;
-- People I've blocked (their profiles are otherwise hidden from me).
create or replace function public.mh_my_blocks() returns table (id uuid, username text, name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.name from public.blocks b join public.profiles p on p.id = b.blocked where b.blocker = auth.uid() order by b.created_at desc;
$$;

-- Search and friend requests skip anyone blocked either way.
create or replace function public.mh_search_users(q text)
returns table (id uuid, username text, name text, avatar text, color text, country text, friend_code text)
language sql stable security definer set search_path = public as $$
  with s as (select lower(replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_')) as t)
  select p.id, p.username, p.name, p.avatar, p.color, p.country, p.friend_code
  from public.profiles p, s
  where auth.uid() is not null and p.id <> auth.uid() and p.username is not null and char_length(s.t) >= 2
    and not public.mh_blocked(p.id, auth.uid())
    and (lower(p.username) like s.t || '%' or lower(p.name) like '%' || s.t || '%')
  order by (lower(p.username) = s.t) desc, (lower(p.username) like s.t || '%') desc, p.username
  limit 20;
$$;
create or replace function public.mh_add_friend(code text) returns json language plpgsql security definer set search_path = public as $$
declare target public.profiles; me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into target from public.profiles where friend_code = upper(trim(code));
  if target.id is null then return json_build_object('ok', false, 'error', 'No one has that friend ID.'); end if;
  if target.id = me then return json_build_object('ok', false, 'error', 'That''s your own friend ID.'); end if;
  if public.mh_blocked(target.id, me) then return json_build_object('ok', false, 'error', 'You can''t add this person.'); end if;
  if exists (select 1 from public.friendships where requester = target.id and addressee = me) then
    update public.friendships set status = 'accepted' where requester = target.id and addressee = me;
    return json_build_object('ok', true, 'status', 'accepted', 'id', target.id, 'name', target.name);
  end if;
  insert into public.friendships (requester, addressee) values (me, target.id) on conflict do nothing;
  return json_build_object('ok', true, 'status', (select status from public.friendships where requester = me and addressee = target.id), 'id', target.id, 'name', target.name);
end $$;

-- ------------------------------------------------------------------ reports (only the app owner can read these, in the dashboard)
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references auth.users(id) on delete set null,
  reported uuid references auth.users(id) on delete cascade,
  reported_username text,
  reason text not null check (reason in ('name_or_picture', 'harassment', 'spam_or_fake', 'cheating', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports add" on public.reports;
create policy "reports add" on public.reports for insert to authenticated with check (reporter = auth.uid() and reported <> auth.uid());
grant insert on public.reports to authenticated;

-- ------------------------------------------------------------------ delete my account
-- Removes everything: diary, weights, photos' metadata, friends, reactions, backups, Garmin key, profile and the login itself.
create or replace function public.mh_delete_me() returns json
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  delete from public.items where owner = me;
  delete from public.backups where owner = me;
  delete from public.reports where reporter = me;
  delete from auth.users where id = me;   -- profiles, friendships, reactions, notifications, keys and blocks go with it
  return json_build_object('ok', true);
end $$;

revoke all on function public.mh_username_status(text) from public;
revoke all on function public.mh_block(uuid) from public;
revoke all on function public.mh_unblock(uuid) from public;
revoke all on function public.mh_my_blocks() from public;
revoke all on function public.mh_delete_me() from public;
revoke all on function public.mh_blocked(uuid, uuid) from public;
grant execute on function public.mh_username_status(text) to authenticated;
grant execute on function public.mh_block(uuid) to authenticated;
grant execute on function public.mh_unblock(uuid) to authenticated;
grant execute on function public.mh_my_blocks() to authenticated;
grant execute on function public.mh_delete_me() to authenticated;
grant execute on function public.mh_blocked(uuid, uuid) to authenticated;
grant select on public.blocks to authenticated;
