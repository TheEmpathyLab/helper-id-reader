# Helper-ID — PDF Email Flow + Drip Completion
**Session date:** 2026-04-28
**Status:** Decision log — ready for repo commit
**Next session entry point:** Add CRON_SECRET to DigitalOcean env vars and configure the daily cron job to activate the drip sequence.

---

## What was decided

- `api/template.pdf` is the canonical drop-in path for the PDF template — overwrite and push to update the design, no code changes required.
- `docs/` is not a valid location for runtime assets — DigitalOcean deploys only the `api/` source directory; anything at the repo root is unavailable on the server.
- Font face for filled PDF fields is controlled by `StandardFonts.Courier` in server.js — not by Acrobat's DA string. Size and color remain Acrobat-controlled.
- The DA override (`setDefaultAppearance()` per field) was removed — InDesign/Acrobat owns font styling going forward; the code only enforces the font face needed by pdf-lib at render time.
- `embedFont(StandardFonts.Courier)` + `form.updateFieldAppearances(courier)` must be called before `form.flatten()` — pdf-lib cannot render appearance streams for any font, including standard fonts, without an explicit embed.
- The `/cron/drip` endpoint is the authoritative drip sender — it is protected by `x-cron-secret` header matching the `CRON_SECRET` env var, not by any auth middleware.
- Drip timing: step 0→1 at 3 days (set at `/email-pdf` upsert), step 1→2 at +7 days, step 2→3 at +11 days, then `completed = true`.

---

## What was built or designed

- **`POST /cron/drip`** — queries leads due for the next drip step (`consent=true`, `completed=false`, `sequence_step<3`, `next_send_at<=now()`), fires `getDripEmail(nextStep)` via SendGrid, advances `sequence_step`, schedules the next `next_send_at`, marks `completed=true` after step 3. Protected by `x-cron-secret` header.
- **`pdf.html` rewrite** — removed the generate/preview/download/print flow entirely. Single "Email Me My Profile →" button calls `/api/email-pdf` directly. On success, reveals a success alert and the three product upsell cards (`#output-section`). jsPDF removed.
- **PDF font fix** — added `pdf.embedFont(StandardFonts.Courier)` and `form.updateFieldAppearances(courier)` before `form.flatten()` in the `/email-pdf` handler. Resolved blank/erroring fields when flattening with a Courier DA string.
- **DA override removed** — `set()` helper simplified to `form.getTextField(name).setText(value || '')`. No more per-field `setDefaultAppearance()` calls.
- **`api/template.pdf` updated** — replaced with the new InDesign design (blue text, Courier, correct sizing set in Acrobat).

Commits: `5e26d8e` (EMAIL-03 + pdf.html), `d141af2` (docs path — later reverted), `0c701d2` (path fix back to api/), `2505f9a` (DA override removed), `566ce1d` (Courier embed).

---

## Open questions

| Question | Context | Priority |
|---|---|---|
| CRON_SECRET env var and cron job not yet active | Must be added to DigitalOcean env vars; cron job (daily POST to `/cron/drip` with `x-cron-secret` header) must be configured before drip emails fire | Before launch |
| Final polished PDF not yet in `api/template.pdf` | Current template is the v2.6 Acrobat-edited file; InDesign work may still be in progress | Before launch |
| Issue #70: DigitalOcean reconnect after repo rename | Renaming repo to `helper-id` will break DO webhook again; proper reconnect process needed | Post-launch / low priority |
| Issue #71: README.md | Pull from about.html content | Post-launch / low priority |

---

## What was ruled out

- **`docs/` as the PDF template location:** DigitalOcean's source directory is `api/`; the repo root (including `docs/`) is not deployed to the server. Any file needed at runtime must live inside `api/`.
- **Per-field DA override in code:** User sets font size and color in Acrobat; the code was overriding those values unnecessarily. Removed in favor of Acrobat-controlled styling.
- **InDesign font picker for AcroForm fields:** InDesign embeds TrueType fonts (e.g. Courier New) as custom PDF resources that pdf-lib cannot render. Font must be set in Acrobat Pro using the standard built-in font list, or controlled programmatically via `StandardFonts` in pdf-lib.

---

## May need revisiting

- **Font face split between code and Acrobat:** `StandardFonts.Courier` in server.js controls what actually renders; the Acrobat DA font name is effectively ignored at fill time. If the design changes font, a code change is also required — this coupling is not obvious from the PDF alone.
- **`updateFieldAppearances(font)` overrides all fields uniformly:** If future template versions need different fonts per field (e.g. a bold name field), `updateFieldAppearances` won't support it — per-field `updateAppearances()` calls would be needed instead.

---

## Next steps

1. Add `CRON_SECRET` env var to DigitalOcean App Platform → Settings → Environment Variables — done when variable is saved and app redeploys.
2. Configure a daily cron job (`0 8 * * *` UTC) that POSTs to `https://helper-id.com/api/cron/drip` with header `x-cron-secret: $CRON_SECRET` — done when first drip fires successfully in production.
3. Drop final InDesign PDF into `api/template.pdf`, commit, and push — done when the PDF email renders correctly end-to-end in production.
4. Test full `pdf.html` → email → PDF attachment flow on production after next DO deploy.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Human directed priorities and made all design decisions (font, styling, drop-in PDF workflow); AI diagnosed root causes, wrote all code, and committed all changes.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Identified bugs, set design direction in InDesign/Acrobat, dropped in updated PDF assets, confirmed or redirected at each step
- AI Roles: Diagnosed DO deployment path constraint, diagnosed pdf-lib font embed requirement, wrote /cron/drip endpoint, rewrote pdf.html, removed DA override, added Courier embed + updateFieldAppearances, wrote all commits
```
