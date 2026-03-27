# Helper-ID — Profile UI & NFC Architecture
**Session date:** 2026-03-27
**Status:** Decision log — ready for repo commit
**Next session entry point:** Merge `reader_v2.html` design direction into the actual `reader.html` in the repo, starting with photo fallback logic and the updated information hierarchy.

---

## What was decided

- **Photo is a paid (Tier 1) feature only.** NTAG215 capacity is 492 bytes. A usable headshot is 743× that. Physically impossible to store on the tag. Photos are hosted server-side for paid members only.
- **Tier 2 (self-sovereign NFC) shows an initials fallback.** No broken image state. Graceful by default.
- **Profile layout direction is locked for `reader.html` v2.** Mobile-first, single column, 480px max-width. Red used only on Call buttons. Bold used only on critical clinical values (condition name, field labels in detail cards). No colored section headers, no colored borders.
- **Information hierarchy is locked.** Conditions → Allergies → Medications → Contacts. Clinical triage first, human connection (Call buttons) immediately after.
- **"You're helping:" framing is kept verbatim.** From the original v1 Bubble design. Best first-responder hook of the three versions reviewed.
- **Photo treatment:** 76×76px, `border-radius: 12px` (rounded, not circular), subtle drop shadow. Grayscale filter applied. Sits top-left in the identity row alongside name, age, blood type, and member ID.
- **Photo gate is a feature, not a limitation.** Critical emergency data (conditions, allergies, meds, contacts) is always present regardless of tier. The photo adds the human layer for paid members. Viable pricing page framing: "Free / NFC tag: your emergency information, always accessible. Paid membership: your face too."
- **NFC tag as bearer token is the right Tier 1 architecture.** Tag encodes a secret token, not profile data. Tap → token sent to server → server returns full hosted profile including photo. Token lives only on the physical card; losing the card means revoking the token, not exposing data.
- **NFC-as-key and CODE+PIN are complementary, not competing.** Two keys to the same hosted profile door. Tag is the fast physical key. CODE+PIN is the backup when the card is absent, lost, or the device can't read NFC.

---

## What was built or designed

- **`reader_v2.html`** — fully standalone prototype with Shelton's headshot embedded as base64. No server, no repo dependencies, no internet required. Delivered as a downloadable file for local click-through and in-field demos with Lifestyle Directors.
- Design system tokens (DM Serif Display, DM Sans, `--red: #D0312D`) carried forward from `hid-style.css`. No divergence from the established system.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| NFC tag as bearer token — architecture design | For Tier 1 hosted members: tag encodes a revocable secret token instead of profile data. Tap → server returns full profile + photo. Eliminates raw medical data from the URL. Enables photo, revocation, and family management. Requires server-side token issuance at enrollment. CODE+PIN becomes a second key to the same profile. | Before Tier 1 hosted launch |
| Photo upload in `writer.html` enrollment | Paid members need a headshot upload step during enrollment. Needs to be gated to Tier 1 only. Server storage and retrieval path TBD (DO Spaces or similar). | Before Tier 1 hosted launch |
| Photo storage and serving for hosted profiles | Where does the photo live? DO Spaces is the likely answer. Needs a serving URL pattern tied to member ID. | Before Tier 1 hosted launch |
| Graceful degradation for NFC profiles without photo | `reader.html` needs logic: if `profile.photo` exists → show `<img>`, else → show initials derived from `profile.fn` + `profile.ln`. | Before merging v2 into repo |

---

## What was ruled out

- **Photo in the NFC URL fragment (Tier 2).** 492 bytes total capacity. Even a 40×40 JPEG at extreme compression is marginal and not useful. Not worth pursuing at any quality level.
- **Circular photo crop.** Rounded square (`border-radius: 12px`) was chosen over a circle. More ID-card-appropriate, better for portrait crops.
- **Color-coded contact rows** (green Primary, red Secondary from Bubble legacy). Removed in favor of color restraint — red on Call buttons only. Hierarchy communicated by order, not color.
- **Tabbed allergy categories** (Medicine / Environmental / Animal / Food tabs from Bubble). Too much UI chrome for a first-responder view. Pills or plain text only.
- **Bottom 4-card grid as primary layout.** Kept as secondary detail only (Vitals / Medications / Insurance / Allergies in 2-col grid below the main card). Not triage-critical, so moved down.

---

## May need revisiting

- **`reader_v2.html` as static prototype vs. dynamic render.** Currently uses hardcoded Shelton data. When merging into `reader.html`, all fields need to come from the decoded profile JSON as before. The layout is the deliverable from this session; the data binding is the next step.
- **Photo gate enforcement.** Currently a design decision only — no server-side or enrollment-flow enforcement yet. Needs to be wired before launch so Tier 2 NFC profiles cannot include a photo field.

---

## Next steps

1. **Add photo fallback logic to `reader.html`** — check for `profile.photo` field; show `<img>` if present, derive and show initials if absent. Done when both states render correctly on a real NFC-decoded profile.
2. **Update `reader.html` layout to match `reader_v2.html`** — replace the current red header block with the new identity row (photo + name block), update section order to Conditions → Allergies → Medications → Contacts, strip color from section labels. Done when the live deployed page matches the prototype.
3. **Commit `reader_v2.html` prototype to `sessions/` folder** — as a design artifact for reference. Done when file appears in repo.
4. **Design token-based NFC architecture for Tier 1** — define the token format, issuance flow at enrollment, storage in DO, and revocation mechanism. Done when a one-page spec exists that answers: what goes on the tag, what does the server check, how is a token revoked.
5. **Add photo upload step to `writer.html`** — gated to paid tier. Done when a paid member can upload a headshot during enrollment and it appears on their hosted profile.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 55%
- AI Contribution: 45%
- Collaboration Method: Iterative design review — human directed aesthetic decisions, hierarchy, and product framing; AI executed prototypes, fetched live designs for comparison, and provided technical feasibility analysis (NFC capacity math, bearer token architecture)
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Design direction, layout critique, feature gating decisions, product framing, architecture question origination
- AI Roles: Live repo fetch (reader.html, hid-style.css), screenshot capture of Bubble legacy design, prototype construction (v4, v5, reader_v2.html), base64 photo embedding, NFC capacity calculations, bearer token architecture explanation
```
