# Helper-ID — Architecture & Product Decisions
**Session date:** March 17, 2026  
**Status:** Decision log — ready for repo commit  
**Next session entry point:** Start with Supabase project setup (Step 1 of build order)

---

## 1. Product Vision

Helper-ID is an emergency identification and information platform targeting residents of 55+ and retirement communities. It works when phones are dead, missing, or inaccessible — a physical, identifiable solution first responders can locate and use regardless of device status.

**Core principle: one product, two doors.**  
CODE+PIN and NFC are different access paths into the same profile. The reader renders the same card regardless of how it was accessed. All design decisions flow from this.

---

## 2. Product Tiers

| Tier | Name | How it works | Infrastructure |
|------|------|-------------|----------------|
| Tier 1 | HID Hosted (CODE+PIN) | Alphanumeric CODE + generated PIN. Profile stored in Supabase. Accessed via manual entry. | Supabase + serverless functions |
| Tier 2 | Self-Sovereign (NFC) | Profile encoded as Base64 URL fragment written to NTAG215 tag via NFC Tools. No server required. | GitHub Pages only |
| Hybrid | Both paths | Single profile accessible via NFC tap or CODE+PIN entry. One tag, two access methods. | Both |

---

## 3. Database Schema (Supabase)

Four core tables. RLS enabled from day one. `access_logs` stub built in now so future phone-auth populates it without a migration.

### `members`
The account layer. Separate from profile data so a member can exist before their profile is complete.

```
id                      uuid PK
email                   string
stripe_customer_id      string
stripe_subscription_id  string
plan                    enum: individual | household
status                  enum: pending | active
trial_ends_at           timestamp
created_at              timestamp
```

### `households`
One admin member manages multiple profiles. Family tier creates a household. One-to-many with profiles.

```
id                  uuid PK
admin_member_id     uuid FK → members.id
name                string
created_at          timestamp
```

### `profiles`
The emergency card. Shared schema for both NFC and CP paths.

```
id                    uuid PK
member_id             uuid FK → members.id
household_id          uuid FK → households.id
code                  string (6–7 char alphanumeric, unique)
pin_hash              string (bcrypt)

first_name            string (required)
last_name             string (required)
preferred_name        string
date_of_birth         date (displayed as calculated age on card)
headshot_url          string (Supabase Storage bucket)

ec1_name              string
ec1_relationship      string
ec1_phone             string
ec2_name              string
ec2_relationship      string
ec2_phone             string

blood_type            string
allergies             string (rendered in red on card)
medications           string
conditions            string
primary_physician     string

insurance_provider    string
insurance_id          string
advance_directives    string

access_tier           enum: nfc_only | cp_only | hybrid
requires_auth         boolean (stub for future SMS gate, default false)
is_minor              boolean (under-18 simplified profile)
status                enum: pending | active
updated_at            timestamp
created_at            timestamp
```

### `access_logs`
Written on every profile view regardless of access method. Powers member usage data and future phone-auth audit trail.

```
id              uuid PK
profile_id      uuid FK → profiles.id
access_method   enum: nfc | cp
accessor_phone  string (null until SMS auth is built)
ip_address      string
accessed_at     timestamp
```

---

## 4. Security Model

**Philosophy: security through friction, not fortress.**

Information is voluntarily shared. Physical proximity or knowledge of CODE+PIN is the implicit trust gate. This is honest and legally defensible — clearly communicated to members at enrollment.

### Current posture
- RLS on all Supabase tables — profiles not publicly queryable by table scan
- HTTPS everywhere (GitHub Pages provides this free)
- PIN is system-generated, not member-chosen — no memorization required
- Transparency notice on profile builder: persistent, plain-language, visible throughout form entry
- Stripe webhook signature verification on all events
- Super-admin uses service-role key only — not exposed to client

### Future: phone-number auth gate
Optional per-profile flag (`requires_auth`). When enabled, accessing a profile requires SMS OTP. Phone number logged in `access_logs` — visible to member in dashboard. Security mechanism becomes a member-facing trust feature: "your profile was accessed at 2am on Saturday by (404) 555-0182."

### Data sensitivity note
Supabase Pro with RLS is appropriate for PII (name, address, emergency contacts). Medication list and medical history fields should be queried only through authenticated paths — not HIPAA-certified on Pro tier, but defensible for voluntary consumer data. If HIPAA compliance becomes required, migrate to Supabase Enterprise or an alternative.

---

## 5. Stripe & Member Provisioning

### Known issue — Stripe branding ⚠️
All payments currently route through the Empathy Lab Stripe account. Checkout reads "Empathy Lab" not "Helper-ID." Must be resolved before public launch via a dedicated Stripe account or product branding update. Flagged in super-admin Needs Attention panel.

