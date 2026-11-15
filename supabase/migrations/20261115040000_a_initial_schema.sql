-- SKY Campus Connect: initial schema (sprint-planning.md task A-0.2).
-- Every table in plan-v3's data model, with row-level security for the two roles:
--   organizer   - sees and edits only their own courses, documents and templates
--   iahv_admin  - sees and edits everything
-- Merged migrations are never edited. Later changes go in new files named
-- <timestamp>_<a|b>_<what>.sql (sprint-planning.md 1.3).

-- ---------------------------------------------------------------------------
-- Enums (status values are a contract: keep in sync with lib/types.ts)
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('organizer', 'iahv_admin');
create type public.course_type as enum ('happiness', 'premium');
create type public.course_format as enum ('in_person', 'online');
create type public.funder as enum ('students', 'university', 'sponsor', 'donor');
create type public.agreement_status as enum ('yes', 'in_progress', 'no', 'not_at_this_time');
-- 'waiting' = waiting on IAHV, or an organizer action is due (same meaning as lib/types.ts StepStatus).
create type public.step_status as enum ('locked', 'todo', 'in_progress', 'waiting', 'done', 'skipped');
create type public.funding_status as enum ('draft', 'submitted', 'approved', 'needs_info');
create type public.quote_status as enum ('requested', 'issued', 'accepted', 'revised', 'expired');
create type public.invoice_status as enum (
  'requested', 'issued', 'sent_to_client', 'accounting_submitted', 'paid', 'closed', 'rejected'
);
create type public.document_kind as enum ('proof_of_funds', 'agreement', 'other');
create type public.form_type as enum ('course', 'funding_request', 'quote_request', 'invoice_request', 'reminder_email');
create type public.email_status as enum ('queued', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null default 'US' check (country in ('US', 'CA')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  role public.user_role not null default 'organizer',
  campus_id uuid references public.campuses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who quotes and invoices go to; reused per university.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  attn text,
  address text,
  email text,
  country text not null default 'US' check (country in ('US', 'CA')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  course_type public.course_type, -- null while the course is still a draft
  format public.course_format not null default 'in_person',
  start_date date,
  end_date date,
  teachers text,
  est_participants integer check (est_participants >= 0),
  actual_participants integer check (actual_participants >= 0),
  funding_sources public.funder[] not null default '{}',
  funding_amount numeric(12, 2) check (funding_amount >= 0),
  agreement_status public.agreement_status,
  journey_course_id text,
  journey_status text,
  currency text not null default 'USD' check (currency in ('USD', 'CAD')),
  country text not null default 'US' check (country in ('US', 'CA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_dates_ordered check (end_date is null or start_date is null or end_date >= start_date)
);

-- One row per course step (1-8). The "current step" is derived, not stored.
create table public.course_steps (
  course_id uuid not null references public.courses (id) on delete cascade,
  step_no smallint not null check (step_no between 1 and 8),
  status public.step_status not null default 'todo',
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (course_id, step_no)
);

create table public.funding_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses (id) on delete cascade,
  total_funding numeric(12, 2) check (total_funding > 0),
  student_fee numeric(12, 2) not null default 0 check (student_fee >= 0),
  prior_funding_note text,
  needed_by date,
  status public.funding_status not null default 'draft',
  submitted_at timestamptz,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(12, 2) check (amount > 0),
  status public.quote_status not null default 'requested',
  quote_number text unique,
  version integer not null default 1 check (version >= 1),
  notes text,
  requested_at timestamptz not null default now(),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  po_number text,
  participants integer check (participants >= 0),
  base_amount numeric(12, 2) check (base_amount >= 0),
  cc_fee_applied boolean not null default false,
  amount numeric(12, 2) check (amount > 0),
  due_date date,
  status public.invoice_status not null default 'requested',
  invoice_number text unique,
  is_placeholder boolean not null default false,
  notes text,
  requested_at timestamptz not null default now(),
  issued_at timestamptz,
  sent_at timestamptz,
  accounting_submitted_at timestamptz,
  paid_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uploaded PDFs (Supabase Storage bucket "documents", path "<course_id>/<file>").
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null unique,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A document is saved once and reused (e.g. proof of funds reused for the invoice).
create table public.funding_request_documents (
  funding_request_id uuid not null references public.funding_requests (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  primary key (funding_request_id, document_id)
);

create table public.invoice_documents (
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  primary key (invoice_id, document_id)
);

-- "Save as template" (plan-v3). Templates are private to their owner.
create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  form_type public.form_type not null,
  name text not null check (length(trim(name)) > 0),
  schema_version integer not null default 1,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, form_type, name)
);

-- Pre-written reminder texts that admins edit in Settings.
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subject text not null,
  body text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Every reminder email sent: always by an admin, to the course organizer.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  template_id uuid references public.email_templates (id) on delete set null,
  from_admin_id uuid not null references public.profiles (id) on delete restrict,
  from_email text not null,
  to_email text not null,
  subject text not null,
  body text not null,
  status public.email_status not null default 'queued',
  provider_message_id text,
  sent_at timestamptz not null default now()
);

-- Audit log: who did what, when.
create table public.events (
  id bigint generated always as identity primary key,
  course_id uuid references public.courses (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}',
  at timestamptz not null default now()
);

-- Admin-editable settings (pricing constants, ...).
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('pricing', '{"basePrice": {"happiness": 500, "premium": 1000}, "includedStudents": 10, "extraStudentPrice": 100, "cardFeeRate": 0.03}');

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys and the dashboard's common filters)
-- ---------------------------------------------------------------------------

create index profiles_campus_id_idx on public.profiles (campus_id);
create index clients_created_by_idx on public.clients (created_by);
create index courses_organizer_id_idx on public.courses (organizer_id);
create index courses_campus_id_idx on public.courses (campus_id);
create index courses_client_id_idx on public.courses (client_id);
create index courses_start_date_idx on public.courses (start_date);
create index course_steps_completed_by_idx on public.course_steps (completed_by);
create index funding_requests_status_idx on public.funding_requests (status);
create index funding_requests_reviewer_id_idx on public.funding_requests (reviewer_id);
create index quotes_course_id_idx on public.quotes (course_id);
create index quotes_client_id_idx on public.quotes (client_id);
create index quotes_status_idx on public.quotes (status);
create index invoices_course_id_idx on public.invoices (course_id);
create index invoices_client_id_idx on public.invoices (client_id);
create index invoices_quote_id_idx on public.invoices (quote_id);
create index invoices_status_due_idx on public.invoices (status, due_date);
create index documents_course_id_idx on public.documents (course_id);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index funding_request_documents_document_id_idx on public.funding_request_documents (document_id);
create index invoice_documents_document_id_idx on public.invoice_documents (document_id);
create index email_templates_updated_by_idx on public.email_templates (updated_by);
create index email_log_course_id_idx on public.email_log (course_id);
create index email_log_template_id_idx on public.email_log (template_id);
create index email_log_from_admin_id_idx on public.email_log (from_admin_id);
create index events_course_id_at_idx on public.events (course_id, at desc);
create index events_actor_id_idx on public.events (actor_id);
create index settings_updated_by_idx on public.settings (updated_by);

-- ---------------------------------------------------------------------------
-- Helper functions used by the policies
-- ---------------------------------------------------------------------------

-- security definer so policies can check the caller's role without recursing into profiles RLS.
create function public.is_iahv_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'iahv_admin'
  );
$$;

create function public.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses
    where id = p_course_id and organizer_id = (select auth.uid())
  );
