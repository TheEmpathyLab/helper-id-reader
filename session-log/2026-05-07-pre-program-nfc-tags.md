# Helper-ID — Pre-Program NFC Tag Architecture
**Session date:** 2026-05-07  
**Status:** Decision log — ready for repo commit  
**Next session entry point:** Run end-to-end test with a member who hasn't activated yet — confirm activate.html UX is clear without coaching.

---

## What was decided

- Physical NFC tags are manufactured blank and activated by members — admin does not link tags to members at manufacture time.
- Tag identity is a permanent `tag_id` in `HID-XXXXXX` format (HID- prefix + 6 alphanumeric uppercase, no I/O/0/1). This is written to the chip once and never changes.
- Tags exist in three states: `pending` (unactivated), `active` (linked to a member), `revoked` (deactivated).
- Tag activation requires CODE+PIN — not a session token — so any member can activate a tag from any device without being logged in.
- The tag resolver (`t.html`) is a static HTML page using a query parameter (`?id=HID-XXXXXX`) rather than a path-based URL (`/t/HID-XXXXXX`), to avoid requiring DigitalOcean routing config changes.
- Tag URL format written to physical chip: `https://helper-id.com/t.html?id=HID-XXXXXX`.
- The `nfc_tags` table references `members.id`, not `profiles.id` — one tag per member, not per profile (household dependents use the old `nfc_tokens` system for now).
- The old `nfc_tokens` system coexists unchanged. Legacy `/reader.html?token=` URLs continue working.
- When a tag is activated, an `nfc_tokens` entry is provisioned for the member's active profile so the existing reader flow works without modification.
- If no `nfc_tokens` entry exists at resolve time, one is provisioned lazily — this is a safety fallback, not the primary path.
- Admin can generate tags in batches (1–100), revoke any tag, and see the full tag table with member info.
- Members can see their linked tags in the dashboard, deactivate a tag, and link a new tag by entering the tag ID (which redirects to `activate.html`).
- A spreadsheet + Admin → NFC Tags panel are the dual tracking system: spreadsheet for physical logistics, admin panel for digital state.
- Same URL is written to the NFC chip regardless of form factor (card, sticker, keychain).

---

## What was built or designed

- **`supabase/schema.sql`** — migration block added with `nfc_tags` table DDL, indexes, and RLS enable. Run manually in Supabase SQL Editor.
- **`api/server.js`** — 7 new routes:
  - `POST /tag-resolve` — resolves tag_id to status + nfc token; called by t.html
  - `POST /tag/activate` — CODE+PIN auth, links pending tag to member, provisions nfc_tokens entry
  - `POST /tag/mine` — returns member's linked tags (session auth)
  - `POST /tag/deactivate` — member revokes one of their own tags
  - `POST /admin/tags` — admin list all tags with member info
  - `POST /admin/tags/generate` — generates batch of pending tag IDs
  - `POST /admin/tags/revoke` — admin force-revokes any tag
- **`t.html`** — new static tag resolver; reads `?id=` param, calls `/api/tag-resolve`, routes to activate/reader/error states client-side.
- **`activate.html`** — new activation flow page; reads `?tag=` param, prompts CODE+PIN, calls `/api/tag/activate`, shows success state with dashboard link.
- **`dashboard.html`** — "My Devices" card added: lists linked tags with status + activation date, deactivate button per tag, enter-tag-ID → activate flow.
- **`admin.html`** — "NFC Tags" card added: full tag table, batch generator with output display, revoke button per tag.
- **GitHub issue #72** — opened and closed in same session (commit `501b23e`).

---

## Open questions

| Question | Context | Priority |
|---|---|---|
| Should household dependents get their own tag activation flow? | Currently nfc_tags links to member_id (one per account); dependents share the guardian's tag system. | Post-launch |
| Should the admin panel show the NFC URL alongside each tag ID for easy copy? | Currently shown only in the generate results panel. Would help when reprinting or replacing a tag. | Low |
| Should a member be able to name/label their tags? | Useful when a member has multiple tags (e.g. wallet card + keychain). Not built yet. | Post-launch |
| DO routing rule to enable `/t/HID-XXXXXX` clean URL | Currently uses `t.html?id=`. Would require configuring `/t/*` → API in DigitalOcean app spec. | Cosmetic — post-launch |

---

## What was ruled out

- **Path-based tag URL (`/t/HID-XXXXXX`) at launch:** Requires a DigitalOcean routing rule to forward `/t/*` to the Express service. Deferred to post-launch in favor of query-param approach (`t.html?id=`) which works without config changes.
- **Storing a direct `nfc_token` reference on `nfc_tags`:** Would require an extra column outside the spec schema. Instead, the resolver chains through `nfc_tags → profiles → nfc_tokens` with lazy provisioning as fallback.
- **Member activates via session token instead of CODE+PIN:** Would require a separate `/tag/link-by-session` endpoint. Rejected — CODE+PIN is already the auth primitive for the activate flow, keeps the path consistent, and works without a dashboard login.

---

## May need revisiting

- **Lazy nfc_token provisioning in the resolver:** If a member's profile loses its active nfc_token for any reason, the resolver creates a new one silently. This is correct behavior but could mask data issues. Revisit if access log anomalies appear.
- **Tag URL format (`t.html?id=`):** Should be migrated to clean path format (`/t/HID-XXXXXX`) once DO routing is configured. All logic is already in the Express server ready for this.

---

## Next steps

1. Write the remaining 9 tags with NFC Tools using the URLs from Admin → NFC Tags generate output — done when all 10 physical tags have been written and tested.
2. Test `activate.html` with a real member account (not admin) — done when a non-admin member completes activation without coaching.
3. Add tag label field (e.g. "wallet card", "keychain") — done when member can name a device and see the label in My Devices.
4. Configure DO routing for `/t/*` → API to enable clean URL format — done when `https://helper-id.com/t/HID-XXXXXX` resolves correctly without `t.html?id=`.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 15%
- AI Contribution: 85%
- Collaboration Method: Shelton directed the spec and made all product decisions; Claude implemented the full schema, all API routes, and all frontend changes in one session.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Spec authorship, product decisions, deployment (Supabase SQL, NFC Tools tag writing), live QA on 10 physical tags
- AI Roles: Schema design, all server.js routes, t.html, activate.html, dashboard My Devices section, admin NFC Tags panel, GitHub issue, commit
```
