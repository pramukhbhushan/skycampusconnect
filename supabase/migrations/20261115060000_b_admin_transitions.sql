-- Admin status changes (sprint-planning.md B-3.1, B-5.1, B-6.1, B-2.2). Owner: Engineer B.
-- One function per action, so the app never writes these columns directly. Each checks
-- the caller is an IAHV admin, allows only the next valid status (same rules as
-- lib/admin/transitions.ts), stamps the time, and writes an audit event.
-- They run as the caller (security invoker), so row-level security and the
-- guard_admin_fields trigger from the initial schema still apply.

create function public.require_iahv_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_iahv_admin() then
    raise exception 'Only an IAHV admin can do this' using errcode = '42501';
  end if;
end;
$$;

create function public.log_admin_event(p_course_id uuid, p_type text, p_payload jsonb default '{}')
returns void
language sql
set search_path = ''
as $$
  insert into public.events (course_id, actor_id, type, payload)
  values (p_course_id, (select auth.uid()), p_type, p_payload);
$$;

-- ---- Funding (B-5.1) ------------------------------------------------------

create function public.approve_funding(p_request_id uuid)
returns public.funding_requests
language plpgsql
set search_path = ''
as $$
declare r public.funding_requests;
begin
  perform public.require_iahv_admin();
  update public.funding_requests
     set status = 'approved', reviewer_id = (select auth.uid()), reviewed_at = now(), review_note = null
   where id = p_request_id and status in ('submitted', 'needs_info')
  returning * into r;
  if not found then
    raise exception 'This funding request is not waiting for approval' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'funding.approved');
  return r;
end;
$$;

create function public.request_funding_info(p_request_id uuid, p_note text)
returns public.funding_requests
language plpgsql
set search_path = ''
as $$
declare r public.funding_requests;
begin
  perform public.require_iahv_admin();
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Tell the organizer what is missing' using errcode = '22023';
  end if;
  update public.funding_requests
     set status = 'needs_info', reviewer_id = (select auth.uid()), reviewed_at = now(), review_note = trim(p_note)
   where id = p_request_id and status = 'submitted'
  returning * into r;
  if not found then
    raise exception 'This funding request is not waiting for review' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'funding.needs_info', jsonb_build_object('note', trim(p_note)));
  return r;
end;
$$;

-- ---- Quotes (B-6.1) -------------------------------------------------------

create function public.issue_quote_number(p_quote_id uuid, p_number text)
returns public.quotes
language plpgsql
set search_path = ''
as $$
declare r public.quotes;
begin
  perform public.require_iahv_admin();
  if coalesce(trim(p_number), '') = '' then
    raise exception 'Enter the quote number' using errcode = '22023';
  end if;
  update public.quotes
     set status = 'issued', quote_number = upper(trim(p_number)), issued_at = now()
   where id = p_quote_id and status in ('requested', 'revised')
  returning * into r;
  if not found then
    raise exception 'This quote is not waiting for a number' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'quote.issued', jsonb_build_object('number', r.quote_number));
  return r;
end;
$$;

-- p_status: accepted | revised | expired, only from issued.
create function public.settle_quote(p_quote_id uuid, p_status public.quote_status)
returns public.quotes
language plpgsql
set search_path = ''
as $$
declare r public.quotes;
begin
  perform public.require_iahv_admin();
  if p_status not in ('accepted', 'revised', 'expired') then
    raise exception 'A quote can only be accepted, revised or expired here' using errcode = '22023';
  end if;
  update public.quotes
     set status = p_status, version = version + (case when p_status = 'revised' then 1 else 0 end)
   where id = p_quote_id and status = 'issued'
  returning * into r;
  if not found then
    raise exception 'Only an issued quote can be updated' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'quote.' || p_status::text);
  return r;
end;
$$;

-- ---- Invoices (B-3.1) -----------------------------------------------------

create function public.issue_invoice_number(p_invoice_id uuid, p_number text)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare r public.invoices;
begin
  perform public.require_iahv_admin();
  if coalesce(trim(p_number), '') = '' then
    raise exception 'Enter the invoice number' using errcode = '22023';
  end if;
  update public.invoices
     set status = 'issued', invoice_number = upper(trim(p_number)), issued_at = now(), is_placeholder = false
   where id = p_invoice_id and status = 'requested'
  returning * into r;
  if not found then
    raise exception 'This invoice is not waiting for a number' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'invoice.issued', jsonb_build_object('number', r.invoice_number));
  return r;
end;
$$;

create function public.mark_invoice_sent(p_invoice_id uuid)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare r public.invoices;
begin
  perform public.require_iahv_admin();
  update public.invoices set status = 'sent_to_client', sent_at = now()
   where id = p_invoice_id and status = 'issued'
  returning * into r;
  if not found then
    raise exception 'Only an issued invoice can be marked sent' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'invoice.sent');
  return r;
end;
$$;

create function public.mark_invoice_paid(p_invoice_id uuid)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare r public.invoices;
begin
  perform public.require_iahv_admin();
  update public.invoices set status = 'paid', paid_at = now()
   where id = p_invoice_id and status in ('issued', 'sent_to_client', 'accounting_submitted')
  returning * into r;
  if not found then
    raise exception 'This invoice can''t be marked paid from its current status' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'invoice.paid');
  return r;
end;
$$;

create function public.close_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare r public.invoices;
begin
  perform public.require_iahv_admin();
  update public.invoices set status = 'closed', closed_at = now()
   where id = p_invoice_id and status = 'paid'
  returning * into r;
  if not found then
    raise exception 'Only a paid invoice can be closed' using errcode = '22023';
  end if;
  perform public.log_admin_event(r.course_id, 'invoice.closed');
  return r;
end;
$$;

-- ---- Roles (B-2.2) ---------------------------------------------------------

create function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
set search_path = ''
as $$
declare r public.profiles;
begin
  perform public.require_iahv_admin();
  if p_role = 'organizer' then
    if p_user_id = (select auth.uid()) then
      raise exception 'You can''t remove your own admin access' using errcode = '22023';
    end if;
    if not exists (select 1 from public.profiles where role = 'iahv_admin' and id <> p_user_id) then
      raise exception 'There must be at least one IAHV admin' using errcode = '22023';
    end if;
  end if;
  update public.profiles set role = p_role where id = p_user_id returning * into r;
  if not found then
    raise exception 'That person does not exist' using errcode = '22023';
  end if;
  return r;
end;
$$;

-- Only signed-in users can call these (and each checks for an IAHV admin).
do $$
declare f text;
begin
  foreach f in array array[
    'require_iahv_admin()', 'log_admin_event(uuid, text, jsonb)',
    'approve_funding(uuid)', 'request_funding_info(uuid, text)',
    'issue_quote_number(uuid, text)', 'settle_quote(uuid, public.quote_status)',
    'issue_invoice_number(uuid, text)', 'mark_invoice_sent(uuid)', 'mark_invoice_paid(uuid)', 'close_invoice(uuid)',
    'set_user_role(uuid, public.user_role)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
