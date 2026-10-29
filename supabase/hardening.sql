-- GG Gains security hardening (October 2026). Safe to run more than once.

-- ------------------------------------------------------------------ 1) friend requests
-- Accepting a request may only change its status. Who the request is between can never change,
-- an accepted friendship can't be turned back into a request, and blocked people can't be accepted.
create or replace function public.mh_friendship_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.requester is distinct from old.requester or new.addressee is distinct from old.addressee then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if old.status = 'accepted' and new.status <> 'accepted' then raise exception 'Not allowed' using errcode = '42501'; end if;
  if new.status = 'accepted' and public.mh_blocked(new.requester, new.addressee) then raise exception 'Not allowed' using errcode = '42501'; end if;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists mh_friendship_guard on public.friendships;
create trigger mh_friendship_guard before update on public.friendships for each row execute function public.mh_friendship_guard();
drop policy if exists "friendships accept" on public.friendships;
create policy "friendships accept" on public.friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending') with check (addressee = auth.uid() and status = 'accepted');

-- ------------------------------------------------------------------ 2) what friends can see (with consent)
alter table public.profiles add column if not exists share_diary boolean not null default true;   -- food diary and workouts
alter table public.profiles add column if not exists share_weight boolean not null default true;  -- weigh-ins
alter table public.profiles add column if not exists share_health boolean not null default false; -- steps, sleep, heart rate (watch / Apple Health)
alter table public.profiles add column if not exists consent_at timestamptz;                      -- when the person agreed to health-data processing

create or replace function public.mh_can_view(owner_id uuid, what text) returns boolean
language sql stable security definer set search_path = public as $$
  select owner_id = auth.uid() or (
    public.mh_are_friends(owner_id, auth.uid()) and not public.mh_blocked(owner_id, auth.uid()) and exists (
      select 1 from public.profiles p where p.id = owner_id and case what
        when 'diary' then p.share_diary when 'weight' then p.share_weight when 'health' then p.share_health else false end));
$$;
drop policy if exists "friends read items" on public.items;
create policy "friends read items" on public.items for select to authenticated using (
  owner <> auth.uid() and (
    (kind in ('entry', 'daymeta') and public.mh_can_view(owner, 'diary')) or
    (kind = 'garmin' and public.mh_can_view(owner, 'health')) or
    (kind = 'weight' and public.mh_can_view(owner, 'weight'))));

-- ------------------------------------------------------------------ 3) profile colour and picture
-- Colour must be a real colour code; the picture must be an image stored in the profile (no outside links,
-- which could be used to see who looked at you).
update public.profiles set color = '#E0263A' where color !~ '^#[0-9A-Fa-f]{6}$';
alter table public.profiles drop constraint if exists profiles_color_format;
alter table public.profiles add constraint profiles_color_format check (color ~ '^#[0-9A-Fa-f]{6}$');
update public.profiles set avatar = null where avatar is not null and avatar !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$';
alter table public.profiles drop constraint if exists profiles_avatar_format;
alter table public.profiles add constraint profiles_avatar_format check (avatar is null or avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$');

-- ------------------------------------------------------------------ 4) ranking: reject impossible numbers
-- Points are worked out on each phone, so the server at least refuses values no real week could produce.
create or replace function public.mh_profile_guard() returns trigger
language plpgsql set search_path = public as $$
declare g jsonb; r numeric; tier text;
begin
  if new.points is not null and (new.points < -100 or new.points > 200) then new.points := null; end if;
  if new.game is null then return new; end if;
  begin g := new.game::jsonb; exception when others then raise exception 'Ranking data is invalid' using errcode = '22023'; end;
  if jsonb_typeof(g) <> 'object'
    or coalesce((g->>'wp')::numeric, 0) not between 0 and 1200
    or coalesce((g->>'lwp')::numeric, 0) not between 0 and 1200
    or coalesce((g->>'r')::numeric, 0) not between 0 and 2000
    or coalesce((g->>'sp')::numeric, 0) not between 0 and 50000
    or coalesce((g->>'lv')::numeric, 0) not between 0 and 1000
    or coalesce((g->>'ls')::numeric, 0) not between 0 and 4000
    or coalesce((g->>'ps')::numeric, 0) not between 0 and 4000
    or coalesce((g->>'td')::numeric, 0) not between 0 and 200 then
    raise exception 'Ranking data is out of range' using errcode = '22023';
  end if;
  r := coalesce((g->>'r')::numeric, 0);
  tier := case when r >= 1180 then 'legend' when r >= 1050 then 'elite' when r >= 900 then 'diamond' when r >= 720 then 'platinum'
               when r >= 520 then 'gold' when r >= 300 then 'silver' else 'bronze' end;
  if coalesce(g->>'t', 'bronze') <> tier then g := jsonb_set(g, '{t}', to_jsonb(tier)); new.game := g::text; end if;
  return new;
