# Helper-ID — PIN Input Alphanumeric Fix
**Session date:** 2026-05-11
**Status:** Decision log — ready for repo commit
**Next session entry point:** PIN fields across all three pages now accept alphanumeric input; verify end-to-end with a real tag scan on device.

## What was decided

- `inputmode="numeric"` is removed from the PIN field in `activate.html` — it was locking mobile keyboards to digits only, blocking alphanumeric PINs.
- Placeholder text for PIN fields is updated to show an alphanumeric example (`A4B-29X`) across `activate.html`, `reader.html`, and `index.html` so members understand letters are valid.

## What was built or designed

- `activate.html` — removed `inputmode="numeric"` and updated placeholder from `482-931` to `A4B-29X`.
- `reader.html` — updated PIN placeholder from `482-931` to `A4B-29X`.
- `index.html` — updated PIN placeholder from `482931` to `A4B29X`.

Committed: `66456a1` — pushed to `main`.

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Are any existing PINs purely numeric in the database? | If all real PINs happen to be digits, the old placeholder was accidentally accurate — confirm format in Supabase. | Before next member onboarding |

## What was ruled out

- **Keeping `inputmode="numeric"`:** Directly caused the reported bug — mobile browsers restrict input to digits only when this attribute is set.

## May need revisiting

- **PIN format definition:** If the PIN generation logic ever changes (e.g., switching from mixed alphanumeric to purely numeric), placeholder examples and any client-side validation should be updated to match.

## Next steps

1. Test activate flow on a real device with an alphanumeric PIN — confirm full keyboard appears and submission succeeds.
2. Verify that `reader.html` and `index.html` CODE+PIN lookup also accept alphanumeric PINs end-to-end against the API.

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton identified the bug from live device testing; Claude diagnosed root cause, located the offending attribute, and applied fixes across all affected files.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Bug discovery, direction, commit/push approval
- AI Roles: Root cause analysis, code edits, commit authoring
```
