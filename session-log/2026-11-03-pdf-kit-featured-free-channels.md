# Helper-ID — PDF Kit Featured on Product Pages, Free-Channel Sales Plan
**Session date:** 2026-11-03
**Status:** Decision log — ready for repo commit
**Next session entry point:** Add a GA4 `purchase` event and per-channel attribution to the PDF Kit flow (including the Helper Notes UTMs), so free-channel sales can be measured.

Continues [2026-10-29-video-voiceover-priority.md](2026-10-29-video-voiceover-priority.md).

---

## What was decided

- The $5 Emergency PDF Kit is the product to sell now. Memberships stay paused (#92).
- Free channels come before paid ads. Shelton will put in the work instead of the money. Paid ads are parked (see ruled out).
- Free channels in priority order: (1) partners who already serve the buyer (elder care, estate planners, elder law attorneys, financial advisors, school nurses and PTAs, running and cycling groups), ideally buying kits in bulk as client gifts; (2) community talks with a talk-only offer and UTMs; then press hooks, search content, founder posts and the animated video, and buyer referrals.
- On every product page the PDF Kit is the featured card: red border, a "★ Available Now" badge, a pink "One-Time Purchase" label and a solid red "Get My Kit →" button.
- Individual and Family memberships both get a gray border at the same thickness as the red one, a gray tier label and a gray "Coming Soon / Get on the List" button. Price and feature text are not dimmed.
- On `membership.html`, the "Everything you need to be ready" benefits are split into two groups: **Available Now — Emergency PDF Kit, $5** and **Coming Soon — Individual & Family Membership, "everything in the kit, plus:"**. The kit list includes only fields the kit form actually collects.
- The "Three steps to covered" section on `membership.html` is labeled "Memberships — Coming Soon" and written in future tense. Step 1 was renamed "Get your NFC card" so it isn't confused with the PDF Kit.

---

## What was built or designed

- **GA4 audit (no changes):** GA4 `G-588PV5KMPT` has been live since 2026-04-13 (`06fdf3b`) and was confirmed on the live helper-id.com homepage. It is on 18 of the 23 HTML pages. Missing: `admin.html`, `design-system.html`, `generator.html`, `writer.html` (internal) and `t.html` (the NFC tap landing page, which redirects to `reader.html`, where GA does fire). The only custom event is `waitlist_signup` (`hid-waitlist.js:80`). **No purchase event exists.**
- **Sales strategy discussion (no code):** At $5 Shelton keeps about $4.55 after Stripe fees. Cold paid ads typically cost more than that per purchase (a rough industry range, not Helper-ID data), so ads only make sense if the kit is treated as a loss leader for memberships or as paid message testing. Ways to raise what each buyer spends: a family pack (blocked on the dependent-card gap from 2026-06-22), a key tag add-on at Stripe checkout, and "get one for Mom" gift framing for the holidays.
- **Product page restyle:** `index.html`, `products.html` and `membership.html`.
  - New `.product-card.soon` class for the gray border.
  - The `.featured` badge text was changed to "★ Available Now". It had been "★ Full Service" on index and products, and "★ Most Popular" on membership.
  - Tier label colors swapped: `.tier-diy` is now pink/red, `.tier-family` is now gray.
  - Membership buttons changed to `hid-btn-secondary`; the kit button changed to `hid-btn-primary`.
- **`membership.html` copy:** benefits section split into kit and membership groups (new `.included-group` styles, gray checks for coming soon); "Three steps" copy rewritten.
- The dashboard's "upgrade to Family" button and the commented-out CTA block in `membership.html` were left unchanged.
- **Commit:** `94e6781` — #92 — Feature the PDF Kit, gray out coming-soon memberships (pushed to main).

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Which partner audience gets the first 10 calls or emails: elder care, parents and schools, professionals, or fitness? | Decides where outreach starts. Shelton picks based on who he can reach most easily. | Before outreach |
| What is a $5 kit buyer worth to Helper-ID? | Sets the maximum cost per buyer if paid ads are ever turned on. | Before any paid spend |
| Change the membership-first wording at the top of `membership.html`? | The hero badge "Full Membership", the "See Membership Plans →" button and the plans heading "Choose your membership." still lead with membership. | Next page pass |
| Gray out the red step circles in "Three steps to covered"? | The section is now coming soon, but the circles are still brand red. | Next page pass |
| Add GA to `t.html`? | Tap visits currently show up under `reader.html` only. | Low |
| Ask AS for help with the voice-over? | Carried over from 2026-10-29. | Before recording |
| Should `/agenda` read `non-software` GitHub issues? | Carried over from 2026-10-29. Suggested this session: put non-software tasks in `agenda-notes.md`, which doesn't exist yet. | Next agenda run |
| Key tag add-on price ($25 for 3) and how Shelton is notified of orders | Carried over from 2026-10-27. Also relevant now as a possible add-on at kit checkout. | Before memberships reopen |
| Commit or ignore `kit_design/260618-HID-OnePager.indd` and `.DS_Store` | Carried over. Still uncommitted. | Next build session |

---

## What was ruled out

- **Paid ads for the $5 kit, for now:** at $5 the cost per purchase from cold ads very likely exceeds the revenue, and Shelton would rather invest time in free channels.
- **Fully muted membership cards** (faded text, gray price): Shelton chose gray border only, so the membership details stay readable.
- **Graying only Individual:** Family is paused too, so both memberships are gray and the kit is the only red card.

---

## May need revisiting

- **Gray "coming soon" membership styling:** undo when memberships reopen. Restore the red featured card, the red buttons and the membership-first copy.
- **No paid ads:** reconsider once purchase tracking exists and Shelton has set what a buyer is worth.

---

## Next steps

1. Add purchase tracking: a GA4 `purchase` event on `kit-confirm.html` and per-channel attribution (UTM or partner code) saved with each `one_time_orders` row, visible in the admin dashboard. Done when a test purchase shows up in GA Realtime with its source.
2. Shelton picks the first partner audience and lists 10 contacts in a new `agenda-notes.md`. Done when the file exists with 10 open items.
3. Shelton books 2–3 community talks for November–December. Done when the dates are on the calendar.
4. Record the voice-over (#93). Carried over.
5. Live QA for #92, then close #92 citing `83fe6ba`, `5b223d1`, `1c9f716` and `94e6781`. Carried over.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 35%
- AI Contribution: 65%
- Collaboration Method: Shelton asked about GA status and how to sell the $5 kit, chose free channels over paid ads, and directed the product-page visual and copy changes, correcting the tier label colors and asking for the kit and membership benefits to be split. Claude audited GA, outlined sales channels, asked the styling questions, implemented and screenshot-checked the page changes, committed them, and wrote this review.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Product direction, channel strategy choice, visual design decisions, copy direction, QA approval
- AI Roles: GA audit, sales channel analysis, HTML/CSS changes, copy drafting, commit, documentation
```

---

### Update — 2026-11-03 — Hero rewrite, phone nav, Helper Notes launch

#### Additional decisions
- Fred Rogers' name and quote come off the homepage hero. A sales page leading with a famous person's words risks implying endorsement. Quoting him with credit inside an article is fine.
- New homepage hero, in Shelton's words: "You're the Helper!", followed by copy pointing helpers to the CODE + PIN or the member's paper card.
- Phones get a ☰ hamburger menu, not a second row of links. Shelton chose it over the scrollable-row option.
- The articles section is named **Helper Notes**. Shelton picked it over For the Helpers, A Helper's Notebook and Helper Journal. It's just Shelton for now, with room to open it to guest helpers later.
- Workflow: plan and publish from the terminal, write in PL Writer. Claude sends drafts or suggestions into PL Writer, Shelton edits, and Claude publishes the final draft. When asked for edits, Claude suggests them in chat and does not rewrite.
- Helper Notes pages are flat files at the site root (`helper-notes.html`, `helper-notes-{slug}.html`). The host returned 404 for a folder path, so folder index pages weren't relied on.
- Each note shows its provenance label (badge linking to the registry, plus the human/AI split) and ends with a PDF Kit CTA tagged `utm_source=helper-notes&utm_medium=article&utm_campaign={slug}`.
- First note: "Why I'm Building Helper-ID", the story of Shelton's mom in April 2020, then years of listening, who the helpers are, beliefs, and why Helper Notes. Shelton chose it as the anchoring note, ahead of the five topic notes.

#### Additional artifacts
- `index.html` hero rewritten. `hid-style.css` gets the phone nav; the ☰ button was added to the 11 pages with the menu. Commit `36a1c46`.
- `helper-notes.html` (landing page) and `helper-notes-why-im-building-helper-id.html` (first note). "Helper Notes" link added to the menu before "About" on all 11 pages. Commit `56970d4`.
- Provenance label [PL-000037](https://registry.provenancelabel.org/PL-000037) added to the note: 64% human, 36% AI, written in PL Writer with one Claude session. Commit `a3ef9a5`.
- Issue [#94](https://github.com/TheEmpathyLab/helper-id-reader/issues/94) created and closed.
- PL Writer document "Helper Notes — Why I'm Building Helper-ID" (`doc_-WrBATLAzREOyONk`) is the source of the note.

#### Resolved this update
- **Commit `session-log/` while it's publicly served?** Shelton chose to commit as is. The folder is still public at helper-id.com/session-log/.

#### Lesson: headless screenshots at phone width
Chrome headless with `--window-size=390,…` doesn't lay pages out at a true phone width, so pages looked broken when they weren't. Shelton's VS Code phone emulator showed the same false break. **Next time:** render the page inside a 375px `<iframe>` on a wider page to get a real phone layout, and trust Shelton's actual phone for the final check.

#### Open questions — added
| Question | Context | Priority |
|----------|---------|----------|
| Keep or change Claude's wording on the Helper Notes pages? | The note's summary/preview line, the landing page intro ("Notes for helpers…") and the PDF Kit box text were written by Claude, not Shelton. | Before sharing the note |
| Remove Fred Rogers from the founder bio on `about.html` and `community-talk.html`? | The bio says "Mr. Rogers said it best: look for the helpers." It's credited and part of a personal bio, so it's lower risk than a headline, but it has the same attribution slip (it was his mother's advice). | Low |
| Should the About page link to the new note? | The note retells the About page more personally. | Next page pass |

#### Revised next steps
1. Add purchase tracking: a GA4 `purchase` event on `kit-confirm.html`, plus the UTM or partner code saved on each `one_time_orders` row. Done when a test purchase from a Helper Notes link shows its source in GA.
2. Share the first Helper Note (LinkedIn, community talks). Done when it's posted with UTM links.
3. Write the next Helper Note in PL Writer. Recommended: "Why carry emergency info on paper" or "How to choose your emergency contacts." Done when it's published with its label.
4. Shelton picks the first partner audience and lists 10 contacts in `agenda-notes.md`.
5. Carried over: record the voice-over (#93); run #92 live QA and close #92 citing `83fe6ba`, `5b223d1`, `1c9f716`, `94e6781`.

#### Provenance label — continuation
```
Provenance Label v1.0
- Human Contribution: 50%
- AI Contribution: 50%
- Collaboration Method: Shelton wrote the new hero line, chose the hamburger menu and the Helper Notes name, picked the anchoring note, and wrote and edited the note in PL Writer. Claude explained the endorsement risk, built the nav and Helper Notes pages, drafted the starting text and edit suggestions in PL Writer, published the note with its label, and wrote this update.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Copy, naming, design choices, writing and editing the note, QA on device
- AI Roles: Risk explanation, HTML/CSS, draft and edit suggestions, publishing, documentation
```

---

### Update — 2026-11-03 — PL Writer editing-phase reflection

#### Additional decisions
- The Helper Note workflow (scaffold → Shelton fills → AI suggests edits, Shelton writes them → publish) is the model to bring into PL Writer. Editing should be a recorded phase, not just inserting AI text.

#### Additional artifacts
- **PL Writer reflection note:** `2026-11-03-plw-editing-phase-reflection.md`, written to the Claude scratchpad, not to any repo. Shelton is carrying it to the PL repo by hand. It covers:
  - The four phases. Only the scaffold insert shows on PL-000037 (36% AI).
  - What the label missed: 3 review rounds, about 30 suggestions, a fact check, and a privacy flag.
  - Friction: suggestions lived in the chat, and nothing tracks which were accepted or declined.
  - Product ideas: suggestions anchored to text with an applied / dismissed / inserted outcome, an editing line on the label, role tags, a scaffold mode with required prompts, and typography help.
- The suggestion counts in the note come from Claude's replies in this session. Shelton should confirm them before sharing.

#### Revised next steps
1. Shelton moves the reflection note into the PL repo and opens it there as a PL Writer product thread. The scratchpad copy is temporary.
2. The other next steps above are unchanged. Purchase tracking is still the HID entry point.

#### Provenance label — continuation
```
Provenance Label v1.0
- Human Contribution: 25%
- AI Contribution: 75%
- Collaboration Method: Shelton framed the problem (PL Writer should be more than copy-and-paste) and asked for a reflection. Claude wrote it from the session record.
- AI Tool(s): Claude Opus 5.5 (Anthropic)
- Human Roles: Framing, product direction
- AI Roles: Session recall, analysis, drafting
```
