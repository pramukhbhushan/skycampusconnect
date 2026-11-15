-- Course accounting and step progress (sprint-planning.md A-3.2). Owner: Engineer A (Aryan).
--
-- 1. save_funding_request(): submitting no longer requires the Journey course ID. plan-v3
--    says step 3 "can be submitted without a Journey ID but needs one before approval";
--    approval is B's approve_funding(), so the organizer side only warns.
-- 2. Step progress follows IAHV's actions (DECISIONS.md 004 b), without changing B's
--    functions: funding approved -> step 3 done; funding needs_info -> step 3 in progress;
--    invoice # issued -> step 4 done; invoice closed -> step 8 done.
-- 3. submit_accounting(): step 7. The organizer has entered the invoice # in Journey course
--    accounting: invoice -> accounting_submitted, step 7 done, step 8 waiting on payment.

create or replace function public.save_funding_request(
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


-- security definer: only touches course_steps of the course whose row just changed, in
-- reaction to a status change the caller was already allowed to make.
create function public.sync_steps_from_funding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    update public.course_steps
       set status = 'done', completed_at = now(), completed_by = new.reviewer_id, updated_at = now()
     where course_id = new.course_id and step_no = 3 and status <> 'done';
  elsif new.status = 'needs_info' then
    update public.course_steps set status = 'in_progress', updated_at = now()
     where course_id = new.course_id and step_no = 3 and status = 'waiting';
  end if;
  return new;
end;
$$;

create trigger funding_requests_sync_steps after update of status on public.funding_requests
  for each row when (old.status is distinct from new.status)
  execute function public.sync_steps_from_funding();

create function public.sync_steps_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'issued' then
    update public.course_steps
       set status = 'done', completed_at = now(), updated_at = now()
     where course_id = new.course_id and step_no = 4 and status <> 'done';
  elsif new.status = 'closed' then
    update public.course_steps
       set status = 'done', completed_at = now(), updated_at = now()
     where course_id = new.course_id and step_no = 8 and status <> 'done';
  end if;
  return new;
end;
$$;

create trigger invoices_sync_steps after update of status on public.invoices
  for each row when (old.status is distinct from new.status)
  execute function public.sync_steps_from_invoice();

revoke execute on function public.sync_steps_from_funding() from public, anon, authenticated;
revoke execute on function public.sync_steps_from_invoice() from public, anon, authenticated;

create function public.submit_accounting(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invoice public.invoices;
begin
  if v_uid is null then
    raise exception 'Sign in to submit course accounting' using errcode = '42501';
  end if;
  if not exists (select 1 from public.courses where id = p_course_id and organizer_id = v_uid) then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.course_steps where course_id = p_course_id and step_no = 6 and status = 'done') then
    raise exception 'Record attendance (step 6) first' using errcode = '22023';
  end if;

  select * into v_invoice from public.invoices
   where course_id = p_course_id and status <> 'rejected'
   order by requested_at desc limit 1;
  if not found or v_invoice.invoice_number is null then
    raise exception 'IAHV hasn''t issued your invoice # yet' using errcode = '22023';
  end if;
  if v_invoice.status not in ('issued', 'sent_to_client') then
    raise exception 'Course accounting was already submitted' using errcode = '22023';
  end if;

  update public.invoices set status = 'accounting_submitted', accounting_submitted_at = now()
   where id = v_invoice.id;

  update public.course_steps
     set status = 'done', completed_at = now(), completed_by = v_uid, updated_at = now()
   where course_id = p_course_id and step_no = 7;
  update public.course_steps set status = 'waiting', updated_at = now()
   where course_id = p_course_id and step_no = 8 and status in ('locked', 'todo', 'in_progress');

  return v_invoice.id;
end;
$$;

grant execute on function public.submit_accounting(uuid) to authenticated;
revoke execute on function public.submit_accounting(uuid) from public, anon;
