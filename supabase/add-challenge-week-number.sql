alter table public.challenges
  add column if not exists week_number integer;

update public.challenges
set week_number = 1
where week_number is null;

alter table public.challenges
  alter column week_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenges_week_number_positive'
  ) then
    alter table public.challenges
      add constraint challenges_week_number_positive
      check (week_number > 0);
  end if;
end
$$;

create unique index if not exists challenges_exercise_week_idx
  on public.challenges (exercise_type, week_number);