exception when invalid_text_representation then raise exception 'Ranking data is invalid' using errcode = '22023';
end $$;
drop trigger if exists mh_profile_guard on public.profiles;
create trigger mh_profile_guard before insert or update of game, points on public.profiles for each row execute function public.mh_profile_guard();

-- ------------------------------------------------------------------ 5) people search
-- At least 3 characters, and only names/usernames that START with what was typed (so nobody can list every user).
create or replace function public.mh_search_users(q text)
returns table (id uuid, username text, name text, avatar text, color text, country text, friend_code text)
language sql stable security definer set search_path = public as $$
  with s as (select lower(replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_')) as t)
  select p.id, p.username, p.name, p.avatar, p.color, p.country, p.friend_code
  from public.profiles p, s
  where auth.uid() is not null and p.id <> auth.uid() and p.username is not null and char_length(s.t) >= 3
    and not public.mh_blocked(p.id, auth.uid())
    and (lower(p.username) like s.t || '%' or lower(p.name) like s.t || '%')
  order by (lower(p.username) = s.t) desc, (lower(p.username) like s.t || '%') desc, p.username
  limit 15;
$$;

-- ------------------------------------------------------------------ 6) notification flooding
-- Anyone can send at most 40 notices an hour, and at most 3 friend-request notices a day to the same person.
create or replace function public.mh_notify_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor is null or new.actor = new.recipient then return new; end if;
  if (select count(*) from public.notifications where actor = new.actor and created_at > now() - interval '1 hour') >= 40 then return null; end if;
  if new.kind = 'friend-request' and (select count(*) from public.notifications where actor = new.actor and recipient = new.recipient
      and kind = 'friend-request' and created_at > now() - interval '1 day') >= 3 then return null; end if;
  if public.mh_blocked(new.actor, new.recipient) then return null; end if;
  return new;
end $$;
drop trigger if exists mh_notify_limit on public.notifications;
create trigger mh_notify_limit before insert on public.notifications for each row execute function public.mh_notify_limit();
create index if not exists notifications_actor on public.notifications (actor, created_at desc);

-- ------------------------------------------------------------------ 7) consent + sharing settings from the app
create or replace function public.mh_set_privacy(diary boolean, weight boolean, health boolean, consent boolean default false) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.profiles set share_diary = coalesce(diary, share_diary), share_weight = coalesce(weight, share_weight),
    share_health = coalesce(health, share_health), consent_at = case when consent then coalesce(consent_at, now()) else consent_at end
  where id = auth.uid();
  return (select json_build_object('ok', true, 'share_diary', share_diary, 'share_weight', share_weight, 'share_health', share_health, 'consent_at', consent_at) from public.profiles where id = auth.uid());
end $$;
revoke all on function public.mh_set_privacy(boolean, boolean, boolean, boolean) from public;
grant execute on function public.mh_set_privacy(boolean, boolean, boolean, boolean) to authenticated;

-- ------------------------------------------------------------------ 8) size limits on synced data
alter table public.items drop constraint if exists items_data_size;
alter table public.items add constraint items_data_size check (pg_column_size(data) < 200000) not valid;

-- Check: the rules on the main diary table (run on its own and read the result).
select policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'items';
