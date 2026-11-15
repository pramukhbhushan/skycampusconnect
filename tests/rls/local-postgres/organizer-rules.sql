\set ON_ERROR_STOP 1
\set QUIET 1
-- Organizer-side checks for A's tables (sprint-planning.md A-1.3): courses, steps,
-- funding, quotes, documents and templates. Run through tests/rls/organizer.test.ts.
create function pg_temp.act_as(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u::text, false);
$$;
create function pg_temp.expect_fail(label text, q text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'FAIL (should have been blocked): %', label;
exception
  -- Only real access/constraint errors count as "blocked"; a typo in a check must not pass.
  when insufficient_privilege or check_violation or unique_violation or not_null_violation or foreign_key_violation
    or invalid_parameter_value or no_data_found then
    raise notice 'ok   blocked: % (%)', label, sqlerrm;
end $$;
create function pg_temp.expect_rows(label text, q text, n int) returns void language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') t' into got;
  if got <> n then raise exception 'FAIL: % expected % rows, got %', label, n, got; end if;
  raise notice 'ok   % (% rows)', label, got;
end $$;

create function pg_temp.expect_affected(label text, q text, n int) returns void language plpgsql as $$
declare got int;
begin
  execute q;
  get diagnostics got = row_count;
  if got <> n then raise exception 'FAIL: % expected % rows changed, got %', label, n, got; end if;
  raise notice 'ok   % (% rows changed)', label, got;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'maya@example.test', '{"full_name": "Maya"}'),
  ('22222222-2222-2222-2222-222222222222', 'priya@example.test', '{"full_name": "Priya"}');
\set maya '\'11111111-1111-1111-1111-111111111111\''
\set priya '\'22222222-2222-2222-2222-222222222222\''

-- ---- Maya sets up a course with everything attached ----------------------------
set role authenticated;
select pg_temp.act_as(:maya);
insert into public.courses (id, organizer_id, name, course_type, start_date, end_date)
  values ('aaaaaaaa-0000-0000-0000-000000000001', :maya, 'Maya course', 'happiness', '2027-03-05', '2027-03-07');
insert into public.course_steps (course_id, step_no, status)
  select 'aaaaaaaa-0000-0000-0000-000000000001', g, 'todo' from generate_series(1, 8) g;
insert into public.funding_requests (id, course_id, total_funding, needed_by, status, submitted_at)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 900, '2026-11-26', 'draft', null);
insert into public.quotes (id, course_id, amount) values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1300);
insert into public.documents (id, course_id, kind, storage_path, file_name, size_bytes, uploaded_by)
  values ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'proof_of_funds',
          'aaaaaaaa-0000-0000-0000-000000000001/letter.pdf', 'letter.pdf', 1200000, :maya);
insert into public.funding_request_documents values ('bbbbbbbb-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001');
insert into public.form_templates (owner_id, form_type, name, data) values (:maya, 'course', 'My usual course', '{"format": "in_person"}');

-- What an organizer may do on their own course.
update public.course_steps set status = 'done', completed_at = now(), completed_by = :maya
  where course_id = 'aaaaaaaa-0000-0000-0000-000000000001' and step_no = 1;
select pg_temp.expect_rows('organizer completes a step of own course',
  $$select 1 from public.course_steps where step_no = 1 and status = 'done'$$, 1);
update public.funding_requests set status = 'submitted', submitted_at = now() where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select pg_temp.expect_rows('organizer submits own funding request',
  $$select 1 from public.funding_requests where status = 'submitted'$$, 1);

-- What an organizer may not do on their own course.
select pg_temp.expect_fail('organizer marks funding needs_info',
  $$update public.funding_requests set status = 'needs_info' where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer writes a review note',
  $$update public.funding_requests set review_note = 'looks fine' where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer issues own quote number',
  $$update public.quotes set quote_number = 'Q-1' where id = 'dddddddd-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer marks own quote accepted',
  $$update public.quotes set status = 'accepted' where id = 'dddddddd-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer hands own course to someone else',
  $$update public.courses set organizer_id = '22222222-2222-2222-2222-222222222222' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);
