create or replace function public.get_or_create_participant(
  p_display_name text
)
returns table (
  participant_id uuid,
  display_name text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_name text := regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
  v_participant public.participants%rowtype;
begin
  if v_normalized_name = '' then
    raise exception 'A participant name is required.';
  end if;

  if char_length(v_normalized_name) > 60 then
    raise exception 'Participant names must be 60 characters or fewer.';
  end if;

  select *
  into v_participant
  from public.participants p
  where lower(trim(p.display_name)) = lower(v_normalized_name)
  order by p.created_at asc
  limit 1;

  if found then
    if not v_participant.is_active then
      raise exception 'This participant is currently inactive. Ask the organizer to reactivate them.';
    end if;

    return query
    select
      v_participant.id,
      v_participant.display_name,
      v_participant.is_active;
    return;
  end if;

  insert into public.participants (display_name)
  values (v_normalized_name)
  returning * into v_participant;

  return query
  select
    v_participant.id,
    v_participant.display_name,
    v_participant.is_active;
end;
$$;

grant execute on function public.get_or_create_participant(text) to anon;
grant execute on function public.get_or_create_participant(text) to authenticated;
