# Helper-ID — Paid PDF Kit Launch
**Session date:** 2026-06-30
**Status:** Decision log — ready for repo commit
**Next session entry point:** Kit is live and end-to-end tested; next priorities are the anniversary re-purchase email and any copy/design updates to the products page or fill.html.

---

## What was decided

- The free PDF product is removed from the products page — "free" removed any commitment to complete the form, and the $5 price point functions as a completion trigger and trust signal.
- Email delivery is the delivery mechanism for kit outputs — not a direct download link from the redirect.
- The Stripe success URL sends the buyer to `kit-confirm.html` (a "check your email" page) rather than directly to the form, because the webhook fires asynchronously after redirect.
- The form link is also emailed immediately on purchase as a recoverable backup in case the buyer closes the tab.
- Token expiry is 7 days — long enough to gather information (medications, insurance IDs, contacts) without being permanent.
- Self-serve resend is the re-entry path — `resend.html` lets buyers extend their token 7 days without involving Shelton. No manual ops.
- Tokens are single-use. If a buyer needs to update their PDFs, they re-purchase. No update flow for now — the data doesn't change often enough to warrant it.
- The kit delivers three PDF outputs, not two: wallet card, full emergency profile sheet, and a phone-friendly share sheet.
- The share sheet use case is saving emergency information to your phone for reference when filling out medical, school, or gym forms — not just for first responders.
- Print-and-mail is deferred. The concept is validated but the $2 price point is below cost and the fulfillment ops are non-trivial. Email-first ships now; mailing revisits when demand is proven.
- `pdf.html` (the old free form page) remains accessible at its direct URL — it is only removed from the products page, not deleted.

---

## What was built or designed

**New server routes (`api/server.js`):**
- `handleKitCheckout(session)` — fires on `checkout.session.completed` when `metadata.plan === 'kit'`; generates token, inserts `one_time_orders` row, emails form link
- `GET /kit-token-status` — validates a token before showing the form (not found / used / expired)
- `POST /one-time-submit` — validates token, generates all three PDFs, emails bundle, marks token used
- `POST /resend-token` — finds unused token by email, resets expiry to 7 days, resends form link
- `generateSharePdf(profile)` — programmatic portrait-layout PDF drawn with pdf-lib; no AcroForm template needed

**New pages:**
- [`fill.html`](../fill.html) — form page; reads `?token=` from URL, validates on load, submits to `/one-time-submit`
- [`kit-confirm.html`](../kit-confirm.html) — Stripe success_url; tells buyer to check their email
- [`resend.html`](../resend.html) — self-serve re-entry; buyer enters email, gets fresh 7-day link

**Schema:**
- `one_time_orders` table added to Supabase: `id`, `email`, `token`, `stripe_session_id`, `used`, `expires_at`, `created_at`; RLS enabled, no permissive policies
- Documented in [`supabase/schema.sql`](../supabase/schema.sql)

**Config / products page:**
- `config.js` — `stripe.kitPdf` entry added with Stripe Payment Link URL
- `products.html` — kit card added with all three outputs described; free PDF card removed

**Three PDF outputs per kit:**
1. `helper-id-wallet-card.pdf` — filled `card-template.pdf`, print-cut-carry
2. `helper-id-emergency-profile.pdf` — filled `template.pdf`, print for fridge/go-bag
3. `helper-id-share.pdf` — programmatic portrait layout, save to phone for form-filling reference

**Issue closed:** [#82](https://github.com/TheEmpathyLab/helper-id-reader/issues/82)

---

## Open questions

| Question | Context | Priority |
|---|---|---|
| Anniversary re-purchase email | One year after kit purchase, send discount code to update PDFs. `created_at` on `one_time_orders` makes targeting straightforward. | Post-launch |
| Copy and design pass on `fill.html` | Shelton will update the placeholder copy once he has a feel for how buyers respond. | Post-launch |
| Print-and-mail add-on | $2 fee insufficient to cover costs; fulfillment partner needed. Revisit when email kit has proven demand. | Post-launch |
| Update flow for existing buyers | Currently re-purchase only. If buyers ask for it, add a `/resend-token`-style flow that permits re-submission. | Post-launch |

---

## What was ruled out

- **Client-side PDF generation:** All PDF generation is server-side (pdf-lib on Node). No browser-based PDF tools — keeps the logic in one place and consistent with the existing member card/profile routes.
- **Stripe webhook → redirect token in URL:** The webhook fires after the buyer has already landed on the success page. Token goes in the email, not the redirect URL. `kit-confirm.html` bridges the gap.
- **Apple/Google Wallet pass for the share sheet:** Requires signing certificates and `.pkpass` infrastructure. Meaningful build work for uncertain return. Portrait PDF to Files app is sufficient for now.
- **vCard (.vcf) as share format:** Natively integrates with Contacts but has no real fields for medical conditions or insurance. Works only as a complement; not a replacement for a full profile view.
- **Dynamic Stripe Checkout Session (server-created):** Stripe Payment Link with `metadata: { plan: 'kit' }` is consistent with the existing membership pattern and requires no new server endpoint for checkout creation.

---

## May need revisiting

- **Single-use token:** If buyers frequently ask to update their PDFs, the re-purchase friction may become a complaint. Could relax to expiry-only enforcement (multiple submissions allowed within 7 days) without major rework.
- **7-day token expiry:** Chosen as a reasonable window for gathering info. If buyers report links expiring before they can use them, consider 14 days.
- **Share PDF layout:** Programmatically generated with pdf-lib — layout is functional but basic. A design pass could significantly improve the phone-viewing experience, especially for longer medical fields.
- **Free PDF at `pdf.html`:** Hidden from products page but still live. If it causes brand confusion or gets organic traffic that undercuts the $5 kit, consider adding a redirect or a "this product is no longer available" notice.

---

## Next steps

1. End-to-end test in production — purchase, receive form link email, submit form, confirm three PDFs arrive correctly formatted.
2. Review share PDF on an actual phone screen — confirm readability and that long fields (conditions, medications) wrap cleanly.
3. Update `fill.html` copy once Shelton has reviewed the buyer experience — placeholder text is minimal.
4. Add `pricing.kitPdf` entry to `config.js` for consistency with other products (currently missing from the pricing block).

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton directed product decisions and priorities; Claude designed architecture, wrote all code, and produced all artifacts
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Product framing, pricing decisions, delivery mechanism selection, token expiry decision, share-sheet use case identification, QA sign-off, Stripe and Supabase setup
- AI Roles: Architecture recommendation, schema design, all server route code, all HTML pages, PDF layout engine, commit messages, issue creation and closure
```
