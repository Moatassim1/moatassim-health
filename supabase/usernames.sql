-- GG Gains: unique usernames, search by username, and country flags. Safe to run more than once.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists country text;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_.]{3,20}$');
alter table public.profiles drop constraint if exists profiles_country_format;
alter table public.profiles add constraint profiles_country_format check (country is null or country ~ '^[A-Z]{2}(-[A-Z]{3})?$');
create unique index if not exists profiles_username_unique on public.profiles (lower(username));

-- Is a username free? (profiles of strangers are hidden, so this runs with the owner's rights)
create or replace function public.mh_username_free(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(u)) and id <> auth.uid());
$$;

-- Search people by username (or display name). Shows only what's needed to add them.
create or replace function public.mh_search_users(q text)
returns table (id uuid, username text, name text, avatar text, color text, country text, friend_code text)
language sql stable security definer set search_path = public as $$
  with s as (select lower(replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_')) as t)
  select p.id, p.username, p.name, p.avatar, p.color, p.country, p.friend_code
  from public.profiles p, s
  where auth.uid() is not null and p.id <> auth.uid() and p.username is not null and char_length(s.t) >= 2
    and (lower(p.username) like s.t || '%' or lower(p.name) like '%' || s.t || '%')
  order by (lower(p.username) = s.t) desc, (lower(p.username) like s.t || '%') desc, p.username
  limit 20;
$$;

revoke all on function public.mh_username_free(text) from public;
revoke all on function public.mh_search_users(text) from public;
grant execute on function public.mh_username_free(text) to authenticated;
grant execute on function public.mh_search_users(text) to authenticated;
