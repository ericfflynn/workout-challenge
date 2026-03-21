create or replace function public.submit_session(
  p_challenge_id uuid,
  p_participant_id uuid,
  p_sets integer[]
)
returns table (
  session_id uuid,
  submitted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
  v_submitted_at timestamptz := timezone('utc', now());
  v_created_at timestamptz := timezone('utc', now());
begin
  if p_challenge_id is null or p_participant_id is null then
    raise exception 'A challenge and participant are required.';
  end if;

  if coalesce(array_length(p_sets, 1), 0) = 0 then
    raise exception 'At least one set is required.';
  end if;

  if array_length(p_sets, 1) > 20 then
    raise exception 'A session can contain at most 20 sets.';
  end if;

  if exists (
    select 1
    from unnest(p_sets) as reps
    where reps is null
      or reps <= 0
      or reps > 250
  ) then
    raise exception 'Each set must be between 1 and 250 reps.';
  end if;

  if not exists (
    select 1
    from public.challenges c
    join public.participants p on p.id = p_participant_id
    where c.id = p_challenge_id
      and p.is_active = true
      and now() between c.start_at and c.end_at
  ) then
    raise exception 'This challenge is not accepting submissions.';
  end if;

  insert into public.sessions (
    challenge_id,
    participant_id,
    submitted_at,
    created_at
  )
  values (
    p_challenge_id,
    p_participant_id,
    v_submitted_at,
    v_created_at
  )
  returning id into v_session_id;

  insert into public.sets (session_id, set_order, reps)
  select
    v_session_id,
    ordinality::integer,
    reps
  from unnest(p_sets) with ordinality as set_values(reps, ordinality);

  return query
  select
    v_session_id,
    v_submitted_at,
    v_created_at;
end;
$$;

grant execute on function public.submit_session(uuid, uuid, integer[]) to anon;
grant execute on function public.submit_session(uuid, uuid, integer[]) to authenticated;
