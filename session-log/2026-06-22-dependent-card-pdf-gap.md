# Helper-ID — Dependent Profile Creation + Card/PDF Gap Analysis
**Session date:** 2026-06-22
**Status:** Decision log — ready for repo commit
**Next session entry point:** Pick up #77 (self-serve add-dependent flow) first — #78 (per-dependent card/PDF buttons) is blocked on dependents being creatable through something other than raw API calls.

---

## What was decided

- Household/dependent provisioning stays a future build item, not an immediate fix — Shelton will work #77 and #78 later rather than having them built in this session.
- The card/PDF gap and the dependent-creation gap are tracked as **two separate issues**, not one — creating a dependent and generating their card/PDF are independent problems with independent fixes.
- The wallet card's PIN-on-card requirement is an open UX question, not something to resolve by guessing — it's logged as a decision point inside #78 rather than pre-decided.

---

## What was built or designed

Nothing shipped to the repo this session — this was a diagnostic session that ended in two scoped GitHub issues:

- **[#77](https://github.com/TheEmpathyLab/helper-id-reader/issues/77)** — Dashboard: self-serve flow to add a household dependent profile.
- **[#78](https://github.com/TheEmpathyLab/helper-id-reader/issues/78)** — Dashboard: per-dependent Card/PDF actions in Household section.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| How should a guardian see/use a dependent's PIN for the wallet card? | Only the bcrypt hash is stored — guardian has no way to know a dependent's raw PIN unless they just regenerated it | Before building #78 |
| Should the PIN field on the wallet card be optional for minors? | Minors will likely be accessed via NFC tap, not CODE+PIN — an optional/blank PIN field may be the simpler answer | Before building #78 |
| What's the real max-profiles-per-household limit? | #77 needs a server-side cap; #15 (household pricing) hasn't finalized seat count yet | Before building #77 |

---

## What was ruled out

- **Folding #78 into #77:** Considered bundling the card/PDF buttons into the add-dependent issue since they touch the same dashboard section, but the backend for #78 (card/PDF generation) already works for dependents today — only the UI affordance is missing. Keeping them separate means #78 isn't artificially blocked on #77's full scope.

---

## May need revisiting

- **Issue #77's "household auto-create on first add" behavior:** Drafted as "create the household row if one doesn't exist yet" — this may need to be gated behind the household plan (#15) once pricing/seat enforcement is real, rather than letting any individual-plan member spin up a household for free.

---

## Next steps

1. Build #77 — guardian-facing "Add a household member" action + session-authenticated create/link endpoint.
2. Resolve the PIN UX question inside #78 before writing any code for it.
3. Build #78 once #77 makes dependents creatable outside of raw API calls.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton asked a direct product question (can he print a card for his daughter); Claude traced the dashboard and API code to find the actual gap, then Shelton directed that the findings become tracked issues for later work.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Original question, decision to split into two issues, decision to defer building
- AI Roles: Code investigation (dashboard.html, server.js, schema.sql), gap diagnosis, issue drafting and creation
```
