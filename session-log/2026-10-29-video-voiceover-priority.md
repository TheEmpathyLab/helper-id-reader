# Helper-ID — Video Voice-Over Priority, Non-Software Issue Label
**Session date:** 2026-10-29
**Status:** Decision log — ready for repo commit
**Next session entry point:** Record the voice-over for the team's animated video (issue #93), then run the #92 live QA.

---

## What was decided

- The voice-over for the team's animated Helper-ID video is the top HID priority, ahead of the #92 live QA.
- Non-software tasks can be tracked as GitHub issues in this repo, tagged with a new `non-software` label.

---

## What was built or designed

- **HID agenda block** for 2026-10-29, built with `/agenda`. The voice-over is the next action, and the #92 live QA moved to second place.
- **GitHub label `non-software`:** "Human tasks outside the codebase: calls, recordings, outreach."
- **GitHub issue [#93](https://github.com/TheEmpathyLab/helper-id-reader/issues/93):** "Record voice-over for the animated video". Its checklist:
  - decide whether to ask AS for help;
  - record the voice-over;
  - send it to the team.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Ask AS for help with the voice-over? | Shelton is considering it. The answer decides who records and when. | Before recording |
| Should `/agenda` read `non-software` issues, or should these items also go into `agenda-notes.md`? | `/agenda` reads only session notes, git log and `agenda-notes.md`. It never sees GitHub issues, so #93 won't appear in the block unless a note mentions it. | Next agenda run |
| Key tag add-on price ($25 for 3) and how Shelton is notified of orders | Carried over from 2026-10-27. | Before memberships reopen |
| Commit or ignore `kit_design/260618-HID-OnePager.indd` and `.DS_Store` | Carried over from 2026-10-27. Still uncommitted. | Next build session |

---

## What was ruled out

Nothing ruled out this session.

---

## May need revisiting

- **Non-software tasks as repo issues:** Revisit if they crowd the issue list or if `agenda-notes.md` turns out to be the better home.

---

## Next steps

1. Record the voice-over (#93). Done when the recording is sent to the team and #93 is closed.
2. Live QA for #92, the three checks listed in [2026-10-27-memberships-paused-waitlist.md](2026-10-27-memberships-paused-waitlist.md). Done when all three pass.
3. Close #92, citing `83fe6ba`, `5b223d1` and `1c9f716`. Done when the issue is closed.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 40%
- AI Contribution: 60%
- Collaboration Method: Shelton set the voice-over as the HID priority, raised asking AS for help, and asked for a GitHub issue with a label for non-software work. Claude built the agenda block, created the label and issue, and wrote this review.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Prioritization, deciding to track non-software work as issues, labeling direction
- AI Roles: Agenda block from session notes and git log, label and issue creation, session review
```
