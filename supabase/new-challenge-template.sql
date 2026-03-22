-- Reuse or update participants separately as needed.
-- Each new week should be a new row in public.challenges.
-- Sessions are already separated by challenge_id, and week_number lives on challenges.

insert into public.challenges (
  slug,
  title,
  description,
  exercise_type,
  week_number,
  start_at,
  end_at
)
values (
  'pushup-week-2',
  'Pushup Challenge',
  'Week 2 of the public pushup challenge.',
  'pushups',
  2,
  timestamptz '2026-03-30 00:00:00 America/New_York',
  timestamptz '2026-04-05 23:59:59 America/New_York'
);
