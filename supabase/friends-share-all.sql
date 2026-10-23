-- Friends always see each other's diary and weight. To stop sharing, remove the friend.
create or replace function public.mh_can_view(owner_id uuid, what text) returns boolean language sql stable security definer set search_path = public as $$
  select owner_id = auth.uid() or public.mh_are_friends(owner_id, auth.uid());
$$;
