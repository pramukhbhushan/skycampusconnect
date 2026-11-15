-- Invoice request (sprint-planning.md A-3.1). Owner: Engineer A (Aryan).
--
-- course_fee() computes the fee from the admin-editable "pricing" setting, mirroring
-- computeFee() in lib/pricing.ts. request_invoice() creates the invoice, attaches the
-- agreement PDFs, links the client and marks step 4 as waiting on IAHV, in one
-- transaction, as the signed-in organizer (security invoker: row-level security applies).
-- The amount is always computed here, never taken from the browser.

create function public.course_fee(p_type public.course_type, p_participants integer, p_pay_by_card boolean)
returns table (base_amount numeric, extra_students integer, extra_amount numeric, subtotal numeric, card_fee numeric, total numeric)
language sql
stable
set search_path = ''
as $$
  with p as (
    select
      (value -> 'basePrice' ->> p_type::text)::numeric as base,
      (value ->> 'includedStudents')::integer as included,
      (value ->> 'extraStudentPrice')::numeric as extra_price,
      (value ->> 'cardFeeRate')::numeric as rate
    from public.settings where key = 'pricing'
  ),
  f as (
    select base, greatest(0, p_participants - included) as extra, extra_price, rate from p
  ),
  s as (
    select base, extra, extra * extra_price as extra_amount, base + extra * extra_price as subtotal, rate from f
  )
  select base, extra, extra_amount, subtotal,
         case when p_pay_by_card then round(subtotal * rate, 2) else 0 end,
         subtotal + case when p_pay_by_card then round(subtotal * rate, 2) else 0 end
  from s;
$$;

grant execute on function public.course_fee(public.course_type, integer, boolean) to authenticated;
revoke execute on function public.course_fee(public.course_type, integer, boolean) from public, anon;

create function public.request_invoice(
  p_course_id uuid,
  p_client_id uuid,
  p_participants integer,
  p_pay_by_card boolean,
  p_due_date date,
  p_document_ids uuid[],
  p_po_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_type public.course_type;
  v_fee record;
  v_invoice_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to request an invoice' using errcode = '42501';
  end if;

  select course_type into v_type from public.courses where id = p_course_id and organizer_id = v_uid;
  if not found then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  if v_type is null then
    raise exception 'Finish the course details (step 1) first' using errcode = '22023';
  end if;
  if exists (select 1 from public.invoices where course_id = p_course_id and status <> 'rejected') then
    raise exception 'An invoice was already requested for this course' using errcode = '23505';
  end if;
  if p_participants is null or p_participants < 1 or p_participants > 500 then
    raise exception 'Participants must be between 1 and 500' using errcode = '22023';
  end if;
  if p_due_date is null or p_due_date < current_date then
    raise exception 'Pick today or a later due date' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;
  if coalesce(cardinality(p_document_ids), 0) = 0 then
    raise exception 'Attach the signed agreement' using errcode = '22023';
  end if;
  if exists (
    select unnest(p_document_ids)
    except
    select id from public.documents where course_id = p_course_id
  ) then
    raise exception 'An attached file is not from this course' using errcode = '22023';
  end if;

  select * into v_fee from public.course_fee(v_type, p_participants, coalesce(p_pay_by_card, false));
  if v_fee.total is null then
    raise exception 'Pricing is not set up' using errcode = '22023';
  end if;

  insert into public.invoices (course_id, client_id, participants, base_amount, cc_fee_applied, amount,
                               due_date, po_number, notes)
  values (p_course_id, p_client_id, p_participants, v_fee.subtotal, coalesce(p_pay_by_card, false), v_fee.total,
          p_due_date, nullif(trim(p_po_number), ''), nullif(trim(p_notes), ''))
  returning id into v_invoice_id;

  insert into public.invoice_documents (invoice_id, document_id)
  select v_invoice_id, d from (select distinct unnest(p_document_ids) as d) ids;

  update public.courses set client_id = p_client_id where id = p_course_id;

  update public.course_steps set status = 'waiting', updated_at = now()
   where course_id = p_course_id and step_no = 4 and status in ('locked', 'todo', 'in_progress');

  return v_invoice_id;
end;
$$;

grant execute on function public.request_invoice(uuid, uuid, integer, boolean, date, uuid[], text, text) to authenticated;
revoke execute on function public.request_invoice(uuid, uuid, integer, boolean, date, uuid[], text, text) from public, anon;
