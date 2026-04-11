# Helper-ID — Security Practices

**Maintained by:** Empathy Lab, Inc.
**Last reviewed:** April 2026
**Audience:** This document has two parts:
- **Part 1** — Full plain-language breakdown (internal reference, team, community partners)
- **Part 2** — Public commitment block (for trust.html, leave-behinds, in-person use)

The rule for what goes public: if knowing it helps an attacker, it stays in Part 1 only.

---

## Part 1 — What we've actually built

### Your connection is always encrypted
Every request between a user's device and Helper-ID travels over HTTPS. Once a browser visits Helper-ID, it is permanently instructed to only connect over HTTPS going forward — even if someone types a plain `http://` address. This closes the window where an unencrypted first request could be intercepted.

### Your data is encrypted at rest
All member and profile data — including medical information — is stored in a database with encryption at rest. This means that even if someone gained unauthorized access to the underlying storage infrastructure, the data would be unreadable without the encryption keys managed by our hosting provider.

### Profiles cannot be accessed directly from the database
Our database is configured so that only our server-side application — using a key that lives exclusively in encrypted server environment variables — can read profile data. Direct queries to the database from a browser, a third-party tool, or an unauthorized script return nothing. This is enforced at the database layer, not just the application layer.

### PINs are never stored in plain text
When you set or receive a PIN, we immediately convert it into a one-way cryptographic hash and discard the original. The stored value cannot be reversed back into your PIN. When you enter your PIN to access a profile, we compare it against the stored hash — we never compare plain text to plain text.

### Automated attacks are blocked
The CODE+PIN lookup endpoint is protected against automated brute-force attempts at multiple levels. Repeated failed attempts from the same source are blocked. Repeated failed attempts against the same code are also tracked and blocked independently — catching attackers who distribute their attempts across many different locations. Failed attempts are logged for review.

### Security headers protect every browser interaction
Every response from Helper-ID includes a set of browser-level security instructions that:
- Prevent Helper-ID from being embedded in another website (blocks clickjacking attacks)
- Prevent browsers from misinterpreting file types (blocks MIME sniffing attacks)
- Block access to device camera, microphone, and location — which Helper-ID never needs
- Restrict which external sources are allowed to load scripts and images (limits injection attack surface)
- Prevent the server from advertising what software stack it runs

### Every profile access is logged
Every time a profile is accessed — whether by NFC tap or CODE+PIN entry — we record the time, method, and connection origin. Failed attempts are also logged. This gives us an audit trail for identifying unusual access patterns, and gives members visibility into when their profile has been viewed.

### We never see or store your payment information
All billing is processed directly by Stripe. Helper-ID never receives, handles, or stores card numbers, billing details, or banking information. Stripe is PCI-DSS certified and is the industry standard for payment processing. Our only record of your payment is a Stripe customer ID that links your account to your subscription.

### API keys and secrets live only on the server
Credentials that access our database, email service, and payment processor exist only as encrypted environment variables on our server. They are never included in source code, never exposed in browser requests, and are checked at application startup — the server refuses to start if any required secret is missing.

### Tier 2 NFC: your data never leaves your device
For members using the self-sovereign NFC tier, the profile data is encoded directly onto the NFC tag itself. When the tag is scanned, the data is decoded entirely in the reader's browser. No profile data transits our servers during a Tier 2 read. This is the strongest possible privacy model for NFC-based identification.

---

## Part 2 — Public commitment block

*Use this verbatim or lightly adapted for trust.html, printed leave-behinds, and in-person community presentations. This language is specific enough to be credible without disclosing anything that helps an attacker.*

---

### How Helper-ID protects your information

We don't just say we take security seriously — we've built specific protections into every layer of the platform. Here's what that means in plain language.

**Your connection is always encrypted.**
Every interaction with Helper-ID travels over an encrypted connection. Your browser is permanently instructed to use encryption when connecting to Helper-ID, even if you type a plain web address.

**Your data is encrypted at rest.**
Your profile information — including any medical details you've added — is stored encrypted. The underlying data is unreadable without the encryption keys managed by our infrastructure provider.

**Profiles require server-side authentication to access.**
Your profile data cannot be queried directly from our database. Every lookup goes through our application server, which enforces authentication before any data is returned. This protection lives at the database layer — it cannot be bypassed at the application level.

**Your PIN is never stored.**
When you set a PIN, we immediately convert it into a one-way cryptographic value and discard the original. We never store your PIN in a readable form — not in our database, not in our logs, nowhere.

**Automated attacks are actively blocked.**
The profile lookup system is protected against automated attempts to guess PINs. Repeated failures — whether from one location or many — are detected and blocked. Every failed attempt is logged.

**Every profile access is recorded.**
Any time your profile is viewed, we record the date, time, and access method. You can see this history in your member dashboard. You always know when your information has been accessed.

**We never touch your payment information.**
Billing is handled entirely by Stripe, a PCI-DSS certified payment processor. Helper-ID never sees, receives, or stores your card number or banking details.

**Tier 2 NFC members: your data stays on your tag.**
If you use a self-sovereign NFC tag, your profile data is read directly from the tag by the person scanning it — it never passes through our servers. Your information goes from your tag to their screen and nowhere else.

---

Helper-ID is built by a small team that uses the platform ourselves. Security isn't a checkbox for us — it's what makes the tool worth trusting.

Questions about our security practices: [hello@helper-id.com](mailto:hello@helper-id.com)
