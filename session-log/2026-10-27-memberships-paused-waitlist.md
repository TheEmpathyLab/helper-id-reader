# Helper-ID — Memberships Paused, Waitlist Signup, Key Tags as Add-On
**Session date:** 2026-10-27
**Status:** Decision log — ready for repo commit
**Next session entry point:** Run the three live checks for issue #92 (waitlist popup signup, admin Membership Waitlist table, PDF Kit purchase with the opt-in box ticked), then close #92 with the commit SHAs.

---

## What was decided

- The Emergency PDF Kit ($5) is the only product for sale. It serves as the lead product for memberships.
- Individual and Family memberships are paused. Every membership button reads "Coming Soon" with a smaller, lighter "Get on the List" stacked underneath.
- "Get on the List" opens a free email signup. Joining the waitlist does not require buying the PDF Kit.
- PDF Kit buyers are also asked on the fill form whether they want to hear when memberships launch. The box is unchecked by default (consent-driven).
- NFC key tags are no longer included in any membership. Memberships ship only an NFC card, which goes flat rate and is cheaper to ship. Key tags become a paid add-on.
- The member dashboard's Family upgrade button also shows Coming Soon. Existing members can't upgrade while memberships are paused.
- The Membership page's bottom "Join Helper-ID" section (two buttons plus the "30-day money-back guarantee" line) is hidden for now.
- `pdf.html`'s "Want this on a physical NFC tag?" box is hidden. It held three retired products with live checkout links: $9 DIY instructions, $35 NFC Pack and $55 Full Membership.
- No email links to buying a plan:
  - The PDF Kit email and the old free-PDF email no longer have the "See Helper-ID Plans" button or the NFC tag line above it.
  - The third drip email's button now reads "Get on the Membership List →". It links to `membership.html#pricing` with UTM tags (`utm_campaign=drip-3-waitlist`).

---

## What was built or designed

