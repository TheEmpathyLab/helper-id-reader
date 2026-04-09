# Helper-ID — Pre-Launch Security Project

**Repo:** `TheEmpathyLab/helper-id-reader`
**Created:** 2026-04-05
**Owner:** @shelton
**Purpose:** Structured review of all PII handling, transport security, API hardening, and access controls before any public community outreach or DNS/domain switch. This file defines the project, individual issues, and the launch gate checklist.

---

## Context: What data Helper-ID actually touches

Before hardening anything, a plain-language inventory of what we hold and why.

### Data in Supabase (Tier 1 hosted members)

| Table | Fields | Sensitivity |
|---|---|---|
| `members` | `code`, `pin`, `tier`, `community_id`, `created_at`, `stripe_customer_id` | Medium — code+PIN is the credential pair |
| `profiles` | `member_id`, `first_name`, `last_name`, `dob`, `photo_url`, `conditions[]`, `allergies[]`, `medications[]` | **HIGH** — clinical PII |
| `households` | `household_id`, `member_ids[]`, `billing_contact` | Medium |
| `access_logs` | `code`, `accessed_at`, `ip_address`, `user_agent` | Medium — access pattern data |

### Data in NFC tags (Tier 2 self-sovereign)

The full profile is Base64-encoded into a URL fragment on the tag itself. **No PII transits our servers for a Tier 2 read.** The data never leaves the tag except in the user's browser, which decodes the fragment locally. This is the primary privacy advantage of the self-sovereign tier and should be documented explicitly.

### Third-party data touches

| Vendor | What they receive | Retention |
|---|---|---|
| **Stripe** | Name, email, billing address, payment method | Stripe-managed, governed by their DPA |
| **SendGrid** | Email address (for welcome/confirmation emails) | Transient send — depends on SendGrid account settings |
| **DigitalOcean** | All server-side traffic, env vars (Stripe keys, Supabase URL/key, SendGrid key) | DO infrastructure layer |
| **Supabase** | All Tier 1 profile data | Supabase-managed Postgres, hosted on AWS |
| **randomuser.me** | None — it's a one-way fetch for demo placeholder portraits only | N/A |

---

## Issue Index

The issues below are written ready to paste into GitHub Issues. Each maps to the corresponding checklist item at the bottom of this file.

---

### Issue #SEC-01 — Data minimization audit

**Label:** `security` `data-privacy`
**Priority:** Before launch

**Problem:**
We have not formally asked "do we need all of this?" for every field we store. Emergency response is the use case — the profile should contain only what a first responder or emergency contact actually needs in the first 15 minutes of a medical event.

**Tasks:**
- [ ] Review every field in `profiles` and mark each as: Required for emergency use / Useful but optional / Nice-to-have / Unclear
- [ ] Review `access_logs` — are we storing `ip_address` and `user_agent`? Do we need both? What is the retention policy?
- [ ] Review `members` — `stripe_customer_id` links a financial identity to a medical profile. Confirm this linkage is necessary in the same table, or separate it.
- [ ] Add a field-level data dictionary comment to the Supabase schema documentation
- [ ] Establish a formal data retention policy: how long do we keep access logs? What happens to a profile when a subscription lapses?

**Done when:** Every stored field has a documented justification. Access log retention has a defined TTL. Lapsed-subscription data handling is decided and written down.

---

### Issue #SEC-02 — Transport security (HTTPS enforcement)

**Label:** `security` `infrastructure`
**Priority:** Before launch

**Problem:**
We have not formally verified that all traffic — reader, API, Supabase, and any webhook endpoints — enforces HTTPS. DigitalOcean App Platform provides managed TLS, but we haven't confirmed every endpoint is covered and HTTP → HTTPS redirects are active.

**Tasks:**
- [ ] Confirm DigitalOcean App Platform forces HTTPS on all routes (verify no HTTP fallback on `/api/*`)
- [ ] Verify `reader.html` and all static assets are served over HTTPS
- [ ] Verify the Stripe webhook endpoint (`/api/webhook`) only accepts HTTPS
- [ ] Confirm Supabase connection string uses `ssl=true` (the default, but worth verifying in config)
- [ ] Run `curl -I http://helper-id-v8uev.ondigitalocean.app` and confirm redirect to HTTPS (301/302), not a direct serve
- [ ] Add `Strict-Transport-Security` (HSTS) header — see Issue #SEC-05