$$;

-- Organizer can see the course, or the caller is an IAHV admin.
create function public.can_access_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_iahv_admin() or public.owns_course(p_course_id);
$$;

revoke execute on function public.is_iahv_admin() from public, anon;
revoke execute on function public.owns_course(uuid) from public, anon;
revoke execute on function public.can_access_course(uuid) from public, anon;
grant execute on function public.is_iahv_admin() to authenticated;
grant execute on function public.owns_course(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger course_steps_updated_at before update on public.course_steps for each row execute function public.set_updated_at();
create trigger funding_requests_updated_at before update on public.funding_requests for each row execute function public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger form_templates_updated_at before update on public.form_templates for each row execute function public.set_updated_at();
create trigger email_templates_updated_at before update on public.email_templates for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();

-- Every new sign-in (Google) gets a profile as an organizer. Only an admin can promote them.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    'organizer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-only fields. RLS lets organizers edit their own rows; these triggers stop them
-- changing the parts only IAHV may set (plan-v3: enforced in Postgres, not just the UI).
create function public.guard_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Admins, the server's service role, and trusted SQL with no signed-in user
  -- (migrations, seed data, the dashboard SQL editor) may set anything.
  if public.is_iahv_admin()
     or (select auth.role()) = 'service_role'
     or (select auth.uid()) is null then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if new.role is distinct from old.role then
      raise exception 'Only an IAHV admin can change roles' using errcode = '42501';
    end if;

  elsif tg_table_name = 'funding_requests' then
    if tg_op = 'INSERT' then
      if new.status not in ('draft', 'submitted') or new.reviewer_id is not null or new.reviewed_at is not null then
        raise exception 'Only an IAHV admin can approve funding' using errcode = '42501';
      end if;
    elsif new.status is distinct from old.status and new.status not in ('draft', 'submitted')
       or new.reviewer_id is distinct from old.reviewer_id
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_note is distinct from old.review_note then
      raise exception 'Only an IAHV admin can approve funding' using errcode = '42501';
    end if;

  elsif tg_table_name = 'quotes' then
    if tg_op = 'INSERT' then
      if new.status <> 'requested' or new.quote_number is not null or new.issued_at is not null then
        raise exception 'Only an IAHV admin can issue quotes' using errcode = '42501';
      end if;
    elsif new.status is distinct from old.status
       or new.quote_number is distinct from old.quote_number
       or new.issued_at is distinct from old.issued_at then
      raise exception 'Only an IAHV admin can issue quotes' using errcode = '42501';
    end if;

  elsif tg_table_name = 'invoices' then
    if tg_op = 'INSERT' then
      if new.status <> 'requested' or new.invoice_number is not null or new.issued_at is not null
         or new.sent_at is not null or new.paid_at is not null or new.closed_at is not null then
        raise exception 'Only an IAHV admin can issue invoices' using errcode = '42501';
      end if;
    elsif new.invoice_number is distinct from old.invoice_number
       or new.is_placeholder is distinct from old.is_placeholder
       or new.issued_at is distinct from old.issued_at
       or new.sent_at is distinct from old.sent_at
       or new.paid_at is distinct from old.paid_at
       or new.closed_at is distinct from old.closed_at
       -- The organizer's only status change: marking course accounting submitted (step 7).
       or (new.status is distinct from old.status and new.status <> 'accounting_submitted') then
      raise exception 'Only an IAHV admin can change this invoice field' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_admin_fields();
create trigger funding_requests_guard before insert or update on public.funding_requests
  for each row execute function public.guard_admin_fields();
create trigger quotes_guard before insert or update on public.quotes
  for each row execute function public.guard_admin_fields();
create trigger invoices_guard before insert or update on public.invoices
  for each row execute function public.guard_admin_fields();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.campuses enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.courses enable row level security;
alter table public.course_steps enable row level security;
alter table public.funding_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.documents enable row level security;
alter table public.funding_request_documents enable row level security;
alter table public.invoice_documents enable row level security;
alter table public.form_templates enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_log enable row level security;
alter table public.events enable row level security;
alter table public.settings enable row level security;

-- Campuses: everyone signed in can read; admins manage.
create policy "campuses: read" on public.campuses for select to authenticated using (true);
create policy "campuses: admin write" on public.campuses for all to authenticated
  using (public.is_iahv_admin()) with check (public.is_iahv_admin());

-- Profiles: you see yourself; admins see everyone. Role changes are blocked by the guard trigger.
create policy "profiles: read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_iahv_admin());
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_iahv_admin())
  with check (id = (select auth.uid()) or public.is_iahv_admin());

