\set ON_ERROR_STOP 1
\set QUIET 1
-- Helpers: act as a user, and assert a statement fails / succeeds.
create function pg_temp.act_as(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u::text, false);
$$;
create function pg_temp.expect_fail(label text, q text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'FAIL (should have been blocked): %', label;
exception
  when insufficient_privilege or check_violation or not_null_violation or foreign_key_violation then
    raise notice 'ok   blocked: % (%)', label, sqlerrm;
  when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'ok   blocked: % (%)', label, sqlerrm;
end $$;
create function pg_temp.expect_rows(label text, q text, n int) returns void language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') t' into got;
  if got <> n then raise exception 'FAIL: % expected % rows, got %', label, n, got; end if;
  raise notice 'ok   % (% rows)', label, got;
end $$;

-- Three Google sign-ins. The trigger should make each an organizer.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'mchen@umd.edu', '{"full_name": "Maya Chen"}'),
  ('22222222-2222-2222-2222-222222222222', 'pshah@utexas.edu', '{"name": "Priya Shah"}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@iahv.org', '{"full_name": "IAHV Admin"}');
select pg_temp.expect_rows('new sign-ins become organizers', $$select 1 from public.profiles where role = 'organizer'$$, 3);
select pg_temp.expect_rows('name copied from Google profile', $$select 1 from public.profiles where name in ('Maya Chen','Priya Shah')$$, 2);
-- Promote the admin from trusted SQL (no signed-in user), like the dashboard SQL editor.
update public.profiles set role = 'iahv_admin' where email = 'admin@iahv.org';

\set maya '\'11111111-1111-1111-1111-111111111111\''
\set priya '\'22222222-2222-2222-2222-222222222222\''
\set admin '\'33333333-3333-3333-3333-333333333333\''

-- ---- Organizer: Maya --------------------------------------------------------
set role authenticated;
select pg_temp.act_as(:maya);
insert into public.courses (id, organizer_id, name, course_type, start_date, end_date)
  values ('aaaaaaaa-0000-0000-0000-000000000001', :maya, 'UMD Spring Retreat', 'happiness', '2027-03-05', '2027-03-07');
insert into public.course_steps (course_id, step_no, status) select 'aaaaaaaa-0000-0000-0000-000000000001', g, 'todo' from generate_series(1, 8) g;
select pg_temp.expect_rows('organizer sees own course', 'select 1 from public.courses', 1);
select pg_temp.expect_fail('organizer creates a course for someone else',
  $$insert into public.courses (organizer_id, name) values ('22222222-2222-2222-2222-222222222222', 'Not mine')$$);
select pg_temp.expect_fail('end date before start date',
  $$insert into public.courses (organizer_id, name, start_date, end_date) values ('11111111-1111-1111-1111-111111111111', 'Bad dates', '2027-03-07', '2027-03-05')$$);
select pg_temp.expect_fail('organizer makes self admin',
  $$update public.profiles set role = 'iahv_admin' where id = '11111111-1111-1111-1111-111111111111'$$);
select pg_temp.expect_rows('organizer sees only own profile', 'select 1 from public.profiles', 1);

-- Funding: submit yes, approve no.
insert into public.funding_requests (id, course_id, total_funding, needed_by, status, submitted_at)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 900, '2026-11-26', 'submitted', now());
select pg_temp.expect_fail('organizer approves own funding',
  $$update public.funding_requests set status = 'approved' where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer inserts already-approved funding',
  $$insert into public.funding_requests (course_id, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'approved')$$);

-- Invoice: request yes, set the number no, mark accounting submitted yes.
insert into public.invoices (id, course_id, amount, due_date)
  values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 900, '2027-04-04');
select pg_temp.expect_fail('organizer enters own invoice number',
  $$update public.invoices set invoice_number = 'INV-1' where id = 'cccccccc-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer marks invoice paid',
  $$update public.invoices set status = 'paid', paid_at = now() where id = 'cccccccc-0000-0000-0000-000000000001'$$);
select pg_temp.expect_fail('organizer inserts an issued invoice',
  $$insert into public.invoices (course_id, invoice_number) values ('aaaaaaaa-0000-0000-0000-000000000001', 'INV-FAKE')$$);
update public.invoices set status = 'accounting_submitted', accounting_submitted_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';
select pg_temp.expect_fail('organizer issues own quote',
  $$insert into public.quotes (course_id, status, quote_number) values ('aaaaaaaa-0000-0000-0000-000000000001', 'issued', 'Q-1')$$);