select pg_temp.expect_affected('organizer cannot delete a course (only admins)',
  $$delete from public.courses where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0);
select pg_temp.expect_fail('document over 10 MB',
  $$insert into public.documents (course_id, kind, storage_path, file_name, size_bytes, uploaded_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'other', 'aaaaaaaa-0000-0000-0000-000000000001/big.pdf', 'big.pdf', 10485761, '11111111-1111-1111-1111-111111111111')$$);
select pg_temp.expect_fail('document recorded as uploaded by someone else',
  $$insert into public.documents (course_id, kind, storage_path, file_name, size_bytes, uploaded_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'other', 'aaaaaaaa-0000-0000-0000-000000000001/x.pdf', 'x.pdf', 100, '22222222-2222-2222-2222-222222222222')$$);
select pg_temp.expect_fail('two templates with the same name for one form',
  $$insert into public.form_templates (owner_id, form_type, name) values ('11111111-1111-1111-1111-111111111111', 'course', 'My usual course')$$);

-- ---- Priya can read none of it and change none of it ------------------------------
select pg_temp.act_as(:priya);
select pg_temp.expect_rows('other organizer sees no funding', 'select 1 from public.funding_requests', 0);
select pg_temp.expect_rows('other organizer sees no quotes', 'select 1 from public.quotes', 0);
select pg_temp.expect_rows('other organizer sees no document records', 'select 1 from public.documents', 0);
select pg_temp.expect_rows('other organizer sees no document links', 'select 1 from public.funding_request_documents', 0);
select pg_temp.expect_affected('other organizer cannot rename Maya''s course',
  $$update public.courses set name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0);
select pg_temp.expect_affected('other organizer cannot change Maya''s steps',
  $$update public.course_steps set status = 'done' where course_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0);
select pg_temp.expect_affected('other organizer cannot change Maya''s funding',
  $$update public.funding_requests set total_funding = 1$$, 0);
select pg_temp.expect_affected('other organizer cannot change Maya''s quote',
  $$update public.quotes set notes = 'x'$$, 0);
select pg_temp.expect_affected('other organizer cannot delete Maya''s document record',
  $$delete from public.documents$$, 0);
select pg_temp.expect_affected('other organizer cannot touch Maya''s template',
  $$update public.form_templates set name = 'Hacked'$$, 0);
select pg_temp.expect_fail('other organizer adds steps to Maya''s course',
  $$insert into public.course_steps (course_id, step_no) values ('aaaaaaaa-0000-0000-0000-000000000001', 1)$$);
select pg_temp.expect_fail('other organizer requests a quote on Maya''s course',
  $$insert into public.quotes (course_id, amount) values ('aaaaaaaa-0000-0000-0000-000000000001', 100)$$);
select pg_temp.expect_fail('other organizer records a document on Maya''s course',
  $$insert into public.documents (course_id, kind, storage_path, file_name, size_bytes, uploaded_by) values ('aaaaaaaa-0000-0000-0000-000000000001', 'other', 'aaaaaaaa-0000-0000-0000-000000000001/y.pdf', 'y.pdf', 100, '22222222-2222-2222-2222-222222222222')$$);
select pg_temp.expect_fail('other organizer links a file to Maya''s funding request',
  $$insert into public.funding_request_documents values ('bbbbbbbb-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001')$$);
select pg_temp.expect_fail('other organizer logs an invoice on Maya''s course',
  $$insert into public.invoices (course_id, amount) values ('aaaaaaaa-0000-0000-0000-000000000001', 100)$$);

