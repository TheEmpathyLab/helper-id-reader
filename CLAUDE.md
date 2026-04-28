# CLAUDE.md — Helper-ID

Standing instructions for every Claude Code session on this repo.
Decisions here are final unless explicitly reopened.

---

## Who is building this

Shelton Davis, founder of Empathy Lab, Inc. He directs priorities, makes all product and architecture decisions, and does live QA on real devices. He is not a developer — Claude handles all code. Prefer concise responses and direct execution over explanation. Do not summarize what you just did at the end of a response.

---

## What this is

**Helper-ID** — an NFC emergency ID system. A physical NFC tag taps to a profile page showing emergency contacts, medical info, and insurance. Two access paths: NFC token (tap) and CODE+PIN (manual entry). Members manage their profile via a member dashboard. Shelton manages everything via an admin dashboard.

Stack: Express/Node.js API (`api/server.js`) · Supabase (Postgres) · SendGrid · Stripe · DigitalOcean App Platform · Vanilla JS frontend (no framework).

---

## Repository structure

```
/                   — Frontend HTML files (served as static)
api/
  server.js         — The entire API. All routes live here.
  template.pdf      — AcroForm PDF template for the free PDF email flow.
                      Overwrite and push to update the design — no code changes needed.
  package.json      — Node dependencies (pdf-lib, SendGrid, Supabase, Stripe, bcryptjs, etc.)
docs/               — Design assets and reference PDFs. NOT deployed to server.
session-log/        — Session reviews. One file per session.
supabase/
  schema.sql        — Authoritative DB schema. All migrations documented here as comments.
.github/workflows/  — GitHub Actions (drip cron, future security checks)
hid-form-fields.js  — Shared form rendering and buildProfile() — used by pdf.html and generator.html
hid-style.css       — Design system styles
config.js           — Client-side config (Stripe public keys, etc.) — never put secrets here
```

---

## Deployment constraints

DigitalOcean App Platform deploys **only the `api/` source directory**. The repo root (`docs/`, HTML files, etc.) is not available at runtime. Any file the server needs to read (e.g. `template.pdf`) must live inside `api/`.

---

## Database rules

- All reads and writes go through `server.js` using the Supabase service role key.
- Never use `select('*')` — always use an explicit field allowlist.
- New profile columns require explicit addition to both the SELECT query and the allowlist in `server.js`.
- RLS is enabled on all tables. Service role bypasses it automatically.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## Security rules (non-negotiable)

- API keys and secrets live in environment variables only — never in code, never in the repo.
- Client-side JS (`config.js`, HTML files) may only contain Stripe publishable keys and public URLs.
- Stripe webhook handler: `stripe.webhooks.constructEvent()` must be the first operation. Never process unsigned webhooks.
- Never log sensitive fields (PIN hashes, medical data, email addresses) to console.
- `ip_address` is stored in `access_logs` (justified: rate limiting + intrusion detection). `user_agent` is not stored.
- HIPAA-aligned, not HIPAA-compliant. Consent-driven data sharing. Members explicitly choose to share. Field-level encryption deferred until 1,000 members.

---

## Code conventions

- No comments unless the WHY is non-obvious. Never explain what the code does.
- No abstractions beyond what the task requires. Three similar lines beats a premature helper.
- No error handling for scenarios that can't happen. Trust framework guarantees.
- Validate only at system boundaries (user input, external APIs).
- No feature flags. No backwards-compatibility shims. If something is unused, delete it.

---

## Commit message style

Follow the pattern already established in this repo:

```
ISSUE-ID — short description of what and why

Optional second paragraph if the change needs more context.
Avoid describing what the code does — the diff shows that.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Examples from this repo:
- `NFC-05 — reader.html token path + revoked/invalid card UI`
- `EMAIL-03 — /cron/drip endpoint + pdf.html UX simplification`
- `Fix PDF path — template must live in api/ for DigitalOcean deployment`

When there's no issue number (fixes, infra), lead with a short imperative phrase.

---

## GitHub workflow

- `gh` CLI is authenticated as `TheEmpathyLab` for this repo.
- Create a GitHub issue before starting any non-trivial feature. Reference the issue number in commits.
- Close issues with `gh issue close <n> --comment "..."` — include the commit SHA in the comment.
- Never force-push to main.

---

## Session reviews

At the end of every working session, Shelton will ask for a session review. Follow the format defined in `SESSION_REVIEW_INSTRUCTIONS.md` exactly. Write the file to `session-log/YYYY-MM-DD-{slug}.md` and commit it.

If work continues after a review is written, append a continuation block — never rewrite the original.

---

## Known infrastructure facts

| Thing | Fact |
|---|---|
| PDF template | `api/template.pdf` — AcroForm, 18 fields, Courier font embedded via pdf-lib before flatten |
| PDF font | `StandardFonts.Courier` in server.js controls face. Acrobat controls size and color via DA string. |
| Email | SendGrid. `FROM_EMAIL` env var. Transactional from `hello@helper-id.com`. |
| Drip emails | 3-step sequence. Leads table. `/cron/drip` fires daily via GitHub Actions at 9am ET. Protected by `x-cron-secret` header. |
| Stripe | Webhook at `/stripe-webhook`. Provisions member + profile on `checkout.session.completed`. |
| NFC tokens | `nfc_tokens` table. Token = 12-char alphanumeric. URL: `helper-id.com/reader.html?token=TOKEN`. |
| Admin access | `is_admin` boolean on `members` table. Shelton's account: `shelton@helper-id.com`. |
| SendGrid HSTS | `includeSubDomains` removed from HSTS header — restore after Cloudflare proxy is on `url6672.helper-id.com`. |

---

## What never to do

- Never put secrets, API keys, or service role keys in client-side code or the repo.
- Never use `select('*')` in Supabase queries.
- Never produce DOCX. Markdown only.
- Never mock the database. All testing hits real infrastructure.
- Never skip the Stripe webhook signature check.
- Never commit `node_modules/`, `.env`, or headshot files (`api/scripts/headshots/` is gitignored).
- Never recommend `docs/` or repo root paths for runtime assets — DO won't serve them.
