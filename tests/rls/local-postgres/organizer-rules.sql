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
  when insufficient_privilege or check_violation or unique_violation or not_null_violation or foreign_key_violation then
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
reset role;

\echo ALL ORGANIZER RULE CHECKS PASSED