-- Clients are shared per university so details are entered once.
create policy "clients: read" on public.clients for select to authenticated using (true);
create policy "clients: insert" on public.clients for insert to authenticated
  with check (created_by = (select auth.uid()) or public.is_iahv_admin());
create policy "clients: update creator or admin" on public.clients for update to authenticated
  using (created_by = (select auth.uid()) or public.is_iahv_admin())
  with check (created_by = (select auth.uid()) or public.is_iahv_admin());

-- Courses: organizers own theirs; admins see all. Only admins delete.
create policy "courses: read" on public.courses for select to authenticated
  using (organizer_id = (select auth.uid()) or public.is_iahv_admin());
create policy "courses: insert own" on public.courses for insert to authenticated
  with check (organizer_id = (select auth.uid()) or public.is_iahv_admin());
create policy "courses: update own or admin" on public.courses for update to authenticated
  using (organizer_id = (select auth.uid()) or public.is_iahv_admin())
  with check (organizer_id = (select auth.uid()) or public.is_iahv_admin());
create policy "courses: admin delete" on public.courses for delete to authenticated
  using (public.is_iahv_admin());

-- Course-owned rows: same access as the course.
create policy "course_steps: access" on public.course_steps for all to authenticated
  using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));

create policy "funding_requests: read" on public.funding_requests for select to authenticated
  using (public.can_access_course(course_id));
