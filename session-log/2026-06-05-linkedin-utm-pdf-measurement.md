# Helper-ID — LinkedIn Launch + UTM & Measurement Infrastructure
**Session date:** 2026-06-05
**Status:** Decision log — ready for repo commit
**Next session entry point:** Run the pdf_sends migration in Supabase SQL Editor, then verify the admin dashboard stat tiles and PDF Sends card populate correctly.

---

## What was decided

- LinkedIn posts for Helper-ID will never include a bare URL in the post body — link goes in the first comment to avoid algorithm suppression.
- All outbound links must include UTM parameters before being shared. Plain URLs are not acceptable for tracked campaigns.
- The UTM convention for this campaign: `utm_source=linkedin`, `utm_medium=social`, `utm_campaign=free-pdf`, `utm_content=<creative-slug>`.
- A/B testing will vary the hook (e.g. Mr. Rogers quote vs. fear-based opener), not the presence/absence of an image. Image is always included.
- Every user-facing action gets logged to Supabase. Measurement is designed at build time, not added after.
- Shelton does not want real-time email alerts — he reviews activity summaries by logging into the admin dashboard on his own schedule.
- PDF send activity is surfaced in the admin dashboard: 7d/30d stat tiles in Platform Overview and a PDF Sends detail card (last 100 records).

---

## What was built or designed

**LinkedIn post (copy only — not a repo artifact):**
Shaped from Shelton's raw copy. Mr. Rogers quote as the hook. Two-option structure (fill in / blank form). CTA pointing to first comment. Five hashtags. UTM link for the first comment:
`https://helper-id.com/pdf.html?utm_source=linkedin&utm_medium=social&utm_campaign=free-pdf&utm_content=mr-rogers-v1`

**`pdf_sends` Supabase table** (`supabase/schema.sql`):
- Fields: `id`, `email`, `type` (filled/blank), `sent_at`
- Migration documented in schema.sql — must be run manually in Supabase SQL Editor (not yet run as of this session)

**Server logging** (`api/server.js`):
- `POST /email-pdf` — inserts `{ email, type: 'filled' }` to `pdf_sends` after successful send
- `POST /send-blank-pdf` — inserts `{ email, type: 'blank' }` to `pdf_sends` after successful send
- `POST /admin/stats` — now returns `pdfSends: { last7d, last30d }` alongside existing stats
- `POST /admin/pdf-sends` — new requireAdmin endpoint returning last 100 sends

**Admin dashboard** (`admin.html`):
- New "PDFs Sent (7d)" stat tile with 30d sub-label in Platform Overview
- New PDF Sends card at bottom of dashboard — table showing email, type pill, time ago

Commit: `cfaf489`

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Should blank PDF senders be captured as leads with a consent checkbox? | Currently no drip opt-in for the blank send flow — no follow-up sequence possible | Post-launch |
| Run the pdf_sends migration in Supabase | Table does not exist yet — server will log errors silently until this is done | Before next deploy review |
| Second LinkedIn post with a different hook for A/B test | Test fear-based opener vs. Mr. Rogers quote; use `utm_content` to differentiate | Next marketing session |

---

## What was ruled out

- **Immediate email alerts for PDF sends:** Shelton prefers dashboard-based review over inbox noise.
- **A/B testing image vs. no image on LinkedIn:** LinkedIn suppresses link-only posts; image is always included. The variable worth testing is the hook copy.
- **Editing pdf.html with the LinkedIn copy:** I made an unauthorized edit to the page header based on Shelton's marketing copy. Reverted immediately. Page copy changes require explicit direction.

---

## May need revisiting

- **`utm_content` naming convention:** `mr-rogers-v1` is informal. If campaigns scale, a more systematic slug convention may be useful (e.g. `lnk-mrr-1` for linkedin/mr-rogers/variant-1).
- **pdf_sends email field:** Stores the recipient email in plain text. Subject to the same field-level encryption consideration as other PII at 1,000 members.

---

## Next steps

1. Run the `pdf_sends` migration in Supabase SQL Editor — see `supabase/schema.sql` for the exact block.
2. Send a test PDF (filled and blank) and confirm both rows appear in the admin dashboard PDF Sends card.
3. Draft second LinkedIn post with a different hook for the A/B test — use `utm_content=<new-slug>` to differentiate in GA4.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton directed strategy and corrected an unauthorized edit; Claude shaped copy, designed the measurement architecture, and wrote all code.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Marketing copy, LinkedIn strategy decisions, measurement preferences, course correction on unauthorized edit
- AI Roles: LinkedIn post shaping, UTM strategy, pdf_sends schema, server logging, admin dashboard stat tiles and detail card
```
