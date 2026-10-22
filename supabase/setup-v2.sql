-- Moatassim Health v2: one account per person, friends, permissions, ranking, push.
-- Run once in Supabase > SQL Editor. Safe to run again.

-- ------------------------------------------------------------------ profiles (what friends can see)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Me' check (char_length(name) between 1 and 40),
  friend_code text unique not null,
  color text not null default '#1E7656',
  goal text not null default 'maintain' check (goal in ('lose', 'gain', 'maintain')),
  points numeric,              -- % of the way from start weight to goal weight
  points_detail text,          -- e.g. "lost 2.1 of 6 kg" (only shown if weight is shared)
  points_updated timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.mh_new_code() returns text language plpgsql as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := 'MH-';
    for i in 1..6 loop c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where friend_code = c);
  end loop;
  return c;
end $$;

-- New accounts get a profile with the name chosen at sign-up.
create or replace function public.mh_handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, friend_code)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)), public.mh_new_code())
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists mh_on_auth_user_created on auth.users;
create trigger mh_on_auth_user_created after insert on auth.users for each row execute function public.mh_handle_new_user();

-- Existing accounts (yours) get a profile too.
insert into public.profiles (id, name, friend_code)
select u.id, case when u.email = 'moatassime1310@gmail.com' then 'Moatassim' else split_part(u.email, '@', 1) end, public.mh_new_code()
from auth.users u on conflict (id) do nothing;

-- ------------------------------------------------------------------ friends
create table if not exists public.friendships (
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create or replace function public.mh_are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;
create or replace function public.mh_knows(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f
    where (f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a));
$$;

-- What each person lets each friend see. Ranking points are always visible to friends.
create table if not exists public.friend_perms (
  owner uuid not null references auth.users(id) on delete cascade,
  friend uuid not null references auth.users(id) on delete cascade,
  see_diary boolean not null default false,
  see_weight boolean not null default false,
  notify_logs boolean not null default false,
  primary key (owner, friend)
);

create or replace function public.mh_can_view(owner_id uuid, what text) returns boolean language sql stable security definer set search_path = public as $$
  select owner_id = auth.uid() or (
    public.mh_are_friends(owner_id, auth.uid()) and exists (
      select 1 from public.friend_perms p where p.owner = owner_id and p.friend = auth.uid()
        and ((what = 'diary' and p.see_diary) or (what = 'weight' and p.see_weight))));
$$;

-- Send a friend request by friend ID. If they already asked you, you become friends straight away.
create or replace function public.mh_add_friend(code text) returns json language plpgsql security definer set search_path = public as $$
declare target public.profiles; me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into target from public.profiles where friend_code = upper(trim(code));
  if target.id is null then return json_build_object('ok', false, 'error', 'No one has that friend ID.'); end if;
  if target.id = me then return json_build_object('ok', false, 'error', 'That''s your own friend ID.'); end if;
  if exists (select 1 from public.friendships where requester = target.id and addressee = me) then
    update public.friendships set status = 'accepted' where requester = target.id and addressee = me;
    return json_build_object('ok', true, 'status', 'accepted', 'id', target.id, 'name', target.name);
  end if;
  insert into public.friendships (requester, addressee) values (me, target.id) on conflict do nothing;
  return json_build_object('ok', true, 'status', (select status from public.friendships where requester = me and addressee = target.id), 'id', target.id, 'name', target.name);
end $$;

-- ------------------------------------------------------------------ push notifications
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient uuid not null references auth.users(id) on delete cascade,
  actor uuid references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient on public.notifications (recipient, created_at desc);

-- Wearable keys: no policies, so only the server functions can read them.
create table if not exists public.wearable_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  display_name text,
  primary key (user_id, provider)
);

-- ------------------------------------------------------------------ security (row level)
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_perms enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.wearable_keys enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.mh_knows(id, auth.uid()));
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "friendships read" on public.friendships;
create policy "friendships read" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "friendships accept" on public.friendships;
create policy "friendships accept" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
drop policy if exists "friendships remove" on public.friendships;
create policy "friendships remove" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

drop policy if exists "perms own" on public.friend_perms;
create policy "perms own" on public.friend_perms for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "perms see mine" on public.friend_perms;
create policy "perms see mine" on public.friend_perms for select to authenticated using (friend = auth.uid());

drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications mine" on public.notifications;
create policy "notifications mine" on public.notifications for select to authenticated using (recipient = auth.uid());
drop policy if exists "notifications mark read" on public.notifications;
create policy "notifications mark read" on public.notifications for update to authenticated using (recipient = auth.uid()) with check (recipient = auth.uid());
drop policy if exists "notifications delete" on public.notifications;
create policy "notifications delete" on public.notifications for delete to authenticated using (recipient = auth.uid());

-- Friends can read the parts of your log you allow.
drop policy if exists "friends read items" on public.items;
create policy "friends read items" on public.items for select to authenticated using (
  owner <> auth.uid() and (
    (kind in ('entry', 'daymeta', 'garmin') and public.mh_can_view(owner, 'diary')) or
    (kind = 'weight' and public.mh_can_view(owner, 'weight'))));
create index if not exists items_owner_kind_day on public.items (owner, kind, day);

-- ------------------------------------------------------------------ move the old shared data
-- Everything logged as "Moatassim" becomes your own log; the old "Waifu" log is removed.
delete from public.items where profile = 'waifu' or id = 'p:waifu' or id like '%:waifu:%';
-- If the new app already saved a blank "me" copy before this ran, the real data wins.
delete from public.items m where (m.profile = 'me' or m.id = 'p:me') and exists (
  select 1 from public.items o where o.owner = m.owner and o.id = replace(m.id, ':me', ':moatassim'));
update public.items set id = replace(id, ':moatassim', ':me'), profile = 'me'
  where profile = 'moatassim' or id = 'p:moatassim';