**Done when:** Every externally reachable endpoint returns HTTPS-only. HTTP requests redirect, not serve. HSTS header is present.

---

### Issue #SEC-03 — Data at rest encryption

**Label:** `security` `infrastructure`
**Priority:** Before launch

**Problem:**
We are storing clinical PII (conditions, allergies, medications) in Supabase. We have not documented what encryption at rest is in place, and we have not considered whether field-level encryption is warranted for the most sensitive fields.

**Tasks:**
- [ ] Confirm Supabase's encryption-at-rest coverage (Supabase uses AES-256 at the storage layer on AWS — document this as a known baseline)
- [ ] Decide: do we want application-level field encryption for `conditions`, `allergies`, `medications`? (This adds complexity but means Supabase never stores plaintext clinical data — worth the tradeoff discussion)
- [ ] If field-level encryption is deferred, document the decision explicitly and the conditions under which it would be revisited (e.g., HIPAA considerations, scale)
- [ ] Confirm DigitalOcean environment variables are stored as encrypted secrets, not plaintext (DO App Platform does encrypt env vars — verify and document)
- [ ] Review Supabase row-level security (RLS) policies — are they enabled on the `profiles` table?

**Done when:** Encryption-at-rest baseline is documented. RLS decision is made and implemented. Field-level encryption decision is logged (even if deferred).

---

### Issue #SEC-04 — Supabase Row-Level Security (RLS) audit

**Label:** `security` `database`
**Priority:** Before launch — HIGH

**Problem:**
Supabase exposes a REST API by default. If RLS is not enabled on our tables, any authenticated Supabase client with our `anon` key could query any row in `profiles`, `members`, or `access_logs`. The `anon` key is public-facing — it appears in browser requests. Without RLS, this is a data exposure risk.

**Tasks:**
- [ ] Confirm RLS is enabled on all four tables: `members`, `profiles`, `households`, `access_logs`
- [ ] Write and test RLS policies:
  - `profiles`: readable only via the server-side API (service role), never directly by anon key
  - `members`: same — no direct anon read
  - `access_logs`: write-only for anon, read-only for service role
  - `households`: service role only
- [ ] Confirm the Node.js API uses the `service_role` key (server-side only, in env vars) — never the `anon` key for data reads
- [ ] Confirm the `anon` key is never used for writes to `profiles` or `members`
- [ ] Test: attempt a direct Supabase REST call with the anon key to `profiles` and confirm it returns empty/403

**Done when:** RLS blocks all direct-client reads of sensitive tables. Service role key is confirmed server-side only. Test confirms anon key returns no profile data.

---

### Issue #SEC-05 — Security headers

**Label:** `security` `api`
**Priority:** Before launch

**Problem:**
We have not audited or set HTTP security headers on any response from the DigitalOcean-hosted app. Missing headers leave the reader and API vulnerable to clickjacking, MIME sniffing, and information leakage.

**Tasks:**
- [ ] Add the following headers to all API responses (via Express middleware):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' data: https://randomuser.me` (tighten after Supabase Storage is live)
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] Remove or suppress the `X-Powered-By: Express` header (leaks stack info)
- [ ] Verify headers appear on both API routes and static file serves
- [ ] Run against securityheaders.com or equivalent after deployment and target at least a B+ grade

**Done when:** All listed headers present. `X-Powered-By` suppressed. Security headers scan returns B+ or above.

---

### Issue #SEC-06 — API rate limiting

**Label:** `security` `api`
**Priority:** Before launch

**Problem:**
The `/api/profile` lookup endpoint (CODE+PIN) has no documented rate limiting. Without it, an attacker can brute-force PIN combinations against a known member code. With a 4-digit PIN, there are only 10,000 possible values — brute-force is trivially feasible without rate limiting.

**Tasks:**
- [ ] Add rate limiting to `/api/profile` — recommended: 10 attempts per IP per 15-minute window
- [ ] Add rate limiting to any other write or lookup endpoints (`/api/register`, `/api/subscribe`, etc.)
- [ ] Use `express-rate-limit` (already available in npm ecosystem, minimal setup)
- [ ] Consider: after N failed PIN attempts for a given code, add a time-delay or lockout response (not just IP-based — also code-based)
- [ ] Log failed PIN attempts to `access_logs` with a `failed_attempt` flag — this gives us intrusion detection data
- [ ] Decide: do we alert on unusual access patterns? (e.g., 50+ lookups on a single code in an hour) — even a simple email alert to admin via SendGrid would be meaningful

