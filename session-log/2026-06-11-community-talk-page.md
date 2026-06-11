# Helper-ID — Community Talk Page + Admin Session Persistence
**Session date:** 2026-06-11
**Status:** Decision log — ready for repo commit
**Next session entry point:** Review community-talk.html live in production, then consider adding a nav link or entry point from the main site to the talk page.

---

## What was decided

- The community talk page is **organizer-facing**, not resident-facing — its job is to help Shelton get booked, not explain Helper-ID to attendees.
- The talk title is **"Look for the Helpers: A Community Talk on Emergency Preparedness."**
- CTA is a direct mailto link to `shelton@empathylab.io` — no contact form.
- The cost model is public service framing: no speaker fee, Atlanta engagements welcome lunch/gas/donations, out-of-town requires travel sponsorship.
- The page explicitly addresses the "free = they get my data" concern in a dedicated privacy section with plain language.
- The page is **not** locked to 55+ communities — it covers any community type (faith, HOA, employer, school, caregiver groups, civic orgs, etc.).
- Fayette County is named as the origin community in the "Who it's for" section.
- Admin session token is now persisted in `localStorage` so Shelton does not need a new magic link on every page refresh. Token is already 30-day HMAC-signed.

---

## What was built or designed

- **`community-talk.html`** — full organizer-facing booking page with:
  - Hero with talk title and inline CTA
  - 45-minute talk outline (4 blocks with time stamps)
  - Community type tags (8 community categories)
  - Cost model (4 cards: Atlanta, out-of-town, sponsorship, format)
  - Plain-language data/privacy section (dark background, 3 points)
  - About Shelton section with headshot
  - Red CTA footer with mailto button
- **`images/shelton-headshot-bw.png`** — added and committed by Shelton via Terminal
- **Admin localStorage persistence** (`admin.html`) — session token saved on login, restored on refresh, cleared on logout or auth failure

Commits: `4c69e4b`, `58a653a`, `410f578`, `7a64ea9`

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Add a nav link to community-talk.html from the main site? | Page is live but not linked from anywhere — only reachable via direct URL | Before active outreach |
| Should Fayette County be named on the page? | Currently called out as the origin community — remove if Shelton prefers to keep it generic | Before sharing link publicly |
| Talk outline timing — does it match the real talk? | Times were drafted by Claude based on the 45m total — Shelton should verify they reflect the actual flow | Before first use |

---

## What was ruled out

- **Contact form on the community talk page:** Direct mailto keeps it simple and personal. A form adds complexity with no clear benefit at this stage.
- **55+-only framing:** Page is intentionally broad — the talk works for any community type.

---

## May need revisiting

- **Headshot crop:** `object-position: top` is set — may need adjustment depending on how the photo frames in different viewports.
- **Out-of-town sponsorship language:** Vague by design for now. If out-of-town requests come in, a clearer sponsorship ask may be needed.

---

## Next steps

1. Verify `community-talk.html` looks correct in production (headshot, layout, all sections).
2. Decide whether to add a nav or footer link to the page or keep it as a direct-URL-only share for now.
3. Review the 45-minute talk outline against the actual talk flow and adjust if needed.
4. Share the link with the Fayette community organizer as the first outreach test.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 30%
- AI Contribution: 70%
- Collaboration Method: Shelton directed strategy, framing, cost model, and privacy stance; Claude structured the page, wrote all copy, and committed all code.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Talk title approval, CTA decision, cost model, privacy framing, headshot upload, vim survival
- AI Roles: Page structure, copy, talk outline, privacy section, cost cards, localStorage fix, all commits
```
