# Helper-ID Admin Scripts

Shell scripts for provisioning members, managing households, and running migrations. All scripts talk to the live API — never directly to Supabase.

## Setup

All scripts require `ADMIN_SECRET` to be set in your environment:

```bash
export ADMIN_SECRET=your_admin_secret
```

Get the value from DigitalOcean → App → Settings → Environment Variables.

Never commit `ADMIN_SECRET` to this repo.

---

## Scripts

### `provision-member.sh`
Manually provisions a single member + profile without a Stripe purchase.

Use for: Bubble member migration, comped accounts, demo/test profiles.

```bash
# Edit the variables at the top of the file, then:
ADMIN_SECRET=your_secret bash scripts/provision-member.sh
```

**Behavior:**
- If `SKIP_EMAIL=false` and profile data is provided → sends member a dashboard login link
- If `SKIP_EMAIL=false` and no profile data → sends standard setup email
- If `SKIP_EMAIL=true` → no email (demo/test profiles, dependents)

---

### `create-household.sh`
Creates a household record and assigns a guardian (admin member).

Run this first when setting up a household, then run `link-household.sh`.

```bash
# Edit ADMIN_MEMBER_ID and HOUSEHOLD_NAME, then:
ADMIN_SECRET=your_secret bash scripts/create-household.sh
```

Returns a `householdId` — copy it for use in `link-household.sh`.

---

### `link-household.sh`
Links profile IDs to a household. Safe to re-run.

```bash
# Edit HOUSEHOLD_ID and PROFILE_IDS, then:
ADMIN_SECRET=your_secret bash scripts/link-household.sh
```

Profile IDs are in Supabase → Table Editor → `profiles`.

---

## migrations/

One-time scripts that have already been run. **Do not re-run these.**

They are kept as an audit trail — each file documents what was done, when, and which IDs were affected. New devs can read these to understand the history of the database.

| File | Date | What it did |
|------|------|-------------|
| `2026-03-31-davis-family.sh` | 2026-03-31 | Provisioned Davis family (4 members), created household, linked profiles |

---

## Adding a new migration

When you run a one-time admin operation:
1. Copy the relevant template script
2. Fill in the real values
3. Run it
4. Save it to `migrations/YYYY-MM-DD-description.sh` with a comment block explaining what it did
5. Commit it

This gives future developers a complete history of every manual change made to the database.
