-- ShyftKick core records (product scope §8).
-- Tenant separation: every business row carries organization_id, RLS is
-- enabled on all tables, and customer access flows through memberships.
-- Workers use the service role and are the only writers for imported data.
-- All money is integer cents. All timestamps are timestamptz.

create extension if not exists pgcrypto;

-- ---------- tenancy ----------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone_default text not null default 'America/Phoenix',
  created_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null,
  business_day_cutoff text not null default '03:00',
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','org_admin','regional','location_manager','recipient')),
  -- Wage visibility is restricted independently of role (scope §7).
  can_view_wages boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table location_grants (
  membership_id uuid not null references memberships(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  primary key (membership_id, location_id)
);

-- ---------- connections and sync ----------

create table connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_id text not null,
  -- Reference into managed secret storage; the credential itself never lives here.
  secret_ref text,
  state text not null default 'not_connected' check (state in (
    'not_connected','authorizing','validating','importing','ready',
    'degraded','stale','permission_required','disconnected')),
  state_detail text,
  last_successful_sync timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, provider_id)
);

create table connection_locations (
  connection_id uuid not null references connections(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  provider_location_id text not null,
  primary key (connection_id, location_id),
  -- One provider location maps to exactly one internal location: no duplicate imports.
  unique (connection_id, provider_location_id)
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  kind text not null check (kind in ('backfill','incremental','reconciliation')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  cursor text,
  detail jsonb not null default '{}'::jsonb
);

-- ---------- normalized business data ----------

create table normalized_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  provider_id text not null,
  source_id text not null,
  closed_at timestamptz not null,
  business_date date not null,
  gross_sales integer not null,
  discounts integer not null default 0,
  refunds integer not null default 0,
  tax integer not null default 0,
  tips integer not null default 0,
  service_charges integer not null default 0,
  gift_card_loads integer not null default 0,
  voided boolean not null default false,
  channel text,
  -- Stable source identity prevents duplicates across retries and re-imports.
  unique (location_id, provider_id, source_id)
);

create index idx_sales_location_date on normalized_sales (location_id, business_date);

create table sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references normalized_sales(id) on delete cascade,
  source_id text not null,
  category text not null,
  item_name text not null,
  quantity numeric not null,
  gross_amount integer not null,
  discount_amount integer not null default 0,
  unique (sale_id, source_id)
);

create table timecards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  provider_id text not null,
  source_id text not null,
  employee_ref text not null,
  role text,
  clock_in timestamptz not null,
  clock_out timestamptz,
  unpaid_break_minutes integer not null default 0,
  hourly_wage integer,
  unique (location_id, provider_id, source_id)
);

create table scheduled_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  provider_id text not null,
  source_id text not null,
  employee_ref text,
  role text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  unique (location_id, provider_id, source_id)
);

-- ---------- aggregates, context, and rules ----------

create table daily_aggregates (
  location_id uuid not null references locations(id) on delete cascade,
  business_date date not null,
  weekday smallint not null,
  net_sales integer not null,
  gross_sales integer not null,
  discounts integer not null,
  refunds integer not null,
  check_count integer not null,
  labor_hours numeric,
  labor_cost integer,
  completeness text not null check (completeness in ('complete','partial','missing')),
  exclusions text[] not null default '{}',
  computed_at timestamptz not null default now(),
  primary key (location_id, business_date)
);

create table weather_observations (
  location_id uuid not null references locations(id) on delete cascade,
  business_date date not null,
  -- Observation vs modeled/reanalysis vs forecast is stored, never blurred (scope §5).
  source_kind text not null check (source_kind in ('observation','modeled','forecast')),
  data jsonb not null,
  primary key (location_id, business_date, source_kind)
);

create table context_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  business_date date not null,
  kind text not null check (kind in ('closure','holiday','promotion','abnormal_hours','note')),
  description text
);

create table rule_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  version integer not null,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id, version)
);

-- ---------- findings, reports, actions ----------

create table findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  business_date date not null,
  metric_key text not null,
  -- Stable issue identity dedupes across retries, channels, and repeat detections.
  issue_key text not null,
  severity text not null check (severity in ('priority','watch','operational')),
  evidence jsonb not null,
  rule_version integer not null,
  suggested_action text,
  uncertainties text,
  created_at timestamptz not null default now(),
  unique (organization_id, issue_key, business_date)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  business_date date not null,
  kind text not null check (kind in ('daily_briefing','company_summary','operational_notice')),
  data_status text not null,
  body jsonb not null,
  -- Corrections create labeled revisions; a sent report is never silently rewritten.
  revision integer not null default 1,
  revision_reason text,
  created_at timestamptz not null default now()
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references findings(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_membership_id uuid references memberships(id) on delete set null,
  workflow_state text not null default 'new' check (workflow_state in (
    'new','acknowledged','action_recorded','dismissed','overdue')),
  outcome text not null default 'pending' check (outcome in (
    'pending','improved','unchanged','worsened','insufficient_data')),
  response_note text,
  snooze_until timestamptz,
  escalated_to uuid references memberships(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------- delivery and consent ----------

create table delivery_preferences (
  membership_id uuid primary key references memberships(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  -- Adding a phone number is not consent; the recipient confirms (scope §6).
  sms_consent text not null default 'not_requested' check (sms_consent in (
    'not_requested','pending','confirmed','declined','opted_out')),
  phone text,
  delivery_time text not null default '07:00',
  quiet_hours_start text,
  quiet_hours_end text,
  max_issue_texts_per_day integer not null default 2
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  membership_id uuid references memberships(id) on delete set null,
  report_id uuid references reports(id) on delete set null,
  finding_id uuid references findings(id) on delete set null,
  channel text not null check (channel in ('email','sms')),
  -- Outbox/idempotency key: crashes and retries never double-send.
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in (
    'queued','provider_accepted','delivered','failed','opted_out')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- usage, billing, audit ----------

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('llm','sms','email','connector','storage','job')),
  quantity numeric not null,
  unit text not null,
  cost_cents integer,
  occurred_at timestamptz not null default now()
);

create table billing_entitlements (
  organization_id uuid primary key references organizations(id) on delete cascade,
  plan text not null,
  max_locations integer not null,
  monthly_spend_cap_cents integer,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  subject text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------

-- Enable RLS everywhere; the service role (workers) bypasses it.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Customers read their organization's rows through membership.
create or replace function is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where organization_id = org and user_id = auth.uid()
  );
$$;

create policy org_read on organizations for select
  using (is_org_member(id));
create policy locations_read on locations for select
  using (is_org_member(organization_id));
create policy memberships_read on memberships for select
  using (user_id = auth.uid() or is_org_member(organization_id));
create policy connections_read on connections for select
  using (is_org_member(organization_id));
create policy findings_read on findings for select
  using (is_org_member(organization_id));
create policy reports_read on reports for select
  using (is_org_member(organization_id));
create policy actions_read on actions for select
  using (is_org_member(organization_id));
create policy deliveries_read on deliveries for select
  using (is_org_member(organization_id));
create policy usage_read on usage_events for select
  using (is_org_member(organization_id));

-- Location-scoped and wage-restricted access (managers see only their
-- authorized locations; wage detail needs can_view_wages) is enforced in
-- follow-up policies added with the Stage 3 application queries — the
-- server authorizes every report, download, and action regardless (scope §7).
