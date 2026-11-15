-- Funding request (sprint-planning.md A-5.1, pulled forward per DECISIONS.md 003).
-- Owner: Engineer A (Aryan).
--
-- save_funding_request() saves the step 3 form as a draft or submits it to IAHV, in one
-- transaction, as the signed-in organizer (security invoker: row-level security and the
-- guard_admin_fields trigger apply). Submitting requires the Journey course ID (IAHV sets
-- the Journey student fee from it) and at least one proof-of-funds PDF from this course.
-- Earlier unclosed courses are shown to the organizer as a warning, not enforced here
-- (sprint-planning.md open question 2: hard gate or advisory).

create function public.save_funding_request(
  p_course_id uuid,
  p_submit boolean,
  p_total_funding numeric default null,
  p_needed_by date default null,
  p_document_ids uuid[] default '{}',
  p_student_fee numeric default 0,
  p_prior_funding_note text default null,
  p_agreement public.agreement_status default null,
  p_est_participants integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_course public.courses;
  v_existing public.funding_requests;
  v_id uuid;
  v_docs uuid[] := coalesce(p_document_ids, '{}');
begin
  if v_uid is null then
    raise exception 'Sign in to request funding approval' using errcode = '42501';
  end if;

  select * into v_course from public.courses where id = p_course_id and organizer_id = v_uid;
  if not found then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.course_steps where course_id = p_course_id and step_no = 3 and status = 'skipped') then
    raise exception 'Students pay for this course, so it doesn''t need funding approval' using errcode = '22023';
  end if;

  select * into v_existing from public.funding_requests where course_id = p_course_id;
  if found and v_existing.status = 'approved' then
    raise exception 'Funding is already approved' using errcode = '22023';
  end if;
  if found and v_existing.status = 'submitted' then
    raise exception 'This request is with IAHV. You can change it if they ask for more information.' using errcode = '22023';
  end if;

  if exists (select unnest(v_docs) except select id from public.documents where course_id = p_course_id) then
    raise exception 'An attached file is not from this course' using errcode = '22023';
  end if;

  if p_submit then
    if coalesce(trim(v_course.journey_course_id), '') = '' then
      raise exception 'Add the Journey course ID (step 2) first: IAHV needs it to set the student fee' using errcode = '22023';
    end if;
    if p_total_funding is null or p_total_funding <= 0 then
      raise exception 'Enter the total funding available' using errcode = '22023';
    end if;
    if p_needed_by is null or p_needed_by < current_date then
      raise exception 'Pick today or a later "needed by" date' using errcode = '22023';
    end if;
    if cardinality(v_docs) = 0 then
      raise exception 'Upload at least one proof-of-funds PDF' using errcode = '22023';
    end if;
  end if;

  insert into public.funding_requests as f (course_id, total_funding, student_fee, prior_funding_note, needed_by, status, submitted_at)
  values (p_course_id, p_total_funding, coalesce(p_student_fee, 0), nullif(trim(p_prior_funding_note), ''), p_needed_by,
          case when p_submit then 'submitted'::public.funding_status else 'draft'::public.funding_status end,
          case when p_submit then now() end)
  on conflict (course_id) do update set
    total_funding = excluded.total_funding,
    student_fee = excluded.student_fee,
    prior_funding_note = excluded.prior_funding_note,
    needed_by = excluded.needed_by,
    -- A draft save keeps "needs_info" so the organizer still sees IAHV's note.
    status = case when p_submit then 'submitted'::public.funding_status else f.status end,
    submitted_at = case when p_submit then now() else f.submitted_at end
  returning id into v_id;

  delete from public.funding_request_documents where funding_request_id = v_id;
  insert into public.funding_request_documents (funding_request_id, document_id)
  select v_id, d from (select distinct unnest(v_docs) as d) ids;

  update public.courses
     set agreement_status = coalesce(p_agreement, agreement_status),
         est_participants = coalesce(p_est_participants, est_participants),
         funding_amount = p_total_funding
   where id = p_course_id;

  update public.course_steps
     set status = case when p_submit then 'waiting'::public.step_status else 'in_progress'::public.step_status end,
         updated_at = now()
   where course_id = p_course_id and step_no = 3 and status in ('locked', 'todo', 'in_progress', 'waiting');

  return v_id;
end;
$$;

grant execute on function public.save_funding_request(uuid, boolean, numeric, date, uuid[], numeric, text, public.agreement_status, integer) to authenticated;
revoke execute on function public.save_funding_request(uuid, boolean, numeric, date, uuid[], numeric, text, public.agreement_status, integer) from public, anon;