-- ---- Creating a course (A-2.1) ------------------------------------------------------
select pg_temp.act_as(:maya);
select public.create_course('Students pay', 'happiness', 'in_person', '2027-04-02', '2027-04-04', null, null, 12, '{students}', '{"requirements": [true, false, false]}');
select pg_temp.expect_rows('create_course makes 8 steps',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Students pay'$$, 8);
select pg_temp.expect_rows('step 3 skipped when only students pay',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Students pay' and s.step_no = 3 and s.status = 'skipped'$$, 1);
select pg_temp.expect_rows('step 1 starts in progress with its checklist',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Students pay' and s.step_no = 1 and s.status = 'in_progress' and s.data ? 'requirements'$$, 1);
select pg_temp.expect_rows('course belongs to the caller',
  $$select 1 from public.courses where name = 'Students pay' and organizer_id = '11111111-1111-1111-1111-111111111111'$$, 1);
update public.courses set funding_sources = '{students,university}' where name = 'Students pay';
select pg_temp.expect_rows('adding a university payer reopens step 3',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Students pay' and s.step_no = 3 and s.status = 'todo'$$, 1);
update public.course_steps set status = 'waiting'
  where step_no = 3 and course_id = (select id from public.courses where name = 'Students pay');
update public.courses set funding_sources = '{students}' where name = 'Students pay';
select pg_temp.expect_rows('a started funding step is left alone',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Students pay' and s.step_no = 3 and s.status = 'waiting'$$, 1);
select public.create_course('Draft', null, null, null, null, null, null, null, null);
select pg_temp.expect_rows('a draft keeps step 3 open',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Draft' and s.step_no = 3 and s.status = 'todo'$$, 1);
insert into public.campuses (name) values ('Example State University');
select pg_temp.expect_rows('organizer adds a missing campus', $$select 1 from public.campuses where name = 'Example State University'$$, 1);
select pg_temp.expect_affected('organizer cannot rename a campus',
  $$update public.campuses set name = 'Renamed' where name = 'Example State University'$$, 0);

-- ---- Client privacy (DECISIONS.md 001) ----------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false); -- trusted SQL, no signed-in user
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'iahv_admin' where id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select pg_temp.act_as(:maya);
insert into public.clients (id, full_name, attn, email, created_by)
  values ('ffffffff-0000-0000-0000-000000000001', 'University of Maryland, College Park', 'Pat Payable', 'ap@example.test', :maya);
insert into public.clients (id, full_name, created_by)
  values ('ffffffff-0000-0000-0000-000000000002', 'Maya Unused Client', :maya);
update public.courses set client_id = 'ffffffff-0000-0000-0000-000000000001' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.expect_rows('creator sees own clients', 'select 1 from public.clients', 2);
select pg_temp.act_as(:priya);
select pg_temp.expect_rows('other organizer sees no one else''s clients', 'select 1 from public.clients', 0);
select pg_temp.expect_affected('other organizer cannot edit Maya''s client',
  $$update public.clients set email = 'x@evil.test'$$, 0);
insert into public.clients (id, full_name, created_by)
  values ('ffffffff-0000-0000-0000-000000000003', 'Priya Client', :priya);
select pg_temp.expect_rows('organizer sees the client she created', 'select 1 from public.clients', 1);
select pg_temp.expect_fail('organizer creates a client in someone else''s name',
  $$insert into public.clients (full_name, created_by) values ('Fake', '11111111-1111-1111-1111-111111111111')$$);
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
select pg_temp.expect_rows('admin sees every client', 'select 1 from public.clients', 3);
-- A client created by an admin and billed on Maya's course is visible to Maya.
insert into public.clients (id, full_name, created_by)
  values ('ffffffff-0000-0000-0000-000000000004', 'Admin-entered Client', '33333333-3333-3333-3333-333333333333');
update public.courses set client_id = 'ffffffff-0000-0000-0000-000000000004' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.act_as(:maya);
select pg_temp.expect_rows('organizer sees the client billed on her course',
  $$select 1 from public.clients where id = 'ffffffff-0000-0000-0000-000000000004'$$, 1);

-- ---- Requesting an invoice (A-3.1) ---------------------------------------------------
select pg_temp.act_as(:maya);
select pg_temp.expect_rows('fee: 14 happiness students = 500 + 4 x 100',
  $$select 1 from public.course_fee('happiness', 14, false) where total = 900 and extra_students = 4$$, 1);
select pg_temp.expect_rows('fee: card adds 3%, premium base 1000',
  $$select 1 from public.course_fee('premium', 10, true) where subtotal = 1000 and card_fee = 30 and total = 1030$$, 1);
select public.create_course('Invoice course', 'happiness', 'in_person', '2027-05-07', '2027-05-09', null, null, 14, '{students}');
insert into public.documents (id, course_id, kind, storage_path, file_name, size_bytes, uploaded_by)
  select 'eeeeeeee-0000-0000-0000-000000000002', id, 'agreement', id || '/0123456789abcdef-agreement.pdf', 'agreement.pdf', 5000, :maya
  from public.courses where name = 'Invoice course';
select pg_temp.expect_fail('invoice needs an agreement PDF',
  $$select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000002', 14, false, current_date + 30, '{}')$$);
select pg_temp.expect_fail('invoice cannot attach another course''s file',
  $$select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000002', 14, false, current_date + 30, '{eeeeeeee-0000-0000-0000-000000000001}')$$);
select pg_temp.expect_fail('invoice due date in the past',
  $$select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000002', 14, false, current_date - 1, '{eeeeeeee-0000-0000-0000-000000000002}')$$);
select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000002', 14, true, current_date + 30, '{eeeeeeee-0000-0000-0000-000000000002}', 'PO-1', 'Thanks');
select pg_temp.expect_rows('invoice requested with the server-computed amount',
  $$select 1 from public.invoices i join public.courses c on c.id = i.course_id
    where c.name = 'Invoice course' and i.status = 'requested' and i.amount = 927 and i.base_amount = 900 and i.cc_fee_applied and i.invoice_number is null$$, 1);
select pg_temp.expect_rows('agreement attached and client linked',
  $$select 1 from public.invoice_documents d join public.invoices i on i.id = d.invoice_id join public.courses c on c.id = i.course_id
    where c.name = 'Invoice course' and c.client_id = 'ffffffff-0000-0000-0000-000000000002'$$, 1);
select pg_temp.expect_rows('step 4 now waits on IAHV',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Invoice course' and s.step_no = 4 and s.status = 'waiting'$$, 1);
select pg_temp.expect_fail('a second invoice request for the same course',
  $$select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000002', 14, false, current_date + 30, '{eeeeeeee-0000-0000-0000-000000000002}')$$);
select pg_temp.act_as(:priya);
select pg_temp.expect_fail('other organizer requests an invoice on Maya''s course',
  $$select public.request_invoice((select id from public.courses where name = 'Invoice course'), 'ffffffff-0000-0000-0000-000000000003', 14, false, current_date + 30, '{eeeeeeee-0000-0000-0000-000000000002}')$$);
select pg_temp.act_as(:maya);

-- ---- Funding request (A-5.1) ----------------------------------------------------------
select pg_temp.act_as(:maya);
select public.create_course('Funded course', 'happiness', 'in_person', '2027-06-04', '2027-06-06', null, null, 12, '{university}');
insert into public.documents (id, course_id, kind, storage_path, file_name, size_bytes, uploaded_by)
  select 'eeeeeeee-0000-0000-0000-000000000003', id, 'proof_of_funds', id || '/0123456789abcdef-award.pdf', 'award.pdf', 5000, :maya
  from public.courses where name = 'Funded course';
select public.save_funding_request((select id from public.courses where name = 'Funded course'), false, null, null, '{}');
select pg_temp.expect_rows('a draft saves with nothing filled in and starts step 3',
  $$select 1 from public.funding_requests f join public.courses c on c.id = f.course_id join public.course_steps s on s.course_id = c.id and s.step_no = 3
    where c.name = 'Funded course' and f.status = 'draft' and s.status = 'in_progress'$$, 1);
select pg_temp.expect_fail('submit without proof of funds',
  $$select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 900, current_date + 10, '{}')$$);
select pg_temp.expect_fail('submit with another course''s file',
  $$select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 900, current_date + 10, '{eeeeeeee-0000-0000-0000-000000000002}')$$);
select pg_temp.expect_fail('submit with a past needed-by date',
  $$select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 900, current_date - 1, '{eeeeeeee-0000-0000-0000-000000000003}')$$);
select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 900, current_date + 10,
  '{eeeeeeee-0000-0000-0000-000000000003}', 0, 'none', 'yes', 14);
select pg_temp.expect_rows('submitted: proof attached, course updated, step 3 waiting',
  $$select 1 from public.funding_requests f join public.courses c on c.id = f.course_id
    join public.funding_request_documents d on d.funding_request_id = f.id
    join public.course_steps s on s.course_id = c.id and s.step_no = 3
    where c.name = 'Funded course' and f.status = 'submitted' and f.submitted_at is not null and f.total_funding = 900
      and c.agreement_status = 'yes' and c.est_participants = 14 and c.funding_amount = 900 and s.status = 'waiting'$$, 1);
select pg_temp.expect_fail('changing a request that is with IAHV',
  $$select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 1, current_date + 10, '{eeeeeeee-0000-0000-0000-000000000003}')$$);
select pg_temp.expect_fail('a students-pay course has no funding request',
  $$select public.save_funding_request((select id from public.courses where name = 'Invoice course'), false, null, null, '{}')$$);
-- IAHV asks for more information; the organizer can then change and resubmit.
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.funding_requests set status = 'needs_info', review_note = 'Letter must show the amount'
  where course_id = (select id from public.courses where name = 'Funded course');
set role authenticated;
select pg_temp.act_as(:maya);
select public.save_funding_request((select id from public.courses where name = 'Funded course'), false, 950, current_date + 10, '{eeeeeeee-0000-0000-0000-000000000003}');
select pg_temp.expect_rows('a draft save keeps needs_info and IAHV''s note',
  $$select 1 from public.funding_requests f join public.courses c on c.id = f.course_id
    where c.name = 'Funded course' and f.status = 'needs_info' and f.review_note is not null and f.total_funding = 950$$, 1);
select public.save_funding_request((select id from public.courses where name = 'Funded course'), true, 950, current_date + 10, '{eeeeeeee-0000-0000-0000-000000000003}');
select pg_temp.expect_rows('resubmitted after needs_info',
  $$select 1 from public.funding_requests f join public.courses c on c.id = f.course_id where c.name = 'Funded course' and f.status = 'submitted'$$, 1);
select pg_temp.act_as(:priya);
select pg_temp.expect_fail('other organizer saves funding on Maya''s course',
  $$select public.save_funding_request((select id from public.courses where name = 'Funded course'), false, 1, null, '{}')$$);
select pg_temp.act_as(:maya);

-- ---- Journey ID, step progress and course accounting (A-3.2) --------------------------
select pg_temp.act_as(:maya);
select public.create_course('No Journey yet', 'happiness', 'in_person', '2027-07-02', '2027-07-04', null, null, 12, '{donor}');
insert into public.documents (id, course_id, kind, storage_path, file_name, size_bytes, uploaded_by)
  select 'eeeeeeee-0000-0000-0000-000000000004', id, 'proof_of_funds', id || '/0123456789abcdef-pledge.pdf', 'pledge.pdf', 5000, :maya
  from public.courses where name = 'No Journey yet';
select public.save_funding_request((select id from public.courses where name = 'No Journey yet'), true, 500, current_date + 10, '{eeeeeeee-0000-0000-0000-000000000004}');
select pg_temp.expect_rows('funding can be submitted before the Journey ID (plan-v3)',
  $$select 1 from public.funding_requests f join public.courses c on c.id = f.course_id where c.name = 'No Journey yet' and f.status = 'submitted'$$, 1);
-- IAHV acts (trusted SQL stands in for B's admin functions).
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.funding_requests set status = 'needs_info', review_note = 'x'
  where course_id = (select id from public.courses where name = 'No Journey yet');
select pg_temp.expect_rows('needs_info puts step 3 back to in progress',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'No Journey yet' and s.step_no = 3 and s.status = 'in_progress'$$, 1);
update public.funding_requests set status = 'approved'
  where course_id = (select id from public.courses where name = 'No Journey yet');
select pg_temp.expect_rows('approval marks step 3 done',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'No Journey yet' and s.step_no = 3 and s.status = 'done'$$, 1);
update public.invoices set status = 'issued', invoice_number = 'INV-90001', issued_at = now()
  where course_id = (select id from public.courses where name = 'Invoice course');
select pg_temp.expect_rows('issuing the invoice # marks step 4 done',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Invoice course' and s.step_no = 4 and s.status = 'done'$$, 1);
set role authenticated;
select pg_temp.act_as(:maya);
select pg_temp.expect_fail('accounting before attendance is recorded',
  $$select public.submit_accounting((select id from public.courses where name = 'Invoice course'))$$);
update public.course_steps set status = 'done'
  where step_no = 6 and course_id = (select id from public.courses where name = 'Invoice course');
update public.course_steps set status = 'done'
  where step_no = 6 and course_id = (select id from public.courses where name = 'Students pay');
select pg_temp.expect_fail('accounting without an invoice #',
  $$select public.submit_accounting((select id from public.courses where name = 'Students pay'))$$);
select public.submit_accounting((select id from public.courses where name = 'Invoice course'));
select pg_temp.expect_rows('accounting submitted: invoice status, step 7 done, step 8 waiting',
  $$select 1 from public.invoices i join public.courses c on c.id = i.course_id
    join public.course_steps s7 on s7.course_id = c.id and s7.step_no = 7
    join public.course_steps s8 on s8.course_id = c.id and s8.step_no = 8
    where c.name = 'Invoice course' and i.status = 'accounting_submitted' and i.accounting_submitted_at is not null
      and s7.status = 'done' and s8.status = 'waiting'$$, 1);
select pg_temp.expect_fail('submitting accounting twice',
  $$select public.submit_accounting((select id from public.courses where name = 'Invoice course'))$$);
select pg_temp.act_as(:priya);
select pg_temp.expect_fail('other organizer submits Maya''s accounting',
  $$select public.submit_accounting((select id from public.courses where name = 'Invoice course'))$$);
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.invoices set status = 'paid', paid_at = now() where course_id = (select id from public.courses where name = 'Invoice course');
update public.invoices set status = 'closed', closed_at = now() where course_id = (select id from public.courses where name = 'Invoice course');
select pg_temp.expect_rows('closing the invoice marks step 8 done',
  $$select 1 from public.course_steps s join public.courses c on c.id = s.course_id where c.name = 'Invoice course' and s.step_no = 8 and s.status = 'done'$$, 1);
set role authenticated;
select pg_temp.act_as(:maya);

reset role;
set role anon;
select pg_temp.expect_fail('anonymous visitor creates a course',
  $$select public.create_course('x', null, null, null, null, null, null, null, null)$$);
reset role;
set role authenticated;

-- ---- Signed out -------------------------------------------------------------------
reset role;
set role anon;
select pg_temp.expect_fail('anonymous visitor reads funding', 'select * from public.funding_requests');
select pg_temp.expect_fail('anonymous visitor reads templates', 'select * from public.form_templates');
select pg_temp.expect_fail('anonymous visitor reads clients', 'select * from public.clients');
select pg_temp.expect_fail('anonymous visitor submits accounting',
  $$select public.submit_accounting(gen_random_uuid())$$);
select pg_temp.expect_fail('anonymous visitor requests an invoice',
  $$select public.request_invoice(gen_random_uuid(), gen_random_uuid(), 1, false, current_date, '{}')$$);
reset role;

\echo ALL ORGANIZER RULE CHECKS PASSED
