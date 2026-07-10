# Helper-ID — Fayette Community Page, Nav Fixes, Product Consistency
**Session date:** 2026-07-10
**Status:** Decision log — ready for repo commit
**Next session entry point:** Decide whether `pdf.html`'s product cards (still showing the retired "Full Membership" / Digital Download / NFC Kit set) get folded into the product-consistency fix now, or get handled later as part of issue #84's full page audit.

---

## What was decided

- `fayette.html` is a hardcoded single page for Fayette Senior Services for now — not the data-driven multi-community template. Migration is explicitly deferred to when a second/third community signs on (tracked in issue #85).
- The community page's contact line uses `shelton@empathylab.io`, matching the personal-outreach convention already established on `community-talk.html`.
- On community resource pages: file downloads (PDF/image) get a "Download" button (with the `download` attribute where the file is same-origin); view-only destinations (Miro, membership, external resource links) get "View" or a specific CTA; every resource link opens in a new tab.
- Every page's nav must read exactly Products · Membership · Read a Tag · About — no duplicates, no omissions.
- The three canonical products shown everywhere products are listed (`index.html`, `products.html`, `membership.html`) are: Emergency PDF Kit ($5 one-time), Individual Membership ($55/yr), Family Membership ($99/yr). "Full Membership" is retired as a distinct product name/card — it and Individual Membership already pointed to the same Stripe link.
- `digitalDownload` ($9) and `nfcPack` ($35) stay hidden/commented out on `index.html` and `products.html` (pre-existing decision, untouched this session) and are not part of the three-product set.
- `pdf.html` was left out of scope for the product-consistency pass — it still references the old `fullMembership`/`digitalDownload`/`nfcPack` Stripe keys, which remain valid in `config.js` so nothing there is broken, just inconsistent.

---

## What was built or designed

- **`fayette.html`** (new) — Two-column layout: thank-you copy + contact email in a sticky left column, resource cards in the right column. Eight resource cards: Miro board, Fayette resource list PDF, GA Advance Directive, GA Power assistance info, EMC senior assistance program, iPhone Medical ID setup guide, Android medical info guide, and Membership. Every outbound link carries `utm_source=helper-id&utm_medium=community-page&utm_campaign=fayette`.
- **`images/fayette-resource-list.pdf`, `images/fayette-ga-power.jpg`** — copied from `docs/fayss/` into the served `/images` directory, since `docs/` isn't deployed.
- **Nav fixes:** `index.html` (removed duplicate "Products" link), `pdf.html` (removed duplicate "About" link), `generator.html` (added missing "About" link).
- **GitHub issue [#84](https://github.com/TheEmpathyLab/helper-id-reader/issues/84)** — Audit all frontend pages, decide keep/update/archive per page.
- **GitHub issue [#85](https://github.com/TheEmpathyLab/helper-id-reader/issues/85)** — Migrate `fayette.html` to a data-driven community template (Supabase `communities` table + `GET /community/:slug`) once there's a second community.
- **Product consistency:** `index.html`, `products.html`, `membership.html` all updated to a 3-column `.product-grid` (collapses to 1 column below 900px). All three now render matching Individual/Family Membership cards; `membership.html` gained a new Emergency PDF Kit card. `data-stripe` wiring updated to `individualMembership`/`familyMembership` in place of `fullMembership` on `index.html` and `products.html`.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| What happens to `pdf.html`'s product cards? | Still shows the old 4-card set (Full Membership, Digital Download, NFC Kit) — now inconsistent with the rest of the site. Overlaps with the existing dead-link/funnel decision in issue #83. | Before next marketing push referencing `pdf.html`, or fold into #84 |
| Are `digitalDownload` ($9) and `nfcPack` ($35) retired permanently or restored later? | Currently commented out pending "video tutorials" per the existing code comment — not reassessed this session. | Post-launch / whenever tutorials are ready |
| Full page audit (#84) — which standalone pages get kept/updated/archived? | Repo root has many pages (`confirm.html`, `kit-confirm.html`, `t.html`, `resend.html`, `writer.html`, `design-system.html`, etc.) with no record of live vs. orphaned status. | Whenever Shelton has time for the full pass |
| Community template data model (#85) — Supabase schema and endpoint shape? | Not started; revisit once a second community is confirmed. | Post-launch / next community signup |

---

## What was ruled out

- **Keeping "Full Membership" as its own product/card:** Replaced everywhere with the existing Individual/Family split, since `fullMembership` and `individualMembership` already pointed to the same Stripe checkout link — no reason to maintain two names for one product.
- **Building the data-driven community template now:** Explicitly deferred. Hardcoded `fayette.html` is the right scope for a single community; issue #85 tracks the template work for when it's actually needed.

---

## May need revisiting

- **`pdf.html`'s product cards and Stripe wiring:** Untouched this session, now inconsistent with the rest of the site's three-product set. Revisit alongside issue #84 or the existing #83 funnel work.
- **3-column product grid drops straight to 1 column below 900px** (no intermediate 2-column tablet step): revisit if tablet users report cramped cards above 900px or an awkward jump to single-column.
- **`fayette.html`'s hardcoded structure:** revisit once a second or third community signs on (issue #85).

---

## Next steps

1. Decide `pdf.html`'s product-card treatment — align with the unified 3-product set or handle as part of issue #84. Done when `pdf.html` either matches the rest of the site or is explicitly excluded with a documented reason.
2. Start issue #84 (full page audit) when ready — enumerate all root HTML files, flag orphaned ones, get a keep/update/archive decision per page.
3. Start issue #85 (community template) once a second community is ready to onboard — build the Supabase `communities` table and `GET /community/:slug` endpoint, then reroute `fayette.html`.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton directed priorities, supplied all source content/links, made the three-product business decision via a direct choice between options, did local QA on the Fayette page and product pages, and approved every commit before push.
- AI Tool(s): Claude Sonnet 5 (Anthropic)
- Human Roles: Content and link sourcing (Miro, GA forms, Ms. Kisha's resources), layout direction (two-column ask, button restructuring), product-set decision, QA, approvals
- AI Roles: Full page authorship (fayette.html), nav consistency fixes across 3 pages, product card/CSS/Stripe-wiring unification across 3 pages, GitHub issue creation, commit messages, all commits and pushes
```
