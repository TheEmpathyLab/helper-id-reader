# Session Log — 2026-04-09

**Focus:** Pre-launch security — SEC-04, SEC-06, SEC-12

---

## What was decided

- **Agents deferred to post-launch.** Shelton's DevOps friends are running multi-agent AI setups. Agreed the concept is real and useful, but the overhead isn't worth it pre-DNS flip with 9 members. First natural agent post-launch: access_logs anomaly monitor via SendGrid. Revisit when onboarding communities.
- **SEC-04 confirmed clean.** RLS was already enabled on all four tables in the original schema with no permissive policies. Anon/publishable key curl test returned empty — no data exposed. Closed without code changes.
- **SEC-06 implemented.** Two-layer rate limiting added to `/lookup`: IP-based (express-rate-limit) + code-based in-memory lockout. Failed attempts now logged.
- **SEC-12 confirmed clean.** Zero hardcoded secrets in repo. `.env` never committed. Startup check expanded to all five required env vars. DO env vars confirmed encrypted.

---

## What was built

### `api/server.js`

- **Rate limiting — IP-based:** `express-rate-limit` applied to `/lookup` — 10 requests per 15-minute window per IP. Returns 429 with generic message on breach.
- **Rate limiting — code-based:** In-memory `codeFailures` Map tracks failed PIN attempts per code. After 10 failures, code is locked for 15 minutes regardless of IP. Resets on successful auth.
- **Failed attempt logging:** `/lookup` now writes to `access_logs` on bad PIN with `failed_attempt: true`. Successful lookups log `failed_attempt: false`.
- **Startup check expanded:** Was only checking `SENDGRID_API_KEY`. Now checks all five required env vars and fails fast with a clear error listing which are missing.

### `supabase/schema.sql`

- Added `failed_attempt boolean NOT NULL DEFAULT false` to `access_logs` table definition.
- Migration run in Supabase SQL Editor: `ALTER TABLE access_logs ADD COLUMN failed_attempt boolean NOT NULL DEFAULT false;`

### `api/package.json` / `package-lock.json`

- `express-rate-limit` added to dependencies.

---

## Issues closed

| Issue | Title |
|-------|-------|
| #36 | SEC-04 — Supabase Row-Level Security (RLS) audit ✅ |
| #38 | SEC-06 — API rate limiting ✅ |
| #44 | SEC-12 — Secrets and environment variable audit ✅ |

---

## Open security issues (10 remaining)

| Priority | Issue | Title |
|----------|-------|-------|
| Next | #37 | SEC-05 — Security headers |
| Next | #40 | SEC-08 — Stripe webhook security |
| — | #33 | SEC-01 — Data minimization audit |
| — | #34 | SEC-02 — Transport security (HTTPS enforcement) |
| — | #35 | SEC-03 — Data at rest encryption |
| — | #39 | SEC-07 — API response field leakage audit |
| — | #41 | SEC-09 — Access logging completeness and privacy |
| — | #42 | SEC-10 — NFC self-sovereign tier: client-side data handling review |
| — | #43 | SEC-11 — Backup and recovery strategy |
| — | #45 | SEC-13 — Demo profile security review |

---

## Carry-forward (non-security)

| Item | Notes |
|------|-------|
| Drop `images/about-research.png` | Post-it note wall — commit and push when ready |
| Drop `images/about-desk.png` | Desk + HID prototypes + coffee — commit and push when ready |
| DNS flip (Issue #19) | After security gate is complete |
| 3 temp emails | Dan Haber, Kristin Bodiford, Anara Bodiford |
| Elton Robinson insurance | Update from Bubble record ID to "Medicare" in Supabase |
| trust.html placeholders | Governing law/jurisdiction, mailing address |
| faq.html placeholder | Group/bulk pricing section |
| Images for other pages | index.html, products.html — img-slot pattern ready |

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Tools: Claude Sonnet 4.6
- Session Init: pre | Estimated: false
- Process: Shelton confirmed RLS dashboard state, ran curl test, ran Supabase SQL migration, and verified DO env vars. Claude audited the codebase, wrote all rate limiting code, expanded the startup check, ran git grep audits, and filed all closing issue comments.
```
