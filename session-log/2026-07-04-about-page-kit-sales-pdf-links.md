# Helper-ID — About Page, Kit Sales Dashboard, Dead PDF Links
**Session date:** 2026-07-04
**Status:** Decision log — ready for repo commit
**Next session entry point:** Resolve issue #83 — design a proper conversion funnel to replace the temporary `about.html` redirects on all former Free PDF links.

---

## What was decided

- Shelton's bio and headshot (from `community-talk.html`) are now also displayed on `about.html` in a dedicated "About the Founder" section.
- The $5 digital kit sales count (total + last 30 days) is surfaced on the admin dashboard as a "Kit Sales" stat tile, sourced from `one_time_orders`.
- All six dead `pdf.html` outbound links across the site are temporarily redirected to `about.html` pending a proper funnel decision; link copy updated to "Learn More" / "About Helper-ID" / "Learn more →" as appropriate.
- The nav entry for "Free PDF" on `pdf.html` itself now points to `about.html` instead of self-referencing.
- Issue #83 was opened to track the conversion funnel work as a distinct future task.

---

## What was built or designed

- **`about.html` — founder section:** New `.founder-section` block with two-column grid (bio left, headshot right), responsive to single column below 720px. CSS added inline. Located between the Stewardship block and the CTA.
- **`api/server.js` — `/admin/stats` update:** Added two `one_time_orders` count queries (total and last-30d) to the existing `Promise.all`. Response now includes `kitOrders: { total, last30d }`.
- **`admin.html` — Kit Sales tile:** New stat tile added to the stats grid; `renderStats()` updated to populate `stat-kit-total` and `stat-kit30-sub`.
- **Dead link remediation (5 files):** `about.html`, `55-communities.html` (×2), `faq.html` (×2), `reader.html`, `pdf.html` — all `pdf.html` hrefs replaced.
- **GitHub issue #83:** [Build conversion funnel for dead Free PDF links](https://github.com/TheEmpathyLab/helper-id-reader/issues/83)

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| What is the right conversion funnel destination for visitors who were seeking a free/low-commitment entry point? | Six links currently dead-end at `about.html`. Audience intent was "I want something free before committing." Options: products page, $5 kit, a dedicated landing page. | Before next marketing push |
| Should `pdf.html` be kept, repurposed as a landing page, or removed? | Page still exists and is reachable by direct URL. Nav link removed but no server-side redirect. | Same time as funnel decision (#83) |

---

## What was ruled out

- **Leaving links pointing to `pdf.html` as-is:** The Free PDF feature is deprecated; dead links are worse than any redirect, so a temporary `about.html` destination was chosen as a holding pattern.

---

## May need revisiting

- **Temporary `about.html` redirect:** This is explicitly a placeholder. Needs a real destination once the funnel is designed (tracked in #83).
- **Kit sales stat shows count only, not revenue:** $5 × count is trivially calculable but no dollar figure is shown on the dashboard. May want a revenue line if kit volume grows.

---

## Next steps

1. Resolve issue #83 — decide funnel destination and update all 6 redirects from `about.html` to the chosen page.
2. Decide fate of `pdf.html` — keep as a landing page, repurpose, or remove and add a server-side redirect.
3. Monitor kit sales tile on admin dashboard — if volume warrants it, add a revenue line ($5 × count) to the stat.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton directed priorities and reviewed output; Claude executed all code changes, wrote the issue, and committed/pushed.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Feature direction, QA (caught that bio wasn't visible due to changes not being pushed), final approval
- AI Roles: Code authorship, HTML/CSS for founder section, server.js and admin.html edits for kit sales stat, dead link audit and remediation across 5 files, GitHub issue creation, session review
```
