# Session Log — 2026-04-04

**Focus:** Member migration (Bubble → Supabase), Stripe audit, headshot upload, content pages

---

## What was decided

- **Stripe branding confirmed:** Checkout now reads "Helper-ID by Empathy Lab, Inc." — product identity with org backing. Issue #14 closed.
- **Confirmation URLs updated:** All three Stripe payment links (Digital Download, NFC Pack, Full Membership) now point to `helper-id.com` instead of the DigitalOcean app URL.
- **Pioneer members keep their accounts as-is.** Four members have Stripe subscriptions on the old Bubble Stripe profile. Decision: leave them active with no Stripe IDs in the new system. The webhook only matters for future events. Shelton will reach out personally. When they next purchase, Stripe will wire up naturally.
- **Temp emails for three members.** Dan Haber, Kristin Bodiford, and Anara Bodiford were on `@test.com` emails from the Bubble v2 build transfer. Migrated under `shelton+X@helper-id.com` until real emails are confirmed.
- **Initials fallback for missing headshots.** Matt Shirley has no headshot — the reader already shows initials (MS) in a gray box. Kept as-is, no placeholder image needed.
- **Nav standardized.** All public pages now share the same nav: Products | Read a Tag | Free PDF | About.
- **Three content pages added from scratch** rather than porting from Bubble — cleaner than migration.

---

## What was built

### Stripe (dashboard)
- Business name updated to "Helper-ID by Empathy Lab, Inc."
- Confirmation URLs updated on all three payment links → `helper-id.com`

### Supabase schema fix
- Added `UNIQUE` constraint on `members.email` (was missing — only had a regular index)
- Fixed `schema.sql` to reflect `unique index` going forward

### Migration scripts (`api/scripts/`)

| Script | Purpose |
|--------|---------|
| `seed-from-bubble.js` | Hardcoded 9-member Bubble v3 export → Supabase. Bcrypt-hashes PINs, maps fields, upserts members + profiles. |
| `patch-stripe-members.js` | Patches `stripe_customer_id` + `stripe_subscription_id` for paying members post-seed. (Not run — pioneer decision above.) |
| `update-member-email.js` | Swaps a temp `shelton+X` email for a member's real email when they're ready to claim their account. |
| `upload-headshots.js` | Reads `scripts/headshots/{CODE}.jpeg`, uploads to Supabase Storage `headshots` bucket, generates 10-year signed URL, updates `profiles.headshot_url`. |

### Member migration results
- 9 members seeded into Supabase — all `status: active`
- All CODE+PIN combinations verified working after `UPDATE profiles SET code = UPPER(code)` fix (Bubble codes were lowercase; reader uppercases input)
- 8 of 9 headshots uploaded (Matt Shirley — no image, initials fallback)
- `api/scripts/headshots/` added to `.gitignore`

### Content pages
- **`about.html`** — marketing template: mission, origin story, values (6-up grid), Empathy Lab section, CTA
- **`trust.html`** — legal template: Privacy Policy, Terms of Service, Data Practices, Refund Policy, Contact. Anchor nav between sections.
- **`faq.html`** — documentation template: accordion FAQ, 6 categories (Getting Started, NFC Tags, Profiles, Membership, Privacy & Security, Communities)
- Footer updated on all pages: About · Privacy & Terms · FAQ

---

## Issues closed

| # | Title |
|---|-------|
| #14 | Stripe branding audit (pre-launch checklist) ✅ |

---

## Open items / [PLACEHOLDER] markers

### Migration follow-ups
| Item | Notes |
|------|-------|
| 3 temp emails to update | Dan Haber, Kristin Bodiford, Anara Bodiford — use `update-member-email.js` when real emails confirmed |
| Elton Robinson insurance | `insurance_provider` stored as Bubble record ID — believed to be Medicare. Update manually in Supabase once confirmed. |
| Matt Shirley headshot | No image provided. Initials fallback active. Add when available. |

### Content [PLACEHOLDER] markers
| Page | Placeholder |
|------|-------------|
| `about.html` | Origin story / founding moment |
| `about.html` | Empathy Lab founder context |
| `about.html` | Community partnerships |
| `trust.html` | Governing law / jurisdiction |
| `trust.html` | Mailing address |
| `faq.html` | 55+ communities workflow |
| `faq.html` | Group/bulk pricing |
| `faq.html` | Community partnership contact |

### Pre-DNS flip remaining
| Priority | Item |
|----------|------|
| 1 | Fill [PLACEHOLDER] copy — especially about.html origin story + faq.html 55+ section |
| 2 | DNS flip: Namecheap → DigitalOcean App (Issue #19) |
| 3 | Reach out personally to 4 pioneer Stripe members |
| 4 | Confirm real emails for 3 temp-email members |

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 40%
- AI Contribution: 60%
- Tools: Claude Sonnet 4.6
- Session Init: pre | Estimated: false
- Process: Shelton made all product decisions — pioneer member strategy, temp email approach, initials fallback, content pages from scratch vs. Bubble migration. Claude built all scripts, debugged the migration (UNIQUE constraint, lowercase code mismatch), wrote placeholder copy for all three content pages, and standardized nav across the site.
```