- **GitHub issue [#92](https://github.com/TheEmpathyLab/helper-id-reader/issues/92):** Pause memberships, add Coming Soon buttons and an email waitlist.
- **`hid-waitlist.js`** (new, shared): injects the signup popup and binds every `[data-waitlist="individual|family"]` button.
  - Posts to `/api/waitlist` with the email, the plan and the page the visitor came from.
  - Fires a GA `waitlist_signup` event.
  - Loaded on `index.html`, `products.html`, `membership.html` and `dashboard.html`.
- **`hid-style.css`:**
  - `.hid-btn-sub` stacks a small sub-label under button text.
  - New `.hid-modal` styles.
  - DM Sans 300 isn't loaded, so the sub-label uses weight 400.
- **`api/server.js`:**
  - `POST /waitlist`: public, with its own limiter of 5 per hour per IP. It upserts on email, so a repeat signup updates the plan.
  - `POST /admin/waitlist`: returns the waitlist for the admin table.
  - `/one-time-submit` stores `membership_interest` on the order.
  - `/admin/kit-orders` now returns `membership_interest`.
  - PDF email and drip email 3 copy changes.
- **`fill.html`:** opt-in checkbox above the submit button.
- **`admin.html`:**
  - New Membership Waitlist card with Email, Plan, Page and Signed Up columns.
  - New "Membership Waitlist" column in the Kit Sales table.
- **Copy across `index.html`, `products.html`, `membership.html`, `faq.html` and `dashboard.html`:**
  - "NFC card + two NFC key tags" became "NFC card shipped to you" plus "NFC key tags available as an add-on".
  - "NFC hardware for every profile" became "NFC card for every profile".
- **Supabase** (run by Shelton, documented in `supabase/schema.sql`):
  - `one_time_orders.membership_interest` boolean column.
  - New `membership_waitlist` table (email unique, plan, source, created_at, RLS on).
- **Commits:**
  - `83fe6ba`: main change.
  - `5b223d1`: PDF email upsell removed.
  - `1c9f716`: drip 3 points to the waitlist.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| How is the NFC key tag add-on sold? | Copy says "available as an add-on", but there's no Stripe product, price or link. | Before memberships reopen |
| What email do waitlist signups get when memberships launch? | Data is collected in two places: `membership_waitlist` and `one_time_orders.membership_interest`. No launch email or export flow exists yet. | Before memberships reopen |
| Do PDF Kit buyers who opt in also need to be in `membership_waitlist`? | Today the two lists are separate and shown in separate admin tables. They need merging or de-duplicating at launch. | Before memberships reopen |
| What happens to `pdf.html` overall? | The free PDF flow is mostly dead (links redirect to `about.html`), but the blank-card email still links to `pdf.html`. | Fold into #84 page audit |
| FAQ still describes "Full Membership" and "Free PDF (DIY)" | Only the key tag wording was fixed this session. | Issue #89 |

---

## What was ruled out

- **Making the PDF Kit purchase the only way onto the waitlist:** Rejected because it puts a $5 price on showing interest. The kit opt-in exists alongside the free signup.
- **Leaving "Get on the List" unclickable as a teaser:** Rejected. The label asks for an action, so the button has to do something.
- **Removing the drip email 3 button outright:** Rejected in favor of pointing it at the waitlist, which fits the email's tone.
- **Bundling NFC key tags in memberships:** Rejected on shipping cost. A card-only shipment goes flat rate.

---

## May need revisiting

- **Coming Soon buttons use normal (not grayed) button styles:** They became clickable when the waitlist was added. Revisit if they read as "buy" buttons.
- **Hidden sections (membership CTA, `pdf.html` upsell) are HTML-commented, not deleted:** Restore or delete when memberships reopen.
- **Waitlist rate limit of 5 per hour per IP:** Revisit if shared networks, such as a senior center or a community event, need to sign up many people from one IP.
- **Dashboard Family upgrade paused for existing Individual members:** Revisit if a current member asks to add family before launch.

---

## Next steps

1. Live QA for #92. Done when:
   - a popup signup shows "You're on the list" and appears in admin;
   - a test PDF Kit purchase with the box ticked shows "Yes" in Kit Sales;
   - the PDF Kit email has no plans button.
2. Close #92 with `gh issue close 92`, citing `83fe6ba`, `5b223d1` and `1c9f716`. Done when the issue is closed.
3. Decide how the NFC key tag add-on is sold (Stripe product, price, where it appears). Done when a buyer can buy key tags, or the add-on line is removed.
4. Plan the membership launch email to both waitlist sources. Done when there's a draft email and a de-duplicated recipient list.
5. Decide whether to commit or ignore the uncommitted `kit_design/260618-HID-OnePager.indd` and `.DS_Store`. Done when `git status` is clean.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton set the business direction (sell only the PDF Kit, pause memberships, key tags as add-on), chose between options presented, gave the button label and layout, ran the Supabase migrations, did local and live QA (catching the plans button in the PDF email), and approved each commit and push.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Product and pricing decisions, button copy and stacked layout direction, choosing the free waitlist signup and the drip email treatment, running SQL migrations, QA, approvals
- AI Roles: Site-wide search for membership and key tag references, button and copy changes across 7 pages, waitlist popup script and styles, server endpoints and rate limiting, admin tables, schema migration notes, email template edits, GitHub issue, commits and pushes, this review
```

---

### Update — 2026-10-27 — Session log housekeeping

#### Additional decisions
- `session-log/` is the only home for session reviews. `SESSION_REVIEW_INSTRUCTIONS.md` now says so, matching `CLAUDE.md`.

#### Additional artifacts
- Moved the four May reviews that had landed in `sessions/` into `session-log/`. The `sessions/` folder no longer exists:
  - `2026-05-02-drip-cron-trust-proxy`
  - `2026-05-11-pin-input-alphanumeric-fix`
  - `2026-05-15-pin-email-flow-audit`
  - `2026-05-17-keychain-addon-deferred`

#### Resolved this update
- **"How is the NFC key tag add-on sold?"** already has a scoped answer in [2026-05-17-keychain-addon-deferred.md](2026-05-17-keychain-addon-deferred.md):
  - 3 key tags for $25. The price was not formally locked.
  - Sold through a dynamic Stripe Checkout Session (`/create-checkout`) at membership checkout. Option A was chosen there; the post-purchase upsell was ruled out.
  - Still open from that review: the price and how Shelton gets notified of key tag orders.

#### Revised next steps
3. Build the key tag add-on per the 2026-05-17 plan when memberships reopen. Confirm the $25 for 3 price and the fulfillment notification first. Done when a membership checkout can include key tags in one transaction.

#### Provenance label — continuation
```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton approved consolidating the session folders; Claude found the split, moved the files, updated the instructions, and linked the earlier key tag decision.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Approval, direction to keep history orderly
- AI Roles: Audit of session folders, file moves, instructions update, cross-reference to prior decision
```
