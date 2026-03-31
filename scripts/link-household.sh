#!/bin/bash
# =============================================================
# link-household.sh
# Links one or more profiles to a household.
# Safe to re-run — just updates household_id on each profile.
#
# Usage:
#   ADMIN_SECRET=your_secret bash scripts/link-household.sh
#
# Edit the variables below before running.
# =============================================================

API="https://helper-id-v8uev.ondigitalocean.app/api"

# ---- Edit these ----
HOUSEHOLD_ID="household-uuid-here"
# Add or remove profile UUIDs as needed
PROFILE_IDS='[
  "profile-uuid-1",
  "profile-uuid-2",
  "profile-uuid-3"
]'
# --------------------

curl -X POST "$API/admin/link-household" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"householdId\": \"$HOUSEHOLD_ID\",
    \"profileIds\": $PROFILE_IDS
  }"
