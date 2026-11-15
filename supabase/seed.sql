-- Sample data for LOCAL development (sprint-planning.md A-0.4).
-- Same campuses, organizers, courses and statuses as the frontend mock data.
-- Everything here is synthetic: fake people, example.test email addresses, made-up amounts.
--
-- Runs on `supabase db reset` (local database only). `supabase db push` does NOT run it.
-- Do not run this against the real project: it inserts fake rows into auth.users.
-- Organizers are fake auth.users rows (nobody can sign in as them); the
-- on_auth_user_created trigger creates their profiles, which are then filled in below.

-- ---------------------------------------------------------------------------
-- Campuses
-- ---------------------------------------------------------------------------
insert into public.campuses (id, name, country) values
  ('c0000000-0000-4000-8000-000000000001', 'University of Maryland, College Park', 'US'),
  ('c0000000-0000-4000-8000-000000000002', 'Purdue University', 'US'),
  ('c0000000-0000-4000-8000-000000000003', 'University of California, Los Angeles', 'US'),
  ('c0000000-0000-4000-8000-000000000004', 'George Washington University', 'US'),
  ('c0000000-0000-4000-8000-000000000005', 'Rutgers, The State University of New Jersey', 'US'),
  ('c0000000-0000-4000-8000-000000000006', 'The University of Texas at Austin', 'US'),
  ('c0000000-0000-4000-8000-000000000007', 'University of Toronto (CAD)', 'CA');

-- ---------------------------------------------------------------------------
-- Users: 7 organizers and 1 IAHV admin (fake auth.users rows)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'maya.chen@seed.example.test',     '{"full_name": "Maya Chen"}'),
  ('a0000000-0000-4000-8000-000000000002', 'arjun.patel@seed.example.test',   '{"full_name": "Arjun Patel"}'),
  ('a0000000-0000-4000-8000-000000000003', 'sofia.ramirez@seed.example.test', '{"full_name": "Sofia Ramirez"}'),
  ('a0000000-0000-4000-8000-000000000004', 'daniel.kim@seed.example.test',    '{"full_name": "Daniel Kim"}'),
  ('a0000000-0000-4000-8000-000000000005', 'hannah.lee@seed.example.test',    '{"full_name": "Hannah Lee"}'),
  ('a0000000-0000-4000-8000-000000000006', 'priya.shah@seed.example.test',    '{"full_name": "Priya Shah"}'),
  ('a0000000-0000-4000-8000-000000000007', 'ethan.wong@seed.example.test',    '{"full_name": "Ethan Wong"}'),
  ('a0000000-0000-4000-8000-0000000000ff', 'admin@seed.example.test',         '{"full_name": "Sample Admin"}');

-- The trigger made each profile an organizer without a campus; set campus and the admin role.
update public.profiles p set campus_id = v.campus_id::uuid
from (values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004'),
  ('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005'),
  ('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006'),
  ('a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000007')
) as v(id, campus_id)
where p.id = v.id::uuid;

update public.profiles set role = 'iahv_admin' where id = 'a0000000-0000-4000-8000-0000000000ff';

-- ---------------------------------------------------------------------------
-- Clients (who quotes and invoices go to)
-- ---------------------------------------------------------------------------
insert into public.clients (id, full_name, country, created_by) values
  ('d0000000-0000-4000-8000-000000000001', 'University of Maryland, College Park', 'US', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'Purdue University', 'US', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000003', 'University of California, Los Angeles', 'US', 'a0000000-0000-4000-8000-000000000003'),
  ('d0000000-0000-4000-8000-000000000004', 'George Washington University', 'US', 'a0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000005', 'Rutgers, The State University of New Jersey', 'US', 'a0000000-0000-4000-8000-000000000005');

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
insert into public.courses
  (id, organizer_id, campus_id, client_id, name, course_type, start_date, end_date,
   est_participants, funding_sources, funding_amount, agreement_status, journey_course_id, currency, country)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'UMD Spring Retreat', 'happiness', '2027-03-05', '2027-03-07', 14, '{university}', 900, 'yes', 'J-104582', 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'Fall Premium Retreat', 'premium', '2026-11-06', '2026-11-08', 14, '{students}', null, null, 'J-103977', 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null,
   'New retreat (untitled)', null, null, null, null, '{}', null, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',
   'Purdue Winter Retreat', 'happiness', '2027-01-22', '2027-01-24', null, '{}', null, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003',
   'UCLA Spring Retreat', 'happiness', '2027-03-12', '2027-03-14', null, '{}', 1300, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004',
   'GWU Fall Retreat', 'happiness', '2026-10-16', '2026-10-18', null, '{}', 700, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005',
   'Rutgers Fall Retreat', 'happiness', '2026-09-25', '2026-09-27', null, '{}', 1100, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', null,
   'UT Austin Fall Retreat', 'happiness', '2026-11-13', '2026-11-15', null, '{}', null, null, null, 'USD', 'US'),
  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000007', null,
   'Toronto Winter Retreat', 'happiness', '2026-12-04', '2026-12-06', null, '{}', null, null, null, 'CAD', 'CA');