### Webhook flow
```
checkout.session.completed
  → verify Stripe signature (reject with 400 if invalid)
  → return HTTP 200 immediately (before downstream work)
  → parse plan from session metadata
  → generate CODE (6–7 char alphanumeric, collision-check against Supabase)
  → generate PIN (4–6 digit numeric, formatted XXX-XXX)
  → insert members row (status: pending)
  → insert profiles row (status: pending, code, pin_hash)
  → trigger SendGrid welcome email (CODE + signed setup link)
```

**Critical:** Return 200 before processing. Stripe retries on non-200, causing duplicate records.

### CODE+PIN generation rules
- CODE: random alphanumeric, 6–7 chars, unique — loop: generate → check Supabase → retry if collision
- PIN: system-generated, not member-chosen — it lives on a physical card, not in memory
- PIN format: `XXX-XXX` with hyphen break for readability under stress
- PIN regeneration available in member dashboard — invalidates old PIN immediately

### Plan metadata requirement
Stripe payment links must pass `metadata: { plan: 'individual' }` or `metadata: { plan: 'household' }`. Without this, the webhook cannot determine what to provision.

### Subscription upgrade event
`customer.subscription.updated` — flips `plan` on member record, unlocks household features.

---

## 6. Member Setup Flow

Two screens between "just paid" and "profile live."

### Token validation
- Setup link from welcome email contains a signed, time-limited token (48-hour expiry)
- Expired tokens surface a "resend setup email" prompt on the login screen

### Screen 1 — CODE+PIN reveal
- Displays CODE and generated PIN prominently
- Explicit "write this down" instruction
- No PIN creation step — already generated at provisioning

### Screen 2 — Profile builder
- **Transparency notice at top, persistent throughout:**  
  *"Everything you enter here is visible to anyone who accesses your profile using your code and PIN — first responders, family members, or anyone you share your card with. Only include what you're comfortable sharing."*
- Photo upload (optional)
- Fields in first-responder priority order:
  1. Personal (name required, preferred name, DOB)
  2. Emergency contacts (two contacts — name / relationship dropdown / phone, separate fields)
  3. Medical (blood type, allergies, medications, conditions, physician)
  4. Insurance (provider, member ID)
  5. Advance directives (free text)
- Save draft / finish later available throughout
- Status stays `pending` until member reaches review + confirm screen

### DOB decision
Stored as full date. Displayed as **calculated age** on responder card — never needs member update. Raw date shown in header for hospital intake forms.

### Emergency contact decision
Three separate fields per contact (name, relationship dropdown, phone) — not a single composite field. Independently editable, independently validated, independently rendered.

---

## 7. First Responder Profile View

Unified renderer for both NFC and CP access paths. Reader does not know which path was used — renders same card from same data shape.

### Card structure (top to bottom)
1. **Photo** — large, prominent, primary identity confirmation
2. **Full legal name** + preferred name ("Jim")
3. **Age badge** — calculated from DOB, always current
4. CODE shown quietly for reference
5. Emergency contacts — name, relationship, phone as **tap-to-call link**
6. Medical — allergies in **red** (only safety-critical color on card), medications, conditions, physician as tap-to-call
7. Insurance — provider, member ID
8. Advance directives — plain text

### Design decisions
- Preferred name below legal name — legal name leads for hospital intake, preferred name for verbal contact with patient
- All phone numbers are `href="tel:..."` tap-to-call links
- Allergies rendered in red — no other field uses color coding
- Age calculated client-side from DOB — member never updates it

---

## 8. Member Dashboard

Serves four functions: profile management, household management, access monitoring, account settings.

### Sections
- **Access metrics** — total views, NFC views, CP views (sourced from `access_logs`)
- **Profiles** — each profile card shows: name, status badge (active/pending), CODE, last-viewed date, edit/view actions. Incomplete profiles show "Finish setup" CTA only.
- **Add household member** — visible on family plan only
- **Recent access log** — method badge (NFC/CP) + whose profile + timestamp. Future: accessor phone when SMS auth is built.
- **Account** — print/download card (PDF), regenerate PIN, subscription details, email

---

## 9. Super-Admin Interface

Shelton's operational view. Service-role Supabase connection that bypasses RLS. Not a separate database table — a separate authenticated role.

### Features
- Summary metrics: total members, active profiles, 30-day views, MRR
- Member table: searchable by name/email/code, filterable by plan / tier / status
- Manual member provisioning (field enrollments)
- Per-member detail view for data augmentation
- **Needs Attention panel:**
  - Incomplete profiles (pending > X days) → send reminder action
  - Stripe branding issue → persistent flag until resolved
  - NFC members eligible for CP upgrade → upsell surface

