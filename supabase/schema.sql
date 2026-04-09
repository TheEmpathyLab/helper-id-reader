-- ============================================================
-- Helper-ID — Supabase Schema
-- Architecture reference: session-log/helper-id-architecture-2026-03-17.md
--
-- Instructions:
--   1. Open your Supabase project → SQL Editor
--   2. Paste this entire file and click Run
--   3. Then create the headshots Storage bucket manually:
--      Storage → New bucket → name: "headshots" → Private (not public)
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- CUSTOM ENUM TYPES
-- ============================================================

create type member_plan   as enum ('individual', 'household');
create type member_status as enum ('pending', 'active');
create type profile_access_tier as enum ('nfc_only', 'cp_only', 'hybrid');
create type log_access_method   as enum ('nfc', 'cp');


-- ============================================================
-- TABLES
-- ============================================================

-- ---- members ----
-- The account layer. Created at Stripe checkout completion.
-- Exists before profile is filled out.

create table members (
  id                     uuid primary key default uuid_generate_v4(),
  email                  text not null,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   member_plan   not null default 'individual',
  status                 member_status not null default 'pending',
  trial_ends_at          timestamptz,
  created_at             timestamptz   not null default now()
);

create unique index members_email_idx       on members(email);
create index members_stripe_customer_id_idx on members(stripe_customer_id);


-- ---- households ----
-- One admin member (guardian) manages multiple profiles.
-- admin_member_id = the guardian's members.id
-- Profiles are linked via profiles.household_id
-- Guardian access is checked server-side via guardianCanAccess()
-- Use /admin/create-household + /admin/link-household to set up.

create table households (
  id              uuid primary key default uuid_generate_v4(),
  admin_member_id uuid not null references members(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);


-- ---- profiles ----
-- The emergency card. Shared schema for NFC and CODE+PIN paths.
-- code is system-generated, unique, collision-checked before insert.
-- pin_hash is bcrypt hash of the generated PIN.

create table profiles (
  id                 uuid primary key default uuid_generate_v4(),
  member_id          uuid references members(id)    on delete cascade,
  household_id       uuid references households(id) on delete set null,

  -- Access credentials
  code               text not null unique,
  pin_hash           text not null,

  -- Identity
  first_name         text not null,
  last_name          text not null,
  preferred_name     text,
  date_of_birth      date,
  headshot_url       text,

  -- Emergency contacts
  ec1_name           text,
  ec1_relationship   text,
  ec1_phone          text,
  ec2_name           text,
  ec2_relationship   text,
  ec2_phone          text,

  -- Medical
  blood_type         text,
  allergies          text,   -- rendered in red on responder card
  medications        text,
  conditions         text,
  primary_physician  text,

  -- Insurance
  insurance_provider text,
  insurance_id       text,

  -- Advance directives
  advance_directives text,

  -- Access control
  access_tier        profile_access_tier not null default 'cp_only',
  requires_auth      boolean             not null default false,  -- stub for future SMS gate
  is_minor           boolean             not null default false,

  -- Status
  status             member_status not null default 'pending',
  updated_at         timestamptz   not null default now(),
  created_at         timestamptz   not null default now()
);

create unique index profiles_code_idx       on profiles(code);
create index        profiles_member_id_idx  on profiles(member_id);


-- ---- access_logs ----
-- Written on every profile view regardless of access method.
-- accessor_phone is null until SMS auth is built (future).

create table access_logs (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid          not null references profiles(id) on delete cascade,
  access_method  log_access_method not null,
  accessor_phone text,
  ip_address     text,
  failed_attempt boolean       not null default false,  -- true = bad PIN attempt (intrusion detection)
  accessed_at    timestamptz   not null default now()
);

create index access_logs_profile_id_idx on access_logs(profile_id);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update profiles.updated_at on any row change

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- All four tables have RLS enabled from day one.
-- All writes go through the service role key (server.js / webhook).
-- The service role bypasses RLS automatically.
--
-- Member-facing read policies will be added in Step 4 when the
-- CODE+PIN auth mechanism is implemented. Until then, all
-- client-side access goes through the service role on the server.

alter table members     enable row level security;
alter table households  enable row level security;
alter table profiles    enable row level security;
alter table access_logs enable row level security;

-- access_logs: never directly client-accessible.
-- No permissive policies = deny all for non-service-role clients.

-- members: deny all non-service-role direct access for now.
-- profiles: deny all non-service-role direct access for now.
-- households: deny all non-service-role direct access for now.

-- ============================================================
-- NEXT STEPS (manual — Supabase dashboard)
-- ============================================================
-- 1. Storage → New bucket → name: "headshots" → toggle Private
-- 2. Copy your Project URL and service_role key from:
--    Settings → API → Project URL / service_role secret
--    Add both as encrypted env vars in DigitalOcean:
--      SUPABASE_URL=<your project url>
--      SUPABASE_SERVICE_ROLE_KEY=<your service role key>
-- ============================================================