-- ---------------------------------------------------------------------------
-- The 8 steps of every course (same statuses as the mock data)
-- ---------------------------------------------------------------------------
insert into public.course_steps (course_id, step_no, status)
select v.course_id::uuid, s.step_no::smallint, s.status::public.step_status
from (values
  ('e0000000-0000-4000-8000-000000000001', array['done','done','waiting','todo','todo','todo','todo','todo']),
  ('e0000000-0000-4000-8000-000000000002', array['done','done','skipped','done','done','done','waiting','todo']),
  ('e0000000-0000-4000-8000-000000000003', array['in_progress','todo','todo','todo','todo','todo','todo','todo']),
  ('e0000000-0000-4000-8000-000000000004', array['done','done','skipped','waiting','todo','todo','todo','todo']),
  ('e0000000-0000-4000-8000-000000000005', array['done','done','done','waiting','todo','todo','todo','todo']),
  ('e0000000-0000-4000-8000-000000000006', array['done','done','done','done','done','done','done','waiting']),
  ('e0000000-0000-4000-8000-000000000007', array['done','done','done','done','done','done','done','waiting']),
  ('e0000000-0000-4000-8000-000000000008', array['done','done','skipped','waiting','in_progress','todo','todo','todo']),
  ('e0000000-0000-4000-8000-000000000009', array['done','in_progress','todo','todo','todo','todo','todo','todo'])
) as v(course_id, statuses),
unnest(v.statuses) with ordinality as s(status, step_no);

-- ---------------------------------------------------------------------------
-- Funding requests (step 3)
-- ---------------------------------------------------------------------------
insert into public.funding_requests (id, course_id, total_funding, student_fee, needed_by, status, submitted_at, reviewed_at) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 900, 0, '2026-11-26', 'submitted', '2026-11-12', null),
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', 1300, 0, '2026-11-20', 'approved', '2026-11-03', '2026-11-05'),
  ('f0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 700, 0, '2026-09-30', 'approved', '2026-09-20', '2026-09-22'),
  ('f0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', 1100, 0, '2026-09-01', 'approved', '2026-08-20', '2026-08-22');

-- ---------------------------------------------------------------------------
-- Quotes and invoices
-- ---------------------------------------------------------------------------
insert into public.quotes (id, course_id, client_id, amount, status, requested_at) values
  ('b0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 1300, 'requested', '2026-11-06');

insert into public.invoices
  (id, course_id, client_id, amount, due_date, status, invoice_number, requested_at, accounting_submitted_at) values
  ('90000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 1400, '2026-12-08', 'sent_to_client',       'INV-24817', '2026-10-14', null),
  ('90000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002',  900, '2027-02-21', 'requested',            null,        '2026-11-10', null),
  ('90000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004',  700, '2026-11-30', 'accounting_submitted', 'INV-24790', '2026-09-28', '2026-11-01'),
  ('90000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000005', 1100, '2026-11-01', 'accounting_submitted', 'INV-24755', '2026-09-10', '2026-10-05');

-- ---------------------------------------------------------------------------
-- Sample audit-log entries
-- ---------------------------------------------------------------------------
insert into public.events (course_id, actor_id, type, payload) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'course.created', '{}'),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'funding.submitted', '{}'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'invoice.requested', '{}');