---

## 10. Upgrade Paths

| From | To | What changes | Trigger |
|------|----|-------------|---------|
| NFC free (self-sovereign) | NFC paid (hosted) | Profile migrated to Supabase. Member gets account + dashboard. | Stripe payment → webhook provisions member record |
| NFC paid | Hybrid (NFC + CP) | CODE+PIN generated for existing profile. `access_tier` flips to `hybrid`. | Flag flip in dashboard + card print prompt |
| Individual | Family / Household | Profile limit increases. Household created. Add member CTA unlocked. | `customer.subscription.updated` webhook |
| CP only | Hybrid | NFC tag written to match existing Supabase profile. Same data, new access path. | Field enrollment or self-serve tag write |

### Open question — free NFC tier
Does the free self-sovereign NFC tier stay free forever (lead-generation path) or convert after a trial period? This determines upgrade messaging tone. **Decide before building upsell prompts.**

---

## 11. Existing NFC Build — Integration Review

Three files at `theempathylab.github.io/helper-id-reader/` to audit before building CP path.

### `index.html` (reader)
Becomes the unified responder view. Audit against responder card design above:
- [ ] Photo first, large
- [ ] Emergency contacts with tap-to-call links
- [ ] Allergies rendered in red
- [ ] Age calculated from DOB (not raw date)
- [ ] Advance directives at bottom
- [ ] Preferred name shown

### `writer.html` (enrollment)
Built for NFC-only field encoding. Needs schema alignment:
- [ ] DOB field added
- [ ] Emergency contacts split into separate name/relationship/phone fields
- [ ] `access_tier` flag written to tag

### `generator.html` (profile URL generator)
Base64-encoded URL fragment must carry the same field structure as a Supabase profile row. One decoder on the reader handles both sources.
- [ ] Field names match `profiles` table exactly
- [ ] DOB included
- [ ] EC fields split (ec1_name, ec1_relationship, ec1_phone, ec2_name, etc.)
- [ ] Stripe payment link constants swapped to live links

---

## 12. Build Order — Scaffolding Sequence

Each step produces something testable before the next begins.

### Step 1 — Supabase project setup
Schema from session ERD. RLS policies on all tables. Service role key for admin access. Supabase Storage bucket for headshots.

### Step 2 — Stripe webhook handler
Serverless function: signature verification → plan parse from metadata → CODE+PIN generation with collision check → Supabase member + profile insert (`status: pending`) → SendGrid welcome email. Return 200 before downstream work.

### Step 3 — Unified reader (`index.html`)
Single renderer for both NFC URL fragment and CP Supabase fetch. Align field order and rendering with responder card design. Tap-to-call links. Allergies in red. Age from DOB.

### Step 4 — PIN setup / profile builder
Setup link token validation. Screen 1: CODE+PIN reveal. Screen 2: profile builder with transparency notice, split emergency contact fields, photo upload. Save draft. Activation on review + confirm.

### Step 5 — Member dashboard
Profile management, household members, access log from `access_logs`, account settings including PIN regeneration and card print/download.

### Step 6 — Super-admin
Member table with filters, manual provisioning, Needs Attention panel, per-member detail view.

### Step 7 — NFC writer alignment
Update `writer.html` and `generator.html` to match new schema. Ensure URL fragment field structure is identical to Supabase profile row. One decoder on the reader handles both.

---

## 13. Open Questions & Deferred Decisions

| Question | Context | Priority |
|----------|---------|----------|
| Free NFC tier: permanent or trial? | Determines upgrade messaging tone | Before Step 5 |
| Stripe branding fix | Dedicated account or branding update? | Before public launch |
| Photo access control | Headshots should not be publicly crawlable — RLS on Storage bucket | Before Step 4 |
| Minor profile fields | What fields are suppressed for under-18 profiles? | Before Step 4 |
| PDF card print layout | What does the printable card look like? | Before Step 5 |
| Referral/commission structure | Community Helpers — not yet defined | Post-launch |

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 55%
- AI Contribution: 45%
- Collaboration Method: Conversational architecture design — Shelton drove all product 
  decisions, priorities, and corrections through dialogue; Claude translated decisions 
  into schemas, flow diagrams, UI mockups, and structured documentation
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Product vision, feature prioritization, security philosophy, UX feedback 
  and corrections (emergency contact fields, PIN model reframe, photo prominence, DOB 
  rationale, transparency notice placement), upgrade path strategy, build order approval, 
  output format decisions
- AI Roles: Database schema design (ERD), webhook flow architecture, UI mockups (setup 
  screens, responder view, member dashboard, super-admin), security model articulation, 
  upgrade path mapping, document authoring
```
