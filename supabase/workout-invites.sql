-- GG Gains: share a workout plan with a friend (November 2026). Safe to run more than once.
-- The sender shares the exercises they plan to do; the friend gets an in-app notification and can
-- Accept or Decline. Accepting copies only the exercise list (never the sender's sets) into the
-- friend's own diary, so both people keep completely separate workout records.
-- Everything goes through the two functions below; the table can only be read, never written directly.

create table if not exists public.workout_invites (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  day date not null,
  plan jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default now() + interval '36 hours',
  constraint workout_invites_not_self check (sender <> recipient),
  constraint workout_invites_plan check (jsonb_typeof(plan) = 'array' and jsonb_array_length(plan) between 1 and 30 and pg_column_size(plan) < 30000)
);
create index if not exists workout_invites_recipient on public.workout_invites (recipient, created_at desc);
create index if not exists workout_invites_sender on public.workout_invites (sender, day);
alter table public.workout_invites enable row level security;
drop policy if exists "workout invites mine" on public.workout_invites;
create policy "workout invites mine" on public.workout_invites for select to authenticated using (sender = auth.uid() or recipient = auth.uid());
revoke insert, update, delete on public.workout_invites from anon, authenticated;

-- Send (or refresh) an invite. Returns { ok, id, updated } or { ok: false, error }.
create or replace function public.mh_send_workout(friend uuid, on_day date, plan jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); clean jsonb; existing uuid; new_id uuid; my_name text; n int; names text;
begin
  if me is null then return json_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if friend is null or friend = me then return json_build_object('ok', false, 'error', 'bad_friend'); end if;
  if not public.mh_are_friends(me, friend) or public.mh_blocked(me, friend) then return json_build_object('ok', false, 'error', 'not_friends'); end if;
  if on_day is null or on_day < current_date - 1 or on_day > current_date + 7 then return json_build_object('ok', false, 'error', 'bad_day'); end if;
  if jsonb_typeof(plan) <> 'array' then return json_build_object('ok', false, 'error', 'bad_plan'); end if;
  -- Keep only the exercise list (what to do), never weights or reps.
  select coalesce(jsonb_agg(jsonb_build_object(
      'ex', left(e->>'ex', 80),
      'name', left(coalesce(e->>'name', 'Exercise'), 120),
      'g', left(coalesce(e->>'g', ''), 30),
      'mp', coalesce((select jsonb_agg(left(v, 40)) from jsonb_array_elements_text(case when jsonb_typeof(e->'mp') = 'array' then e->'mp' else '[]' end) as t(v)), '[]'),
      'ms', coalesce((select jsonb_agg(left(v, 40)) from jsonb_array_elements_text(case when jsonb_typeof(e->'ms') = 'array' then e->'ms' else '[]' end) as t(v)), '[]'),
      'sets', least(10, greatest(1, coalesce(case when (e->>'sets') ~ '^[0-9]+$' then (e->>'sets')::int end, 3))))), '[]')
    into clean
    from (select e from jsonb_array_elements(plan) as x(e) where jsonb_typeof(e) = 'object' and coalesce(e->>'ex', '') <> '' limit 30) s;
  n := jsonb_array_length(clean);
  if n = 0 then return json_build_object('ok', false, 'error', 'empty_plan'); end if;
  if (select count(*) from public.workout_invites where sender = me and created_at > now() - interval '1 day') >= 30 then
    return json_build_object('ok', false, 'error', 'too_many'); end if;
  select coalesce(nullif(name, ''), username, 'A friend') into my_name from public.profiles where id = me;
  select string_agg(x->>'name', ', ') into names from (select x from jsonb_array_elements(clean) as t(x) limit 4) s;
  -- One open invite per friend per day: sending again just updates the plan.
  select id into existing from public.workout_invites
    where sender = me and recipient = friend and day = on_day and status = 'pending' and expires_at > now() limit 1;
  if existing is not null then
    update public.workout_invites set plan = clean, created_at = now(), expires_at = now() + interval '36 hours' where id = existing;
    insert into public.notifications (recipient, actor, kind, title, body)
      values (friend, me, 'workout-invite', '🏋️ Workout updated', my_name || ' updated the workout: ' || n || ' exercise' || case when n = 1 then '' else 's' end || ' (' || names || case when n > 4 then '…' else '' end || ').');
    return json_build_object('ok', true, 'id', existing, 'updated', true);
  end if;
  insert into public.workout_invites (sender, recipient, day, plan) values (me, friend, on_day, clean) returning id into new_id;
  insert into public.notifications (recipient, actor, kind, title, body)
    values (friend, me, 'workout-invite', '🏋️ Workout invite', my_name || ' wants to train with you: ' || n || ' exercise' || case when n = 1 then '' else 's' end || ' (' || names || case when n > 4 then '…' else '' end || '). Open the app to accept.');
  return json_build_object('ok', true, 'id', new_id, 'updated', false);
end $$;

-- Accept or decline. On accept, returns the plan so the app can add it to the friend's own diary.
create or replace function public.mh_respond_workout(invite uuid, accept boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.workout_invites; my_name text;
begin
  if me is null then return json_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select * into r from public.workout_invites where id = invite and recipient = me for update;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status = 'accepted' then return json_build_object('ok', false, 'error', 'already_accepted', 'status', r.status, 'plan', r.plan, 'day', r.day); end if;
  if r.status <> 'pending' then return json_build_object('ok', false, 'error', 'already_' || r.status, 'status', r.status); end if;
  if r.expires_at <= now() then return json_build_object('ok', false, 'error', 'expired', 'status', 'expired'); end if;
  if accept and (not public.mh_are_friends(me, r.sender) or public.mh_blocked(me, r.sender)) then return json_build_object('ok', false, 'error', 'not_friends'); end if;
  update public.workout_invites set status = case when accept then 'accepted' else 'declined' end, responded_at = now() where id = invite;
  select coalesce(nullif(name, ''), username, 'Your friend') into my_name from public.profiles where id = me;
  if not public.mh_blocked(me, r.sender) then
    insert into public.notifications (recipient, actor, kind, title, body)
      values (r.sender, me, case when accept then 'workout-accepted' else 'workout-declined' end,
        case when accept then '💪 Workout accepted' else 'Workout invite declined' end,
        my_name || case when accept then ' accepted your workout. You''re training together!' else ' can''t join this workout.' end);
  end if;
  return json_build_object('ok', true, 'status', case when accept then 'accepted' else 'declined' end, 'plan', case when accept then r.plan else null end, 'day', r.day);
end $$;

-- The last two weeks of invites, sent and received, with the other person's name.
create or replace function public.mh_my_workouts() returns table (id uuid, sender uuid, recipient uuid, day date, plan jsonb, status text, created_at timestamptz, responded_at timestamptz, expires_at timestamptz, other_name text, other_color text, incoming boolean)
language sql stable security definer set search_path = public as $$
  select w.id, w.sender, w.recipient, w.day, w.plan,
    case when w.status = 'pending' and w.expires_at <= now() then 'expired' else w.status end,
    w.created_at, w.responded_at, w.expires_at,
    coalesce(nullif(p.name, ''), p.username, 'A friend'), p.color, w.recipient = auth.uid()
  from public.workout_invites w
  join public.profiles p on p.id = case when w.recipient = auth.uid() then w.sender else w.recipient end
  where auth.uid() is not null and (w.sender = auth.uid() or w.recipient = auth.uid()) and w.created_at > now() - interval '14 days'
    and not public.mh_blocked(w.sender, w.recipient)
  order by w.created_at desc limit 60;
$$;

revoke all on function public.mh_send_workout(uuid, date, jsonb) from public;
revoke all on function public.mh_respond_workout(uuid, boolean) from public;
revoke all on function public.mh_my_workouts() from public;
grant execute on function public.mh_send_workout(uuid, date, jsonb) to authenticated;
grant execute on function public.mh_respond_workout(uuid, boolean) to authenticated;
grant execute on function public.mh_my_workouts() to authenticated;

-- Live updates for invites (the app already listens to notifications, which every invite creates).