create policy "funding_requests: insert" on public.funding_requests for insert to authenticated
  with check (public.can_access_course(course_id));
create policy "funding_requests: update" on public.funding_requests for update to authenticated
  using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));
create policy "funding_requests: admin delete" on public.funding_requests for delete to authenticated
  using (public.is_iahv_admin());

create policy "quotes: read" on public.quotes for select to authenticated
  using (public.can_access_course(course_id));
create policy "quotes: insert" on public.quotes for insert to authenticated
  with check (public.can_access_course(course_id));
create policy "quotes: update" on public.quotes for update to authenticated
  using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));
create policy "quotes: admin delete" on public.quotes for delete to authenticated
  using (public.is_iahv_admin());

create policy "invoices: read" on public.invoices for select to authenticated
  using (public.can_access_course(course_id));
create policy "invoices: insert" on public.invoices for insert to authenticated
  with check (public.can_access_course(course_id));
create policy "invoices: update" on public.invoices for update to authenticated
  using (public.can_access_course(course_id)) with check (public.can_access_course(course_id));
create policy "invoices: admin delete" on public.invoices for delete to authenticated
  using (public.is_iahv_admin());

create policy "documents: read" on public.documents for select to authenticated
  using (public.can_access_course(course_id));
create policy "documents: insert" on public.documents for insert to authenticated
  with check (public.can_access_course(course_id) and uploaded_by = (select auth.uid()));
create policy "documents: delete" on public.documents for delete to authenticated
  using (public.can_access_course(course_id));

create policy "funding_request_documents: access" on public.funding_request_documents for all to authenticated
  using (exists (select 1 from public.funding_requests f where f.id = funding_request_id and public.can_access_course(f.course_id)))
  with check (exists (select 1 from public.funding_requests f where f.id = funding_request_id and public.can_access_course(f.course_id)));

create policy "invoice_documents: access" on public.invoice_documents for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.can_access_course(i.course_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.can_access_course(i.course_id)));

-- Templates are private, admins included.
create policy "form_templates: owner only" on public.form_templates for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "email_templates: admin only" on public.email_templates for all to authenticated
  using (public.is_iahv_admin()) with check (public.is_iahv_admin());

-- Only admins send, and only as themselves. Organizers can see what was sent about their courses.
create policy "email_log: read" on public.email_log for select to authenticated
  using (public.is_iahv_admin() or (course_id is not null and public.owns_course(course_id)));
create policy "email_log: admin insert as self" on public.email_log for insert to authenticated
  with check (public.is_iahv_admin() and from_admin_id = (select auth.uid()));
create policy "email_log: admin update" on public.email_log for update to authenticated
  using (public.is_iahv_admin()) with check (public.is_iahv_admin());

-- Audit log: append-only for users, written as yourself.
create policy "events: read" on public.events for select to authenticated
  using (public.is_iahv_admin() or (course_id is not null and public.owns_course(course_id)));
create policy "events: insert as self" on public.events for insert to authenticated
  with check (actor_id = (select auth.uid()) and (course_id is null or public.can_access_course(course_id)));

create policy "settings: read" on public.settings for select to authenticated using (true);
create policy "settings: admin write" on public.settings for all to authenticated
  using (public.is_iahv_admin()) with check (public.is_iahv_admin());

-- The app only talks to the database as a signed-in user.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for PDFs, path "<course_id>/<file name>"
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf']);

-- Folder names are user input, so check they're a real uuid before casting.
create function public.storage_course_id(p_name text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

create policy "documents bucket: read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.can_access_course(public.storage_course_id(name)));
create policy "documents bucket: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_access_course(public.storage_course_id(name)));
create policy "documents bucket: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_access_course(public.storage_course_id(name)));
