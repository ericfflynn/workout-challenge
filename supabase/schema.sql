create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  exercise_type text not null check (exercise_type in ('pushups')),
  week_number integer not null check (week_number > 0),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (exercise_type, week_number),
  check (end_at > start_at)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete restrict,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  set_order integer not null check (set_order > 0),
  reps integer not null check (reps > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, set_order)
);

create index if not exists sessions_challenge_id_idx
  on public.sessions (challenge_id, participant_id, submitted_at);

create index if not exists sets_session_id_idx
  on public.sets (session_id, set_order);

alter table public.participants enable row level security;
alter table public.challenges enable row level security;
alter table public.sessions enable row level security;
alter table public.sets enable row level security;

drop policy if exists "public can read active participants" on public.participants;
create policy "public can read active participants"
on public.participants
for select
to anon
using (is_active = true);

drop policy if exists "public can read challenges" on public.challenges;
create policy "public can read challenges"
on public.challenges
for select
to anon
using (true);

drop policy if exists "public can read sessions" on public.sessions;
create policy "public can read sessions"
on public.sessions
for select
to anon
using (true);

drop policy if exists "public can read sets" on public.sets;
create policy "public can read sets"
on public.sets
for select
to anon
using (true);

drop policy if exists "public can create sessions during active challenge" on public.sessions;
create policy "public can create sessions during active challenge"
on public.sessions
for insert
to anon
with check (
  exists (
    select 1
    from public.challenges c
    join public.participants p on p.id = participant_id
    where c.id = challenge_id
      and p.is_active = true
      and now() between c.start_at and c.end_at
  )
);

drop policy if exists "public can create sets for active challenge sessions" on public.sets;
create policy "public can create sets for active challenge sessions"
on public.sets
for insert
to anon
with check (
  exists (
    select 1
    from public.sessions s
    join public.challenges c on c.id = s.challenge_id
    join public.participants p on p.id = s.participant_id
    where s.id = session_id
      and p.is_active = true
      and now() between c.start_at and c.end_at
  )
);

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

create or replace view public.challenge_total_reps as
select
  c.id as challenge_id,
  p.id as participant_id,
  p.display_name,
  coalesce(sum(st.reps), 0) as total_reps,
  coalesce(max(st.reps), 0) as best_single_set,
  count(distinct s.id) as session_count,
  max(s.submitted_at) as reached_total_at
from public.challenges c
cross join public.participants p
left join public.sessions s
  on s.challenge_id = c.id
 and s.participant_id = p.id
left join public.sets st
  on st.session_id = s.id
where p.is_active = true
group by c.id, p.id, p.display_name;

create or replace view public.challenge_best_sets as
select distinct on (c.id, p.id)
  c.id as challenge_id,
  p.id as participant_id,
  p.display_name,
  st.reps,
  s.submitted_at
from public.challenges c
join public.sessions s
  on s.challenge_id = c.id
join public.participants p
  on p.id = s.participant_id
join public.sets st
  on st.session_id = s.id
where p.is_active = true
order by c.id, p.id, st.reps desc, s.submitted_at asc;
