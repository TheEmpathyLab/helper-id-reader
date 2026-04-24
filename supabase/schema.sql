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

-- is_admin column added 2026-04-13 via Supabase SQL Editor:
--   alter table members add column is_admin boolean not null default false;
-- Shelton's admin account (shelton@helper-id.com) has is_admin = true.


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
  insurance_group    text,
  insurance_phone    text,

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


-- ---- nfc_tokens ----
-- One row per physical NFC tag. Tied to profile_id (not member_id)
-- so household members each get their own independent tokens.
-- Token is a 12-char system-generated alphanumeric string (crypto.randomBytes).
-- NFC URL format: https://helper-id.com/reader.html?token=TOKEN
-- Revoking a token does not affect the profile, PIN, or other tokens.
-- PIN regeneration does not affect NFC tokens — independent credentials.

create table nfc_tokens (
  id               uuid primary key default uuid_generate_v4(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  token            varchar(16) not null unique,
  label            text,        -- e.g. "keychain tag", "wallet card", "lanyard"
  status           text not null default 'active' check (status in ('active', 'revoked')),
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  last_accessed_at timestamptz
);

create index idx_nfc_tokens_token      on nfc_tokens(token);
create index idx_nfc_tokens_profile_id on nfc_tokens(profile_id);

alter table nfc_tokens enable row level security;
-- No permissive policies = deny all non-service-role access.
-- All reads and writes go through server.js using the service role key.


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
-- ENCRYPTION AT REST (documented 2026-04-13)
-- ============================================================
-- Supabase provides AES-256 encryption at the storage layer via AWS.
-- All data — including clinical fields (conditions, allergies, medications)
-- — is encrypted at rest at the infrastructure level.
--
-- Field-level application encryption (encrypting values before writing
-- to Supabase so the DB never stores plaintext clinical data) has been
-- evaluated and deferred. Decision rationale:
--   - Adds key management complexity with minimal additional protection
--     at current scale given RLS + service-role-only access
--   - Cannot query or filter encrypted fields
--   - Helper-ID is consent-driven and HIPAA-aligned, not HIPAA compliant
--   - Members explicitly choose to share their information
--   - Revisit when member count reaches 1,000
--
-- ============================================================
-- DATA RETENTION POLICY (decided 2026-04-13)
-- ============================================================
--
-- access_logs:
--   Retained for 90 days rolling, then purged.
--   Rationale: sufficient for intrusion detection review and member
--   access transparency. Reassess if security incidents require longer.
--   Implementation: scheduled Supabase function or periodic API job (TODO post-launch).
--   SQL to purge manually if needed:
--     DELETE FROM access_logs WHERE accessed_at < now() - interval '90 days';
--
-- profiles (lapsed subscription):
--   On subscription lapse → profile status set to 'pending' (CODE+PIN stops working).
--   Data retained for 30 days to allow reactivation.
--   After 30 days with no renewal → profile and all associated data purged.
--   Member record (members table) retained for billing reconciliation.
--   On final purge → member receives email with PDF profile export.
--   Implementation: subscription lapse handling via Stripe webhook
--   (customer.subscription.deleted event) + scheduled purge job (TODO post-launch).
--
-- stripe_customer_id / stripe_subscription_id in members table:
--   Intentional — links financial identity to account record, not to medical profile.
--   Medical data lives in profiles, which is a separate table. Acceptable at current scale.
--   Revisit if HIPAA compliance becomes a requirement.
--
-- ============================================================
-- DATA MINIMIZATION AUDIT (completed 2026-04-13)
-- ============================================================
-- All fields in profiles confirmed justified for emergency use:
--   Required: first_name, last_name, preferred_name, date_of_birth, headshot_url,
--             ec1_*/ec2_* contacts, blood_type, allergies, medications, conditions,
--             advance_directives, access_tier, requires_auth, is_minor
--   Useful but optional (member-controlled): primary_physician,
--             insurance_provider, insurance_id
-- user_agent is NOT stored in access_logs (not in schema — no action needed).
-- ip_address IS stored — justified for rate limiting and intrusion detection.
--
-- ============================================================
-- BACKUP AND RECOVERY (documented 2026-04-13)
-- ============================================================
-- Plan: Supabase Pro
-- Scheduled backups: daily, automatic, visible in Project Settings → Backups
-- PITR (point-in-time recovery): available but deferred — extra cost,
--   revisit when member count and liability exposure justifies it.
--
-- Recovery procedure:
--   1. Go to supabase.com → Project Settings → Backups
--   2. Select the backup date to restore from
--   3. Click Restore — Supabase restores to a new project (does not overwrite live)
--   4. Update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in DigitalOcean env vars
--      to point to the restored project
--   5. Verify member data and profiles are intact via SQL Editor
--   6. Re-enable pg_cron purge job (see ACCESS LOG TTL section below)
--
-- RPO (Recovery Point Objective) by table:
--   profiles, members, households — max 24 hours data loss acceptable
--   access_logs — max 24 hours acceptable (security audit trail, not critical data)
--
-- Secondary backup: download manual SQL dump from Backups tab before
--   any major migration or schema change.
--
-- Credentials location: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
--   are in DigitalOcean App Platform → Settings → Environment Variables (encrypted).
--
-- ============================================================
-- ACCESS LOG TTL — AUTOMATED PURGE (run once in Supabase SQL Editor)
-- ============================================================
-- Requires pg_cron extension. Enable in Supabase:
--   Dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- Then run this to schedule the nightly purge:
--
--   select cron.schedule(
--     'purge-old-access-logs',       -- job name
--     '0 3 * * *',                   -- runs at 3am UTC daily
--     $$
--       delete from access_logs
--       where accessed_at < now() - interval '90 days';
--     $$
--   );
--
-- To verify it was scheduled:
--   select * from cron.job;
--
-- To remove the job if needed:
--   select cron.unschedule('purge-old-access-logs');
--
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
