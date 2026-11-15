-- Course creation support (sprint-planning.md A-2.1). Owner: Engineer A (Aryan).
--
-- 1. Organizers may add a campus that isn't listed yet (step 1 asks for the full university
--    name). Only admins can rename or remove campuses.
-- 2. create_course() inserts a course and its 8 course_steps rows in one transaction, as the
--    signed-in organizer (security invoker: row-level security applies as usual).
-- 3. Step 3 (funding approval) is skipped when only students pay, and comes back if a
--    school, sponsor or donor is added later, unless the step has already started.

create policy "campuses: signed-in insert" on public.campuses for insert to authenticated
  with check (true);

-- Step 3 status for a set of payers. No payers yet (a draft) keeps the step open.
create function public.funding_step_status(p_sources public.funder[])
returns public.step_status
language sql
immutable
set search_path = ''
as $$
  select case
    when cardinality(p_sources) > 0 and p_sources <@ array['students']::public.funder[] then 'skipped'::public.step_status
    else 'todo'::public.step_status
  end;
$$;

create function public.create_course(
  p_name text,
  p_course_type public.course_type default null,
  p_format public.course_format default null,
  p_start_date date default null,
  p_end_date date default null,
  p_campus_id uuid default null,
  p_teachers text default null,
  p_est_participants integer default null,
  p_funding_sources public.funder[] default null,
  p_step1_data jsonb default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to create a course' using errcode = '42501';
  end if;

  insert into public.courses (organizer_id, name, course_type, format, start_date, end_date,
                              campus_id, teachers, est_participants, funding_sources)
  values ((select auth.uid()), p_name, p_course_type, coalesce(p_format, 'in_person'), p_start_date, p_end_date,
          p_campus_id, p_teachers, p_est_participants, coalesce(p_funding_sources, '{}'))
  returning id into v_id;

  insert into public.course_steps (course_id, step_no, status, data)
  select v_id, g,
    case
      when g = 1 then 'in_progress'::public.step_status
      when g = 3 then public.funding_step_status(coalesce(p_funding_sources, '{}'))
      else 'todo'::public.step_status
    end,
    case when g = 1 then coalesce(p_step1_data, '{}') else '{}'::jsonb end
  from generate_series(1, 8) g;

  return v_id;
end;
$$;

revoke execute on function public.create_course(text, public.course_type, public.course_format, date, date, uuid, text, integer, public.funder[], jsonb) from public, anon;
grant execute on function public.create_course(text, public.course_type, public.course_format, date, date, uuid, text, integer, public.funder[], jsonb) to authenticated;

-- security definer: only touches step 3 of the course being updated, which the caller
-- was already allowed to update.
create function public.sync_funding_step()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.course_steps
     set status = public.funding_step_status(new.funding_sources)
   where course_id = new.id
     and step_no = 3
     and status in ('todo', 'skipped');
  return new;
end;
$$;

create trigger courses_sync_funding_step after update of funding_sources on public.courses
  for each row when (old.funding_sources is distinct from new.funding_sources)
  execute function public.sync_funding_step();

revoke execute on function public.sync_funding_step() from public, anon, authenticated;