**Done when:** Rate limiting is active on all lookup endpoints. Failed attempts are logged. Brute-force of a 4-digit PIN against a known code requires >24 hours at enforced rate.

---

### Issue #SEC-07 — API response field leakage audit

**Label:** `security` `api`
**Priority:** Before launch

**Problem:**
When the API returns a profile, we need to confirm it returns exactly the fields the reader needs — no more. Internal fields like `stripe_customer_id`, `created_at`, `member_id` (UUID), or any Supabase metadata should never appear in a profile response. Over-returning fields leaks internal structure and PII that isn't needed for emergency display.

**Tasks:**
- [ ] Audit the `/api/profile` response shape — enumerate every field returned
- [ ] Create an explicit response allowlist (not a blocklist) — only these fields leave the server
- [ ] Confirm `stripe_customer_id`, `member_id`, internal timestamps, and Supabase metadata are stripped before response
- [ ] Confirm error responses don't leak stack traces, SQL errors, or internal field names (e.g., a bad PIN should return `{"error": "Invalid code or PIN"}` — not a Postgres error message)
- [ ] Test with an intentionally malformed request and verify generic error response

**Done when:** Response shape is documented and matches an explicit allowlist. Error responses are generic. No internal identifiers appear in any profile response.

---

### Issue #SEC-08 — Stripe webhook security

**Label:** `security` `payments`
**Priority:** Before launch (blocks Stripe migration)

**Problem:**
The `/api/webhook` endpoint accepts POST requests from Stripe. If we don't verify the `Stripe-Signature` header on every incoming request, anyone can POST fake webhook events and trigger subscription state changes (e.g., fake a `customer.subscription.created` event to activate an account without payment).

**Tasks:**
- [ ] Confirm `stripe.webhooks.constructEvent()` is called on every webhook POST before any business logic runs
- [ ] Confirm `STRIPE_WEBHOOK_SECRET` is set as an encrypted env var in DigitalOcean (not hardcoded anywhere)
- [ ] Confirm the webhook secret is from the new dedicated Helper-ID Stripe account, not the Empathy Lab account
- [ ] Test with a request missing the signature header — confirm 400 rejection
- [ ] Test with a request with an invalid signature — confirm 400 rejection
- [ ] Confirm the webhook endpoint does not log the raw request body to any persistent store (it contains payment data)

**Done when:** Every webhook POST is signature-verified. STRIPE_WEBHOOK_SECRET is from the correct account. Unsigned requests are rejected before any DB writes.

---

### Issue #SEC-09 — Access logging completeness and privacy

**Label:** `security` `data-privacy`
**Priority:** Before launch

