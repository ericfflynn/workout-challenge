truncate table public.sets restart identity cascade;
truncate table public.sessions restart identity cascade;
truncate table public.challenges restart identity cascade;
truncate table public.participants restart identity cascade;

insert into public.participants (id, display_name, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Eric', true),
  ('22222222-2222-2222-2222-222222222222', 'Joe', true),
  ('33333333-3333-3333-3333-333333333333', 'Nick', true);

insert into public.challenges (
  id,
  slug,
  title,
  description,
  exercise_type,
  start_at,
  end_at
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'pushup-week-1',
  'Pushup Week 1',
  'A one-week honor-system pushup challenge. Log batch sessions, climb the total reps leaderboard, and chase the best single set.',
  'pushups',
  timestamptz '2026-03-21 00:00:00 America/New_York',
  timestamptz '2026-03-29 23:59:59 America/New_York'
);
