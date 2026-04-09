# Session Log — 2026-04-05

**Focus:** About page content + images, Pre-Launch Security project setup

---

## What was decided

- **About page images confirmed.** Two photos: post-it note wall (origin/research) placed in the left story column, desk with HID prototypes + coffee placed in the right story column. Both use the `img-slot` placeholder pattern established on 55-communities.html.
- **Values section collapsed from 6 to 4.** Removed "Empowering Help" and "Always Reliable" as standalone cards. Grid changed from 3-col to 2-col. Section label changed from "What We Believe" to "Empowering Help."
- **"Preparedness for people who care" tagline locked in.** Added as the closing line of the "What We Want to Accomplish" column.
- **Pre-launch security review scoped before DNS flip.** 13 issues defined across data, transport, API, payments, NFC, backup, and secrets. Launch gate checklist written as formal go/no-go gate.
- **Three highest-urgency items identified:** SEC-04 (RLS — anon key exposure), SEC-06 (rate limiting — 4-digit PIN brute-force), SEC-12 (secrets audit). These are next up.

---

## What was built

### `about.html` — updated

- Copy rewritten: origin story now opens "born out of years of listening," blockquote treatment for the key question
- "What We Want to Accomplish" now includes 4-item bullet list + "preparedness for people who care" closing line
- Values grid: 3×2 → 2×2, 6 items → 4 items
- Two image slots added at bottom of each story column:
  - `images/about-research.png` — post-it note wall
  - `images/about-desk.png` — desk with HID prototypes + coffee
- Stewardship section copy tightened

### Pre-Launch Security project

| Artifact | Location |
|----------|----------|
| Full spec document | `docs/pre-launch-security.md` |
| GitHub Project (Kanban) | [TheEmpathyLab/projects/3](https://github.com/users/TheEmpathyLab/projects/3) |
| Issues | #33–#45 (SEC-01 through SEC-13) |
| Launch gate issue | #46 🔒 Launch Gate — Security |

**Labels created:** `security`, `data-privacy`, `infrastructure`, `database`, `api`, `payments`, `nfc`, `demo`

**Issues filed:**

| Issue | Title | Labels |
|-------|-------|--------|
| #33 | SEC-01 — Data minimization audit | security, data-privacy |
| #34 | SEC-02 — Transport security (HTTPS enforcement) | security, infrastructure |
| #35 | SEC-03 — Data at rest encryption | security, infrastructure |
| #36 | SEC-04 — Supabase Row-Level Security (RLS) audit | security, database |
| #37 | SEC-05 — Security headers | security, api |
| #38 | SEC-06 — API rate limiting | security, api |
| #39 | SEC-07 — API response field leakage audit | security, api |
| #40 | SEC-08 — Stripe webhook security | security, payments |
| #41 | SEC-09 — Access logging completeness and privacy | security, data-privacy |
| #42 | SEC-10 — NFC self-sovereign tier: client-side data handling review | security, nfc |
| #43 | SEC-11 — Backup and recovery strategy | security, infrastructure |
| #44 | SEC-12 — Secrets and environment variable audit | security, infrastructure |
| #45 | SEC-13 — Demo profile security review | security, demo |
| #46 | 🔒 Launch Gate — Security (pinned) | security |

---

## Open items

### About page
| Item | Notes |
|------|-------|
| Drop `images/about-research.png` | Post-it note wall photo |
| Drop `images/about-desk.png` | Desk + HID prototypes + coffee |
| Commit and push images | Same process as 55-communities images |

### Pre-launch security (next up)
| Priority | Issue | Title |
|----------|-------|-------|
| 1 | #36 | SEC-04 — RLS audit (anon key can read all profiles without this) |
| 2 | #38 | SEC-06 — Rate limiting (4-digit PIN is brute-forceable without this) |
| 3 | #44 | SEC-12 — Secrets audit (confirm nothing hardcoded in repo) |

### Carry-forward from prior session
| Item | Notes |
|------|-------|
| DNS flip (Issue #19) | Namecheap → DigitalOcean App — after security gate |
| 3 temp emails to update | Dan Haber, Kristin Bodiford, Anara Bodiford — use `update-member-email.js` |
| Elton Robinson insurance | Update from Bubble record ID to "Medicare" in Supabase |
| Matt Shirley headshot | No image on file — initials fallback active |
| trust.html [PLACEHOLDER] | Governing law/jurisdiction, mailing address |
| faq.html [PLACEHOLDER] | Group/bulk pricing section |
| Images for other pages | index.html, products.html, etc. — img-slot pattern ready |

---

## Provenance Label

```
Provenance Label v1.0
- Human Contribution: 30%
- AI Contribution: 70%
- Tools: Claude Sonnet 4.6
- Session Init: pre | Estimated: false
- Process: Shelton provided all copy direction, image descriptions, and security issue content. Claude structured the about.html layout and image placement, rewrote copy to match, filed all 13 GitHub issues with full task lists, created labels, and built the GitHub Project board.
```
