# Helper-ID — End-to-End Member Flow
**Session date:** 2026-03-30
**Status:** Decision log — ready for repo commit
**Next session entry point:** Build Bubble member migration path — existing members need CODE+PIN credentials and a way to transfer their profile data into Supabase.

---

## What was decided

- **$9 and $35 purchases do not provision member records.** Only the $55 hosted plan triggers the webhook provisioning flow. $9 and $35 are handled by `/send-email` only — no data is stored.
- **The raw PIN is embedded in the signed setup token.** Never stored in the database. The token payload contains `{ memberId, pin, expiresAt }`. This is the only place the raw PIN lives after the webhook fires.
- **`setup.html` is a separate page from `reader.html`.** Three-screen flow: CODE+PIN reveal → profile builder → review + confirm.
- **`reader.html` is the long-term homepage hero target.** It should eventually be the first thing a first responder sees.
- **Stripe post-purchase redirect needs a Helper-ID confirmation page.** Currently sends to generic Stripe page — tracked in Issue #17.
- **Stripe branding still reads "Empathy Lab, Inc."** Minor issue, non-blocking for internal testing, must fix before public outreach (Issue #14, BLOCKER).
- **Photo upload is built and wired to Supabase Storage.** Headshots bucket created, multer handles multipart uploads, signed URLs generated with 10-year TTL.
- **Household plan architecture is captured but not yet built.** Issue #15. Schema already supports it via `households` table.
- **NFC write from hosted profile is captured for future build.** Issue #16 — writer.html needs a "fetch by CODE" option to pre-populate from Supabase.

---

## What was built or designed

- **`server.js` — `/validate-token` endpoint** — verifies HMAC-signed setup token, returns `{ code, pin, email }` for Screen 1
- **`server.js` — `/resend-setup` endpoint** — generates new PIN + token, resends welcome email for expired links
- **`server.js` — `/save-profile` endpoint** — saves profile fields as draft, profile stays `pending`
- **`server.js` — `/activate-profile` endpoint** — flips profile + member status to `active`
- **`server.js` — `/upload-photo` endpoint** — multer multipart upload to Supabase Storage headshots bucket
- **`server.js` — `/lookup` endpoint** — CODE+PIN verification, returns sanitized profile, writes access_log
- **`server.js` — webhook guard** — skips provisioning for non-hosted plans (no `plan: individual/household` metadata)
- **`setup.html`** — full 3-screen onboarding flow, token validation on load, expired token handling with resend
- **`reader.html`** — CODE+PIN form enabled, `lookupProfile()` + `normalizeSupabaseProfile()` added, `renderProfile()` extracted as shared renderer for both NFC and CP paths, preferred name display added
- **`writer.html`** — `buildProfile()` updated to match `profiles` schema field names exactly (fn/ln, al/med/cond as strings, contacts `[{n,r,p}]`, doc as string, tier: nfc_only)
- **Issue #15** — Household plan + family pricing captured
- **Issue #16** — Writer: fetch hosted profile by CODE for NFC write
- **Issue #17** — Stripe post-purchase redirect page
- **Issue #18** — Setup flow success screen should link directly to member profile

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Bubble member migration path | Existing members need CODE+PIN credentials and profile data moved to Supabase. Manual process or bulk import? | Before Bubble shutdown |
| Stripe branding fix ("Empathy Lab, Inc.") | Must read "Helper-ID" before any public outreach | Before outreach (BLOCKER — Issue #14) |
| Post-purchase redirect page | Members land on generic Stripe page after $55 checkout | Before Bubble shutdown (Issue #17) |
| Setup success screen links to profile | Members should land on their active profile after completing setup | Before Bubble shutdown (Issue #18) |
| Welcome email delivery confirmation | Confirmed working with real purchase + real email. SendGrid activity shows delivery. | Closed — confirmed |

---

## What was ruled out

- **Storing raw PIN in the database.** PIN is embedded in the setup token only — never persisted. bcrypt hash only.
- **Stripe test mode for webhook testing.** Test mode has no products/payment links. CLI listener + live mode with temp CLI secret is the right test path.
- **`customer_details.email` override in Stripe CLI trigger.** Not a valid fixture parameter. `customer_email` also caused fixture errors. Real purchase with coupon code is the correct test path.

---

## May need revisiting

- **10-year signed URL TTL for headshots.** Functional for now but not ideal — if a member leaves, their photo URL remains valid. Consider shorter TTL with refresh on profile load post-launch.
- **`SETUP_LINK_SECRET` rotation.** All setup tokens are invalidated if this secret changes. Need a rotation strategy before production scale.

---

## Next steps

1. **Build Bubble migration path** — define how existing Bubble members get CODE+PIN credentials and their profile data moved to Supabase. Done when a Bubble member can access their profile via CODE+PIN in the new system.
2. **Build `confirm.html`** — post-purchase landing page (Issue #17). Done when Stripe $55 checkout redirects to a Helper-ID branded page telling members to check their email.
3. **Fix setup success screen** — link to profile after activation (Issue #18). Done when member lands on or is directed to their active profile after completing setup.
4. **Fix Stripe branding** — "Helper-ID" on checkout (Issue #14). Done when Stripe checkout reads "Helper-ID" — required before any community outreach.
5. **Build member dashboard** — Issue #5. Done when a logged-in member can view/edit their profile and see access logs.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 35%
- AI Contribution: 65%
- Collaboration Method: Human directed priorities, tested each flow end-to-end, caught bugs and edge cases in real browser; AI built all server endpoints, setup.html, reader.html CP path, writer.html schema alignment, and GitHub issues
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Priority direction, real-device testing, bug discovery (wrong Stripe product, missing env vars, line break in URL, component-level env var conflict), product decisions (PIN in token, tier gating, household pricing)
- AI Roles: All code (server.js endpoints, setup.html, reader.html updates, writer.html schema fix), debugging (SendGrid key mismatch, component-level DO env var, Stripe metadata guard), GitHub issue creation, session log
```
