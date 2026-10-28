# Helper-ID — PIN Input Fix, Email Update Flow, and CODE+PIN Audit
**Session date:** 2026-05-15
**Status:** Decision log — ready for repo commit
**Next session entry point:** Copy-to-clipboard button for CODE on dashboard is the next UX improvement flagged but deferred; member self-service email update (issue #74) is the next functional build.

## What was decided

- `inputmode="numeric"` on the PIN field in `activate.html` was a bug — removed. PIN fields accept alphanumeric input across all three entry points (`activate.html`, `reader.html`, `index.html`).
- Placeholder text for PIN fields updated to show an alphanumeric example (`A4B-29X`) everywhere to set correct member expectations.
- When an admin updates a member's email, a confirmation email with a 30-day magic login link is sent automatically to the new address.
- The confirmation email is scoped to individual members and household guardians only — household dependents have no independent login so the send is skipped silently.
- The admin UI shows "Saved. Confirmation email sent." vs. "Saved." to distinguish the two cases.
- CODE regeneration will not be built — deferred indefinitely. No product need identified.
- Copy-to-clipboard for CODE on the dashboard is a valid future UX improvement but not building now.
- CODEs and PINs are not case-sensitive. CODEs are normalized to uppercase at every lookup; PINs are numeric only so case is irrelevant.

## What was built or designed

- `activate.html` — removed `inputmode="numeric"`, updated placeholder. Committed `66456a1`.
- `reader.html`, `index.html` — updated PIN placeholders to alphanumeric format. Same commit.
- `api/server.js` — `/admin/update-email` expanded: detects member type (guardian/individual vs. dependent), sends confirmation + magic login link for the former, skips for the latter. Committed `26bfc20`.
- `admin.html` — success message updated to reflect whether email was sent. Same commit.

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Are any existing member PINs purely numeric in the DB? | If all real PINs are digits, the old numeric placeholder was accidentally accurate — worth confirming format in Supabase before member confusion arises. | Before next member onboarding |
| Should member self-service email update (issue #74) require re-authentication or just session auth? | If a bad actor gets dashboard access, they could redirect account email. Current session tokens are 30-day magic links — worth deciding the security bar here before building. | Before building #74 |

## What was ruled out

- **CODE regeneration:** No product need. If a member loses their physical card, the existing CODE remains valid — they can look it up on the dashboard or request a new wallet card print.
- **Copy-to-clipboard button on CODE (now):** Valid improvement for the physical kit flow, but not blocking. Deferred.

## May need revisiting

- **Household dependent email field:** Currently a required-but-inert placeholder. Will become meaningful when issue #73 (non-minor adult independent access) is built — the email update flow will need to handle sending a first-time welcome to dependents getting real credentials.

## Next steps

1. Confirm PIN format in Supabase — are any real member PINs alphanumeric, or all numeric? Informs whether placeholder change surfaces any member confusion.
2. Build issue #74 — member self-service email update from the dashboard. Decide re-auth requirement before starting.
3. When ready, build issue #73 — non-minor household adult independent dashboard access.

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton identified bugs from live device testing and directed product decisions; Claude audited codebase, implemented fixes, authored GitHub issues, and wrote session review.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Bug discovery (PIN keyboard), product decisions (email scoping, no CODE regen, case sensitivity question), issue prioritization
- AI Roles: Root cause diagnosis, code edits across 4 files, API expansion, GitHub issue authoring, CODE+PIN flow audit
```
