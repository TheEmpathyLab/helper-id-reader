# Session Log — 2026-04-15

**Focus:** Product design — NFC token system, fulfillment model, wallet card print flow

---

## What was decided

### Product lineup
- Two options presented on site for now: **Free PDF (DIY)** and **Full Membership ($55/yr — Full Service)**
- $9 Digital Download and $35 NFC Kit hidden (commented out) until video tutorials are ready
- index.html, products.html, faq.html all updated to reflect two-option lineup

### Fulfillment model — Full Membership kit
Every Full Membership ships:
- **NFC tag** — token embedded in chip (URL), CODE printed visibly on label. No PIN on tag.
- **Backup paper card** — CODE printed, blank PIN line. Member writes their PIN in themselves.
- **Wallet card** — member prints this themselves at end of setup flow. CODE + PIN pre-filled.

Member owns their PIN exposure entirely. Shelton never sees or handles the raw PIN after the provisioning moment.

### NFC security model
- NFC tap → goes directly to profile, **no PIN prompt**
- Token in the chip is the credential — not CODE, not PIN
- Tokens are revocable — lost tag → revoke token → old tag shows "reported lost" page
- PIN regeneration does NOT affect NFC tags (independent credentials)
- Lost paper card → regenerate PIN → old card dead, NFC tag unaffected
- Lost NFC tag → revoke token → paper card unaffected
- Lost both → revoke token + regenerate PIN → profile intact throughout

### PIN handling
- PIN is hashed immediately at provisioning — never stored in plain text
- Raw PIN exists only in: welcome email, `/admin/provision` API response (once)
- Member is responsible for keeping their welcome email — it is their permanent PIN record
- "Keep this email" messaging to be added in three places (see below)

### Print wallet card
- Generated at end of setup flow — CODE + PIN available in token at that moment
- Also accessible from member dashboard via "Print My Card" button
- Dashboard flow (Option A): member enters their PIN → card generates entirely client-side → PIN never sent back to server
- If PIN forgotten: Regenerate PIN → then print
- Card format: helper-id.com / CODE / PIN

---

## What was built this session

### Products page redesign (index.html, products.html, faq.html)
- 2-column grid: Free PDF (left, DIY) and Full Membership (right, Full Service)
- Tier labels: "DIY — Self-Guided" (gray pill) and "Full Service — We Do It For You" (red pill)
- "★ Full Service" badge on Full Membership card
- Bold highlighted feature rows: CODE + PIN access, first responder access
- $9 and $35 cards commented out with restore instructions
- faq.html pricing references updated throughout

### Admin dashboard (admin.html)
- Stats tiles: total members, active/pending, lookups 7d/30d, failed attempts
- Members table with inline email edit and resend setup
- Access log feed (last 50 events)
- Accessible via "Admin Panel →" link in dashboard (is_admin members only)
- Session passed via URL param from dashboard

### HSTS / SendGrid SSL
- `includeSubDomains` removed from HSTS — `url6672.helper-id.com` (SendGrid branded link domain) cannot serve valid SSL without a CDN
- To restore: add Cloudflare proxy on `url6672.helper-id.com` → restore `includeSubDomains`

---

## Design decisions documented

### Why tokens, not CODE+PIN, on NFC tags
- PIN on a physical card = lost card exposes full profile
- Token = revocable, independent of PIN, no sensitive data on the card
- First responder gets zero-friction tap-to-profile
- CODE+PIN remains as backup/digital access path

### Why member prints their own wallet card
- Shelton never handles raw PIN after provisioning
- PIN goes directly from system → member's email → member's printer
- Clean privacy model — no PIN exposure in fulfillment

### Welcome email — "Keep this email" messaging
To be added in three places:
1. Welcome email body — *"Keep this email. It is your permanent record of your CODE and PIN."*
2. Setup flow — at the CODE+PIN display step
3. Dashboard — next to "Print My Card" button: *"Need your PIN? Check your original welcome email."*

---

## What to build next

| Priority | Item | Notes |
|----------|------|-------|
| 1 | **Revocable NFC token system** | New `nfc_tokens` table, GET /api/nfc/:token, POST /api/nfc/revoke, POST /api/nfc/provision, reader.html token path, revoked card UI |
| 2 | **Print wallet card — setup flow** | At end of setup.html, generate printable CODE+PIN card |
| 3 | **Print My Card — dashboard** | Button in dashboard, client-side PIN entry, card generates in browser |
| 4 | **"Keep this email" messaging** | Welcome email + setup flow + dashboard copy additions |
| 5 | **NFC token management in dashboard** | Member can see their tokens, report one lost (revoke) |
| 6 | **NFC token provisioning in admin** | Admin provisions token per member, gets URL to write to tag |
| Post-launch | trust.html — governing law/jurisdiction + mailing address |
| Post-launch | faq.html — group/bulk pricing placeholder |
| Post-launch | Email click tracking — Cloudflare CDN + restore includeSubDomains |
| Post-launch | Security checkups + GitHub Actions automation |
| Post-launch | AI agents — access_logs anomaly monitor |
| At 1,000 members | Field-level encryption revisit |

---

## NFC token system spec (ready to build)

### Schema
```sql
CREATE TABLE nfc_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token VARCHAR(16) NOT NULL UNIQUE,
  label TEXT, -- e.g. "keychain tag", "wallet card", "lanyard"
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_nfc_tokens_token ON nfc_tokens(token);
CREATE INDEX idx_nfc_tokens_profile_id ON nfc_tokens(profile_id);
```

**Note:** Token references `profile_id` (not `member_id`) — avoids ambiguity for household members, each profile gets its own tokens.

### NFC URL format
```
https://helper-id.com/reader.html?token=TOKEN_VALUE
```
Must use production domain — NFC tags are permanent physical objects.

### Endpoints
- `GET /api/nfc/:token` — public, no auth. Returns profile or revoked status.
- `POST /api/nfc/revoke` — member session auth. Member can only revoke their own tokens.
- `POST /api/nfc/provision` — admin only. Generates token, returns URL.

### reader.html behavior
- `?token=` present → call GET /api/nfc/:token
- active → render profile directly, no PIN prompt
- revoked → show "reported lost" page (no profile data, no member info)
- 404 → show generic invalid tag page
- Existing `?code=` + PIN flow unchanged

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 40%
- AI Contribution: 60%
- Tools: Claude Sonnet 4.6
- Session Init: continuation | Estimated: false
- Process: Shelton drove all product and security decisions — fulfillment model,
  NFC security model, PIN handling policy, print-your-own card flow. Claude
  facilitated the design discussion, identified the PIN/hash tension, proposed
  the token system rationale, and documented all decisions.
```
