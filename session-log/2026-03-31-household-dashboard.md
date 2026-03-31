# Helper-ID — Household Plan + Dashboard Build
**Session date:** 2026-03-31
**Status:** Decision log — ready for repo commit
**Next session entry point:** Migrate 10 paying Bubble members (3 are households). Use `/admin/provision` + `/admin/create-household` + `/admin/link-household` scripts in `scripts/`. Then tackle Issue #14 (Stripe branding BLOCKER before outreach).

---

## What was decided

- **Guardian → Dependent model** chosen over "minor" flag. A dependent is anyone under guardianship regardless of age — child, adult, elder. Captured in Issue #26.
- **Dependents use placeholder emails** (`juliette@davis.local`, `grayson@davis.local`) since they don't log in. Guardian manages their profiles.
- **Household admin identified via `households.admin_member_id`** — no role column needed on `members`. Guardian access checked server-side via `guardianCanAccess()`.
- **`scripts/` folder established** for all admin curl operations. All scripts use `$ADMIN_SECRET` env var — no secrets in the repo. `migrations/` subfolder records every one-time action as an audit trail for future devs.
- **DOB stored as ISO `YYYY-MM-DD`** in Supabase, displayed as `MM/DD/YYYY` in the form. Auto-formats as user types.
- **PIN can't be retrieved** (only bcrypt hash stored). Guardian uses Regenerate PIN to get a new one, which then reveals a "View Profile ↗" link pre-filled with CODE+PIN.

---

## What was built

### server.js
- **`guardianCanAccess(memberId, profileId)`** — returns true if own profile OR household admin
- **`POST /admin/create-household`** — creates household record, sets admin member, upgrades member plan to `household`
- **`POST /admin/link-household`** — sets `household_id` on a list of profile UUIDs
- **`POST /admin/provision`** — updated: accepts `householdId` param; uses `guardianCanAccess` for all edits
- **`POST /member-data`** — updated: returns household profiles + `household` object for admins
- **`POST /update-profile`** — updated: guardian access via `guardianCanAccess`
- **`POST /regenerate-pin`** — updated: guardian access via `guardianCanAccess`
- **`POST /upload-photo`** — updated: accepts session+profileId (dashboard) OR token (setup flow); uses `profileId` as filename

### dashboard.html
- **Household section** — shows dependent cards (name, CODE, View ↗, Edit buttons); only visible for household admins
- **Shared edit form** — one form works for own profile and dependents; editing banner shows whose profile is active
- **Dependent credentials block** — shows CODE; PIN revealed after Regenerate; "View Profile ↗" link appears with CODE+PIN pre-filled
- **Headshot upload** — click header avatar for own profile; "📷 Update Photo" button in edit panel for any profile
- **DOB auto-format** — slashes inserted as user types; validates MM/DD/YYYY on save; converts to/from ISO for DB
- **Field-level error highlighting** — red border + inline message on bad fields; clears on focus
- **View profile from dep card** — "View ↗" opens reader.html in new tab; pre-fills CODE only (PIN needed manually unless just regenerated)

### reader.html
- **Auto-lookup fix** — pre-fills CODE field from `?code=` param even without PIN; auto-submits only when both CODE+PIN are present

### scripts/
- `provision-member.sh` — reusable template for `/admin/provision`
- `create-household.sh` — reusable template for `/admin/create-household`
- `link-household.sh` — reusable template for `/admin/link-household`
- `migrations/2026-03-31-davis-family.sh` — audit record of Davis family setup
- `scripts/README.md` — onboarding docs for future devs

### supabase/schema.sql
- Updated household table comment to document guardian model

---

## Members provisioned this session

| Name | Email | CODE | Type |
|------|-------|------|------|
| Forrest Gump | forrest@demo.helper-id.com | 323232 | Demo |
| Shelton Davis | shelton@empathylab.io | 123456 | Guardian / Household admin |
| Laura Davis | lauracdavis@gmail.com | LAURA | Household member |
| Juliette Davis | juliette@davis.local | JULIETTE | Dependent (no login) |
| Grayson Davis | grayson@davis.local | GRAYSON | Dependent (no login) |

**Davis Family household:**
- ID: `fae15362-c53e-4493-b34d-434f8c386387`
- Admin: Shelton (`f84f4acc-cc6f-4e58-84c0-45fe07cdf49e`)
- All 4 Davis profiles linked

---

## GitHub issues created this session

- **Issue #26** — Guardian → dependent model (any age, not just minors)
- **Issue #27** — Nav: Member Login button on all pages

---

## Open questions / next steps (updated after UI session)

| Priority | Task | Notes |
|----------|------|-------|
| 1 | Migrate 10 paying Bubble members | 3 are households — use scripts/ |
| 2 | Fix Stripe branding (Issue #14) | BLOCKER before outreach |
| 3 | DNS flip helper-id.com → DO (Issue #19) | /api/ calls fail on Bubble DNS |
| 4 | Build household plan + billing (Issue #15, #25) | After migration |
| 5 | Guardian dashboard — manage household members (Issue #24/#26) | Dashboard phase 2 |

---

---

## UI overhaul — continuation session (same date)

### Product restructure & nav overhaul (commit 95dceb3)
- **Product grid** reduced to 3 cards: $9 Digital Download, $35 NFC Pack + Digital Download, $55 Full Membership (annual). Free PDF demoted to a text link below the grid.
- **"Most Popular" badge** moved to $55 Full Membership (was on $9).
- **New `products.html`** — standalone products page with same 3-card grid + "Why Helper-ID" dark section.
- **Nav updated on all pages** — Products · Read a Tag · Free PDF + Member Login button (outline style). Applied to index.html, products.html, pdf.html, generator.html.
- **Notify strip removed** from index.html (was "Coming Soon CODE+PIN" — no longer needed).

### Index.html hero redesign — Issue #28 (commit df7a580)
- **Old hero**: centered, max-width 640px, brand-focused, squished on mobile.
- **New hero**: two-column grid layout at `var(--max-width)` (~860px).
  - Left: responder-first copy — "Found someone's Helper-ID tag?" headline + description + secondary "Get Your Own Tag →" CTA.
  - Right: white card with CODE + PIN inputs, "Access Profile" button, divider + "Open Tag Reader" fallback link.
- **`heroLookup()`** validates CODE presence, redirects to `reader.html?code=X&pin=Y` — reader handles the API call.
- **Mobile** (`≤720px`): stacks to single column, full-width, comfortable padding.
- Confirmed pushed to DO and deploying.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 30%
- AI Contribution: 70%
- Collaboration Method: Human directed priorities, QA'd each feature in live DO environment, caught UX issues (headshot upload confusion, DOB format error, view link not pre-filling); AI built all server endpoints, dashboard UI, scripts folder, and session log
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Priority direction, live QA, bug discovery (DOB format, view link, dependent headshot confusion, curl paste issues), product decisions (guardian model, placeholder emails, scripts folder pattern)
- AI Roles: All code (server.js guardian endpoints, dashboard.html household UI, reader.html fix, scripts/ folder), migration execution support, GitHub issues, session log
```
