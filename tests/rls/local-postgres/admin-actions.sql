\set ON_ERROR_STOP 1
\set QUIET 1
-- Admin action functions (B-1.3 admin-side checks; B-3.1, B-5.1, B-6.1, B-2.2).
create function pg_temp.act_as(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u::text, false);
$$;
create function pg_temp.expect_fail(label text, q text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'FAIL (should have been refused): %', label;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok   refused: % (%)', label, sqlerrm;
end $$;
create function pg_temp.expect(label text, q text, want text) returns void language plpgsql as $$
declare got text;
begin
  execute q into got;
  if got is distinct from want then raise exception 'FAIL: % expected %, got %', label, want, got; end if;
  raise notice 'ok   % (%)', label, got;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'admin@iahv.org', '{"full_name": "IAHV Admin"}'),
  ('a0000000-0000-0000-0000-000000000002', 'mchen@umd.edu', '{"full_name": "Maya Chen"}');
update public.profiles set role = 'iahv_admin' where email = 'admin@iahv.org';

insert into public.courses (id, organizer_id, name, course_type) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'UMD Spring Retreat', 'happiness'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Fall Premium Retreat', 'premium');
insert into public.funding_requests (id, course_id, total_funding, status) values
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 900, 'submitted');
insert into public.quotes (id, course_id, amount) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 900);
insert into public.invoices (id, course_id, amount) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 900),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 1400);

set role authenticated;

-- ---- An organizer can't use any of them ----------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-000000000002');
select pg_temp.expect_fail('organizer approves own funding', $$select public.approve_funding('f0000000-0000-0000-0000-000000000001')$$);
select pg_temp.expect_fail('organizer issues own invoice number', $$select public.issue_invoice_number('e0000000-0000-0000-0000-000000000001', 'INV-1')$$);
select pg_temp.expect_fail('organizer issues own quote number', $$select public.issue_quote_number('d0000000-0000-0000-0000-000000000001', 'Q-1')$$);
select pg_temp.expect_fail('organizer makes self admin', $$select public.set_user_role('a0000000-0000-0000-0000-000000000002', 'iahv_admin')$$);

-- ---- Admin: funding -------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-000000000001');
select pg_temp.expect_fail('needs-info without a note', $$select public.request_funding_info('f0000000-0000-0000-0000-000000000001', '  ')$$);
select public.request_funding_info('f0000000-0000-0000-0000-000000000001', 'Please attach the signed award letter');
select pg_temp.expect('funding sent back with note', $$select status || ': ' || review_note from public.funding_requests$$, 'needs_info: Please attach the signed award letter');
select public.approve_funding('f0000000-0000-0000-0000-000000000001');
select pg_temp.expect('funding approved and reviewer recorded', $$select status || ' by ' || (reviewer_id = 'a0000000-0000-0000-0000-000000000001')::text from public.funding_requests$$, 'approved by true');
select pg_temp.expect_fail('approving twice', $$select public.approve_funding('f0000000-0000-0000-0000-000000000001')$$);

-- ---- Admin: quotes ---------------------------------------------------------------
select pg_temp.expect_fail('settling a quote before it is issued', $$select public.settle_quote('d0000000-0000-0000-0000-000000000001', 'accepted')$$);
select public.issue_quote_number('d0000000-0000-0000-0000-000000000001', ' q-1042 ');
select public.settle_quote('d0000000-0000-0000-0000-000000000001', 'revised');
select public.issue_quote_number('d0000000-0000-0000-0000-000000000001', 'Q-1042B');
select public.settle_quote('d0000000-0000-0000-0000-000000000001', 'accepted');
select pg_temp.expect('quote issued, revised, reissued, accepted', $$select status || ' ' || quote_number || ' v' || version from public.quotes$$, 'accepted Q-1042B v2');

-- ---- Admin: invoices -------------------------------------------------------------
select pg_temp.expect_fail('closing an unpaid invoice', $$select public.close_invoice('e0000000-0000-0000-0000-000000000001')$$);
select pg_temp.expect_fail('marking an un-issued invoice sent', $$select public.mark_invoice_sent('e0000000-0000-0000-0000-000000000001')$$);
select public.issue_invoice_number('e0000000-0000-0000-0000-000000000001', 'inv-24901');
select pg_temp.expect_fail('reusing an invoice number', $$select public.issue_invoice_number('e0000000-0000-0000-0000-000000000002', 'INV-24901')$$);
select pg_temp.expect_fail('issuing a number twice', $$select public.issue_invoice_number('e0000000-0000-0000-0000-000000000001', 'INV-24902')$$);
select public.mark_invoice_sent('e0000000-0000-0000-0000-000000000001');
select public.mark_invoice_paid('e0000000-0000-0000-0000-000000000001');
select public.close_invoice('e0000000-0000-0000-0000-000000000001');
select pg_temp.expect('invoice lifecycle with timestamps',
  $$select status || ' ' || invoice_number || ' ' || (issued_at is not null and sent_at is not null and paid_at is not null and closed_at is not null)::text from public.invoices where id = 'e0000000-0000-0000-0000-000000000001'$$,
  'closed INV-24901 true');

-- ---- Admin: roles ------------------------------------------------------------------
select pg_temp.expect_fail('admin removes own admin access', $$select public.set_user_role('a0000000-0000-0000-0000-000000000001', 'organizer')$$);
select public.set_user_role('a0000000-0000-0000-0000-000000000002', 'iahv_admin');
select public.set_user_role('a0000000-0000-0000-0000-000000000002', 'organizer');
select pg_temp.expect('promote then demote another person', $$select role::text from public.profiles where email = 'mchen@umd.edu'$$, 'organizer');

-- ---- Audit trail -----------------------------------------------------------------
select pg_temp.expect('every action wrote an event as the admin',
  $$select count(*)::text from public.events where actor_id = 'a0000000-0000-0000-0000-000000000001'$$, '10');
select pg_temp.expect('the organizer can see the trail for her course',
  $$select (set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false) is not null and true)::text || ' ' || (select count(*) from public.events)::text$$, 'true 10');

reset role;
set role anon;
select pg_temp.expect_fail('anonymous visitor calls an admin action', $$select public.approve_funding('f0000000-0000-0000-0000-000000000001')$$);
reset role;

\echo ALL ADMIN ACTION CHECKS PASSED