-- Templates are private; reminder emails are admin-only.
insert into public.form_templates (owner_id, form_type, name, data) values (:maya, 'invoice_request', 'UMD billing', '{"client": "UMD"}');
select pg_temp.expect_fail('organizer sends a reminder email',
  $$insert into public.email_log (from_admin_id, from_email, to_email, subject, body) values ('11111111-1111-1111-1111-111111111111', 'm@umd.edu', 'x@y.edu', 's', 'b')$$);
update public.settings set value = '{}' where key = 'pricing'; -- RLS: silently updates 0 rows
select pg_temp.expect_rows('organizer cannot change pricing (no rows updated)',
  $$select 1 from public.settings where value = '{}'::jsonb$$, 0);
insert into public.events (course_id, actor_id, type) values ('aaaaaaaa-0000-0000-0000-000000000001', :maya, 'invoice.requested');
select pg_temp.expect_fail('organizer logs an event as someone else',
  $$insert into public.events (course_id, actor_id, type) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'x')$$);

-- Storage: own course folder only.
insert into storage.objects (bucket_id, name) values ('documents', 'aaaaaaaa-0000-0000-0000-000000000001/letter.pdf');

-- ---- Organizer: Priya can't see Maya's anything -------------------------------
select pg_temp.act_as(:priya);
select pg_temp.expect_rows('other organizer sees none of Maya''s courses', 'select 1 from public.courses', 0);
select pg_temp.expect_rows('other organizer sees none of Maya''s invoices', 'select 1 from public.invoices', 0);
select pg_temp.expect_rows('other organizer sees none of Maya''s steps', 'select 1 from public.course_steps', 0);
select pg_temp.expect_rows('other organizer sees none of Maya''s templates', 'select 1 from public.form_templates', 0);
select pg_temp.expect_rows('other organizer sees none of Maya''s files', 'select 1 from storage.objects', 0);
select pg_temp.expect_fail('other organizer uploads into Maya''s course folder',
  $$insert into storage.objects (bucket_id, name) values ('documents', 'aaaaaaaa-0000-0000-0000-000000000001/x.pdf')$$);
select pg_temp.expect_fail('upload with a non-uuid folder',
  $$insert into storage.objects (bucket_id, name) values ('documents', '../etc/x.pdf')$$);
select pg_temp.expect_fail('other organizer creates a funding request on Maya''s course',
  $$insert into public.funding_requests (course_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$);

-- ---- IAHV admin ---------------------------------------------------------------
select pg_temp.act_as(:admin);
select pg_temp.expect_rows('admin sees every profile', 'select 1 from public.profiles', 3);
select pg_temp.expect_rows('admin sees every course', 'select 1 from public.courses', 1);
update public.funding_requests set status = 'approved', reviewer_id = :admin, reviewed_at = now() where id = 'bbbbbbbb-0000-0000-0000-000000000001';
update public.invoices set invoice_number = 'INV-24817', status = 'issued', issued_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';
select pg_temp.expect_rows('admin approved funding', $$select 1 from public.funding_requests where status = 'approved'$$, 1);
select pg_temp.expect_rows('admin issued invoice #', $$select 1 from public.invoices where invoice_number = 'INV-24817'$$, 1);
insert into public.email_log (course_id, from_admin_id, from_email, to_email, subject, body)
  values ('aaaaaaaa-0000-0000-0000-000000000001', :admin, 'admin@iahv.org', 'mchen@umd.edu', 'Please submit course accounting', 'Hi Maya,');
select pg_temp.expect_fail('admin sends an email as another admin',
  $$insert into public.email_log (from_admin_id, from_email, to_email, subject, body) values ('11111111-1111-1111-1111-111111111111', 'a', 'b', 's', 'b')$$);
select pg_temp.expect_rows('admin cannot see organizer templates either', 'select 1 from public.form_templates', 0);
select pg_temp.expect_rows('admin sees every file', 'select 1 from storage.objects', 1);
update public.settings set value = jsonb_set(value, '{extraStudentPrice}', '110') where key = 'pricing';
update public.profiles set role = 'iahv_admin' where id = :priya;
update public.profiles set role = 'organizer' where id = :priya;

-- Maya can read the reminder sent about her course.
select pg_temp.act_as(:maya);
select pg_temp.expect_rows('organizer sees reminders about own course', 'select 1 from public.email_log', 1);

-- ---- Not signed in -------------------------------------------------------------
reset role;
set role anon;
select pg_temp.expect_fail('anonymous visitor reads courses', 'select * from public.courses');
reset role;

\echo ALL ACCESS-RULE CHECKS PASSED
