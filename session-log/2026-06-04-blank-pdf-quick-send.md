# Helper-ID — Blank PDF Quick Send
**Session date:** 2026-06-04
**Status:** Decision log — ready for repo commit
**Next session entry point:** Feature is live on pdf.html; verify in production that v2.6 editable fields survive the email attachment round-trip.

---

## What was decided

- The blank PDF send uses the existing v2.6 editable file from `docs/` — not a generated/flattened version — so recipients can fill it digitally or print it blank.
- The file is copied to `api/blank-card.pdf` because DigitalOcean App Platform deploys only the `api/` directory; `docs/` is not available at runtime.
- A dedicated endpoint `POST /send-blank-pdf` handles the flow — it accepts only `{ email }` and attaches the file as-is with no pdf-lib processing.
- The UI section sits below the main "Email Me My Profile" button on `pdf.html`, visually subordinate with an "— or —" divider.

---

## What was built or designed

- `api/blank-card.pdf` — v2.6 editable emergency card, committed into `api/` for runtime access.
- `POST /send-blank-pdf` in `api/server.js` — validates email, reads `blank-card.pdf`, sends via SendGrid with editable fields intact. Subject: "Your Helper-ID Blank Emergency Card".
- UI block in `pdf.html` — "Just want the blank form?" card with email input, "Send Blank PDF →" button, and inline success/error states. `sendBlank()` function added to the page script.

Commit: `5443f18`

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Should blank PDF senders be captured as leads? | Currently no drip opt-in for the blank send flow — they get nothing further. Could add a consent checkbox like the full form. | Post-launch |
| Should the blank PDF filename be versioned in the email attachment? | Currently sends as `helper-id-blank-emergency-card.pdf` regardless of which version `blank-card.pdf` is. If the file is updated, recipients have no way to know. | Post-launch |

---

## What was ruled out

- **Reusing `/email-pdf` with empty profile data:** Endpoint requires a populated `profile` object; gutting that validation would have been messy and semantically wrong.
- **Flattening/processing the blank PDF with pdf-lib:** The point of the blank form is that fields stay editable. No processing needed.

---

## May need revisiting

- **`blank-card.pdf` is a static file in the repo:** When the card design is updated, the file must be manually replaced in `api/` and committed. If updates become frequent, a named symlink or build step could help — not worth it now.

---

## Next steps

1. QA in production — send a blank PDF to a real email and confirm editable fields work in Acrobat and Preview.
2. (Optional) Add lead capture / consent checkbox to the blank send flow if conversion data shows demand.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton directed the feature and identified the source file; Claude designed the endpoint, wrote all code, and committed.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Feature direction, source file selection (v2.6), approval to build
- AI Roles: Endpoint design, server.js implementation, pdf.html UI, commit
```