**Problem:**
The `access_logs` table is both a security asset (intrusion detection, audit trail) and a privacy liability (it records when and how often someone's medical profile was accessed). We need it to be useful as a security tool without becoming a surveillance record that members would be uncomfortable with.

**Tasks:**
- [ ] Define exactly what gets logged on every profile access: `code`, `accessed_at`, `ip_address`, `user_agent`, `access_type` (NFC vs CODE+PIN vs demo)
- [ ] Decide on access log retention TTL — recommendation: 90 days rolling, then purge
- [ ] Implement the TTL as a Supabase scheduled function or a periodic API job
- [ ] Consider the future SMS OTP feature: when implemented, the access log entry for that event becomes a member-visible trust transparency feature — design the log schema to support this from day one
- [ ] Add to member-facing privacy disclosure: "Every time your profile is accessed, the date, time, and access method are logged. Logs are retained for 90 days."
- [ ] Decide: should access logs be visible to the member themselves? (This is the SMS OTP use case — flag for post-launch but design for now)

**Done when:** Log schema is finalized with retention TTL. Privacy disclosure reflects what is logged. Schema supports future member-visible access history.

---

### Issue #SEC-10 — NFC self-sovereign tier: client-side data handling review

**Label:** `security` `nfc`
**Priority:** Before launch

**Problem:**
Tier 2 profiles never hit our server — the full profile lives Base64-encoded in the URL fragment, decoded and rendered entirely in the browser. This is the strong privacy model. But we need to confirm the client-side implementation doesn't accidentally exfiltrate data or leave traces.

**Tasks:**
- [ ] Confirm the URL fragment (`#...`) is never sent to the server in any request (HTTP spec: fragments are client-only — verify no logging middleware accidentally captures them)
- [ ] Confirm `reader.html` does not send the decoded profile data to any analytics service, external script, or third-party CDN that could log it
- [ ] Confirm there is no `console.log` of decoded profile data left in production code
- [ ] Audit any external script tags in `reader.html` — each one is a potential data leak vector
- [ ] Add a comment in `reader.html` explicitly documenting the "fragment stays in browser" privacy guarantee so future contributors don't accidentally break it

**Done when:** Code review confirms no exfiltration vectors. Fragment data stays entirely in the browser. Privacy guarantee is documented inline.

---

### Issue #SEC-11 — Backup and recovery strategy

**Label:** `security` `infrastructure`
**Priority:** Before launch

**Problem:**
We have no documented backup strategy. Supabase provides point-in-time recovery on paid plans, but we have not confirmed our plan tier or tested recovery. If the database is corrupted or accidentally wiped, member profiles and subscription records are gone.

**Tasks:**
- [ ] Confirm which Supabase plan we're on and what PITR (point-in-time recovery) window it provides
- [ ] Enable and test a manual Supabase backup (Export → SQL dump) — do this now, before we have real member data
- [ ] Document the recovery procedure: what are the steps to restore from a Supabase backup? Who does it? Where are the credentials?
- [ ] Decide: do we want an automated periodic export to DigitalOcean Spaces or another store as a secondary backup?
- [ ] Document what "acceptable data loss" looks like: if we lost the last 24 hours of access logs vs. profile data, those are very different severities — define RPO (Recovery Point Objective) for each table

**Done when:** PITR is confirmed active. Manual backup has been tested end-to-end. Recovery procedure is written down somewhere a future operator can find it.

---

### Issue #SEC-12 — Secrets and environment variable audit

**Label:** `security` `infrastructure`
**Priority:** Before launch — HIGH

**Problem:**
Helper-ID has at least five secrets in play: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`. We need to confirm none of them are hardcoded anywhere in the repo, and that DigitalOcean's env var store is the single source of truth.

**Tasks:**
- [ ] `git grep` the repo for all five secret values — confirm zero matches
- [ ] `git grep` for `sk_live`, `sk_test`, `whsec_`, `SG.` — common secret prefixes — confirm zero matches
- [ ] Confirm `config.js` references env vars via `process.env.*` — never hardcoded values
- [ ] Confirm `.env` file (if any) is in `.gitignore` and has never been committed — run `git log --all -- .env` to verify
- [ ] Audit DigitalOcean App Platform env vars: confirm all five are present, marked as "secret" (encrypted), and reflect the **Helper-ID** Stripe account (not Empathy Lab)
- [ ] Consider adding a startup check to the Node.js server: if any required env var is missing at boot, fail fast with a clear error — prevents silent misconfigurations

**Done when:** `git grep` confirms zero hardcoded secrets. All five env vars confirmed present and encrypted in DO. Startup check implemented.

---

### Issue #SEC-13 — Demo profile security review

**Label:** `security` `demo`
**Priority:** Before launch

**Problem:**
The `DEMO_PROFILES` object in `reader.html` hard-codes two demo profiles (`?code=DEMO-DOROTHY`, `?code=DEMO-PEGGY`) with realistic-looking medical data (conditions, allergies, medications). We need to confirm demo data is clearly fictitious and cannot be confused with real member records, and that the demo code paths cannot be used to probe the real API.

**Tasks:**
- [ ] Confirm demo profiles are served from the client-side `DEMO_PROFILES` object — they do not hit `/api/profile` at all
- [ ] Confirm demo codes cannot be submitted to `/api/profile` and accidentally match a real member code (rate-limit and reject `DEMO-*` pattern codes at the API layer)
- [ ] Ensure demo profile data uses obviously fictitious names and placeholder clinical data — avoid anything that looks like a real person's medical record
- [ ] When demo profiles are migrated to real Supabase API calls (post-launch), the demo member records should be clearly flagged with a `is_demo: true` column so they can never be returned in production lookups

**Done when:** Demo data is provably fictitious. Demo codes cannot probe the real API. Migration path to Supabase-backed demo is documented.

---

## Launch Gate Checklist

This is the formal gate. Every item must be checked before any public community outreach, DNS switch, or paid member onboarding at scale.

```
HELPER-ID PRE-LAUNCH SECURITY GATE
===================================
Completed by: _______________  Date: _______________

DATA
[ ] SEC-01  All stored fields have documented justification
[ ] SEC-01  Access log retention policy defined and implemented
[ ] SEC-01  Lapsed-subscription data handling decided and documented

TRANSPORT
[ ] SEC-02  All endpoints enforce HTTPS — HTTP redirects confirmed
[ ] SEC-02  HSTS header present

DATA AT REST
[ ] SEC-03  Supabase encryption-at-rest baseline documented
[ ] SEC-03  Field-level encryption decision logged (implement or explicitly defer)
[ ] SEC-04  RLS enabled and tested on all four Supabase tables
[ ] SEC-04  Service role key confirmed server-side only — never in browser

API HARDENING
[ ] SEC-05  All security headers present — securityheaders.com scan B+ or above
[ ] SEC-05  X-Powered-By suppressed
[ ] SEC-06  Rate limiting active on /api/profile (10 req / 15 min / IP)
[ ] SEC-06  Failed PIN attempts logged with failed_attempt flag
[ ] SEC-07  Profile response shape matches explicit allowlist — no internal fields
[ ] SEC-07  Error responses are generic — no stack traces or SQL errors exposed

PAYMENTS
[ ] SEC-08  Stripe webhook signature verification confirmed active
[ ] SEC-08  STRIPE_WEBHOOK_SECRET from Helper-ID account (not Empathy Lab)
[ ] SEC-08  Unsigned webhook requests return 400

ACCESS LOGGING
[ ] SEC-09  Access log schema finalized with retention TTL
[ ] SEC-09  Privacy disclosure updated to reflect what is logged

NFC / SELF-SOVEREIGN
[ ] SEC-10  No exfiltration vectors in reader.html — confirmed by code review
[ ] SEC-10  Fragment privacy guarantee documented inline in code

BACKUP
[ ] SEC-11  PITR confirmed active on current Supabase plan
[ ] SEC-11  Manual backup tested end-to-end
[ ] SEC-11  Recovery procedure documented

SECRETS
[ ] SEC-12  git grep confirms zero hardcoded secrets in repo
[ ] SEC-12  All five env vars present and encrypted in DigitalOcean
[ ] SEC-12  Startup check implemented for missing env vars

DEMO
[ ] SEC-13  Demo codes cannot probe real /api/profile
[ ] SEC-13  Demo data is clearly fictitious

SIGN-OFF
All items above checked: _______________  Date: _______________
```

---

## Risk register (quick reference)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PIN brute-force on known member code | High without SEC-06 | High — full profile exposure | Rate limiting + lockout (SEC-06) |
| Supabase anon key used to read profiles | High without RLS | Critical — full DB exposure | RLS policies (SEC-04) |
| Hardcoded secret committed to repo | Medium | Critical | git grep audit (SEC-12) |
| Fake Stripe webhook activates accounts | Medium | High — revenue loss | Signature verification (SEC-08) |
| Demo profile probes real API | Low | Low-Medium | Code path separation (SEC-13) |
| Access logs retained indefinitely | Low now, grows | Privacy liability | TTL implementation (SEC-09) |
| NFC fragment logged server-side | Low | High — clinical data in server logs | Code review (SEC-10) |
| Missing env var at boot (silent) | Low | High — broken payments or DB | Startup check (SEC-12) |

---

## How to use this file

1. Create a new GitHub Project in `TheEmpathyLab/helper-id-reader` titled **"Pre-Launch Security"**
2. Create 13 issues (SEC-01 through SEC-13) from the issue descriptions above — copy each task list as the issue body
3. Label each issue with the labels shown
4. Add all 13 issues to the project board with a **To Do / In Progress / Done** Kanban view
5. The launch gate checklist above can be copied into a pinned issue titled **"🔒 Launch Gate — Security"** — this becomes the go/no-go gate before public launch

The issues are ordered roughly by priority, but SEC-04 (RLS), SEC-06 (rate limiting), and SEC-12 (secrets audit) should be treated as the highest-urgency items — they represent the most likely active risks right now.
