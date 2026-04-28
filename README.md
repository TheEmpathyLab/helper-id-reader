# Helper-ID

**Compassionate action powered by empathetic data.**

Helper-ID is a consent-driven emergency information platform built for getting help and being a Helper. Preparedness for people who care.

---

## What It Does

Helper-ID gives people a simple, secure way to share critical information — emergency contacts, medical details, and insurance — with the right people at the right moment.

Three ways to access a profile:

- **NFC tag** — tap a Helper-ID tag with any smartphone. No app required.
- **Code + PIN** — enter a member's code and PIN at [helper-id.com](https://helper-id.com) for immediate access.
- **Free PDF** — fill out a profile at [helper-id.com/pdf.html](https://helper-id.com/pdf.html) and receive a printable emergency card by email.

---

## How It Works

Members create a profile with their emergency contacts, medical conditions, allergies, medications, and insurance information. That profile is linked to a physical NFC tag programmed and shipped by Helper-ID.

When a first responder, neighbor, or family member taps the tag — or enters the code and PIN — they see exactly what the member chose to share. The member controls their data. Nothing is shared without their explicit consent.

---

## Principles

**People Over Platforms** — We invest in people first and build platforms to support them.

**Privacy Over Profit** — It's your data. Helper-ID is a messenger, not a product to sell your profile.

**Helpers Over Bystanders** — Empowering each of us to care for ourselves and each other moves us from uninformed bystanders to an informed community of helpers.

**Preparedness Over Perfection** — It's better to be safe than sorry. Prepare today, enjoy more tomorrows.

---

## Tech Stack

- **API** — Node.js / Express
- **Database** — Supabase (Postgres)
- **Email** — SendGrid
- **Payments** — Stripe
- **Hosting** — DigitalOcean App Platform
- **Frontend** — Vanilla HTML / CSS / JS (no framework)

---

## Project Structure

```
/                   Frontend — HTML pages served as static files
api/
  server.js         API — all routes (email, Stripe webhook, NFC, admin)
  template.pdf      AcroForm template for the free PDF email flow
supabase/
  schema.sql        Database schema and migration history
.github/workflows/  GitHub Actions (drip email cron, future security checks)
session-log/        Decision logs — one file per working session
docs/               Design assets and reference PDFs
```

---

## Stewardship

Helper-ID is maintained by a small, independent team focused on clarity, privacy, and long-term reliability. Founded by a passionate human with a background in behavioral psychology, industrial design, user experience research, and empathy-driven action.

Helper-ID isn't here to sell your data or lock you into a system — it's here to give you, and your circle of care, a better way to be ready.

**[helper-id.com](https://helper-id.com)** &nbsp;·&nbsp; **[hello@helper-id.com](mailto:hello@helper-id.com)**
