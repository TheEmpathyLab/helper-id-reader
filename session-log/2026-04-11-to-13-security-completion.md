# Session Log — 2026-04-11 to 2026-04-13

**Focus:** Pre-Launch Security — completing all 13 issues, launch gate sign-off

---

## What was decided

- **Security gate complete.** All 13 SEC issues closed. Helper-ID is hardened and ready for the DNS flip.
- **HIPAA-aligned, not HIPAA compliant.** Consent-driven data sharing is the framework. Members explicitly choose to share. Helper-ID commits to never selling or sharing data. Field-level encryption deferred to 1,000 members.
- **Supabase upgraded to Pro.** Daily scheduled backups now active. PITR available but deferred (extra cost — revisit at scale).
- **Data retention policy finalized.** Access logs: 90 days via pg_cron. Lapsed subscriptions: profile deactivated immediately, data purged after 30-day grace, member receives PDF export before deletion.
- **Post-launch roadmap noted.** Two items saved for after DNS flip: (1) security checkups + automated testing via GitHub Actions, (2) admin dashboard — member management first, platform monitoring second.
- **AI agents revisited.** First natural agent post-launch: access_logs anomaly monitor via SendGrid. Revisit when communities start onboarding.

---

## What was built / verified

### SEC-05 — Security headers
- All headers added via Express middleware and verified live on `/api/health`
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`
- `X-Powered-By` suppressed
- Note: API routes on DO App Platform are served under `/api/*` prefix

### SEC-08 — Stripe webhook security
- `stripe.webhooks.constructEvent()` confirmed first operation on every POST
- Unsigned request test returned `{"error":"Invalid signature"}` with 400
- `STRIPE_WEBHOOK_SECRET` confirmed from Helper-ID Stripe account, re-entered in DO

### SEC-07 — API response field leakage
- Replaced `select('*')` with explicit field allowlist on `/lookup`
- Internal fields (`id`, `pin_hash`, `member_id`, `household_id`, `access_tier`, `requires_auth`, `status`, `created_at`, `updated_at`) no longer fetched or returned
- New profile columns will not be auto-exposed — requires explicit allowlist addition

### SEC-01 — Data minimization audit
- All profile fields reviewed and justified
- `stripe_customer_id` linkage in `members` accepted at current scale
- `ip_address` retained (rate limiting + intrusion detection), `user_agent` not stored
- Retention policy documented in `schema.sql` and `trust.html`

### SEC-09 — Access logging completeness
- `failed_attempt` added to member-data access log select — members can see bad PIN attempts
- pg_cron purge job scheduled: nightly 3am UTC, 90-day rolling delete (job ID: 1)
- `trust.html` updated with specific disclosure of what is logged

### SEC-10 — NFC client-side review
- Fragment confirmed never sent to server — HTTP spec + code review
- No external scripts, no console.log of profile data
- Privacy guarantee comment block added inline in `reader.html`

### SEC-02 — Transport security
- HTTP → HTTPS 301 redirect confirmed via curl
- HSTS active: `max-age=31536000; includeSubDomains`

### SEC-03 — Encryption at rest
- Supabase AES-256 at-rest documented as baseline
- Field-level encryption deferred to 1,000 members — decision documented in `schema.sql`

### SEC-11 — Backup and recovery
- Supabase upgraded to Pro — daily scheduled backups active
- PITR deferred (cost) — revisit at scale
- Recovery procedure documented in `schema.sql`

### SEC-13 — Demo profile security
- No DEMO_PROFILES exist in current codebase
- Defensive guard added to `/lookup`: `DEMO-*` codes return 404 before hitting DB

### SEC-04, SEC-06, SEC-12 — Completed in prior session (2026-04-09)

---

## Content / docs built

### `docs/security-practices.md`
- Part 1: Full plain-language breakdown of all security measures (internal reference)
- Part 2: Public commitment block for trust.html, leave-behinds, in-person use

### `trust.html` updates
- Security section added with full anchor nav entry
- Data retention section updated with actual policy (30-day lapse grace, 90-day log TTL)
- Access logging section updated with specific disclosure

### `supabase/schema.sql` updates
- Encryption at rest decision documented
- Data retention policy documented
- Data minimization audit results documented
- pg_cron purge job SQL documented
- Backup and recovery procedure documented

---

## Issues closed this session

| Issue | Title |
|-------|-------|
| #37 | SEC-05 — Security headers ✅ |
| #40 | SEC-08 — Stripe webhook security ✅ |
| #39 | SEC-07 — API response field leakage audit ✅ |
| #33 | SEC-01 — Data minimization audit ✅ |
| #41 | SEC-09 — Access logging completeness and privacy ✅ |
| #42 | SEC-10 — NFC self-sovereign tier: client-side data handling review ✅ |
| #34 | SEC-02 — Transport security (HTTPS enforcement) ✅ |
| #35 | SEC-03 — Data at rest encryption ✅ |
| #43 | SEC-11 — Backup and recovery strategy ✅ |
| #45 | SEC-13 — Demo profile security review ✅ |
| #46 | 🔒 Launch Gate — Security (signed off) ✅ |

**All 13 Pre-Launch Security issues closed.**

---

## What's next

| Priority | Item |
|----------|------|
| 1 | **DNS flip — Issue #19** (Namecheap → DigitalOcean App) — the only remaining launch blocker |
| 2 | Drop `images/about-research.png` and `images/about-desk.png` — commit and push |
| 3 | trust.html — governing law/jurisdiction + mailing address placeholders |
| 4 | faq.html — group/bulk pricing placeholder |
| Post-flip | Admin dashboard (member management first) |
| Post-flip | Security checkups + GitHub Actions automation |
| Post-flip | AI agents — access_logs anomaly monitor |
| At 1,000 members | Field-level encryption revisit |

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Tools: Claude Sonnet 4.6
- Session Init: pre | Estimated: false
- Process: Shelton made all product decisions — HIPAA stance, retention policies,
  Supabase upgrade, PITR deferral, field-level encryption deferral. Claude ran all
  audits, wrote all code changes, verified all headers and endpoints, documented
  all decisions, and filed all closing issue comments.
```
